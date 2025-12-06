/**
 * Board Protocol Configuration
 *
 * SINGLE SOURCE OF TRUTH for all protocol parameters.
 * These values MUST match the YAML protocol files in Arduino_Upload_to_WebSerialAPI_Tool/protocols/
 *
 * When updating, verify against:
 * - protocols/bossa-renesas.yaml
 * - protocols/stk500v1.yaml
 * - Wireshark captures in captures/
 */

export const PROTOCOL_TYPES = {
  STK500: "STK500v1",
  BOSSA: "BOSSA",
  ESPTOOL: "ESPTool",
  RP2040: "RP2040",
  TEENSY: "Teensy",
  UNKNOWN: "Unknown",
};

/**
 * STK500v1 Protocol Configuration
 * Reference: protocols/stk500v1.yaml
 */
export const STK500_CONFIG = {
  protocol: PROTOCOL_TYPES.STK500,

  serial: {
    baudUpload: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
  },

  timing: {
    syncTimeoutMs: 500,
    commandTimeoutMs: 500,
    writeTimeoutMs: 1000,
    syncRetries: 5,
  },

  memory: {
    pageSize: 128, // 128 bytes per page - from YAML
    flashSize: 0x8000, // 32KB for ATmega328P
    bootStart: 0x7e00,
  },

  constants: {
    STK_OK: 0x10,
    STK_INSYNC: 0x14,
    CRC_EOP: 0x20,
    STK_GET_SYNC: 0x30,
    STK_ENTER_PROGMODE: 0x50,
    STK_LEAVE_PROGMODE: 0x51,
    STK_LOAD_ADDRESS: 0x55,
    STK_PROG_PAGE: 0x64,
  },
};

/**
 * BOSSA/SAM-BA Protocol Configuration for Renesas RA4M1
 * Reference: protocols/bossa-renesas.yaml, R4.pcapng capture
 */
export const BOSSA_RENESAS_CONFIG = {
  protocol: PROTOCOL_TYPES.BOSSA,
  variant: "renesas-ra4m1",

  serial: {
    baudTouch: 1200, // For bootloader entry
    baudUpload: 230400, // Upload baud rate - from YAML & Wireshark
    dataBits: 8,
    stopBits: 1,
    parity: "none",
  },

  timing: {
    resetDelayMs: 2500, // Wait after 1200 touch - CRITICAL
    commandTimeoutMs: 1000,
    writeTimeoutMs: 5000,
    eraseTimeoutMs: 10000,
    retryCount: 3,
    retryDelayMs: 500,
  },

  memory: {
    flashBase: 0x00000000,
    flashSize: 0x40000, // 256KB
    sketchOffset: 0x4000, // 16KB - bootloader adds this internally
    pageSize: 256,
    chunkSize: 4096, // 4KB chunks - from YAML & Wireshark capture!
    sramBufferOffset: 0x34, // Offset in bootloader's data_buffer
  },

  // Bootloader PIDs (different from application PIDs)
  bootloaderPids: [0x006d, 0x0054, 0x0057, 0x0069, 0x0369],
};

/**
 * Board to Protocol mapping
 */
export const BOARD_PROTOCOL_MAP = {
  // AVR boards - STK500v1
  "arduino:avr:uno": STK500_CONFIG,
  "arduino:avr:nano": STK500_CONFIG,
  "arduino:avr:mega": {
    ...STK500_CONFIG,
    memory: { ...STK500_CONFIG.memory, flashSize: 0x40000, pageSize: 256 },
  },
  "arduino:avr:leonardo": STK500_CONFIG,
  "arduino:avr:micro": STK500_CONFIG,

  // Renesas boards - BOSSA
  "arduino:renesas_uno:unor4wifi": BOSSA_RENESAS_CONFIG,
  "arduino:renesas_uno:minima": BOSSA_RENESAS_CONFIG,
  "arduino:renesas_uno:unor4minima": BOSSA_RENESAS_CONFIG,

  // SAMD boards - also BOSSA but different variant
  "arduino:samd:mkr1000": {
    ...BOSSA_RENESAS_CONFIG,
    variant: "samd21",
    memory: {
      ...BOSSA_RENESAS_CONFIG.memory,
      chunkSize: 4096,
      sketchOffset: 0x2000,
    },
  },
  "arduino:samd:nano_33_iot": {
    ...BOSSA_RENESAS_CONFIG,
    variant: "samd21",
    memory: {
      ...BOSSA_RENESAS_CONFIG.memory,
      chunkSize: 4096,
      sketchOffset: 0x2000,
    },
  },

  // mbed boards - BOSSA variant
  "arduino:mbed_nano:nano33ble": BOSSA_RENESAS_CONFIG,
  "arduino:mbed_nano:nanorp2040connect": BOSSA_RENESAS_CONFIG,
  "arduino:mbed_portenta:envie_m7": BOSSA_RENESAS_CONFIG,
};

/**
 * Get protocol configuration for a board
 * @param {string} fqbn - Fully Qualified Board Name
 * @returns {Object} Protocol configuration
 */
export function getProtocolConfig(fqbn) {
  if (!fqbn) return null;

  // Direct match
  if (BOARD_PROTOCOL_MAP[fqbn]) {
    return BOARD_PROTOCOL_MAP[fqbn];
  }

  // Partial match (e.g., "arduino:avr" matches "arduino:avr:uno")
  for (const [key, config] of Object.entries(BOARD_PROTOCOL_MAP)) {
    if (fqbn.startsWith(key.split(":").slice(0, 2).join(":"))) {
      return config;
    }
  }

  return null;
}

/**
 * Get protocol type for a board
 * @param {string} fqbn - Fully Qualified Board Name
 * @returns {string} Protocol type
 */
export function getProtocolType(fqbn) {
  const config = getProtocolConfig(fqbn);
  return config?.protocol || PROTOCOL_TYPES.UNKNOWN;
}

/**
 * Get chunk size for a board's protocol
 * @param {string} fqbn - Fully Qualified Board Name
 * @returns {number} Chunk size in bytes
 */
export function getChunkSize(fqbn) {
  const config = getProtocolConfig(fqbn);
  if (!config) return 2048; // Fallback

  // Use chunkSize if available, otherwise pageSize
  return config.memory?.chunkSize || config.memory?.pageSize || 2048;
}

/**
 * Get page size for a board's protocol
 * @param {string} fqbn - Fully Qualified Board Name
 * @returns {number} Page size in bytes
 */
export function getPageSize(fqbn) {
  const config = getProtocolConfig(fqbn);
  return config?.memory?.pageSize || 128;
}

/**
 * Get upload baud rate for a board
 * @param {string} fqbn - Fully Qualified Board Name
 * @returns {number} Baud rate
 */
export function getUploadBaudRate(fqbn) {
  const config = getProtocolConfig(fqbn);
  return config?.serial?.baudUpload || 115200;
}

/**
 * Check if board uses 1200 baud touch for bootloader entry
 * @param {string} fqbn - Fully Qualified Board Name
 * @returns {boolean}
 */
export function uses1200BaudTouch(fqbn) {
  const config = getProtocolConfig(fqbn);
  return config?.serial?.baudTouch === 1200;
}

export default {
  PROTOCOL_TYPES,
  STK500_CONFIG,
  BOSSA_RENESAS_CONFIG,
  BOARD_PROTOCOL_MAP,
  getProtocolConfig,
  getProtocolType,
  getChunkSize,
  getPageSize,
  getUploadBaudRate,
  uses1200BaudTouch,
};

// Convenience aliases for shorter imports
export const STK500 = STK500_CONFIG;
export const BOSSA_RENESAS = BOSSA_RENESAS_CONFIG;
