'use strict';

/**
 * Returns a Promise that resolves after `ms` milliseconds.
 * Uses async/await-compatible form throughout the codebase.
 *
 * @param {number} ms - Duration to wait in milliseconds.
 * @returns {Promise<void>}
 */
function delay(ms) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { delay };