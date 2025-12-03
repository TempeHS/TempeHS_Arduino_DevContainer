import { Bossa } from "../protocols/Bossa.js";

/**
 * BOSSA Upload Strategy for Arduino UNO R4 WiFi
 *
 * KNOWN LIMITATION: Web Serial API does not reliably trigger bootloader entry
 * ===========================================================================
 * The 1200 baud touch requires USB CDC SET_LINE_CODING control transfers.
 * Web Serial may not send these properly, so the ESP32-S3 bridge doesn't
 * receive the signal to reset the RA4M1 into bootloader mode.
 *
 * ADDITIONAL ISSUE: Even in bootloader mode, the ESP32-S3 bridge may not
 * update its internal UART baud rate when we change the USB CDC baud rate.
 *
 * WORKAROUND: User must manually double-tap RESET button to enter bootloader,
 * and we try multiple baud rates to find one that works.
 */
export class BOSSAStrategy {
  constructor() {
    this.name = "BOSSA (SAMD/Renesas)";

    // R4 WiFi bootloader confirmed at 230400 from Wireshark capture
    this.PRIMARY_BAUD = 230400;

    // Fallback baud rates if primary doesn't work
    this.ALL_BAUD_RATES = [
      230400, 115200, 921600, 460800, 57600, 38400, 19200, 9600,
    ];

    this.TOUCH_BAUD = 1200; // For bootloader entry
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
   */
  async perform1200Touch(port) {
    console.log("[BOSSA] === 1200 BAUD TOUCH ===");
    console.log("[BOSSA] NOTE: This may not work with Web Serial API");

    await this.safeClose(port);

    console.log("[BOSSA] Opening at 1200 baud...");
    await port.open({ baudRate: this.TOUCH_BAUD });

    console.log("[BOSSA] Setting DTR=1, RTS=1");
    await port.setSignals({ dataTerminalReady: true, requestToSend: true });
    await new Promise((r) => setTimeout(r, 50));

    console.log("[BOSSA] Setting DTR=0, RTS=1 (trigger reset)");
    await port.setSignals({ dataTerminalReady: false, requestToSend: true });
    await new Promise((r) => setTimeout(r, 50));

    console.log("[BOSSA] Closing port after touch");
    await port.close();

    console.log("[BOSSA] Waiting 600ms for device reset...");
    await new Promise((r) => setTimeout(r, 600));

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
          collected.push(...value);
          // Got some data, wait a bit more for complete response
          await new Promise((r) => setTimeout(r, 50));
        }
      }
    } catch (e) {
      console.warn(`[BOSSA] Read error: ${e.message}`);
    }

    if (collected.length > 0) {
      const bytes = new Uint8Array(collected);
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      const ascii = Array.from(bytes)
        .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : "."))
        .join("");
      return { gotData: true, bytes, hex, ascii };
    }

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
      await port.open({ baudRate: this.PRIMARY_BAUD });
      await port.setSignals({ dataTerminalReady: true, requestToSend: true });
      await new Promise((r) => setTimeout(r, 100));

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

      if (fqbn && fqbn.includes("renesas_uno")) {
        offset = 0x4000; // Uno R4 flash starts at 0x4000
        // R4 SRAM starts at 0x20000000, bootloader uses buffer area
        // Based on BOSSA Device.cpp for similar Cortex-M4 devices
        sramBufferA = 0x20001000;
        sramBufferB = 0x20001100;
      }
      console.log(`[BOSSA] Flash offset: 0x${offset.toString(16)}`);
      console.log(`[BOSSA] SRAM buffer: 0x${sramBufferA.toString(16)}`);

      const firmware = new Uint8Array(data);
      const totalBytes = firmware.length;

      // Step 1: Erase flash (required for R4)
      console.log(`[BOSSA] Erasing flash...`);
      if (progressCallback) progressCallback(12, "Erasing flash...");

      // Calculate number of pages to erase (R4 page size is 8192 bytes / 0x2000)
      const erasePageSize = 0x2000; // 8KB pages for Renesas RA4M1
      const pagesToErase = Math.ceil(totalBytes / erasePageSize);
      console.log(
        `[BOSSA] Erasing ${pagesToErase} pages (${totalBytes} bytes)`
      );

      // Send erase command: X[addr]#
      // The Arduino bootloader uses 'X' for erase
      await bossa.writeCommand(`X${offset.toString(16)}#`);

      // Wait for erase to complete (can take a few seconds)
      await new Promise((r) => setTimeout(r, 2000));

      // Flush any response
      await bossa.flush(200);

      // Step 2: Write flash in page-sized chunks
      // SAM-BA extended protocol flow:
      // 1. S[sram_addr],[size]# - Write data to SRAM buffer
      // 2. Y[sram_addr],0# - Set source address
      // 3. Y[flash_addr],[size]# - Copy from SRAM to flash
      const flashPageSize = 256; // Flash page size for programming
      console.log(
        `[BOSSA] Writing ${totalBytes} bytes in ${flashPageSize}-byte pages...`
      );
      if (progressCallback) progressCallback(15, "Writing flash...");

      let flashAddr = offset;
      let useBufferA = true; // Alternate between buffers for double-buffering

      for (let i = 0; i < totalBytes; i += flashPageSize) {
        const chunk = firmware.subarray(
          i,
          Math.min(i + flashPageSize, totalBytes)
        );

        // Select buffer address
        const sramBuffer = useBufferA ? sramBufferA : sramBufferB;

        // Step 2a: Write chunk to SRAM buffer
        // S[sram_buffer],[size]# + binary data
        await bossa.writeBinary(sramBuffer, chunk);

        // Step 2b: Commit SRAM buffer to flash using writeBuffer
        // This sends: Y[src],0# then Y[dst],[size]#
        await bossa.writeBuffer(sramBuffer, flashAddr, chunk.length);

        flashAddr += chunk.length;
        useBufferA = !useBufferA; // Alternate buffers

        const percent = 15 + Math.round((i / totalBytes) * 80);
        if (progressCallback) progressCallback(percent, "Writing flash...");

        // Small delay between pages
        await new Promise((r) => setTimeout(r, 5));
      }

      console.log("[BOSSA] Write complete, resetting device...");
      if (progressCallback) progressCallback(98, "Resetting...");

      // Reset the device to run the new firmware
      await bossa.go(offset);

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
