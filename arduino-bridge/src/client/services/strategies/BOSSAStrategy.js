import { Bossa } from "../protocols/Bossa.js";

export class BOSSAStrategy {
  constructor() {
    this.name = "BOSSA (SAMD/Renesas)";
  }

  async prepare(port, fqbn) {
    console.log("[BOSSA] Preparing device...");

    // Check PID to see if we are already in bootloader mode
    // This avoids the invasive "Check" handshake if we can know for sure.
    const info = port.getInfo();
    const pid = info.usbProductId;
    const vid = info.usbVendorId;

    console.log(`[BOSSA] VID: ${vid}, PID: ${pid}`);

    // Known Bootloader PIDs
    // R4 WiFi: Sketch=0x1002, Bootloader=0x006D
    // MKR WiFi 1010: Sketch=0x8054, Bootloader=0x0054
    // Nano 33 IoT: Sketch=0x8057, Bootloader=0x0057
    // We can check if the PID is NOT the sketch PID (if we know it)
    // Or check against a list of known bootloader PIDs.

    const BOOTLOADER_PIDS = [
      0x006d, // R4 WiFi
      0x0054, // MKR WiFi 1010
      0x0057, // Nano 33 IoT
      0x0069, // R4 Minima (Same for sketch/bootloader?)
    ];

    if (pid && BOOTLOADER_PIDS.includes(pid)) {
      console.log("[BOSSA] Detected Bootloader PID! Skipping reset.");
      return;
    }

    // Check if we can identify if it's already in bootloader mode?
    // If the user just selected a new port after a reset, we shouldn't reset again.
    // We can try to detect this by checking if the port is already in bootloader mode (BOSSA handshake).
    // But opening the port might reset it if DTR is toggled.

    // For now, we'll rely on a flag or heuristic.
    // If the user is retrying (which happens in main.js handleUpload), we might want to skip the touch.
    // But main.js calls upload() which calls prepare().

    // Let's try to handshake FIRST. If it responds to BOSSA, it's already in bootloader mode.
    let bossa = null;
    try {
      console.log("[BOSSA] Checking if already in bootloader mode...");
      // Try opening at 115200 first.
      await port.open({ baudRate: 115200 });
      console.log("[BOSSA] Port opened at 115200");

      // Explicitly set DTR/RTS to true to enable communication
      await port.setSignals({ dataTerminalReady: true, requestToSend: true });

      // Wait for port to stabilize
      await new Promise((r) => setTimeout(r, 200));

      bossa = new Bossa(port);
      await bossa.connect();
      console.log("[BOSSA] Connected to stream"); // Flush any garbage data from previous sketch run
      await bossa.flush();
      console.log("[BOSSA] Flushed stream");

      // We need a timeout here because if it's NOT in bootloader mode (running sketch),
      // it won't respond to "V#", and readResponse will hang forever.
      await bossa.hello();
      console.log("[BOSSA] Device already in bootloader mode! Skipping reset.");

      // We must disconnect bossa (release locks) but KEEP the port open?
      // No, flash() expects to open the port. So we close it here.
      await bossa.disconnect();
      await port.close();
      return; // Skip the rest of prepare (the touch reset)
    } catch (e) {
      console.log(
        "[BOSSA] Not in bootloader mode (or handshake failed), proceeding with reset touch.",
        e
      );
      try {
        if (bossa) {
          await bossa.disconnect();
        }
        await port.close();
      } catch (closeErr) {
        // Ignore close error
      }
    }

    // 1200bps Touch to trigger bootloader on Arduino UNO R4 WiFi
    //
    // ARCHITECTURE NOTE: The R4 WiFi has TWO microcontrollers:
    //   1. Renesas RA4M1 - Main MCU (runs sketches, BOSSA bootloader at 0x006D)
    //   2. ESP32-S3 - USB bridge (handles serial, WiFi, AND controls RA4M1 reset)
    //
    // The ESP32-S3 bridge firmware (UNOR4USBBridge.ino) listens for a
    // LINE_CODING USB control transfer with baud=1200, then triggers GPIO
    // reset sequence on the RA4M1.
    //
    // WEB SERIAL LIMITATION:
    // Web Serial API does NOT send USB control transfers the same way native
    // serial libraries do. The SET_LINE_CODING request that triggers the
    // ESP32-S3 reset may not be sent correctly by browsers.
    //
    // We still attempt the touch (it might work on some systems), but
    // users will likely need to MANUALLY double-tap the RESET button.

    console.log(
      "[BOSSA] Attempting 1200bps touch (may not work with Web Serial)..."
    );

    try {
      // Ensure port is closed
      if (port.readable || port.writable) {
        try {
          await port.close();
        } catch (e) {
          // Ignore
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Try the classic 1200bps touch sequence
      console.log("[BOSSA] Opening port at 1200 baud...");
      await port.open({ baudRate: 1200 });

      // Set DTR=false (what go-serial-utils does)
      await port.setSignals({ dataTerminalReady: false, requestToSend: false });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Close port
      await port.close();
      console.log(
        "[BOSSA] 1200bps touch sent (Web Serial may not trigger actual reset)"
      );

      // Wait for potential reset
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (e) {
      console.log("[BOSSA] 1200bps touch failed:", e.message);
      // Clean up
      try {
        if (port.readable || port.writable) {
          await port.close();
        }
      } catch (closeErr) {
        // Ignore
      }
    }

    // KEY DISCOVERY: On Arduino R4 WiFi, the USB port DOES NOT re-enumerate!
    // The PID stays at 0x1002 even in bootloader mode.
    //
    // The ESP32-S3 bridge handles the USB interface continuously.
    // When the RA4M1 enters bootloader mode, the ESP32 internally routes
    // serial data to it WITHOUT changing the USB identity.
    //
    // This means our existing port object should still work.
    // The problem must be elsewhere (timing, baud rate, ESP32 bridge behavior).

    // Wait for the device to reset and stabilize
    console.log("[BOSSA] Waiting for device to reset and stabilize...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log(
      "[BOSSA] Device should now be in bootloader mode (same port, same PID 0x1002)"
    );
  }

  /**
   * Force LINE_CODING CDC event by closing and reopening port at each baud rate.
   * Web Serial may not send LINE_CODING when just changing baudRate on an open port.
   * The ESP32-S3 bridge relies on this USB control transfer to update internal UART baud.
   *
   * Strategy: Close port completely, wait, then open at new baud rate.
   * This should trigger a fresh SET_LINE_CODING USB control transfer.
   */
  async forceLineCodingBaudChange(port, targetBaud, label = "") {
    const logPrefix = label ? `[BOSSA ${label}]` : "[BOSSA]";

    // Ensure port is completely closed
    if (port.readable || port.writable) {
      console.log(`${logPrefix} Closing port to force LINE_CODING...`);
      try {
        await port.close();
      } catch (e) {
        // Ignore close errors
      }
      // Wait for OS to release port
      await new Promise((r) => setTimeout(r, 200));
    }

    // Open at target baud - this should trigger SET_LINE_CODING
    console.log(
      `${logPrefix} Opening at ${targetBaud} baud (forcing LINE_CODING)...`
    );
    await port.open({ baudRate: targetBaud });

    // Set signals
    await port.setSignals({ dataTerminalReady: true, requestToSend: true });

    // Wait for baud rate to propagate through ESP32-S3 bridge
    await new Promise((r) => setTimeout(r, 100));
  }

  /**
   * Aggressive baud rate cycling to stimulate auto-baud detection.
   * The ESP32-S3 bridge might need multiple LINE_CODING events to sync.
   * SAM-BA bootloader has auto-baud that expects 0x80 bytes at startup.
   */
  async aggressiveBaudCycle(port) {
    console.log("[BOSSA] Aggressive baud cycling to wake up bridge...");

    const cycleBauds = [115200, 921600, 115200, 230400, 115200];

    for (const baud of cycleBauds) {
      try {
        // Force LINE_CODING by close/reopen
        if (port.readable || port.writable) {
          await port.close();
          await new Promise((r) => setTimeout(r, 50));
        }

        await port.open({ baudRate: baud });
        await port.setSignals({ dataTerminalReady: true, requestToSend: true });

        // Send auto-baud stimulation byte (0x80)
        const writer = port.writable.getWriter();
        try {
          await writer.write(new Uint8Array([0x80]));
        } finally {
          writer.releaseLock();
        }

        await new Promise((r) => setTimeout(r, 30));
      } catch (e) {
        // Continue cycling even if one fails
        console.log(`[BOSSA] Cycle at ${baud} failed:`, e.message);
      }
    }

    // End with port closed so next phase can open cleanly
    try {
      if (port.readable || port.writable) {
        await port.close();
        await new Promise((r) => setTimeout(r, 100));
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Send extended auto-baud preamble.
   * SAM-BA bootloader uses auto-baud detection that looks for specific bit patterns.
   * Send multiple 0x80 bytes (which have a nice clock-like pattern: 1000 0000).
   */
  async sendAutoBaudPreamble(port, bossa, count = 50) {
    console.log(`[BOSSA] Sending ${count}-byte auto-baud preamble...`);

    const writer = port.writable.getWriter();
    try {
      // Send 0x80 bytes in bursts
      const preamble = new Uint8Array(count).fill(0x80);
      await writer.write(preamble);

      // Also try sending some newlines (SAM-BA likes those)
      await new Promise((r) => setTimeout(r, 50));
      await writer.write(new Uint8Array([0x0d, 0x0a, 0x0d, 0x0a])); // CR LF CR LF

      await new Promise((r) => setTimeout(r, 100));
    } finally {
      writer.releaseLock();
    }

    // Flush any response
    await bossa.flush(200);
  }

  /**
   * Toggle DTR/RTS to potentially reset internal bridge state.
   */
  async toggleSignals(port) {
    console.log("[BOSSA] Toggling DTR/RTS to reset bridge state...");

    // Sequence: high -> low -> high (like a reset pulse)
    const sequences = [
      { dataTerminalReady: true, requestToSend: true },
      { dataTerminalReady: false, requestToSend: false },
      { dataTerminalReady: true, requestToSend: false },
      { dataTerminalReady: false, requestToSend: true },
      { dataTerminalReady: true, requestToSend: true },
    ];

    for (const signals of sequences) {
      await port.setSignals(signals);
      await new Promise((r) => setTimeout(r, 50));
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  async flash(port, data, progressCallback, fqbn) {
    console.log("[BOSSA] Starting flash...");

    // Extended baud rate matrix for brute-force discovery
    // UNO R4 WiFi bootloader uses 203400 over physical UART but USB CDC should be baud-agnostic
    // Testing multiple rates in case the ESP32-S3 bridge has specific requirements
    const baudRates = [
      115200, // Most common for SAM-BA over USB
      921600, // Official BOSSA default for fast USB
      230400, // 2x standard
      460800, // 4x standard
      57600, // Legacy
      38400, // Legacy
      19200, // Very legacy
      9600, // Ultra legacy
    ];

    let connected = false;
    let bossa = null;
    let successfulConfig = null;

    // =======================================================================
    // PHASE 0: Aggressive baud cycling to wake up ESP32-S3 bridge
    // =======================================================================
    console.log(
      "[BOSSA] Phase 0: Aggressive baud cycling to stimulate bridge..."
    );
    try {
      await this.aggressiveBaudCycle(port);
    } catch (e) {
      console.log("[BOSSA] Baud cycling failed, continuing anyway:", e.message);
    }

    // =======================================================================
    // PHASE 1: Force LINE_CODING with port close/reopen at each baud rate
    // =======================================================================
    console.log("[BOSSA] Phase 1: Force LINE_CODING with close/reopen...");

    for (const baud of [115200, 921600, 230400]) {
      if (connected) break;

      try {
        // Force LINE_CODING by closing and reopening
        await this.forceLineCodingBaudChange(port, baud, `Phase1-${baud}`);

        // Toggle signals to potentially reset bridge state
        await this.toggleSignals(port);

        bossa = new Bossa(port);
        await bossa.connect();

        // Send extended auto-baud preamble
        await this.sendAutoBaudPreamble(port, bossa, 30);

        if (progressCallback) progressCallback(5, `Handshake (${baud})...`);
        await bossa.hello({ proceedOnFailure: false, attempts: 5 });

        connected = true;
        successfulConfig = { baud, phase: 1, method: "force-line-coding" };
        console.log(`[BOSSA] SUCCESS at Phase 1! Baud: ${baud}`);
        break;
      } catch (e) {
        console.warn(`[BOSSA] Phase 1 at ${baud} failed:`, e.message);
        if (bossa) {
          await bossa.disconnect();
          bossa = null;
        }
        try {
          if (port.readable || port.writable) await port.close();
        } catch (closeErr) {
          /* ignore */
        }
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // =======================================================================
    // PHASE 2: Multiple open/close cycles with extended delays
    // =======================================================================
    if (!connected) {
      console.log("[BOSSA] Phase 2: Extended delays with multiple cycles...");

      for (const baud of baudRates.slice(0, 4)) {
        if (connected) break;

        try {
          // Do multiple open/close cycles at this baud rate
          for (let cycle = 0; cycle < 3; cycle++) {
            if (port.readable || port.writable) {
              await port.close();
              await new Promise((r) => setTimeout(r, 300));
            }

            await port.open({ baudRate: baud });
            await port.setSignals({
              dataTerminalReady: true,
              requestToSend: true,
            });
            await new Promise((r) => setTimeout(r, 100));
          }

          // Wait longer after cycling
          await new Promise((r) => setTimeout(r, 500));

          bossa = new Bossa(port);
          await bossa.connect();

          // More aggressive preamble
          await this.sendAutoBaudPreamble(port, bossa, 100);

          if (progressCallback) progressCallback(5, `Testing ${baud}...`);
          await bossa.hello({ proceedOnFailure: false, attempts: 5 });

          connected = true;
          successfulConfig = { baud, phase: 2, method: "multi-cycle" };
          console.log(`[BOSSA] SUCCESS at Phase 2! Baud: ${baud}`);
          break;
        } catch (e) {
          console.warn(`[BOSSA] Phase 2 at ${baud} failed:`, e.message);
          if (bossa) {
            await bossa.disconnect();
            bossa = null;
          }
          try {
            if (port.readable || port.writable) await port.close();
          } catch (closeErr) {
            /* ignore */
          }
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    }

    // =======================================================================
    // PHASE 3: Original brute-force with all baud rates and signal configs
    // =======================================================================
    if (!connected) {
      console.log(
        "[BOSSA] Phase 3: Full brute-force with signal variations..."
      );

      const signalConfigs = [
        { dtr: true, rts: true, delay: 500, label: "DTR+RTS high, 500ms" },
        {
          dtr: false,
          rts: true,
          delay: 500,
          label: "DTR low, RTS high, 500ms",
        },
        {
          dtr: true,
          rts: false,
          delay: 500,
          label: "DTR high, RTS low, 500ms",
        },
        { dtr: false, rts: false, delay: 1000, label: "DTR+RTS low, 1000ms" },
        { dtr: true, rts: true, delay: 1500, label: "DTR+RTS high, 1500ms" },
      ];

      outerLoop: for (const baud of baudRates) {
        for (const config of signalConfigs) {
          try {
            console.log(`[BOSSA] Trying ${baud} baud with ${config.label}`);

            // Force LINE_CODING
            if (port.readable || port.writable) {
              await port.close();
              await new Promise((r) => setTimeout(r, 100));
            }

            await port.open({ baudRate: baud });
            await port.setSignals({
              dataTerminalReady: config.dtr,
              requestToSend: config.rts,
            });
            await new Promise((r) => setTimeout(r, config.delay));

            bossa = new Bossa(port);
            await bossa.connect();
            await bossa.flush(300);

            if (progressCallback) progressCallback(5, `Testing ${baud}...`);
            await bossa.hello({ proceedOnFailure: false, attempts: 3 });

            connected = true;
            successfulConfig = { baud, ...config, phase: 3 };
            console.log(
              `[BOSSA] SUCCESS at Phase 3! Config: ${JSON.stringify(
                successfulConfig
              )}`
            );
            break outerLoop;
          } catch (e) {
            if (bossa) {
              await bossa.disconnect();
              bossa = null;
            }
            try {
              if (port.readable || port.writable) await port.close();
            } catch (closeErr) {
              /* ignore */
            }
            await new Promise((r) => setTimeout(r, 100));
          }
        }
      }
    }

    // =======================================================================
    // PHASE 4: "Suck it and see" - proceed anyway with best guess
    // =======================================================================
    if (!connected) {
      console.warn(
        "[BOSSA] Phase 4: All handshakes failed. Trying 'proceed anyway' mode..."
      );
      try {
        if (port.readable || port.writable) {
          await port.close();
          await new Promise((r) => setTimeout(r, 200));
        }

        await port.open({ baudRate: 115200 });
        await port.setSignals({ dataTerminalReady: true, requestToSend: true });
        await new Promise((r) => setTimeout(r, 1000));

        bossa = new Bossa(port);
        await bossa.connect();
        await bossa.flush(500);

        if (progressCallback) progressCallback(5, "Proceeding blind...");
        await bossa.hello({ proceedOnFailure: true, attempts: 1 });

        connected = true;
        successfulConfig = { baud: 115200, phase: 4, mode: "blind" };
        console.warn("[BOSSA] Proceeding WITHOUT handshake confirmation!");
      } catch (e) {
        console.error("[BOSSA] Even blind mode failed:", e.message);
        if (bossa) {
          await bossa.disconnect();
          bossa = null;
        }
        try {
          if (port.readable || port.writable) await port.close();
        } catch (closeErr) {
          /* ignore */
        }
      }
    }

    if (!connected) {
      throw new Error(
        "Failed to connect to BOSSA device. Device may be in bootloader mode but unresponsive.\n\n" +
          "POSSIBLE CAUSES:\n" +
          "• Web Serial API may not send USB CDC LINE_CODING events properly\n" +
          "• ESP32-S3 bridge internal baud rate not synchronized\n\n" +
          "WORKAROUNDS:\n" +
          "1. Try double-tapping the RESET button to enter bootloader mode\n" +
          "2. Try a different browser (Chrome usually works best)\n" +
          "3. Check browser console for detailed debug output"
      );
    }

    if (successfulConfig) {
      console.log(`[BOSSA] Using config: ${JSON.stringify(successfulConfig)}`);
    }

    // Re-instantiate bossa if we broke out of the loop (it should be valid, but let's be safe)
    // Actually, 'bossa' variable holds the connected instance from the loop.
    // We are ready to flash.

    try {
      if (progressCallback) progressCallback(10, "Connected");

      // Determine Offset based on FQBN
      let offset = 0x2000; // Default for SAMD (MKR)
      if (fqbn && fqbn.includes("renesas_uno")) {
        offset = 0x4000; // Uno R4
      }

      // Prepare Data
      const firmware = new Uint8Array(data);
      const pageSize = 256;
      const totalBytes = firmware.length;

      if (progressCallback) progressCallback(10, "Flashing...");

      let currentAddr = offset;
      for (let i = 0; i < totalBytes; i += pageSize) {
        const chunk = firmware.subarray(i, Math.min(i + pageSize, totalBytes));

        // Write Chunk
        await bossa.writeBinary(currentAddr, chunk);
        currentAddr += chunk.length;

        if (progressCallback) {
          progressCallback(Math.round((i / totalBytes) * 100), "Flashing");
        }

        // Small delay to allow write
        await new Promise((r) => setTimeout(r, 10));
      }

      if (progressCallback) progressCallback(100, "Resetting...");

      // Reset
      await bossa.go(offset);

      console.log("[BOSSA] Flash complete");
    } finally {
      if (bossa) await bossa.disconnect();
      // Ensure port is closed
      if (port.readable || port.writable) {
        await port.close();
      }
    }
  }
}
