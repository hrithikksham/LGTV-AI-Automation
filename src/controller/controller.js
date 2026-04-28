'use strict';

/**
 * controller.js
 *
 * Orchestrates the full SunNXT → Sun TV HD playback flow.
 *
 * Execution order (per spec):
 *   Step 1 — Connect to TV (with reconnect retry)
 *   Step 2 — Launch SunNXT
 *   Step 3 — Wait for app to fully load
 *   Step 4 — Connect input socket
 *   Step 5 — Execute navigation sequence
 *   Step 6 — Disconnect and return result
 *
 * Failure handling:
 *   - The entire flow is retried up to MAX_FLOW_RETRIES times.
 *   - On each retry, a HOME key is sent (if possible) to reset UI state,
 *     then the app is relaunched and sequence re-executed.
 *   - Each error is logged with explicit cause.
 */

const { TvClient }          = require('../infra/tv-client');
const { runSequence }       = require('./sequence-runner');
const { TIMING, RETRY, APP, NAVIGATION_SEQUENCE } = require('../config/constants');
const logger                = require('../utils/logger');
const { delay }             = require('../utils/delay');

// ─── Internal: single attempt ─────────────────────────────────────────────────

/**
 * Execute one full attempt of the playback flow.
 * Does NOT handle retries — that is the caller's responsibility.
 *
 * @param {TvClient} client  A fresh TvClient instance.
 * @returns {Promise<void>}  Resolves on success, rejects with Error on failure.
 */
async function _executeSingleAttempt(client) {

  // ── Step 1 — Connect ────────────────────────────────────────────────────────
  logger.step('STEP 1 — CONNECT');

  let connected = false;
  for (let attempt = 1; attempt <= RETRY.MAX_RECONNECT_ATTEMPTS; attempt++) {
    try {
      logger.info(`Connection attempt ${attempt}/${RETRY.MAX_RECONNECT_ATTEMPTS}`);
      await client.connect();
      connected = true;
      logger.info('Connection established');
      break;
    } catch (err) {
      logger.error(`Connection attempt ${attempt} failed`, err);
      if (attempt < RETRY.MAX_RECONNECT_ATTEMPTS) {
        logger.info(`Waiting ${TIMING.RECONNECT_DELAY_MS}ms before retry`);
        await delay(TIMING.RECONNECT_DELAY_MS);
      }
    }
  }

  if (!connected) {
    throw new Error(
      `Failed to connect to TV after ${RETRY.MAX_RECONNECT_ATTEMPTS} attempts`
    );
  }

  // ── Step 2 — Launch App ─────────────────────────────────────────────────────
  logger.step('STEP 2 — LAUNCH APP');
  logger.info(`Launching app: ${APP.SUN_NXT_ID}`);

  await client.launchApp(APP.SUN_NXT_ID);
  logger.info('Launch command acknowledged by TV');

  // ── Step 3 — Wait for App Load ──────────────────────────────────────────────
  logger.step('STEP 3 — WAIT FOR APP LOAD');
  logger.info(`Waiting ${TIMING.APP_LAUNCH_WAIT_MS}ms for SunNXT to fully render`);

  await delay(TIMING.APP_LAUNCH_WAIT_MS);
  logger.info('App load wait complete — proceeding to navigation');

  // ── Step 4 — Connect Input Socket ───────────────────────────────────────────
  logger.step('STEP 4 — CONNECT INPUT SOCKET');

  await client.connectInputSocket();
  logger.info('Input socket ready');

  // ── Step 5 — Execute Navigation Sequence ────────────────────────────────────
  logger.step('STEP 5 — NAVIGATION SEQUENCE');
  logger.info('Executing deterministic navigation: LEFT → DOWN → ENTER → RIGHT → ENTER');

  await runSequence(client, NAVIGATION_SEQUENCE);
  logger.info('Navigation complete — Sun TV HD should be playing');
}

// ─── Public: playSunTV (with retry wrapper) ───────────────────────────────────

/**
 * Top-level function: connect, launch SunNXT, and play Sun TV HD.
 *
 * Retries the full flow on failure up to MAX_FLOW_RETRIES times.
 * On each retry, attempts to send HOME to reset the TV UI before restarting.
 *
 * @returns {Promise<{ status: 'playing_sun_tv_hd' } | { status: 'error', reason: string }>}
 */
async function playSunTV() {
  logger.step('PLAY SUN TV — FLOW START');
  logger.info(`Max flow retries: ${RETRY.MAX_FLOW_RETRIES}`);

  let lastError = null;

  for (let attempt = 1; attempt <= RETRY.MAX_FLOW_RETRIES; attempt++) {
    logger.info(`Flow attempt ${attempt}/${RETRY.MAX_FLOW_RETRIES}`);

    const client = new TvClient();

    try {
      await _executeSingleAttempt(client);

      // ── Success ──────────────────────────────────────────────────────────────
      logger.step('FLOW COMPLETE — SUCCESS');
      logger.info('Sun TV HD is playing');
      await client.disconnect();
      return { status: 'playing_sun_tv_hd' };

    } catch (err) {
      lastError = err;
      logger.error(`Flow attempt ${attempt} failed`, err);

      // ── Recovery before retry ────────────────────────────────────────────────
      if (attempt < RETRY.MAX_FLOW_RETRIES) {
        logger.info('Attempting UI reset before retry: sending HOME key');
        try {
          // Best-effort HOME key to return TV to a known state.
          // If the input socket isn't connected this will fail silently.
          await client.sendKey('HOME');
          await delay(2000);
        } catch (resetErr) {
          logger.warn('HOME key reset failed — continuing with full reconnect', resetErr);
        }

        logger.info('Disconnecting before retry');
        await client.disconnect().catch(() => {});

        logger.info(`Waiting ${TIMING.RECONNECT_DELAY_MS}ms before retry`);
        await delay(TIMING.RECONNECT_DELAY_MS);
      } else {
        await client.disconnect().catch(() => {});
      }
    }
  }

  // ── All retries exhausted ────────────────────────────────────────────────────
  logger.step('FLOW COMPLETE — FAILURE');
  const reason = lastError ? lastError.message : 'Unknown failure';
  logger.error(`All ${RETRY.MAX_FLOW_RETRIES} flow attempts failed. Last error: ${reason}`);

  return {
    status: 'error',
    reason,
  };
}

module.exports = { playSunTV };