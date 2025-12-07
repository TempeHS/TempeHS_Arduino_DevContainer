/**
 * STK500 Protocol Implementation
 *
 * Low-level implementation of the STK500 protocol for AVR programming:
 * - Synchronization with bootloader
 * - Programming mode management
 * - Page-based flash writing
 * - Intel HEX file parsing
 *
 * Compatible with ATmega328P (Arduino Uno R3) and similar AVR microcontrollers.
 *
 * @module client/services/protocols/STK500
 */

import { UploadLogger } from "../utils/UploadLogger.js";

// =============================================================================
// STK500 Protocol Constants
// =============================================================================

/** @constant {number} STK_GET_SYNC - Synchronization command */
const STK_GET_SYNC = 0x30;

/** @constant {number} STK_ENTER_PROGMODE - Enter programming mode command */
const STK_ENTER_PROGMODE = 0x50;

/** @constant {number} STK_LEAVE_PROGMODE - Leave programming mode command */
const STK_LEAVE_PROGMODE = 0x51;

/** @constant {number} STK_LOAD_ADDRESS - Load address command */
const STK_LOAD_ADDRESS = 0x55;

/** @constant {number} STK_PROG_PAGE - Program page command */
const STK_PROG_PAGE = 0x64;

/** @constant {number} CRC_EOP - End of packet marker */
const CRC_EOP = 0x20;

/** @constant {number} STK_INSYNC - In sync response byte */
const STK_INSYNC = 0x14;

/** @constant {number} STK_OK - OK response byte */
const STK_OK = 0x10;

/** @constant {number} FLASH_MEMORY_TYPE - Flash memory type identifier ('F') */
const FLASH_MEMORY_TYPE = 0x46;

/** @constant {number} DEFAULT_TIMEOUT_MS - Default receive timeout */
const DEFAULT_TIMEOUT_MS = 1000;

/** @constant {number} SYNC_WINDOW_MS - Time window for sync detection */
const SYNC_WINDOW_MS = 200;

/** @constant {number} SYNC_RETRY_DELAY_MS - Delay between sync attempts */
const SYNC_RETRY_DELAY_MS = 100;

/** @constant {number} ATMEGA328P_PAGE_SIZE - Page size for ATmega328P */
const ATMEGA328P_PAGE_SIZE = 128;

/** @constant {number} MAX_MEMORY_SIZE - Maximum memory buffer size (32KB) */
const MAX_MEMORY_SIZE = 32 * 1024;

// =============================================================================
// STK500Protocol Class
// =============================================================================

/**
 * STK500 protocol handler for AVR programming
 */
export class STK500Protocol {
  /**
   * Create a new STK500Protocol instance
   * @param {SerialPort} port - WebSerial port instance
   * @param {Function} [logger] - Logging function
   */
  constructor(port, logger) {
    /** @type {SerialPort} */
    this.port = port;

    /** @type {Function} */
    this.logger = logger || new UploadLogger("STK500").getLogFunction();

    /** @type {ReadableStreamDefaultReader|null} */
    this.reader = null;

    /** @type {WritableStreamDefaultWriter|null} */
    this.writer = null;

    /** @type {boolean} Enable debug logging */
    this.debug = true;
  }

  /**
   * Log a message if debug is enabled
   * @param {string} msg - Message to log
   * @private
   */
  log(msg) {
    if (this.debug) this.logger(msg);
  }

  /**
   * Connect to the serial port for programming
   * @returns {Promise<void>}
   */
  async connect() {
    this.writer = this.port.writable.getWriter();
    this.reader = this.port.readable.getReader();
  }

  /**
   * Disconnect from the serial port
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.writer) {
      this.writer.releaseLock();
      this.writer = null;
    }
    if (this.reader) {
      this.reader.releaseLock();
      this.reader = null;
    }
  }

  /**
   * Send data to the bootloader
   * @param {number[]} data - Byte array to send
   * @returns {Promise<void>}
   * @private
   */
  async send(data) {
    const uint8 = new Uint8Array(data);
    const hex = Array.from(uint8)
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join(" ");
    this.log(`TX: ${hex}`);
    await this.writer.write(uint8);
  }

  /**
   * Receive data from the bootloader
   * @param {number} length - Number of bytes to receive
   * @param {number} [timeout=1000] - Timeout in milliseconds
   * @returns {Promise<Uint8Array>} Received data
   * @throws {Error} On timeout or port closed
   * @private
   */
  async receive(length, timeout = DEFAULT_TIMEOUT_MS) {
    const buffer = new Uint8Array(length);
    let offset = 0;
    const start = Date.now();

    while (offset < length) {
      if (Date.now() - start > timeout) {
        this.log(`Timeout waiting for ${length} bytes, got ${offset}`);
        throw new Error("Timeout receiving data");
      }

      const { value, done } = await this.reader.read();
      if (done) throw new Error("Port closed");

      if (value) {
        const hex = Array.from(value)
          .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
          .join(" ");
        this.log(`RX: ${hex}`);

        for (let i = 0; i < value.length && offset < length; i++) {
          buffer[offset++] = value[i];
        }
      }
    }
    return buffer;
  }

  /**
   * Synchronize with the bootloader
   * @param {number} [attempts=5] - Number of sync attempts
   * @returns {Promise<boolean>} True when synchronized
   * @throws {Error} If sync fails after all attempts
   */
  async sync(attempts = 5) {
    for (let i = 0; i < attempts; i++) {
      try {
        this.log(`Sync attempt ${i + 1}...`);
        await this.send([STK_GET_SYNC, CRC_EOP]);

        // Try to find STK_INSYNC + STK_OK in the stream
        const start = Date.now();
        let state = 0; // 0: waiting for STK_INSYNC, 1: waiting for STK_OK

        while (Date.now() - start < SYNC_WINDOW_MS) {
          const { value, done } = await this.reader.read();
          if (done) throw new Error("Port closed");

          if (value) {
            const hex = Array.from(value)
              .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
              .join(" ");
            this.log(`RX (sync): ${hex}`);

            for (const byte of value) {
              if (state === 0) {
                if (byte === STK_INSYNC) state = 1;
              } else if (state === 1) {
                if (byte === STK_OK) {
                  this.log("Synced!");
                  return true;
                } else {
                  // Reset state, check if this byte starts new sequence
                  if (byte === STK_INSYNC) state = 1;
                  else state = 0;
                }
              }
            }
          }
        }
        this.log("Sync timed out window");
      } catch (e) {
        this.log(`Sync attempt failed: ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, SYNC_RETRY_DELAY_MS));
    }
    throw new Error("Failed to sync");
  }

  /**
   * Enter programming mode
   * @returns {Promise<void>}
   * @throws {Error} If entering programming mode fails
   */
  async enterProgMode() {
    this.log("Entering programming mode...");
    await this.send([STK_ENTER_PROGMODE, CRC_EOP]);
    const resp = await this.receive(2);
    if (resp[0] !== STK_INSYNC || resp[1] !== STK_OK)
      throw new Error(
        `Failed to enter prog mode. Got: ${resp[0].toString(
          16
        )} ${resp[1].toString(16)}`
      );
  }

  /**
   * Leave programming mode
   * @returns {Promise<void>}
   * @throws {Error} If leaving programming mode fails
   */
  async leaveProgMode() {
    this.log("Leaving programming mode...");
    await this.send([STK_LEAVE_PROGMODE, CRC_EOP]);
    const resp = await this.receive(2);
    if (resp[0] !== STK_INSYNC || resp[1] !== STK_OK)
      throw new Error("Failed to leave prog mode");
  }

  /**
   * Load an address for subsequent operations
   * @param {number} addr - Word address to load
   * @returns {Promise<void>}
   * @throws {Error} If address load fails
   * @private
   */
  async loadAddress(addr) {
    const low = addr & 0xff;
    const high = (addr >> 8) & 0xff;
    await this.send([STK_LOAD_ADDRESS, low, high, CRC_EOP]);
    const resp = await this.receive(2);
    if (resp[0] !== STK_INSYNC || resp[1] !== STK_OK)
      throw new Error("Failed to load address");
  }

  /**
   * Program a page of flash memory
   * @param {Uint8Array} data - Page data to program
   * @returns {Promise<void>}
   * @throws {Error} If page programming fails
   * @private
   */
  async progPage(data) {
    const blockSize = data.length;
    const high = (blockSize >> 8) & 0xff;
    const low = blockSize & 0xff;

    const cmd = new Uint8Array(5 + blockSize);
    cmd[0] = STK_PROG_PAGE;
    cmd[1] = high;
    cmd[2] = low;
    cmd[3] = FLASH_MEMORY_TYPE;
    cmd.set(data, 4);
    cmd[4 + blockSize] = CRC_EOP;

    await this.send(cmd);
    const resp = await this.receive(2);
    if (resp[0] !== STK_INSYNC || resp[1] !== STK_OK)
      throw new Error("Failed to program page");
  }

  /**
   * Flash a hex file to the device
   * @param {string} hexString - Intel HEX format firmware
   * @param {Function} [progressCallback] - Progress callback (percent, status)
   * @returns {Promise<void>}
   */
  async flashHex(hexString, progressCallback) {
    const data = this.parseHex(hexString);
    const pageSize = ATMEGA328P_PAGE_SIZE;
    const totalBytes = data.length;

    this.log(`Flashing ${totalBytes} bytes...`);

    await this.connect();

    try {
      if (progressCallback) progressCallback(0, "Syncing...");
      await this.sync(20);

      if (progressCallback) progressCallback(0, "Entering Programming Mode...");
      await this.enterProgMode();

      let pageAddr = 0;
      for (let addr = 0; addr < totalBytes; addr += pageSize) {
        const chunk = data.subarray(
          addr,
          Math.min(addr + pageSize, totalBytes)
        );

        // Load Address (Word address)
        await this.loadAddress(pageAddr >> 1);

        // Write Page
        await this.progPage(chunk);

        pageAddr += chunk.length;

        if (progressCallback) {
          progressCallback(Math.round((addr / totalBytes) * 100), "Flashing");
        }
      }

      if (progressCallback) progressCallback(100, "Finalizing...");
      await this.leaveProgMode();
      this.log("Flash complete!");
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Parse Intel HEX format string into binary data
   * @param {string} hex - Intel HEX format string
   * @returns {Uint8Array} Binary data
   * @private
   */
  parseHex(hex) {
    const lines = hex.split("\n");
    const memory = new Uint8Array(MAX_MEMORY_SIZE);
    let maxAddr = 0;

    for (const line of lines) {
      if (!line.startsWith(":")) continue;
      const len = parseInt(line.substr(1, 2), 16);
      const addr = parseInt(line.substr(3, 4), 16);
      const type = parseInt(line.substr(7, 2), 16);

      if (type === 0) {
        // Data record
        for (let i = 0; i < len; i++) {
          const byte = parseInt(line.substr(9 + i * 2, 2), 16);
          memory[addr + i] = byte;
        }
        if (addr + len > maxAddr) maxAddr = addr + len;
      }
    }

    return memory.subarray(0, maxAddr);
  }
}
