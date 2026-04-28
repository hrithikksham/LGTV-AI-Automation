'use strict';

// ─── Log Levels ───────────────────────────────────────────────────────────────

const LEVEL = {
  INFO:  'INFO',
  WARN:  'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
};

// ─── Core Formatter ───────────────────────────────────────────────────────────

/**
 * Formats a structured log line.
 * Output: [2024-01-15T12:34:56.789Z] [LEVEL] message  { meta }
 */
function format(level, message, meta) {
  const timestamp = new Date().toISOString();
  const base      = `[${timestamp}] [${level.padEnd(5)}] ${message}`;

  if (meta !== undefined && meta !== null) {
    const metaStr = typeof meta === 'object'
      ? JSON.stringify(meta)
      : String(meta);
    return `${base}  ${metaStr}`;
  }

  return base;
}

// ─── Public Interface ─────────────────────────────────────────────────────────

function info(message, meta) {
  console.log(format(LEVEL.INFO, message, meta));
}

function warn(message, meta) {
  console.warn(format(LEVEL.WARN, message, meta));
}

function error(message, meta) {
  // If meta is an Error instance, extract the message for readability.
  const detail = meta instanceof Error ? meta.message : meta;
  console.error(format(LEVEL.ERROR, message, detail));
}

function debug(message, meta) {
  // Only emit debug lines when DEBUG env var is set.
  if (process.env.DEBUG) {
    console.log(format(LEVEL.DEBUG, message, meta));
  }
}

/**
 * Log a step boundary — makes execution trace easy to scan.
 * @param {string} step  Short identifier, e.g. "STEP 2 — LAUNCH APP"
 */
function step(label) {
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log(format(LEVEL.INFO, `▶  ${label}`));
  console.log(line);
}

module.exports = { info, warn, error, debug, step };