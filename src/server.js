'use strict';

/**
 * server.js
 *
 * HTTP API entrypoint for the LG TV automation system.
 *
 * Routes:
 *   POST /play    — Trigger the full SunNXT → Sun TV HD playback flow.
 *                   Returns 200 on success, 500 on failure.
 *                   Enforces single-execution lock to prevent concurrent runs.
 *
 *   GET  /health  — Readiness probe. Returns system config and lock state.
 *
 * Design decisions:
 *   - No request queueing. If a flow is already running, /play returns 409.
 *   - All responses are JSON.
 *   - Server does not crash on flow errors — errors are surfaced in response body.
 */

require('dotenv').config();

const express       = require('express');
const { playSunTV } = require('./controller/controller');
const logger        = require('./utils/logger');
const { TV_IP, TV_PORT } = require('./config/constants');

const app  = express();
const PORT = parseInt(process.env.PORT || '3500', 10);

// ─── Concurrency Lock ─────────────────────────────────────────────────────────
// Prevents simultaneous /play invocations which would send conflicting key events.

let isRunning = false;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json());

// Request logger — every inbound request is logged with method, path, and timestamp.
app.use((req, _res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.path}`, {
    ip: req.ip,
  });
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /play
 *
 * Triggers the full playback pipeline:
 *   connect → launch SunNXT → wait → navigate → play Sun TV HD
 *
 * Responses:
 *   200 { status: "playing_sun_tv_hd" }            — success
 *   409 { status: "error", reason: "..." }          — already running
 *   500 { status: "error", reason: "<cause>" }      — flow failed
 */
app.post('/play', async (req, res) => {
  if (isRunning) {
    logger.warn('/play called while flow already running — rejecting');
    return res.status(409).json({
      status: 'error',
      reason: 'A playback flow is already in progress. Please wait and try again.',
    });
  }

  isRunning = true;
  logger.info('Playback flow initiated via POST /play');

  let result;
  try {
    result = await playSunTV();
  } catch (unexpectedErr) {
    // This should never be reached — playSunTV() handles all errors internally
    // and always returns a result object. Guarding defensively.
    logger.error('Unexpected uncaught error in playSunTV()', unexpectedErr);
    result = {
      status: 'error',
      reason: `Unexpected internal error: ${unexpectedErr.message}`,
    };
  } finally {
    isRunning = false;
  }

  const httpStatus = result.status === 'playing_sun_tv_hd' ? 200 : 500;
  logger.info(`POST /play responding`, { httpStatus, result });
  return res.status(httpStatus).json(result);
});


/**
 * GET /health
 *
 * Returns the automation system's current readiness state.
 * Does NOT attempt to connect to the TV — it is a lightweight probe only.
 *
 * Response:
 *   200 {
 *     status:  "ready" | "busy",
 *     tv:      { ip, port },
 *     isRunning: boolean,
 *     timestamp: ISO string
 *   }
 */
app.get('/health', (_req, res) => {
  const payload = {
    status:    isRunning ? 'busy' : 'ready',
    tv:        { ip: TV_IP, port: TV_PORT },
    isRunning,
    timestamp: new Date().toISOString(),
  };
  logger.info('GET /health', payload);
  return res.status(200).json(payload);
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((req, res) => {
  logger.warn(`404 — unknown route: ${req.method} ${req.path}`);
  res.status(404).json({
    status: 'error',
    reason: `Route not found: ${req.method} ${req.path}`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

// Catches any synchronous errors thrown inside route handlers.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  logger.error('Unhandled Express error', err);
  res.status(500).json({
    status: 'error',
    reason: err.message || 'Internal server error',
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  logger.step('SERVER STARTED');
  logger.info(`LG TV Automation API listening`, { port: PORT });
  logger.info(`Target TV`, { ip: TV_IP, port: TV_PORT });
  logger.info('Routes: POST /play  |  GET /health');
});

module.exports = app; // Exported for testing if needed