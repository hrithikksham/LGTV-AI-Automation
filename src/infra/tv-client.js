'use strict';

/**
 * tv-client.js
 *
 * Low-level WebSocket client for LG webOS SSAP protocol.
 *
 * Responsibilities:
 *   - Establish and maintain the primary SSAP socket (port 3000)
 *   - Handle LG TV registration handshake
 *   - Send SSAP commands (request/response pattern)
 *   - Negotiate and connect the secondary input socket
 *   - Send remote key button events via the input socket
 *
 * Design notes:
 *   - The primary socket uses JSON message framing.
 *   - The input socket uses a plain-text protocol:
 *       "type:button\nname:<KEY>\n\n"
 *   - All operations are async/await. No callbacks exposed externally.
 *   - Each TvClient instance owns its own sockets — callers must not share instances.
 */

const WebSocket = require('ws');

const { TV_IP, TV_PORT, TIMING, HANDSHAKE_PAYLOAD, SSAP } = require('../config/constants');
const logger = require('../utils/logger');
const { delay } = require('../utils/delay');

class TvClient {
  constructor() {
    /** @type {WebSocket|null} */
    this._primary = null;

    /** @type {WebSocket|null} */
    this._input = null;

    // Auto-incrementing request ID for SSAP request/response correlation.
    this._msgCounter = 0;

    // Pending promises keyed by request ID.
    // Map<string, { resolve: Function, reject: Function, timer: NodeJS.Timeout }>
    this._pending = new Map();
  }

  // ─── Connection ─────────────────────────────────────────────────────────────

  /**
   * Connect to the TV's primary SSAP WebSocket and complete the registration
   * handshake. Resolves once the TV acknowledges "registered".
   *
   * @returns {Promise<void>}
   */
  async connect() {
    const url = `ws://${TV_IP}:${TV_PORT}`;
    logger.info(`Connecting to TV WebSocket`, { url });

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);

      // Timeout the entire connection + handshake attempt.
      const connectionTimer = setTimeout(() => {
        ws.terminate();
        reject(new Error('Connection handshake timed out'));
      }, TIMING.COMMAND_TIMEOUT_MS);

      ws.on('open', () => {
        logger.info('WebSocket open — sending registration handshake');
        const registerMsg = {
          type:    'register',
          id:      'register_0',
          payload: HANDSHAKE_PAYLOAD,
        };
        ws.send(JSON.stringify(registerMsg));
      });

      ws.on('message', (data) => {
        let msg;
        try {
          msg = JSON.parse(data.toString());
        } catch (parseErr) {
          logger.warn('Received non-JSON message from TV — ignoring', data.toString().slice(0, 120));
          return;
        }

        logger.debug('Received TV message', { type: msg.type, id: msg.id });

        if (msg.type === 'registered') {
          clearTimeout(connectionTimer);
          this._primary = ws;
          logger.info('TV registration successful — primary socket ready');
          resolve();
          return;
        }

        // Some TVs send a "pairing" prompt type first — that is informational only.
        if (msg.type === 'response' || msg.type === 'error') {
          this._handleResponse(msg);
        }
      });

      ws.on('error', (err) => {
        clearTimeout(connectionTimer);
        logger.error('WebSocket error during connect', err);
        reject(err);
      });

      ws.on('close', (code, reason) => {
        logger.warn('Primary socket closed', { code, reason: reason?.toString() });
        this._primary = null;
        // Reject any in-flight requests.
        for (const [id, entry] of this._pending.entries()) {
          clearTimeout(entry.timer);
          entry.reject(new Error('WebSocket closed unexpectedly'));
          this._pending.delete(id);
        }
      });
    });
  }

  /**
   * Close both sockets cleanly.
   */
  async disconnect() {
    if (this._input) {
      logger.info('Closing input socket');
      this._input.terminate();
      this._input = null;
    }
    if (this._primary) {
      logger.info('Closing primary socket');
      this._primary.terminate();
      this._primary = null;
    }
    logger.info('TV client disconnected');
  }

  // ─── SSAP Commands ───────────────────────────────────────────────────────────

  /**
   * Send an SSAP command and wait for the TV's response payload.
   *
   * @param {string} uri     SSAP URI, e.g. "ssap://system.launcher/launch"
   * @param {object} payload Command parameters
   * @returns {Promise<object>} Response payload from the TV
   */
  async sendCommand(uri, payload = {}) {
    if (!this._primary || this._primary.readyState !== WebSocket.OPEN) {
      throw new Error('Primary socket is not connected — cannot send command');
    }

    const id = this._nextId();
    const message = { type: 'request', id, uri, payload };

    logger.info(`Sending SSAP command`, { uri, payload });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(id);
        reject(new Error(`SSAP command timed out: ${uri}`));
      }, TIMING.COMMAND_TIMEOUT_MS);

      this._pending.set(id, { resolve, reject, timer });

      try {
        this._primary.send(JSON.stringify(message));
      } catch (sendErr) {
        clearTimeout(timer);
        this._pending.delete(id);
        reject(sendErr);
      }
    });
  }

  /**
   * Launch an application by its webOS app ID.
   *
   * @param {string} appId  webOS application ID (e.g. "sunNXT")
   * @returns {Promise<object>}
   */
  async launchApp(appId) {
    logger.info(`Launching app`, { appId });
    return this.sendCommand(SSAP.LAUNCH_APP, { id: appId });
  }

  // ─── Input Socket ────────────────────────────────────────────────────────────

  /**
   * Ask the TV for a secondary input socket endpoint, then connect to it.
   * The input socket is used exclusively for remote key button events.
   *
   * @returns {Promise<void>}
   */
  async connectInputSocket() {
    logger.info('Requesting input socket endpoint from TV');
    const response = await this.sendCommand(SSAP.GET_INPUT_SOCKET);

    const socketPath = response && response.socketPath;
    if (!socketPath) {
      throw new Error(
        `TV did not return an input socket path. Response: ${JSON.stringify(response)}`
      );
    }

    logger.info(`Connecting to input socket`, { socketPath });

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(socketPath);

      const connectionTimer = setTimeout(() => {
        ws.terminate();
        reject(new Error('Input socket connection timed out'));
      }, TIMING.COMMAND_TIMEOUT_MS);

      ws.on('open', () => {
        clearTimeout(connectionTimer);
        this._input = ws;
        logger.info('Input socket connected — ready to send key events');
        resolve();
      });

      ws.on('error', (err) => {
        clearTimeout(connectionTimer);
        logger.error('Input socket error', err);
        reject(err);
      });

      ws.on('close', (code) => {
        logger.warn('Input socket closed', { code });
        this._input = null;
      });
    });
  }

  /**
   * Send a single remote button key event via the input socket.
   *
   * Protocol: plain-text frame, format:
   *   "type:button\nname:<KEY_NAME>\n\n"
   *
   * Confirmed LG webOS key names: LEFT, RIGHT, UP, DOWN, ENTER, HOME, BACK
   *
   * @param {string} keyName  Remote key name (uppercase)
   * @returns {Promise<void>}
   */
  async sendKey(keyName) {
    if (!this._input || this._input.readyState !== WebSocket.OPEN) {
      throw new Error(`Input socket not connected — cannot send key: ${keyName}`);
    }

    const frame = `type:button\nname:${keyName}\n\n`;
    logger.info(`Sending key event`, { key: keyName });

    return new Promise((resolve, reject) => {
      this._input.send(frame, (err) => {
        if (err) {
          logger.error(`Failed to send key`, { key: keyName, error: err.message });
          reject(err);
        } else {
          logger.debug(`Key sent successfully`, { key: keyName });
          resolve();
        }
      });
    });
  }

  // ─── Internal Helpers ────────────────────────────────────────────────────────

  /**
   * Route incoming SSAP response/error messages to their pending promise.
   */
  _handleResponse(msg) {
    const entry = this._pending.get(msg.id);
    if (!entry) {
      logger.debug('Received response for unknown request ID — ignoring', { id: msg.id });
      return;
    }

    clearTimeout(entry.timer);
    this._pending.delete(msg.id);

    if (msg.type === 'error') {
      const reason = (msg.payload && msg.payload.message) || msg.error || 'Unknown TV error';
      logger.error(`SSAP command returned error`, { id: msg.id, reason });
      entry.reject(new Error(reason));
    } else {
      logger.debug(`SSAP command succeeded`, { id: msg.id });
      entry.resolve(msg.payload || {});
    }
  }

  _nextId() {
    return `req_${++this._msgCounter}`;
  }
}

module.exports = { TvClient };