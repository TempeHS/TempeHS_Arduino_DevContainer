/**
 * BOSSA Protocol Implementation
 * Reference: https://github.com/shumatech/BOSSA/blob/master/src/Samba.cpp
 * Reference: https://github.com/arduino-libraries/arduino_serialupdater/blob/main/src/Samba.cpp
 */
export class Bossa {
  constructor(port) {
    this.port = port;
    this.reader = null;
    this.writer = null;
    this.isSamd = false; // Flag to enable SAMD-specific workarounds
  }

  async connect() {
    // Assume port is already open
    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();
  }

  async disconnect() {
    if (this.reader) {
      await this.reader.cancel();
      this.reader.releaseLock();
      this.reader = null;
    }
    if (this.writer) {
      this.writer.releaseLock();
      this.writer = null;
    }
  }

  async flush(durationMs = 200) {
    // Drain any pending data for the requested duration without throwing
    const deadline = Date.now() + durationMs;

    try {
      while (Date.now() < deadline) {
        const remaining = Math.max(0, deadline - Date.now());
        const waitSlice = Math.min(remaining, 20);
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve("timeout"), waitSlice)
        );
        const result = await Promise.race([this.reader.read(), timeoutPromise]);

        if (result === "timeout") {
          continue;
        }

        const { value, done } = result;
        if (done) {
          break;
        }
        if (value && value.length) {
          this.logHex("Flush RX", value);
        } else {
          // Empty chunk, bail out to avoid busy looping
          break;
        }
      }
    } catch (e) {
      console.warn(`[Bossa] Flush error ignored: ${e.message}`);
    }
  }

  logHex(label, data) {
    if (!data || !data.length) {
      return;
    }
    const hex = Array.from(data)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    console.log(`[Bossa] ${label} (${data.length}): ${hex}`);
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  bytesToPrintable(bytes) {
    if (!bytes || !bytes.length) {
      return "";
    }

    const printable = Array.from(bytes)
      .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : ""))
      .join("")
      .replace(/[\r\n]+/g, "")
      .replace(/>+$/, "")
      .trim();

    return printable;
  }

  async readUntilTerminator({ terminators, timeout = 1000, maxBytes = 256 }) {
    const collected = [];
    const terminatorSet = new Set(terminators ?? [0x0a, 0x0d, 0x3e]);
    const start = Date.now();

    while (true) {
      if (Date.now() - start > timeout) {
        throw new Error("Timeout waiting for response");
      }

      const remaining = Math.max(0, timeout - (Date.now() - start));
      const waitSlice = Math.min(remaining, 50);
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve("timeout"), waitSlice)
      );

      const result = await Promise.race([this.reader.read(), timeoutPromise]);

      if (result === "timeout") {
        continue;
      }

      const { value, done } = result;
      if (done) {
        break;
      }

      if (value && value.length) {
        this.logHex("RX Chunk", value);
        collected.push(...value);

        if (collected.length >= maxBytes) {
          break;
        }

        if (value.some((byte) => terminatorSet.has(byte))) {
          break;
        }
      }
    }

    if (!collected.length) {
      throw new Error("Timeout waiting for response");
    }

    return new Uint8Array(collected);
  }

  async autoBaudSync() {
    // Mimic BOSSA Samba.cpp auto-baud preamble for stubborn bootloaders
    try {
      const syncByte = new Uint8Array([0x80]);
      for (let i = 0; i < 3; i++) {
        await this.writer.write(syncByte);
        await this.delay(10);
      }
      await this.writer.write(new Uint8Array([0x23])); // '#'
      await this.delay(20);
      await this.flush(100);
    } catch (err) {
      console.warn(`[Bossa] Auto-baud sync ignored: ${err.message}`);
    }
  }

  async readBytes(count, timeout = 1000) {
    const result = new Uint8Array(count);
    let offset = 0;
    const startTime = Date.now();

    while (offset < count) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for ${count} bytes (got ${offset})`);
      }

      // Race read against remaining timeout
      const remainingTime = timeout - (Date.now() - startTime);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), remainingTime)
      );

      try {
        const { value, done } = await Promise.race([
          this.reader.read(),
          timeoutPromise,
        ]);

        if (done) throw new Error("Stream closed");
        if (value) {
          this.logHex("RX Chunk", value);
          // Copy what we need
          const toCopy = Math.min(value.length, count - offset);
          result.set(value.subarray(0, toCopy), offset);
          offset += toCopy;

          // If we got more than we needed, we lose the extra bytes here
          // Ideally we should buffer them, but for BOSSA strict protocol it's usually fine
          if (value.length > toCopy) {
            console.warn(
              `[Bossa] Discarding ${value.length - toCopy} extra bytes`
            );
          }
        }
      } catch (e) {
        throw e;
      }
    }
    return result;
  }

  async readResponse(timeout = 1000) {
    const decoder = new TextDecoder();
    let response = "";
    const startTime = Date.now();

    try {
      while (true) {
        if (Date.now() - startTime > timeout) {
          throw new Error("Timeout waiting for response");
        }

        const remainingTime = timeout - (Date.now() - startTime);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), remainingTime)
        );

        const result = await Promise.race([this.reader.read(), timeoutPromise]);

        if (result === "timeout") {
          continue;
        }

        const { value, done } = result;

        if (done) break;
        if (value) {
          this.logHex("RX Raw", value);
          const chunk = decoder.decode(value, { stream: true });
          response += chunk;
          if (
            response.includes("\n") ||
            response.includes("\r") ||
            response.includes(">")
          ) {
            break;
          }
        }
      }
    } catch (e) {
      console.log(`[Bossa] Read error/timeout: ${e.message}`);
      throw e;
    }

    const cleaned = response
      .replace(/[\r\n]+/g, "")
      .replace(/>+$/, "")
      .trim();

    if (!cleaned) {
      throw new Error("Empty response");
    }

    return cleaned;
  }

  async writeCommand(cmd) {
    console.log(`[Bossa] TX Command: ${cmd}`);
    const encoder = new TextEncoder();
    const data = encoder.encode(cmd);
    this.logHex("TX Raw", data);
    await this.writer.write(data);
  }

  /**
   * Aggressive handshake with "proceed anyway" option
   * @param {Object} options
   * @param {boolean} options.proceedOnFailure - If true, return fake version on timeout ("suck it and see")
   * @param {number} options.attempts - Number of retry attempts
   */
  async hello(options = {}) {
    const { proceedOnFailure = false, attempts = 2 } = options;
    console.log(`[Bossa] Handshake... (proceedOnFailure=${proceedOnFailure})`);
    let lastError = null;

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        if (attempt === 1) {
          console.log("[Bossa] Retrying handshake with auto-baud sync...");
          await this.autoBaudSync();
        } else if (attempt > 1) {
          // Extended attempts: try different sync patterns
          console.log(
            `[Bossa] Attempt ${attempt + 1}: Trying extended sync...`
          );
          await this.extendedSync(attempt);
        }

        // Set Normal Mode (binary)
        await this.writeCommand("N#");

        try {
          const ackBytes = await this.readUntilTerminator({
            terminators: [0x0a, 0x0d, 0x3e],
            timeout: 600,
            maxBytes: 16,
          });
          const ackText = this.bytesToPrintable(ackBytes) || "<non-printable>";
          console.log(`[Bossa] N# Ack: ${ackText}`);
        } catch (ackErr) {
          console.log(`[Bossa] No Ack for N# (${ackErr.message}) - continuing`);
        }

        // Drain any prompt markers that may have arrived with the ack
        await this.flush(100);

        // Get Version
        await this.writeCommand("V#");
        const versionBytes = await this.readUntilTerminator({
          terminators: [0x0a, 0x0d, 0x3e],
          timeout: 3000,
          maxBytes: 256,
        });
        const version = this.bytesToPrintable(versionBytes);

        if (!version) {
          throw new Error("Empty version response");
        }

        console.log(`[Bossa] Device Version: ${version}`);

        if (version.includes("Arduino")) {
          this.isSamd = true;
          console.log(
            "[Bossa] Detected Arduino bootloader, enabling SAMD workarounds"
          );
        }

        return version;
      } catch (err) {
        lastError = err;
        console.warn(
          `[Bossa] Handshake attempt ${attempt + 1} failed: ${err.message}`
        );
        await this.flush(150);
      }
    }

    // "Suck it and see" mode - assume bootloader is there but silent
    if (proceedOnFailure) {
      console.warn(
        "[Bossa] Handshake failed but proceedOnFailure=true. Assuming bootloader is ready..."
      );
      // Send N# one more time to ensure binary mode
      try {
        await this.writeCommand("N#");
        await this.delay(100);
        await this.flush(50);
      } catch (e) {
        // Ignore
      }
      return "ASSUMED:Arduino Bootloader (SAM-BA extended) 2.0";
    }

    throw lastError || new Error("Handshake failed");
  }

  /**
   * Extended sync patterns for stubborn bootloaders
   */
  async extendedSync(attemptNum) {
    try {
      // Different sync strategies based on attempt number
      const strategies = [
        // Strategy 2: More 0x80 bytes with longer delays
        async () => {
          console.log("[Bossa] Sync strategy: Extended 0x80 preamble");
          for (let i = 0; i < 10; i++) {
            await this.writer.write(new Uint8Array([0x80]));
            await this.delay(5);
          }
          await this.writer.write(new Uint8Array([0x23])); // '#'
          await this.delay(50);
        },
        // Strategy 3: Newline wake-up
        async () => {
          console.log("[Bossa] Sync strategy: Newline wake-up");
          await this.writer.write(new Uint8Array([0x0a, 0x0d])); // LF CR
          await this.delay(20);
          await this.writer.write(new Uint8Array([0x80, 0x80, 0x23]));
          await this.delay(50);
        },
        // Strategy 4: SAM-BA classic (used by some Atmel tools)
        async () => {
          console.log("[Bossa] Sync strategy: SAM-BA classic");
          // Send '#' repeatedly to sync
          for (let i = 0; i < 5; i++) {
            await this.writer.write(new Uint8Array([0x23]));
            await this.delay(30);
          }
        },
        // Strategy 5: Break character simulation
        async () => {
          console.log("[Bossa] Sync strategy: Break simulation");
          // Send 0x00 bytes (simulates break at lower bauds)
          await this.writer.write(new Uint8Array([0x00, 0x00, 0x00]));
          await this.delay(50);
          await this.writer.write(new Uint8Array([0x80, 0x80, 0x23]));
          await this.delay(50);
        },
      ];

      const strategyIndex = (attemptNum - 2) % strategies.length;
      await strategies[strategyIndex]();
      await this.flush(100);
    } catch (err) {
      console.warn(`[Bossa] Extended sync error: ${err.message}`);
    }
  }

  async writeBinary(address, data) {
    // Command: S[addr],[size]#
    const cmd = `S${address.toString(16)},${data.length.toString(16)}#`;
    await this.writeCommand(cmd);

    // Workaround: The SAM firmware has a bug if command and data are in same USB packet.
    // We add a small delay to ensure they are sent separately.
    await new Promise((resolve) => setTimeout(resolve, 5));

    // Send Data
    console.log(`[Bossa] TX Binary: ${data.length} bytes`);
    await this.writer.write(data);
  }

  async readBinary(address, size) {
    // SAMD Bug Workaround: Limit read size to 63 bytes
    if (this.isSamd && size > 63) {
      const result = new Uint8Array(size);
      let offset = 0;
      while (offset < size) {
        const chunkSize = Math.min(size - offset, 63);
        const chunk = await this.readBinary(address + offset, chunkSize);
        result.set(chunk, offset);
        offset += chunkSize;
      }
      return result;
    }

    // Command: R[addr],[size]#
    const cmd = `R${address.toString(16)},${size.toString(16)}#`;
    await this.writeCommand(cmd);

    // Read binary response
    return await this.readBytes(size, 2000);
  }

  async go(address) {
    // Command: G[addr]#
    const cmd = `G${address.toString(16)}#`;
    await this.writeCommand(cmd);
  }
}
