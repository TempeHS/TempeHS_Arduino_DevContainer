/**
 * AVR Upload Strategy
 *
 * Upload strategy for AVR-based Arduino boards using STK500 protocol:
 * - Arduino Uno R3
 * - Arduino Nano
 * - Arduino Mega
 * - Other ATmega-based boards
 *
 * Uses DTR reset sequence to enter bootloader mode.
 *
 * @module client/services/strategies/AVRStrategy
 */

import { STK500Protocol } from "../protocols/STK500.js";
import { UploadLogger } from "../utils/UploadLogger.js";

// =============================================================================
// Constants
// =============================================================================

/** @constant {number} RESET_PULSE_MS - Time for reset circuit to respond */
const RESET_PULSE_MS = 100;

/** @constant {number} BOOTLOADER_INIT_MS - Time for bootloader initialization */
const BOOTLOADER_INIT_MS = 100;

// =============================================================================
// AVRStrategy Class
// =============================================================================

/**
 * Upload strategy for AVR-based Arduino boards
 * @implements {UploadStrategy}
 */
export class AVRStrategy {
  /**
   * Create a new AVRStrategy instance
   */
  constructor() {
    /** @type {string} Human-readable strategy name */
    this.name = "AVR (STK500)";

    /** @type {UploadLogger} Logger instance */
    this.log = new UploadLogger("AVR");
  }

  /**
   * Prepare the board for upload by triggering bootloader mode
   * @param {SerialPort} port - WebSerial port instance
   * @returns {Promise<void>}
   */
  async prepare(port) {
    this.log.section("PREPARE: Entering Bootloader Mode");

    const info = port.getInfo();
    this.log.device(
      info.usbVendorId,
      info.usbProductId,
      "AVR-based board (Uno R3, Nano, Mega, etc.)"
    );

    this.log.info("Triggering board reset via DTR toggle");
    this.log.signal(
      "DTR",
      false,
      "Pull DTR LOW to trigger hardware reset on AVR boards"
    );
    await port.setSignals({ dataTerminalReady: false });

    this.log.wait(RESET_PULSE_MS, "Allow reset circuit to respond");
    await new Promise((r) => setTimeout(r, RESET_PULSE_MS));

    this.log.signal(
      "DTR",
      true,
      "Release DTR - board enters bootloader for ~1 second"
    );
    await port.setSignals({ dataTerminalReady: true });

    this.log.wait(BOOTLOADER_INIT_MS, "Wait for bootloader to initialize");
    await new Promise((r) => setTimeout(r, BOOTLOADER_INIT_MS));

    this.log.success("Reset sequence complete - bootloader should be active");
  }

  /**
   * Flash firmware to the board using STK500 protocol
   * @param {SerialPort} port - WebSerial port instance
   * @param {ArrayBuffer} data - Intel HEX firmware data
   * @param {Function} [progressCallback] - Progress callback (percent, status)
   * @returns {Promise<void>}
   */
  async flash(port, data, progressCallback) {
    this.log.section("FLASH: Uploading Firmware via STK500 Protocol");

    // data is ArrayBuffer, convert to string for STK500 (Intel Hex)
    const decoder = new TextDecoder();
    const hexString = decoder.decode(data);

    this.log.info(`Firmware size: ${data.byteLength} bytes (Intel HEX format)`);
    this.log.info("STK500 protocol used by AVR bootloaders (optiboot, etc.)");

    const flasher = new STK500Protocol(port, this.log.getLogFunction());
    await flasher.flashHex(hexString, progressCallback);

    this.log.success("Firmware upload complete!");
  }
}
