/**
 * BOSSAStrategy v1.0.9-padded-firmware
 * - Added 250ms delay between chunks with logging
 * - 10 second post-write wait
 */
import { Bossa } from "../protocols/Bossa.js";
import {
  BOSSA_RENESAS_CONFIG,
  getProtocolConfig,
  getChunkSize,
} from "../../config/boardProtocols.js";

/**
 * BOSSA Upload Strategy using SAM-BA Protocol
 *
 * This strategy handles firmware uploads to boards using the BOSSA/SAM-BA protocol via Web Serial API.
 * Supports: Arduino R4 WiFi, R4 Minima, Nano R4, and other Renesas/SAMD boards.
 *
 * CONFIGURATION: All protocol parameters are loaded from boardProtocols.js
 * which is the SINGLE SOURCE OF TRUTH matching the YAML protocol files.
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
 */
export class BOSSAStrategy {
  constructor() {
    this.name = "BOSSA/SAM-BA";

    // Load configuration from centralized config (matches YAML protocol files)
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
      console.warn(`[BOSSA] Port close warning: ${e.message}`);
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
    console.log("[BOSSA] === 1200 BAUD TOUCH (matching USB capture) ===");

    await this.safeClose(port);

    // Step 1: First SET_LINE_CODING at 1200 baud
    console.log("[BOSSA] Opening at 1200 baud (first SET_LINE_CODING)...");
    await port.open({ baudRate: this.TOUCH_BAUD });

    // Step 2: SET_CONTROL_LINE_STATE = DTR=1, RTS=1 (0x0003)
    console.log("[BOSSA] Setting DTR=1, RTS=1");
    await port.setSignals({ dataTerminalReady: true, requestToSend: true });

    // Step 3: Second SET_LINE_CODING at 1200 (close and reopen to force)
    console.log("[BOSSA] Forcing second SET_LINE_CODING...");
    await port.close();
    await new Promise((r) => setTimeout(r, 10));
    await port.open({ baudRate: this.TOUCH_BAUD });

    // Step 4: SET_CONTROL_LINE_STATE = DTR=0, RTS=1 (0x0002) - triggers reset
    console.log("[BOSSA] Setting DTR=0, RTS=1 (trigger reset)");
    await port.setSignals({ dataTerminalReady: false, requestToSend: true });

    // Close port
    console.log("[BOSSA] Closing port after touch");
    await port.close();

    // Wait ~500ms for device reset (matching USB capture timing)
    console.log("[BOSSA] Waiting 500ms for device reset...");
    await new Promise((r) => setTimeout(r, 500));

    console.log("[BOSSA] 1200 baud touch complete");
  }

  /**
   * Fast baud rate probe - returns immediately on ASCII data, or when enough
   * data received to determine it's garbage (wrong baud)
   *
   * @returns { result: 'ascii'|'garbage'|'timeout', bossa?, bytes? }
   */
  async fastProbe(port, baudRate, timeoutMs = 2000) {
    console.log(
      `[BOSSA] Fast probe at ${baudRate} baud (${timeoutMs}ms timeout)...`
    );

    try {
      await this.safeClose(port);
      await port.open({ baudRate: baudRate });
      await port.setSignals({ dataTerminalReady: true, requestToSend: true });
      await new Promise((r) => setTimeout(r, 50));

      const bossa = new Bossa(port);
      await bossa.connect();

      // Send N# to trigger response
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
              console.log(`[BOSSA] ✓ ASCII data detected at ${baudRate}!`);
              return {
                result: "ascii",
                bossa,
                bytes: new Uint8Array(collected),
              };
            } else {
              console.log(`[BOSSA] ✗ Garbage data at ${baudRate} - wrong baud`);
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
          // Log every byte received
          const rxTime = new Date().toISOString().slice(11, 23);
          const hex = Array.from(value)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ");
          const asciiDetail = Array.from(value)
            .map((b) => {
              if (b === 0x0a) return "<LF>";
              if (b === 0x0d) return "<CR>";
              if (b >= 0x20 && b <= 0x7e) return String.fromCharCode(b);
              return `<0x${b.toString(16).padStart(2, "0")}>`;
            })
            .join("");
          console.log(
            `[BOSSA ${rxTime}] 📥 Probe RX (${value.length} bytes): ${hex}`
          );
          console.log(`[BOSSA ${rxTime}] 📥 Probe ASCII: ${asciiDetail}`);

          collected.push(...value);

          // As soon as we have enough bytes, check if ASCII
          if (collected.length >= 2) {
            const isAscii = this.isValidAsciiResponse(
              new Uint8Array(collected)
            );
            if (isAscii) {
              // ASCII! This is the right baud rate - return immediately
              console.log(
                `[BOSSA] ✓ ASCII data detected at ${baudRate}! (${collected.length} bytes)`
              );
              return {
                result: "ascii",
                bossa,
                bytes: new Uint8Array(collected),
              };
            } else if (collected.length >= 4) {
              // Got enough garbage data - wrong baud rate, exit early
              console.log(
                `[BOSSA] ✗ Garbage data at ${baudRate} - wrong baud (${collected.length} bytes)`
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
        console.log(`[BOSSA] ✗ No response at ${baudRate} (timeout)`);
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
      console.log(`[BOSSA] ✗ Error at ${baudRate}: ${e.message}`);
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
        console.log(`[BOSSA] ✓✓ Version: ${version}`);
        return { success: true, version };
      }

      return { success: true, version: `Connected at ${baudRate}` };
    } catch (e) {
      console.warn(`[BOSSA] Handshake warning: ${e.message}`);
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
    console.log("[BOSSA] ========================================");
    console.log("[BOSSA] Ultra-fast baud detection starting...");
    console.log(`[BOSSA] Primary baud: ${this.PRIMARY_BAUD}`);
    console.log("[BOSSA] ========================================");

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
      console.log("[BOSSA] No response at primary baud - needs manual reset");
      return { success: false, needsManualReset: true, reason: "no_response" };
    }

    // Got garbage - device is responding but at different baud rate
    console.log("[BOSSA] Got response but wrong baud - scanning all rates...");

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
    console.log("[BOSSA] No baud rate produced valid ASCII response");
    return { success: false, needsManualReset: false, reason: "no_valid_baud" };
  }

  /**
   * Wait for any data from the reader
   * Returns { gotData, bytes, hex, ascii }
   */
  async waitForAnyData(reader, timeoutMs) {
    const collected = [];
    const startTime = Date.now();
    const timestamp = new Date().toISOString().slice(11, 23);
    console.log(
      `[BOSSA ${timestamp}] Waiting for data (timeout: ${timeoutMs}ms)...`
    );

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
          const rxTime = new Date().toISOString().slice(11, 23);
          const hex = Array.from(value)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ");
          const asciiDetail = Array.from(value)
            .map((b) => {
              if (b === 0x0a) return "<LF>";
              if (b === 0x0d) return "<CR>";
              if (b >= 0x20 && b <= 0x7e) return String.fromCharCode(b);
              return `<0x${b.toString(16).padStart(2, "0")}>`;
            })
            .join("");
          console.log(
            `[BOSSA ${rxTime}] 📥 RX (${value.length} bytes): ${hex}`
          );
          console.log(`[BOSSA ${rxTime}] 📥 RX ASCII: ${asciiDetail}`);
          collected.push(...value);
          // Got some data, wait a bit more for complete response
          await new Promise((r) => setTimeout(r, 50));
        }
      }
    } catch (e) {
      console.warn(`[BOSSA] Read error: ${e.message}`);
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
      console.log(
        `[BOSSA] ✅ Received ${collected.length} bytes in ${elapsed}ms`
      );
      return { gotData: true, bytes, hex, ascii };
    }

    console.log(`[BOSSA] ⏱️ No data received after ${elapsed}ms`);
    return { gotData: false };
  }

  /**
   * Alias for waitForAnyData
   */
  async waitForResponse(reader, timeoutMs) {
    return this.waitForAnyData(reader, timeoutMs);
  }

  async prepare(port, fqbn) {
    console.log("[BOSSA] ========================================");
    console.log("[BOSSA] PREPARE: Attempting bootloader entry");
    console.log("[BOSSA] ========================================");

    const info = port.getInfo();
    const pid = info.usbProductId;
    const vid = info.usbVendorId;
    console.log(
      `[BOSSA] Device: VID=0x${vid?.toString(16)}, PID=0x${pid?.toString(16)}`
    );

    // Check if already in bootloader mode (different PID)
    const BOOTLOADER_PIDS = [0x006d, 0x0054, 0x0057, 0x0069];
    if (pid && BOOTLOADER_PIDS.includes(pid)) {
      console.log("[BOSSA] Already in bootloader mode (detected by PID)");
      return;
    }

    // Try the 1200 baud touch
    await this.perform1200Touch(port);
  }

  async flash(port, data, progressCallback, fqbn) {
    console.log("[BOSSA] ========================================");
    console.log("[BOSSA] FLASH: Starting upload to R4 WiFi");
    console.log("[BOSSA] ========================================");

    let bossa = null;
    let workingBaud = null;

    // Try direct connection at PRIMARY_BAUD (230400 - confirmed from Wireshark)
    if (progressCallback)
      progressCallback(5, `Connecting at ${this.PRIMARY_BAUD} baud...`);

    try {
      await this.safeClose(port);

      // USB capture shows SET_LINE_CODING sent twice at 230400
      // First open
      await port.open({ baudRate: this.PRIMARY_BAUD });
      await port.setSignals({ dataTerminalReady: true, requestToSend: true });

      // Force second SET_LINE_CODING by closing and reopening
      await port.close();
      await new Promise((r) => setTimeout(r, 10));
      await port.open({ baudRate: this.PRIMARY_BAUD });
      await port.setSignals({ dataTerminalReady: true, requestToSend: true });

      // Wait ~111ms before N# (matching USB capture)
      await new Promise((r) => setTimeout(r, 110));

      bossa = new Bossa(port);
      await bossa.connect();

      // Send N# to verify bootloader is responding
      console.log("[BOSSA] Sending N# command to verify bootloader...");
      await bossa.writeCommand("N#");

      // Wait for response
      const response = await this.waitForResponse(bossa.reader, 2000);

      if (response.gotData && this.isValidAsciiResponse(response.bytes)) {
        workingBaud = this.PRIMARY_BAUD;
        console.log(`[BOSSA] ✓✓ Connected at ${workingBaud}`);
        console.log(`[BOSSA] Response: ${response.ascii}`);
      } else {
        console.log("[BOSSA] No valid response at primary baud");
        await bossa.disconnect();
        await this.safeClose(port);
      }
    } catch (e) {
      console.log(`[BOSSA] Error at ${this.PRIMARY_BAUD}: ${e.message}`);
      await this.safeClose(port);
    }

    // If primary baud failed, try all baud rates
    if (!workingBaud) {
      console.log("[BOSSA] Trying all baud rates...");
      for (const baudRate of this.ALL_BAUD_RATES) {
        if (baudRate === this.PRIMARY_BAUD) continue;

        if (progressCallback) progressCallback(5, `Trying ${baudRate} baud...`);

        try {
          await this.safeClose(port);
          await port.open({ baudRate });
          await port.setSignals({
            dataTerminalReady: true,
            requestToSend: true,
          });
          await new Promise((r) => setTimeout(r, 100));

          bossa = new Bossa(port);
          await bossa.connect();

          await bossa.writeCommand("N#");
          const response = await this.waitForResponse(bossa.reader, 1000);

          if (response.gotData && this.isValidAsciiResponse(response.bytes)) {
            workingBaud = baudRate;
            console.log(`[BOSSA] ✓✓ Connected at ${workingBaud}`);
            break;
          } else {
            await bossa.disconnect();
            await this.safeClose(port);
          }
        } catch (e) {
          console.log(`[BOSSA] Error at ${baudRate}: ${e.message}`);
          await this.safeClose(port);
        }
      }
    }

    // If no baud rate worked, prompt user for manual reset
    if (!workingBaud) {
      console.log("[BOSSA] ========================================");
      console.log("[BOSSA] MANUAL BOOTLOADER ENTRY REQUIRED");
      console.log("[BOSSA] ========================================");

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
      await new Promise((r) => setTimeout(r, 1000));

      if (progressCallback)
        progressCallback(5, `Retrying at ${this.PRIMARY_BAUD}...`);

      try {
        await this.safeClose(port);
        await port.open({ baudRate: this.PRIMARY_BAUD });
        await port.setSignals({ dataTerminalReady: true, requestToSend: true });
        await new Promise((r) => setTimeout(r, 100));

        bossa = new Bossa(port);
        await bossa.connect();

        await bossa.writeCommand("N#");
        const response = await this.waitForResponse(bossa.reader, 2000);

        if (response.gotData && this.isValidAsciiResponse(response.bytes)) {
          workingBaud = this.PRIMARY_BAUD;
          console.log(
            `[BOSSA] ✓✓ Connected after manual reset at ${workingBaud}`
          );
        }
      } catch (e) {
        console.log(`[BOSSA] Error after manual reset: ${e.message}`);
      }
    }

    if (!workingBaud) {
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
      console.log(
        `[BOSSA] Flash write offset: 0x${flashWriteOffset.toString(
          16
        )} (physical: 0x${(flashWriteOffset + 0x4000).toString(16)})`
      );
      console.log(`[BOSSA] Execution (go) offset: 0x${goOffset.toString(16)}`);
      console.log(`[BOSSA] data_buffer offset: 0x${sramBufferA.toString(16)}`);

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
      console.log(
        `[BOSSA] Firmware padded from ${originalSize} to ${totalBytes} bytes (${chunkSize}-byte boundary)`
      );

      // Step 1: Upload flash applet (matches Arduino IDE protocol from Wireshark)
      // The IDE uploads a 52-byte applet to data_buffer[0] before writing firmware
      // This applet is ARM Thumb code used for flash operations
      if (fqbn && fqbn.includes("renesas_uno")) {
        console.log(`[BOSSA] Uploading flash applet (52 bytes)...`);
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
        await bossa.writeBinary(0x00, FLASH_APPLET);
        console.log(`[BOSSA] Flash applet uploaded`);

        // W# register commands from Arduino IDE (flash configuration)
        // W00000030,00000400# and W00000020,00000000#
        console.log(`[BOSSA] Configuring flash registers...`);
        await bossa.writeWord(0x30, 0x400);
        await bossa.writeWord(0x20, 0x00);
        console.log(`[BOSSA] Flash registers configured`);
      }

      // Step 2: Erase flash (required for R4)
      console.log(`[BOSSA] Erasing flash...`);
      if (progressCallback) progressCallback(12, "Erasing flash...");

      // Calculate number of pages to erase (R4 page size is 8192 bytes / 0x2000)
      const erasePageSize = 0x2000; // 8KB pages for Renesas RA4M1
      const pagesToErase = Math.ceil(totalBytes / erasePageSize);
      console.log(
        `[BOSSA] Erasing ${pagesToErase} pages (${totalBytes} bytes)`
      );

      // Use the chipErase method which properly waits for X command ACK
      // X command also has internal 0x4000 offset added by bootloader
      await bossa.chipErase(flashWriteOffset);
      console.log(`[BOSSA] Flash erased, starting write...`);

      // Step 2: Write flash in chunks
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
      console.log(
        `[BOSSA] Writing ${totalBytes} bytes in ${numChunks} chunks (${chunkSize} bytes each)...`
      );
      console.log(
        `[BOSSA] Chunk size from config: ${chunkSize} (protocol: ${
          protocolConfig.variant || "default"
        })`
      );
      if (progressCallback) progressCallback(15, "Writing flash...");

      // flashAddr is the Y command flash offset (bootloader adds 0x4000)
      let flashAddr = flashWriteOffset;
      // sramBuffer is the offset into bootloader's data_buffer[8192]
      const sramBuffer = sramBufferA;

      for (let i = 0; i < totalBytes; i += chunkSize) {
        const chunkNum = Math.floor(i / chunkSize) + 1;
        const chunk = firmware.subarray(i, Math.min(i + chunkSize, totalBytes));
        const isLastChunk = i + chunkSize >= totalBytes;

        // Log: CHUNK #/total @ flash_addr (size bytes)
        console.log(
          `[BOSSA] CHUNK ${chunkNum}/${numChunks} @ 0x${flashAddr.toString(
            16
          )} (${chunk.length}B)${isLastChunk ? " [LAST]" : ""}`
        );

        // Write to SRAM buffer, then commit to flash
        await bossa.writeBinary(sramBuffer, chunk);
        await bossa.writeBuffer(sramBuffer, flashAddr, chunk.length);

        flashAddr += chunk.length;

        const percent = 15 + Math.round((i / totalBytes) * 80);
        if (progressCallback)
          progressCallback(percent, `Chunk ${chunkNum}/${numChunks}`);

        // Delay between chunks - CRITICAL: IDE takes ~250ms per chunk!
        // Wireshark shows 238-261ms between 4KB chunks
        // This allows flash controller to fully commit each page
        if (isLastChunk) {
          console.log(
            `[BOSSA] Last chunk written, waiting 1000ms for flash commit...`
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          console.log(`[BOSSA] Waiting 250ms for flash page commit...`);
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }

      // Wait for flash operations to fully complete before reset
      // The Flash LP peripheral needs time to finish writing all pages
      // CRITICAL: Larger sketches need more time for flash controller to commit all writes
      // The Y# ACK only means data was received, not necessarily committed to flash
      // Using a generous 10 second wait to ensure flash is fully committed
      const waitTime = 10000;
      console.log(
        `[BOSSA] Waiting ${waitTime}ms for flash operations to complete (${numChunks} chunks, ${totalBytes} bytes)...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      // Verify bootloader is still responsive by sending N# before reset
      console.log("[BOSSA] Verifying bootloader is responsive...");
      try {
        await bossa.hello();
        console.log("[BOSSA] ✅ Bootloader still responsive");
      } catch (e) {
        console.log(
          "[BOSSA] ⚠️ Bootloader unresponsive after write, proceeding with reset..."
        );
      }

      if (progressCallback) progressCallback(96, "Finalizing...");

      console.log("[BOSSA] Resetting device to run new firmware...");
      if (progressCallback) progressCallback(98, "Resetting...");

      // Use K# command (system reset) instead of G# (jump)
      // This is what Arduino IDE uses - triggers NVIC_SystemReset()
      // After reset, bootloader validates and boots user code properly
      await bossa.reset();

      if (progressCallback) progressCallback(100, "Complete!");
      console.log("[BOSSA] Upload successful!");
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
