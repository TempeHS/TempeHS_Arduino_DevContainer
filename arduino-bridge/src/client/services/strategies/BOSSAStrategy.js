/**
 * BOSSA Upload Strategy
 *
 * Upload strategy for Renesas/SAMD-based Arduino boards using SAM-BA protocol:
 * - Arduino Uno R4 WiFi
 * - Arduino Uno R4 Minima
 * - Arduino Nano R4
 * - Other Renesas RA4M1 and SAMD-based boards
 *
 * Uses 1200 baud touch sequence to enter bootloader mode.
 *
 * BOOTLOADER ENTRY: Works reliably via 1200 baud touch
 * =======================================================
 * The 1200 baud touch sequence successfully triggers bootloader mode:
 *   1. Open port at 1200 baud with DTR=1, RTS=1
 *   2. Toggle DTR=0 to trigger reset
 *   3. Close port and wait ~500ms for RA4M1 to enter bootloader
 *   4. Reconnect at 230400 baud for BOSSA protocol
 *
 * PROTOCOL: SAM-BA Extended (BOSSA)
 * ==================================
 * - Baud rate: From config (230400 for Renesas)
 * - Commands: N#, V#, S#, Y#, G# (see Bossa.js for details)
 * - Flash offset: From config (0x4000 for Renesas)
 * - Chunk size: From config (4096 bytes - MUST match Wireshark capture!)
 *
 * SOURCE OF TRUTH:
 * @see config/boardProtocols.js - Protocol configuration
 * @see protocols/bossa-renesas.yaml - YAML definition
 * @see https://github.com/arduino/arduino-renesas-bootloader/blob/main/src/bossa.c
 *
 * @module client/services/strategies/BOSSAStrategy
 */

import { BossaProtocol } from "../protocols/Bossa.js";
import {
  BOSSA_RENESAS_CONFIG,
  getProtocolConfig,
  getChunkSize,
} from "../../config/boardProtocols.js";
import { UploadLogger } from "../utils/UploadLogger.js";

// =============================================================================
// BOSSAStrategy Class
// =============================================================================

/**
 * Upload strategy for BOSSA/SAM-BA protocol boards
 * @implements {UploadStrategy}
 */
export class BOSSAStrategy {
  /**
   * Create a new BOSSAStrategy instance
   */
  constructor() {
    /** @type {string} Human-readable strategy name */
    this.name = "BOSSA/SAM-BA";

    /** @type {UploadLogger} Logger instance */
    this.log = new UploadLogger("BOSSA");

    // Load configuration from centralized config (matches YAML protocol files)
    /** @type {Object} Protocol configuration */
    this.config = BOSSA_RENESAS_CONFIG;

    // Serial configuration from config
    this.PRIMARY_BAUD = this.config.serial.baudUpload; // 230400
    this.TOUCH_BAUD = this.config.serial.baudTouch; // 1200

    // Fallback baud rates if primary doesn't work
    this.ALL_BAUD_RATES = [
      this.PRIMARY_BAUD,
      115200,
      921600,
      460800,
      57600,
      38400,
      19200,
      9600,
    ];
  }

  /**
   * Safely close port, releasing any locked streams
   */
  async safeClose(port) {
    try {
      if (port.readable && port.readable.locked) {
        try {
          const reader = port.readable.getReader();
          await reader.cancel();
          reader.releaseLock();
        } catch (e) {
          /* ignore */
        }
      }
      if (port.writable && port.writable.locked) {
        try {
          const writer = port.writable.getWriter();
          writer.releaseLock();
        } catch (e) {
          /* ignore */
        }
      }
      if (port.readable || port.writable) {
        await port.close();
      }
    } catch (e) {
      this.log.warn(`Port close warning: ${e.message}`);
    }
    // Wait for OS to release
    await new Promise((r) => setTimeout(r, 100));
  }

  /**
   * Perform the 1200 baud touch sequence to enter bootloader mode
   *
   * From USB capture (R4.pcapng):
   *   Frame 2589: SET_LINE_CODING = 1200
   *   Frame 2593: SET_CONTROL_LINE_STATE = DTR=1, RTS=1
   *   Frame 2595: SET_LINE_CODING = 1200 (again!)
   *   Frame 2601: SET_CONTROL_LINE_STATE = DTR=0, RTS=1
   *   (wait ~500ms)
   */
  async perform1200Touch(port) {
    this.log.section("1200 BAUD TOUCH SEQUENCE");
    this.log.info("Matching exact USB capture sequence (R4.pcapng)");

    await this.safeClose(port);

    // Step 1: First SET_LINE_CODING at 1200 baud
    this.log.serialConfig(
      this.TOUCH_BAUD,
      "First SET_LINE_CODING - open at 1200 baud"
    );
    await port.open({ baudRate: this.TOUCH_BAUD });

    // Step 2: SET_CONTROL_LINE_STATE = DTR=1, RTS=1 (0x0003)
    this.log.signal("DTR", true, "SET_CONTROL_LINE_STATE = 0x0003");
    this.log.signal("RTS", true, "Both control lines HIGH");
    await port.setSignals({ dataTerminalReady: true, requestToSend: true });

    // Step 3: Second SET_LINE_CODING at 1200 (close and reopen to force)
    this.log.info("Forcing second SET_LINE_CODING by close/reopen");
    await port.close();
    await new Promise((r) => setTimeout(r, 10));
    await port.open({ baudRate: this.TOUCH_BAUD });

    // Step 4: SET_CONTROL_LINE_STATE = DTR=0, RTS=1 (0x0002) - triggers reset
    this.log.signal("DTR", false, "DTR LOW triggers reset on R4 boards");
    this.log.signal("RTS", true, "RTS stays HIGH");
    await port.setSignals({ dataTerminalReady: false, requestToSend: true });

    // Close port
    this.log.info("Closing port after touch sequence");
    await port.close();

    // Wait ~500ms for device reset (matching USB capture timing)
    this.log.wait(500, "Wait for RA4M1 to reset and enter SAM-BA bootloader");
    await new Promise((r) => setTimeout(r, 500));

    this.log.success(
      "1200 baud touch complete - device should be in bootloader mode"
    );
  }

  /**
   * Fast baud rate probe - returns immediately on ASCII data, or when enough
   * data received to determine it's garbage (wrong baud)
   *
   * @returns { result: 'ascii'|'garbage'|'timeout', bossa?, bytes? }
   */
  async fastProbe(port, baudRate, timeoutMs = 2000) {
    this.log.info(`Probing at ${baudRate} baud (${timeoutMs}ms timeout)...`);

    try {
      await this.safeClose(port);
      await port.open({ baudRate: baudRate });
      await port.setSignals({ dataTerminalReady: true, requestToSend: true });
      await new Promise((r) => setTimeout(r, 50));

      const bossa = new BossaProtocol(port);
      await bossa.connect();

      // Send N# to trigger response
      this.log.command(
        "N#",
        "Query bootloader - expects ASCII response if correct baud rate"
      );
      await bossa.writeCommand("N#");

      // Wait for data with early exit
      const collected = [];
      const startTime = Date.now();

      while (Date.now() - startTime < timeoutMs) {
        const remaining = timeoutMs - (Date.now() - startTime);
        const waitTime = Math.min(remaining, 30);

        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ timeout: true }), waitTime)
        );

        const readResult = await Promise.race([
          bossa.reader.read(),
          timeoutPromise,
        ]);

        if (readResult.timeout) {
          // Check if we have enough data to decide
          if (collected.length >= 3) {
            const isAscii = this.isValidAsciiResponse(
              new Uint8Array(collected)
            );
            if (isAscii) {
              this.log.success(`ASCII data detected at ${baudRate} baud!`);
              return {
                result: "ascii",
                bossa,
                bytes: new Uint8Array(collected),
              };
            } else {
              this.log.warn(`Garbage data at ${baudRate} - wrong baud rate`);
              await bossa.disconnect();
              await this.safeClose(port);
              return { result: "garbage", bytes: new Uint8Array(collected) };
            }
          }
          continue;
        }

        const { value, done } = readResult;
        if (done) break;

        if (value && value.length) {
          // Log received data
          this.log.rx(
            `Probe response (${value.length} bytes)`,
            value,
            `Testing if data is valid ASCII at ${baudRate} baud`
          );

          collected.push(...value);

          // As soon as we have enough bytes, check if ASCII
          if (collected.length >= 2) {
            const isAscii = this.isValidAsciiResponse(
              new Uint8Array(collected)
            );
            if (isAscii) {
              // ASCII! This is the right baud rate - return immediately
              this.log.success(
                `ASCII data confirmed at ${baudRate} baud (${collected.length} bytes)`
              );
              return {
                result: "ascii",
                bossa,
                bytes: new Uint8Array(collected),
              };
            } else if (collected.length >= 4) {
              // Got enough garbage data - wrong baud rate, exit early
              this.log.warn(
                `Garbage data at ${baudRate} - wrong baud rate (${collected.length} bytes)`
              );
              await bossa.disconnect();
              await this.safeClose(port);
              return { result: "garbage", bytes: new Uint8Array(collected) };
            }
          }
        }
      }

      // Timeout with no data
      if (collected.length === 0) {
        this.log.warn(`No response at ${baudRate} baud (timeout)`);
        await bossa.disconnect();
        await this.safeClose(port);
        return { result: "timeout" };
      }

      // Had some data but not enough to decide - check what we got
      const isAscii = this.isValidAsciiResponse(new Uint8Array(collected));
      if (isAscii) {
        return { result: "ascii", bossa, bytes: new Uint8Array(collected) };
      } else {
        await bossa.disconnect();
        await this.safeClose(port);
        return { result: "garbage", bytes: new Uint8Array(collected) };
      }
    } catch (e) {
      this.log.error(`Error probing at ${baudRate}`, e);
      await this.safeClose(port);
      return { result: "timeout" };
    }
  }

  /**
   * Complete handshake after successful probe
   */
  async completeHandshake(bossa, baudRate) {
    try {
      // Reconnect reader
      bossa.reader.releaseLock();
      bossa.reader = bossa.port.readable.getReader();

      // Send V# to get version
      this.log.command("V#", "Request bootloader version string");
      await bossa.writeCommand("V#");

      const collected = [];
      const startTime = Date.now();

      while (Date.now() - startTime < 1000) {
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ timeout: true }), 50)
        );
        const result = await Promise.race([
          bossa.reader.read(),
          timeoutPromise,
        ]);

        if (result.timeout) {
          if (collected.length > 0) break;
          continue;
        }

        const { value, done } = result;
        if (done) break;
        if (value && value.length) {
          collected.push(...value);
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      if (collected.length > 0) {
        const version = Array.from(collected)
          .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : ""))
          .join("")
          .trim();
        this.log.success(`Bootloader version: ${version}`);
        return { success: true, version };
      }

      this.log.info(`Connected at ${baudRate} baud (no version string)`);
      return { success: true, version: `Connected at ${baudRate}` };
    } catch (e) {
      this.log.warn(`Handshake warning: ${e.message}`);
      return { success: true, version: `Connected at ${baudRate}` };
    }
  }

  /**
   * Check if response bytes look like valid ASCII text
   * Valid responses should have mostly printable ASCII characters
   */
  isValidAsciiResponse(bytes) {
    if (!bytes || bytes.length === 0) return false;

    let printableCount = 0;
    for (const b of bytes) {
      // Printable ASCII (space to ~) plus common control chars (CR, LF)
      if ((b >= 0x20 && b <= 0x7e) || b === 0x0a || b === 0x0d) {
        printableCount++;
      }
    }

    // At least 70% should be printable ASCII for it to be valid
    const ratio = printableCount / bytes.length;
    return ratio >= 0.7;
  }

  /**
   * Ultra-fast baud rate detection:
   * 1. Try PRIMARY_BAUD (115200) for up to 2 seconds
   *    - If ASCII data received -> return immediately (success!)
   *    - If garbage data received -> try all baud rates with short timeouts
   *    - If no data after 2 seconds -> return (needs manual reset)
   * 2. When trying all baud rates, only wait long enough to get data and decide
   */
  async fastBaudProbe(port) {
    this.log.section("BAUD RATE DETECTION");
    this.log.info(`Primary baud rate: ${this.PRIMARY_BAUD}`);
    this.log.info("Will probe for valid ASCII response from bootloader");

    // Step 1: Try primary baud (115200) with full timeout
    const primaryResult = await this.fastProbe(port, this.PRIMARY_BAUD, 2000);

    if (primaryResult.result === "ascii") {
      // Success! Complete handshake and return
      await this.completeHandshake(primaryResult.bossa, this.PRIMARY_BAUD);
      return {
        success: true,
        bossa: primaryResult.bossa,
        baudRate: this.PRIMARY_BAUD,
      };
    }

    if (primaryResult.result === "timeout") {
      // No response at all - device probably not in bootloader mode
      this.log.warn(
        "No response at primary baud - device may need manual reset"
      );
      return { success: false, needsManualReset: true, reason: "no_response" };
    }

    // Got garbage - device is responding but at different baud rate
    this.log.info("Got response but wrong baud rate - scanning all rates...");

    // Step 2: Try all baud rates with short timeouts (just need enough data to decide)
    for (const baudRate of this.ALL_BAUD_RATES) {
      if (baudRate === this.PRIMARY_BAUD) continue; // Already tried

      // Short timeout since we just need enough data to determine ASCII vs garbage
      const result = await this.fastProbe(port, baudRate, 500);

      if (result.result === "ascii") {
        // Found it!
        await this.completeHandshake(result.bossa, baudRate);
        return { success: true, bossa: result.bossa, baudRate };
      }

      // If timeout at this rate, continue to next (no data = not this rate)
      // If garbage, continue to next rate
    }

    // None worked
    this.log.error("No baud rate produced valid ASCII response");
    return { success: false, needsManualReset: false, reason: "no_valid_baud" };
  }

  /**
   * Wait for any data from the reader
   * Returns { gotData, bytes, hex, ascii }
   */
  async waitForAnyData(reader, timeoutMs) {
    const collected = [];
    const startTime = Date.now();
    this.log.info(`Waiting for data (${timeoutMs}ms timeout)...`);

    try {
      while (Date.now() - startTime < timeoutMs) {
        const remaining = timeoutMs - (Date.now() - startTime);
        const waitTime = Math.min(remaining, 50);

        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ timeout: true }), waitTime)
        );

        const result = await Promise.race([reader.read(), timeoutPromise]);

        if (result.timeout) {
          // If we already have some data, return it
          if (collected.length > 0) {
            break;
          }
          continue;
        }

        const { value, done } = result;
        if (done) break;

        if (value && value.length) {
          this.log.rx(`Data received (${value.length} bytes)`, value);
          collected.push(...value);
          // Got some data, wait a bit more for complete response
          await new Promise((r) => setTimeout(r, 50));
        }
      }
    } catch (e) {
      this.log.warn(`Read error: ${e.message}`);
    }

    const elapsed = Date.now() - startTime;
    if (collected.length > 0) {
      const bytes = new Uint8Array(collected);
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      const ascii = Array.from(bytes)
        .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : "."))
        .join("");
      this.log.success(`Received ${collected.length} bytes in ${elapsed}ms`);
      return { gotData: true, bytes, hex, ascii };
    }

    this.log.warn(`No data received after ${elapsed}ms`);
    return { gotData: false };
  }

  /**
   * Alias for waitForAnyData
   */
  async waitForResponse(reader, timeoutMs) {
    return this.waitForAnyData(reader, timeoutMs);
  }

  async prepare(port, fqbn) {
    this.log.section("PREPARE: Bootloader Entry for BOSSA/SAM-BA");

    const info = port.getInfo();
    const pid = info.usbProductId;
    const vid = info.usbVendorId;
    this.log.device(vid, pid, "Checking if device is in bootloader mode");

    // Check if already in bootloader mode (different PID)
    const BOOTLOADER_PIDS = [0x006d, 0x0054, 0x0057, 0x0069];
    if (pid && BOOTLOADER_PIDS.includes(pid)) {
      this.log.success("Device already in bootloader mode (detected by PID)");
      this.log.info(
        `Bootloader PID: 0x${pid.toString(16)} is a known bootloader PID`
      );
      return;
    }

    this.log.info("Device not in bootloader mode - performing 1200 baud touch");
    // Try the 1200 baud touch
    await this.perform1200Touch(port);
  }

  async flash(port, data, progressCallback, fqbn) {
    this.log.section(
      "FLASH: Uploading Firmware to R4 WiFi via SAM-BA Protocol"
    );
    this.log.info(`Firmware size: ${UploadLogger.formatSize(data.byteLength)}`);
    this.log.info(`Board FQBN: ${fqbn || "unknown"}`);

    let bossa = null;
    let workingBaud = null;

    // Try direct connection at PRIMARY_BAUD (230400 - confirmed from Wireshark)
    if (progressCallback)
      progressCallback(5, `Connecting at ${this.PRIMARY_BAUD} baud...`);

    try {
      await this.safeClose(port);

      // USB capture shows SET_LINE_CODING sent twice at 230400
      this.log.serialConfig(
        this.PRIMARY_BAUD,
        "Opening at primary baud (first SET_LINE_CODING)"
      );
      await port.open({ baudRate: this.PRIMARY_BAUD });
      await port.setSignals({ dataTerminalReady: true, requestToSend: true });

      // Force second SET_LINE_CODING by closing and reopening
      this.log.info("Forcing second SET_LINE_CODING by close/reopen");
      await port.close();
      await new Promise((r) => setTimeout(r, 10));
      await port.open({ baudRate: this.PRIMARY_BAUD });
      await port.setSignals({ dataTerminalReady: true, requestToSend: true });

      // Wait ~111ms before N# (matching USB capture)
      this.log.wait(110, "Match USB capture timing before sending N#");
      await new Promise((r) => setTimeout(r, 110));

      bossa = new BossaProtocol(port);
      await bossa.connect();

      // Send N# to verify bootloader is responding
      this.log.command(
        "N#",
        "Verify bootloader is responding (chip info query)"
      );
      await bossa.writeCommand("N#");

      // Wait for response
      const response = await this.waitForResponse(bossa.reader, 2000);

      if (response.gotData && this.isValidAsciiResponse(response.bytes)) {
        workingBaud = this.PRIMARY_BAUD;
        this.log.success(`Connected to bootloader at ${workingBaud} baud`);
        this.log.info(`Response: ${response.ascii}`);
      } else {
        this.log.warn("No valid response at primary baud rate");
        await bossa.disconnect();
        await this.safeClose(port);
      }
    } catch (e) {
      this.log.error(`Error connecting at ${this.PRIMARY_BAUD}`, e);
      await this.safeClose(port);
    }

    // If primary baud failed, try all baud rates
    if (!workingBaud) {
      this.log.info("Primary baud failed - scanning all baud rates...");
      for (const baudRate of this.ALL_BAUD_RATES) {
        if (baudRate === this.PRIMARY_BAUD) continue;

        if (progressCallback) progressCallback(5, `Trying ${baudRate} baud...`);

        try {
          await this.safeClose(port);
          this.log.serialConfig(baudRate, `Testing alternate baud rate`);
          await port.open({ baudRate });
          await port.setSignals({
            dataTerminalReady: true,
            requestToSend: true,
          });
          await new Promise((r) => setTimeout(r, 100));

          bossa = new BossaProtocol(port);
          await bossa.connect();

          this.log.command("N#", "Query bootloader at this baud rate");
          await bossa.writeCommand("N#");
          const response = await this.waitForResponse(bossa.reader, 1000);

          if (response.gotData && this.isValidAsciiResponse(response.bytes)) {
            workingBaud = baudRate;
            this.log.success(`Connected at ${workingBaud} baud`);
            break;
          } else {
            await bossa.disconnect();
            await this.safeClose(port);
          }
        } catch (e) {
          this.log.warn(`Error at ${baudRate}: ${e.message}`);
          await this.safeClose(port);
        }
      }
    }

    // If no baud rate worked, prompt user for manual reset
    if (!workingBaud) {
      this.log.section("MANUAL BOOTLOADER ENTRY REQUIRED");
      this.log.warn("Could not connect to bootloader at any baud rate");
      this.log.info("User needs to double-tap RESET button on Arduino");

      if (progressCallback) {
        progressCallback(
          0,
          "⚠️ Double-tap RESET button on Arduino, then click OK"
        );
      }

      const userConfirmed = await this.promptUserForBootloader();
      if (!userConfirmed) {
        throw new Error("Upload cancelled by user");
      }

      // Wait for board to enter bootloader and try again
      this.log.wait(1000, "Waiting for board to enter bootloader mode");
      await new Promise((r) => setTimeout(r, 1000));

      if (progressCallback)
        progressCallback(5, `Retrying at ${this.PRIMARY_BAUD}...`);

      try {
        await this.safeClose(port);
        await port.open({ baudRate: this.PRIMARY_BAUD });
        await port.setSignals({ dataTerminalReady: true, requestToSend: true });
        await new Promise((r) => setTimeout(r, 100));

        bossa = new BossaProtocol(port);
        await bossa.connect();

        this.log.command("N#", "Retry bootloader query after manual reset");
        await bossa.writeCommand("N#");
        const response = await this.waitForResponse(bossa.reader, 2000);

        if (response.gotData && this.isValidAsciiResponse(response.bytes)) {
          workingBaud = this.PRIMARY_BAUD;
          this.log.success(
            `Connected after manual reset at ${workingBaud} baud`
          );
        }
      } catch (e) {
        this.log.error("Error after manual reset", e);
      }
    }

    if (!workingBaud) {
      this.log.error("Failed to connect to bootloader at any baud rate");
      throw new Error(
        "Failed to connect to bootloader at any baud rate.\n\n" +
          "Please ensure:\n" +
          "1. Double-tap RESET quickly (LED should pulse/fade)\n" +
          "2. Click Upload within 8 seconds\n" +
          "3. The board is properly connected via USB\n\n" +
          "If the LED never pulses, try tapping RESET faster."
      );
    }

    // Now flash the firmware
    try {
      if (progressCallback) progressCallback(10, `Connected at ${workingBaud}`);

      // Reconnect reader since we consumed it during probe
      try {
        bossa.reader.releaseLock();
      } catch (e) {
        /* ignore */
      }
      bossa.reader = port.readable.getReader();

      // Determine flash offset and SRAM buffer addresses for R4
      let offset = 0x2000; // Default for SAMD
      let sramBufferA = 0x20001000; // SRAM buffer A address
      let sramBufferB = 0x20001100; // SRAM buffer B address (for double-buffering)

      // Flash offset configuration for R4 WiFi
      // User code starts at 0x4000 (bootloader occupies 0x0000-0x3FFF)
      let flashWriteOffset = offset; // Where to write firmware
      let goOffset = offset; // Where to jump for execution

      if (fqbn && fqbn.includes("renesas_uno")) {
        // R4 WiFi: Protocol discovered from Wireshark USB capture + bootloader source code
        //
        // From arduino-renesas-bootloader/src/bossa.c:
        // =============================================
        // - S command: writes to internal data_buffer[8192], addr is OFFSET into buffer
        // - Y command: copies from data_buffer to flash at SKETCH_FLASH_OFFSET + addr
        // - SKETCH_FLASH_OFFSET = 0x4000 (16KB) for non-DFU boards
        // - Flash write is blocking (interrupts disabled during R_FLASH_LP_Write)
        // - ACK "Y\n\r" sent AFTER flash write completes
        //
        // Protocol sequence from Wireshark capture:
        //   S00000034,00001000# (write 0x1000 bytes to data_buffer[0x34])
        //   Y00000034,0#        (set copyOffset = 0x34)  -> Y\n\r ACK
        //   Y00000000,00001000# (write to flash 0x4000)  -> Y\n\r ACK
        //   ...repeat for each 0x1000 chunk at 0x1000, 0x2000, 0x3000...
        //   G00004000#          (jump to user code at 0x4000)
        //
        // NOTE: Y command address 0x0000 writes to physical flash 0x4000 (bootloader adds offset)
        //
        flashWriteOffset = 0x0000; // Y command offset (bootloader adds 0x4000)
        goOffset = 0x4000; // User code entry point (G command uses absolute address)

        // SRAM buffer offset at 0x34 - offset into bootloader's data_buffer[8192]
        sramBufferA = 0x34;
        sramBufferB = 0x34; // Same buffer, no double-buffering
      }

      this.log.info("Flash memory layout (Renesas RA4M1):");
      this.log.memory(
        "FLASH_WRITE",
        flashWriteOffset,
        0,
        `Y command offset (bootloader adds 0x4000 internally → physical 0x${(
          flashWriteOffset + 0x4000
        ).toString(16)})`
      );
      this.log.info(
        `Execution entry point: ${UploadLogger.formatAddr(
          goOffset
        )} (G command uses absolute address)`
      );
      this.log.info(
        `Data buffer offset: ${UploadLogger.formatAddr(
          sramBufferA
        )} (into bootloader's data_buffer[8192])`
      );

      // Get chunk size from config (used for both padding and writing)
      const protocolConfig = getProtocolConfig(fqbn) || this.config;
      const chunkSize =
        protocolConfig.memory?.chunkSize || this.config.memory.chunkSize;

      // Pad firmware to chunk size boundary to ensure complete flash pages
      // The bootloader may have issues with partial page writes
      const originalSize = data.byteLength;
      const paddedSize = Math.ceil(originalSize / chunkSize) * chunkSize;
      const firmware = new Uint8Array(paddedSize);
      firmware.set(new Uint8Array(data), 0);
      // Fill padding with 0xFF (erased flash state)
      firmware.fill(0xff, originalSize);
      const totalBytes = firmware.length;
      this.log.info(
        `Firmware: ${originalSize} bytes → padded to ${totalBytes} bytes (${chunkSize}-byte boundary)`
      );

      // Step 1: Upload flash applet (matches Arduino IDE protocol from Wireshark)
      // The IDE uploads a 52-byte applet to data_buffer[0] before writing firmware
      // This applet is ARM Thumb code used for flash operations
      if (fqbn && fqbn.includes("renesas_uno")) {
        this.log.section("FLASH APPLET UPLOAD");
        this.log.info(
          "Uploading 52-byte ARM Thumb flash applet to data_buffer[0]"
        );
        this.log.info("This applet assists with flash write operations");
        if (progressCallback) progressCallback(10, "Uploading flash applet...");

        // Flash applet extracted from Arduino IDE Wireshark capture (R4.pcapng)
        // S00000000,00000034# followed by 52 bytes of ARM Thumb code
        const FLASH_APPLET = new Uint8Array([
          0x09,
          0x48,
          0x0a,
          0x49,
          0x0a,
          0x4a,
          0x02,
          0xe0,
          0x08,
          0xc9,
          0x08,
          0xc0,
          0x01,
          0x3a,
          0x00,
          0x2a,
          0xfa,
          0xd1,
          0x04,
          0x48,
          0x00,
          0x28,
          0x01,
          0xd1,
          0x01,
          0x48,
          0x85,
          0x46,
          0x70,
          0x47,
          0xc0,
          0x46,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00,
          0x00, // 52 bytes (0x34) total
        ]);
        this.log.command(
          "S00000000,00000034#",
          "Write 52 bytes to data_buffer[0x00] (flash applet)"
        );
        await bossa.writeBinary(0x00, FLASH_APPLET);
        this.log.success("Flash applet uploaded");

        // W# register commands from Arduino IDE (flash configuration)
        // W00000030,00000400# and W00000020,00000000#
        this.log.info("Configuring flash registers via W# commands");
        this.log.command(
          "W00000030,00000400#",
          "Write 0x400 to register at 0x30 (flash config)"
        );
        await bossa.writeWord(0x30, 0x400);
        this.log.command(
          "W00000020,00000000#",
          "Write 0x00 to register at 0x20 (flash config)"
        );
        await bossa.writeWord(0x20, 0x00);
        this.log.success("Flash registers configured");
      }

      // Step 2: Erase flash (required for R4)
      this.log.section("FLASH ERASE");
      if (progressCallback) progressCallback(12, "Erasing flash...");

      // Calculate number of pages to erase (R4 page size is 8192 bytes / 0x2000)
      const erasePageSize = 0x2000; // 8KB pages for Renesas RA4M1
      const pagesToErase = Math.ceil(totalBytes / erasePageSize);
      this.log.memory(
        "ERASE",
        flashWriteOffset + 0x4000,
        totalBytes,
        `Erase ${pagesToErase} pages (${erasePageSize} bytes per page)`
      );
      this.log.command(
        `X${flashWriteOffset.toString(16).padStart(8, "0")}#`,
        "Chip erase command - erases flash from offset to end of firmware"
      );

      // Use the chipErase method which properly waits for X command ACK
      // X command also has internal 0x4000 offset added by bootloader
      await bossa.chipErase(flashWriteOffset);
      this.log.success("Flash erased successfully");

      // Step 3: Write flash in chunks
      this.log.section("FLASH WRITE");
      //
      // SAM-BA R4 WiFi protocol (from bootloader source + Wireshark capture):
      // 1. S[buffer_offset],[size]# - Write data to bootloader's data_buffer[]
      // 2. Y[buffer_offset],0# - Set copyOffset (where to copy FROM in data_buffer)
      // 3. Y[flash_offset],[size]# - Write from data_buffer to flash
      //    (bootloader adds SKETCH_FLASH_OFFSET internally: physical_addr = 0x4000 + flash_offset)
      //
      // Chunk size already determined above from config (MUST match Wireshark capture!)
      // Renesas: 4096 bytes (0x1000) - verified in R4.pcapng
      const numChunks = Math.ceil(totalBytes / chunkSize);
      this.log.info(
        `Writing ${totalBytes} bytes in ${numChunks} chunks of ${chunkSize} bytes`
      );
      this.log.info(`Protocol variant: ${protocolConfig.variant || "default"}`);
      if (progressCallback) progressCallback(15, "Writing flash...");

      // flashAddr is the Y command flash offset (bootloader adds 0x4000)
      let flashAddr = flashWriteOffset;
      // sramBuffer is the offset into bootloader's data_buffer[8192]
      const sramBuffer = sramBufferA;

      for (let i = 0; i < totalBytes; i += chunkSize) {
        const chunkNum = Math.floor(i / chunkSize) + 1;
        const chunk = firmware.subarray(i, Math.min(i + chunkSize, totalBytes));
        const isLastChunk = i + chunkSize >= totalBytes;

        const sramHex = sramBuffer.toString(16).padStart(8, "0");
        const chunkHex = chunk.length.toString(16).padStart(8, "0");
        const flashHex = flashAddr.toString(16).padStart(8, "0");
        const physicalHex = (flashAddr + 0x4000).toString(16).padStart(8, "0");

        this.log.chunk(
          chunkNum,
          numChunks,
          flashAddr + 0x4000,
          chunk.length,
          isLastChunk
        );
        this.log.command(
          `S${sramHex},${chunkHex}#`,
          `Write ${chunk.length} bytes into bootloader data_buffer[0x${sramHex}]`
        );

        // Write to SRAM buffer, then commit to flash
        await bossa.writeBinary(sramBuffer, chunk);
        this.log.command(
          `Y${sramHex},00000000#`,
          "Set copy offset from data_buffer (bootloader uses this as source)"
        );
        this.log.command(
          `Y${flashHex},${chunkHex}#`,
          `Copy ${chunk.length} bytes from data_buffer to flash @ 0x${physicalHex}`
        );
        await bossa.writeBuffer(sramBuffer, flashAddr, chunk.length);

        flashAddr += chunk.length;

        const percent = 15 + Math.round((i / totalBytes) * 80);
        if (progressCallback)
          progressCallback(percent, `Chunk ${chunkNum}/${numChunks}`);

        // Delay between chunks - CRITICAL: IDE takes ~250ms per chunk!
        // Wireshark shows 238-261ms between 4KB chunks
        // This allows flash controller to fully commit each page
        if (isLastChunk) {
          this.log.wait(1000, "Final chunk - extended wait for flash commit");
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          this.log.wait(250, "Inter-chunk delay for flash page commit");
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }

      // Wait for flash operations to fully complete before reset
      // The Flash LP peripheral needs time to finish writing all pages
      // CRITICAL: Larger sketches need more time for flash controller to commit all writes
      // The Y# ACK only means data was received, not necessarily committed to flash
      // Using a generous 10 second wait to ensure flash is fully committed
      const waitTime = 10000;
      this.log.section("FLASH COMMIT");
      this.log.wait(
        waitTime,
        `Final flash commit wait (${numChunks} chunks, ${totalBytes} bytes)`
      );
      this.log.info(
        "Y# ACK only means data received - actual flash commit takes longer"
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      // Verify bootloader is still responsive by sending N# before reset
      this.log.info("Verifying bootloader is still responsive...");
      try {
        await bossa.hello();
        this.log.success("Bootloader still responsive after flash write");
      } catch (e) {
        this.log.warn(
          "Bootloader unresponsive after write - proceeding with reset"
        );
      }

      if (progressCallback) progressCallback(96, "Finalizing...");

      this.log.section("RESET DEVICE");
      this.log.info("Sending K# reset command to boot new firmware");
      this.log.command(
        "K#",
        "System reset via NVIC_SystemReset() - boots into user code at 0x4000"
      );
      if (progressCallback) progressCallback(98, "Resetting...");

      // Use K# command (system reset) instead of G# (jump)
      // This is what Arduino IDE uses - triggers NVIC_SystemReset()
      // After reset, bootloader validates and boots user code properly
      await bossa.reset();

      if (progressCallback) progressCallback(100, "Complete!");
      this.log.success("Firmware upload complete!");
      this.log.info("Device should now be running the new firmware");
    } finally {
      if (bossa) {
        try {
          await bossa.disconnect();
        } catch (e) {
          /* ignore */
        }
      }
      await this.safeClose(port);
    }
  }

  async promptUserForBootloader() {
    return new Promise((resolve) => {
      const message =
        "🔴 MANUAL RESET REQUIRED 🔴\n\n" +
        "Web Serial cannot automatically enter bootloader mode.\n\n" +
        "Please do this NOW:\n" +
        "1. Find the RESET button on your Arduino\n" +
        "2. Double-tap it QUICKLY (like double-clicking a mouse)\n" +
        "3. The built-in LED should start pulsing/fading\n" +
        "4. Click OK within 8 seconds\n\n" +
        "Click OK when the LED is pulsing, or Cancel to abort.";

      const result = window.confirm(message);
      resolve(result);
    });
  }
}
