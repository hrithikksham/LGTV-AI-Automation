'use strict';

require('dotenv').config();

// ─── TV Connection ────────────────────────────────────────────────────────────

const TV_IP   = process.env.TV_IP   || '192.168.1.100';
const TV_PORT = parseInt(process.env.TV_PORT || '3000', 10);

// ─── Timing Constants (milliseconds) ─────────────────────────────────────────

const TIMING = {
  // Time to wait after launching SunNXT before sending any navigation input.
  // Must be 6000–8000 ms per spec. Default: 7000 ms.
  APP_LAUNCH_WAIT_MS: parseInt(process.env.APP_LAUNCH_WAIT_MS || '7000', 10),

  // Delay between directional key presses (LEFT, DOWN, RIGHT).
  NAV_KEY_DELAY_MS: 500,

  // Delay after the first ENTER press (waits for content list to load).
  ENTER_LOAD_DELAY_MS: 2000,

  // Time allowed for the TV to respond to a WebSocket command before timing out.
  COMMAND_TIMEOUT_MS: 10000,

  // Delay between reconnection attempts.
  RECONNECT_DELAY_MS: 2000,

  // Delay between input socket key send and the next send (safety buffer).
  KEY_SEND_BUFFER_MS: 50,
};

// ─── Retry Limits ─────────────────────────────────────────────────────────────

const RETRY = {
  // Max WebSocket reconnection attempts before aborting.
  MAX_RECONNECT_ATTEMPTS: parseInt(process.env.MAX_RECONNECT_ATTEMPTS || '3', 10),

  // Max full-flow retries (connect → launch → navigate) before returning failure.
  MAX_FLOW_RETRIES: parseInt(process.env.MAX_FLOW_RETRIES || '2', 10),
};

// ─── App Config ───────────────────────────────────────────────────────────────

const APP = {
  // SunNXT app ID on LG webOS.
  SUN_NXT_ID: 'sunNXT',
};

// ─── Navigation Sequence ──────────────────────────────────────────────────────
//
// DETERMINISTIC CONTRACT — DO NOT MODIFY.
// Executes after app launch to reach and play Sun TV HD.
//
// Each entry:
//   key        — remote key name (must match LG webOS button event names)
//   delayAfter — milliseconds to wait AFTER sending this key before next step

const NAVIGATION_SEQUENCE = [
  { key: 'LEFT',  delayAfter: TIMING.NAV_KEY_DELAY_MS   },
  { key: 'DOWN',  delayAfter: TIMING.NAV_KEY_DELAY_MS   },
  { key: 'ENTER', delayAfter: TIMING.ENTER_LOAD_DELAY_MS },  // Wait for content load
  { key: 'RIGHT', delayAfter: TIMING.NAV_KEY_DELAY_MS   },
  { key: 'ENTER', delayAfter: 0                          },  // Final play — no wait needed
];

// ─── SSAP Registration Handshake Payload ─────────────────────────────────────
//
// Sent on WebSocket open to register this client with the TV.
// Permissions are the minimum set required for app launching and key input.

const HANDSHAKE_PAYLOAD = {
  forcePairing: false,
  pairingType:  'PROMPT',
  manifest: {
    manifestVersion: 1,
    appVersion: '1.1',
    signed: {
      created:       '20140509',
      appId:         'com.lge.automation',
      vendorId:      'com.lge',
      localizedAppNames:    {},
      localizedVendorNames: {},
      permissions: [
        'CONTROL_INPUT_TEXT',
        'CONTROL_MOUSE_AND_KEYBOARD',
        'READ_INSTALLED_APPS',
        'READ_RUNNING_APPS',
        'READ_LGE_TV_INPUT_EVENTS',
        'UPDATE_FROM_REMOTE_APP',
      ],
      serial: '2f930e2d2cfe083771f68e4fe7bb07',
    },
    permissions: [
      'LAUNCH',
      'LAUNCH_PROTECTED',
      'APP_TO_APP',
      'CLOSE',
    ],
    signatures: [
      {
        signatureVersion: 1,
        signature:        'ca3a7f4a7483573c3b9ac1e3a3d568c0',
      },
    ],
  },
};

// ─── SSAP URIs ────────────────────────────────────────────────────────────────

const SSAP = {
  LAUNCH_APP:        'ssap://system.launcher/launch',
  GET_INPUT_SOCKET:  'ssap://com.webos.service.networkinput/getPointerInputSocket',
};

module.exports = {
  TV_IP,
  TV_PORT,
  TIMING,
  RETRY,
  APP,
  NAVIGATION_SEQUENCE,
  HANDSHAKE_PAYLOAD,
  SSAP,
};