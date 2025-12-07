/**
 * Serial Manager Service
 *
 * Manages serial communication with Arduino devices:
 * - Connect/disconnect via WebSerial API
 * - Data buffering and line parsing
 * - Baud rate detection/scanning
 * - Pause/resume for upload operations
 *
 * @module client/services/SerialManager
 */

import { WebSerialProvider } from "../providers/WebSerialProvider.js";

// =============================================================================
// Constants
// =============================================================================

/** Common baud rates to scan, ordered by prevalence in Arduino projects */
const COMMON_BAUD_RATES = [
  115200, 9600, 57600, 38400, 19200, 74880, 230400, 250000,
];

/** Minimum percentage of printable ASCII characters for valid data detection */
const ASCII_THRESHOLD = 0.8;

/** Delay in ms between baud rate scan attempts */
const BAUD_DETECT_DELAY_MS = 500;

/** Minimum bytes needed to determine if data is valid ASCII */
const MIN_BYTES_FOR_DETECTION = 5;

// =============================================================================
// SerialManager Class
// =============================================================================

/**
 * Manages serial communication with Arduino devices
 */
export class SerialManager {
  constructor() {
    /** @type {WebSerialProvider} */
    this.provider = new WebSerialProvider();
    /** @type {string} */
    this.buffer = "";
    /** @type {boolean} */
    this.paused = false;
    /** @type {boolean} */
    this.baudDetectionActive = false;
    /** @type {{line: Function[], baudDetected: Function[]}} */
    this.listeners = {
      line: [],
      baudDetected: [],
    };

    this.provider.on("data", (chunk) => {
      this.handleData(chunk);
    });
  }

  /**
   * Connect to a serial port
   * @param {number} baudRate - Baud rate for connection
   * @param {SerialPort|null} port - Optional port to connect to
   * @returns {Promise<boolean>}
   */
  async connect(baudRate, port = null) {
    return await this.provider.connect(baudRate, port);
  }

  /**
   * Disconnect from the serial port
   * @returns {Promise<void>}
   */
  async disconnect() {
    this.baudDetectionActive = false;
    return await this.provider.disconnect();
  }

  /**
   * Write data to the serial port
   * @param {string} data - Data to write
   * @returns {Promise<void>}
   */
  async write(data) {
    return await this.provider.write(data);
  }

  /**
   * Set control signals (DTR, RTS)
   * @param {object} signals - Signal states
   * @returns {Promise<void>}
   */
  async setSignals(signals) {
    return await this.provider.setSignals(signals);
  }

  /**
   * Pause serial data processing. Data is still received but not emitted.
   * Used during compile/upload to avoid garbled output in the terminal.
   */
  pause() {
    this.paused = true;
    this.buffer = "";
  }

  /**
   * Resume serial data processing after pause.
   */
  resume() {
    this.paused = false;
  }

  /**
   * Check if a string appears to be valid ASCII text (not garbled baud mismatch data).
   * @param {string} data - The string to check
   * @returns {boolean} - true if data looks like valid ASCII
   */
  isAsciiData(data) {
    if (!data || data.length === 0) return false;

    let printableCount = 0;
    let totalCount = 0;

    for (const char of data) {
      totalCount++;
      const code = char.charCodeAt(0);
      // Printable ASCII: 0x20-0x7E, plus newline (0x0A), carriage return (0x0D), tab (0x09)
      if (
        (code >= 0x20 && code <= 0x7e) ||
        code === 0x0a ||
        code === 0x0d ||
        code === 0x09
      ) {
        printableCount++;
      }
    }

    return totalCount > 0 && printableCount / totalCount > ASCII_THRESHOLD;
  }

  /**
   * Start background baud rate detection. Will scan common baud rates
   * and emit 'baudDetected' when valid ASCII data is received.
   * @param {number} currentBaud - The current baud rate to start from
   * @param {function} onStatusUpdate - Optional callback for status updates
   * @returns {Promise<number|null>} - The detected baud rate, or null if detection failed
   */
  async startBaudDetection(currentBaud, onStatusUpdate = null) {
    if (this.baudDetectionActive) {
      return null; // Already detecting
    }

    this.baudDetectionActive = true;
    const startIndex = COMMON_BAUD_RATES.indexOf(currentBaud);
    const baudsToTry =
      startIndex >= 0
        ? [
            ...COMMON_BAUD_RATES.slice(startIndex + 1),
            ...COMMON_BAUD_RATES.slice(0, startIndex),
          ]
        : COMMON_BAUD_RATES;

    if (onStatusUpdate) {
      onStatusUpdate(`Baud detection: checking ${baudsToTry.length} rates...`);
    }

    for (const baud of baudsToTry) {
      if (!this.baudDetectionActive) {
        break; // Detection was cancelled
      }

      if (onStatusUpdate) {
        onStatusUpdate(`Trying ${baud} baud...`);
      }

      // Reopen port at new baud rate
      const success = await this.provider.reopenAtBaud(baud);
      if (!success) {
        continue;
      }

      // Wait briefly for data to arrive
      await new Promise((r) => setTimeout(r, 500));

      // Check if we received valid ASCII data
      if (this.buffer.length > 5 && this.isAsciiData(this.buffer)) {
        this.baudDetectionActive = false;
        this.emit("baudDetected", baud);
        return baud;
      }

      // Clear buffer for next attempt
      this.buffer = "";
    }

    this.baudDetectionActive = false;
    return null;
  }

  /**
   * Cancel any active baud detection scan.
   */
  cancelBaudDetection() {
    this.baudDetectionActive = false;
  }

  handleData(chunk) {
    // When paused, discard incoming data
    if (this.paused) {
      return;
    }

    this.buffer += chunk;
    const lines = this.buffer.split("\n");

    // Process all complete lines
    while (lines.length > 1) {
      const line = lines.shift();
      this.emit("line", line);
    }

    // Keep the last partial line in buffer
    this.buffer = lines[0];
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }
}
