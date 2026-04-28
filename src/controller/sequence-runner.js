'use strict';

/**
 * sequence-runner.js
 *
 * Reusable deterministic sequence executor.
 *
 * Accepts a sequence array where each entry is:
 *   { key: string, delayAfter: number }
 *
 * Executes steps one-by-one with strict serialisation.
 * Delay after each step is always honoured — never skipped.
 *
 * Per spec:
 *   - Never batch commands
 *   - Always serialize execution
 *   - Always respect delays
 */

const logger = require('../utils/logger');
const { delay } = require('../utils/delay');
const { TIMING }  = require('../config/constants');

/**
 * Run a navigation key sequence on the provided TvClient.
 *
 * @param {import('../infra/tv-client').TvClient} client
 * @param {Array<{ key: string, delayAfter: number }>} sequence
 * @returns {Promise<void>}
 */
async function runSequence(client, sequence) {
  logger.step('SEQUENCE RUNNER — BEGIN');
  logger.info(`Executing ${sequence.length}-step navigation sequence`);

  for (let i = 0; i < sequence.length; i++) {
    const { key, delayAfter } = sequence[i];

    logger.info(`Step ${i + 1}/${sequence.length} — sending key`, {
      key,
      delayAfterMs: delayAfter,
    });

    // Apply a small buffer before sending to avoid key event collisions.
    if (i > 0) {
      await delay(TIMING.KEY_SEND_BUFFER_MS);
    }

    await client.sendKey(key);

    if (delayAfter > 0) {
      logger.info(`Waiting ${delayAfter}ms after key: ${key}`);
      await delay(delayAfter);
    }
  }

  logger.info('Navigation sequence completed successfully');
}

module.exports = { runSequence };