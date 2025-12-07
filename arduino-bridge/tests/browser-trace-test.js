/**
 * Browser-Compatible Protocol Trace Test
 *
 * This can be imported and run in the browser to test actual Bossa.js
 * with a mock port, capturing exact TX/RX sequences with timestamps.
 *
 * Usage in browser console:
 *   import { runProtocolTest } from './tests/browser-trace-test.js';
 *   await runProtocolTest();
 */

import { BossaProtocol } from "../src/client/services/protocols/Bossa.js";
import { BOSSA_RENESAS } from "../src/client/config/boardProtocols.js";

// ============================================================================
// MOCK PORT WITH TRACE CAPTURE
// ============================================================================

/**
 * MockSerialPort - Simulates Web Serial API port with trace capture
 *
 * Accurately simulates SAM-BA bootloader responses based on Samba.cpp
 */
export class MockSerialPort {
  constructor(options = {}) {
    this.name = options.name || "MockPort";
    this.trace = [];
    this.startTime = null;
    this.rxQueue = [];
    this.pendingBinaryBytes = 0;
    this.closed = true;
    this.verbose = options.verbose ?? true;

    // Simulated flash write timing (ms per 2KB)
    this.flashWriteMs = options.flashWriteMs ?? 20;
    // Simulated erase timing
    this.eraseMs = options.eraseMs ?? 50;
  }

  _timestamp() {
    if (!this.startTime) return "[------]";
    const elapsed = Date.now() - this.startTime;
    return `[${String(elapsed).padStart(6, "0")}]`;
  }

  _log(msg) {
    if (this.verbose) {
      console.log(`${this._timestamp()} [Mock] ${msg}`);
    }
  }

  _addTrace(direction, data, description = "") {
    const elapsed = this.startTime ? Date.now() - this.startTime : 0;
    const bytes =
      typeof data === "string"
        ? new TextEncoder().encode(data)
        : new Uint8Array(data);

    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    const ascii = Array.from(bytes)
      .map((b) => {
        if (b === 0x0a) return "\\n";
        if (b === 0x0d) return "\\r";
        if (b >= 0x20 && b <= 0x7e) return String.fromCharCode(b);
        return ".";
      })
      .join("");

    this.trace.push({
      time: elapsed,
      direction,
      bytes: Array.from(bytes),
      hex,
      ascii,
      description,
      timestamp: new Date().toISOString(),
    });
  }

  async _queueResponse(response, delayMs = 1) {
    await new Promise((r) => setTimeout(r, delayMs));
    this._addTrace("RX", response);
    this.rxQueue.push(new Uint8Array(response));
  }

  /**
   * Process a command and generate appropriate response
   */
  async _processCommand(cmd) {
    const cmdStr =
      typeof cmd === "string" ? cmd : new TextDecoder().decode(cmd);
    this._log(
      `Processing command: ${cmdStr
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")}`
    );

    // N# - Normal mode
    if (cmdStr === "N#") {
      await this._queueResponse([0x0a, 0x0d], 1); // \n\r
      return;
    }

    // V# - Version
    if (cmdStr === "V#") {
      const version = "Arduino Bootloader (SAM-BA extended) D21\n\r";
      await this._queueResponse(new TextEncoder().encode(version), 5);
      return;
    }

    // I# - Device Info
    if (cmdStr === "I#") {
      await this._queueResponse(new TextEncoder().encode("ARDUINO\n\r"), 2);
      return;
    }

    // X{addr}# - Erase
    const eraseMatch = cmdStr.match(/^X([0-9a-fA-F]+)#$/);
    if (eraseMatch) {
      this._log(
        `Simulating flash erase at 0x${eraseMatch[1]} (${this.eraseMs}ms)`
      );
      await this._queueResponse([0x58, 0x0a, 0x0d], this.eraseMs); // X\n\r
      return;
    }

    // S{addr},{size}# - SRAM write header (no ACK, expects binary data)
    const sramMatch = cmdStr.match(/^S([0-9a-fA-F]+),([0-9a-fA-F]+)#$/);
    if (sramMatch) {
      this.pendingBinaryBytes = parseInt(sramMatch[2], 16);
      this._log(`S command: expecting ${this.pendingBinaryBytes} binary bytes`);
      // No response for S command header - binary data follows
      return;
    }

    // Y{addr},{size}# - Flash write
    const flashMatch = cmdStr.match(/^Y([0-9a-fA-F]+),([0-9a-fA-F]+)#$/);
    if (flashMatch) {
      const size = parseInt(flashMatch[2], 16);
      if (size === 0) {
        // Y{addr},0# - Set copyOffset, fast ACK
        this._log(`Y command: set copyOffset to 0x${flashMatch[1]}`);
        await this._queueResponse([0x59, 0x0a, 0x0d], 1); // Y\n\r
      } else {
        // Y{addr},{size}# - Flash write, slow ACK
        this._log(
          `Y command: flash write ${size} bytes at 0x${flashMatch[1]} (${this.flashWriteMs}ms)`
        );
        await this._queueResponse([0x59, 0x0a, 0x0d], this.flashWriteMs); // Y\n\r
      }
      return;
    }

    // Z{addr},{size}# - CRC check
    const crcMatch = cmdStr.match(/^Z([0-9a-fA-F]+),([0-9a-fA-F]+)#$/);
    if (crcMatch) {
      // Return mock CRC
      const mockCrc = "DEADBEEF";
      await this._queueResponse(
        new TextEncoder().encode(`Z${mockCrc}#\n\r`),
        50
      );
      return;
    }

    // K# - System reset
    if (cmdStr === "K#") {
      await this._queueResponse([0x4b, 0x0a, 0x0d], 1); // K\n\r
      return;
    }

    // G{addr}# - Go/Jump (no response)
    if (cmdStr.match(/^G[0-9a-fA-F]+#$/)) {
      this._log("G command: jumping to address (no response)");
      return;
    }

    this._log(`Unknown command: ${cmdStr}`);
  }

  // ========== Web Serial API Interface ==========

  getInfo() {
    return { usbVendorId: 0x2341, usbProductId: 0x006d };
  }

  async open(options) {
    this._log(`open(baudRate: ${options?.baudRate})`);
    this.closed = false;
    if (!this.startTime) {
      this.startTime = Date.now();
    }
  }

  async close() {
    this._log("close()");
    this.closed = true;
  }

  async setSignals(signals) {
    this._log(
      `setSignals(DTR: ${signals.dataTerminalReady}, RTS: ${signals.requestToSend})`
    );
  }

  get readable() {
    const self = this;
    return {
      locked: false,
      getReader() {
        this.locked = true;
        return {
          async read() {
            // Wait for data with timeout
            const maxWait = 5000;
            const start = Date.now();
            while (self.rxQueue.length === 0 && !self.closed) {
              if (Date.now() - start > maxWait) {
                return { done: true };
              }
              await new Promise((r) => setTimeout(r, 5));
            }
            if (self.closed && self.rxQueue.length === 0) {
              return { done: true };
            }
            const data = self.rxQueue.shift();
            return { value: data, done: false };
          },
          releaseLock() {
            this.locked = false;
          },
          async cancel() {
            self.closed = true;
          },
        };
      },
    };
  }

  get writable() {
    const self = this;
    return {
      locked: false,
      getWriter() {
        this.locked = true;
        return {
          ready: Promise.resolve(),
          async write(data) {
            const bytes = new Uint8Array(data);

            // Check if this is binary data for S command
            if (self.pendingBinaryBytes > 0) {
              self._addTrace(
                "TX",
                bytes,
                `S binary data (${bytes.length}/${self.pendingBinaryBytes})`
              );
              self.pendingBinaryBytes -= bytes.length;
              if (self.pendingBinaryBytes <= 0) {
                self.pendingBinaryBytes = 0;
                self._log("S command binary data complete");
              }
              return;
            }

            // Regular command
            self._addTrace("TX", bytes);
            await self._processCommand(bytes);
          },
          releaseLock() {
            this.locked = false;
          },
        };
      },
    };
  }

  // ========== Trace Output ==========

  printTrace() {
    console.log("\n" + "═".repeat(100));
    console.log(`PROTOCOL TRACE: ${this.name}`);
    console.log("═".repeat(100));
    console.log(
      `${"Time".padEnd(10)} | ${"Dir".padEnd(4)} | ${"ASCII".padEnd(50)} | Hex`
    );
    console.log("─".repeat(100));

    for (const entry of this.trace) {
      const timeStr = `${entry.time}ms`.padEnd(10);
      const dirStr = entry.direction.padEnd(4);
      const asciiStr = entry.ascii.substring(0, 48).padEnd(50);
      console.log(`${timeStr} | ${dirStr} | ${asciiStr} | ${entry.hex}`);
    }

    console.log("═".repeat(100));
    console.log(`Total entries: ${this.trace.length}`);
    console.log("═".repeat(100) + "\n");
  }

  getTraceAsText() {
    const lines = [
      "═".repeat(100),
      `PROTOCOL TRACE: ${this.name}`,
      "═".repeat(100),
      `${"Time".padEnd(10)} | ${"Dir".padEnd(4)} | ${"ASCII".padEnd(50)} | Hex`,
      "─".repeat(100),
    ];

    for (const entry of this.trace) {
      const timeStr = `${entry.time}ms`.padEnd(10);
      const dirStr = entry.direction.padEnd(4);
      const asciiStr = entry.ascii.substring(0, 48).padEnd(50);
      lines.push(`${timeStr} | ${dirStr} | ${asciiStr} | ${entry.hex}`);
    }

    lines.push("═".repeat(100));
    lines.push(`Total entries: ${this.trace.length}`);

    return lines.join("\n");
  }
}

// ============================================================================
// REFERENCE TRACE GENERATOR (Source of Truth: Samba.cpp)
// ============================================================================

/**
 * Generate expected trace based on Samba.cpp behavior
 *
 * This is the SOURCE OF TRUTH for comparison
 */
export function generateReferenceTrace(firmwareSize, options = {}) {
  const trace = [];
  const CHUNK_SIZE =
    options.chunkSize || BOSSA_RENESAS.memory.chunkSize || 4096;
  const SRAM_OFFSET = options.sramOffset || 0x34;

  let time = 0;

  const tx = (cmd, desc = "") => {
    trace.push({
      time: time++,
      direction: "TX",
      ascii: cmd,
      description: desc,
    });
  };

  const rx = (response, delayMs = 1, desc = "") => {
    time += delayMs;
    trace.push({ time, direction: "RX", ascii: response, description: desc });
  };

  // === HANDSHAKE ===
  tx("N#", "Normal mode");
  rx("\\n\\r", 1, "N# ACK");

  time += 200; // Delay before V#

  tx("V#", "Get version");
  rx("Arduino Bootloader (SAM-BA extended) D21\\n\\r", 10, "Version response");

  time += 25;

  tx("I#", "Get device info");
  rx("ARDUINO\\n\\r", 5, "Info response");

  // === ERASE ===
  tx("X00000000#", "Erase flash at 0x0");
  rx("X\\n\\r", 50, "Erase ACK (blocking)");

  // === WRITE CHUNKS ===
  const numChunks = Math.ceil(firmwareSize / CHUNK_SIZE);

  for (let i = 0; i < numChunks; i++) {
    const chunkSize = Math.min(CHUNK_SIZE, firmwareSize - i * CHUNK_SIZE);
    const flashAddr = i * CHUNK_SIZE;

    const sramHex = SRAM_OFFSET.toString(16).padStart(8, "0");
    const flashHex = flashAddr.toString(16).padStart(8, "0");
    const sizeHex = chunkSize.toString(16).padStart(8, "0");

    // S command (SRAM write) - NO ACK per Samba.cpp
    tx(`S${sramHex},${sizeHex}#`, `SRAM write header chunk ${i + 1}`);
    time += 1;
    tx(`[${chunkSize} bytes binary]`, "Binary data");

    // usleep(10000) in Samba.cpp - wait for transmission
    time += 10;

    // Y command 1: Set source offset - IMMEDIATE ACK
    tx(`Y${sramHex},0#`, "Set copyOffset");
    rx("Y\\n\\r", 1, "Y(offset) ACK");

    time += 2;

    // Y command 2: Flash write - DELAYED ACK (after flash write completes)
    tx(`Y${flashHex},${sizeHex}#`, "Flash write");
    rx("Y\\n\\r", 20, "Y(flash) ACK (blocking)");

    time += 20;
  }

  // === COMPLETION ===
  time += 500; // Wait for flash settle

  // === RESET ===
  tx("K#", "System reset");
  rx("K\\n\\r", 1, "Reset ACK");

  return trace;
}

// ============================================================================
// TRACE COMPARISON
// ============================================================================

export function compareTraces(reference, actual) {
  console.log("\n" + "═".repeat(120));
  console.log("TRACE COMPARISON: Reference (Samba.cpp) vs Actual (Bossa.js)");
  console.log("═".repeat(120));

  const maxLen = Math.max(reference.length, actual.length);
  let differences = 0;
  const diffDetails = [];

  console.log(
    `\n${"#".padEnd(4)} | ${"Dir".padEnd(4)} | ${"Reference".padEnd(
      50
    )} | ${"Actual".padEnd(50)} | Status`
  );
  console.log("─".repeat(120));

  for (let i = 0; i < maxLen; i++) {
    const ref = reference[i];
    const act = actual[i];

    const refStr = ref ? ref.ascii.substring(0, 48) : "(missing)";
    const actStr = act ? act.ascii.substring(0, 48) : "(missing)";
    const refDir = ref?.direction || "??";
    const actDir = act?.direction || "??";

    let status = "✓";
    let statusClass = "match";

    if (!ref || !act) {
      status = "✗ MISSING";
      statusClass = "missing";
      differences++;
      diffDetails.push({ index: i, type: "missing", ref, act });
    } else if (refDir !== actDir) {
      status = "✗ DIR";
      statusClass = "wrong-dir";
      differences++;
      diffDetails.push({ index: i, type: "direction", ref, act });
    } else if (ref.ascii !== act.ascii) {
      // Allow binary data size variations
      if (ref.ascii.includes("[") && act.ascii.includes("[")) {
        status = "≈ (binary)";
        statusClass = "approx";
      } else {
        status = "✗ DATA";
        statusClass = "wrong-data";
        differences++;
        diffDetails.push({ index: i, type: "data", ref, act });
      }
    }

    const dir = refDir === actDir ? refDir : `${refDir}/${actDir}`;
    console.log(
      `${String(i).padStart(4)} | ${dir.padEnd(4)} | ${refStr.padEnd(
        50
      )} | ${actStr.padEnd(50)} | ${status}`
    );
  }

  console.log("─".repeat(120));
  console.log(
    `\n📊 SUMMARY: ${differences} differences found out of ${maxLen} entries`
  );

  if (differences > 0) {
    console.log("\n⚠️  DIFFERENCES DETAIL:");
    for (const diff of diffDetails) {
      console.log(`   [${diff.index}] ${diff.type.toUpperCase()}`);
      console.log(`       Reference: ${diff.ref?.ascii || "(missing)"}`);
      console.log(`       Actual:    ${diff.act?.ascii || "(missing)"}`);
    }
  } else {
    console.log("\n✅ PERFECT MATCH! Implementation matches source of truth.");
  }

  console.log("═".repeat(120) + "\n");

  return { differences, details: diffDetails };
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

export async function runProtocolTest(
  firmwareSize = 63 * 1024,
  verbose = true
) {
  console.log(
    "╔════════════════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║           BOSSA PROTOCOL TRACE TEST - Source of Truth Comparison          ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════════════════════╝"
  );

  console.log(`\n📦 Test Parameters:`);
  console.log(
    `   Firmware size: ${firmwareSize} bytes (${(firmwareSize / 1024).toFixed(
      1
    )} KB)`
  );
  const chunkSizeForDisplay = BOSSA_RENESAS.memory.chunkSize || 4096;
  console.log(`   Chunk size: ${chunkSizeForDisplay} bytes`);
  console.log(
    `   Expected chunks: ${Math.ceil(firmwareSize / chunkSizeForDisplay)}`
  );

  // Step 1: Generate reference trace
  console.log(
    "\n[1] Generating REFERENCE trace (Samba.cpp expected behavior)..."
  );
  const referenceTrace = generateReferenceTrace(firmwareSize);
  console.log(`    Generated ${referenceTrace.length} trace entries`);

  // Step 2: Create mock port and run actual Bossa.js
  console.log("\n[2] Running ACTUAL Bossa.js implementation with MockPort...");
  const mockPort = new MockSerialPort({ name: "Bossa.js Test", verbose });

  try {
    const bossa = new BossaProtocol(mockPort);

    // Open and connect
    await mockPort.open({ baudRate: 230400 });
    await bossa.connect();

    // Handshake
    console.log("    - Performing handshake...");
    await bossa.hello({ attempts: 1, proceedOnFailure: true });

    // Erase
    console.log("    - Erasing flash...");
    await bossa.chipErase(0);

    // Write firmware in chunks
    console.log("    - Writing firmware chunks...");
    const firmware = new Uint8Array(firmwareSize);
    // Fill with pattern for testing
    for (let i = 0; i < firmware.length; i++) {
      firmware[i] = i & 0xff;
    }

    const CHUNK_SIZE = BOSSA_RENESAS.memory.chunkSize || 4096;
    const SRAM_OFFSET = 0x34;
    let flashAddr = 0;

    for (let i = 0; i < firmware.length; i += CHUNK_SIZE) {
      const chunk = firmware.subarray(
        i,
        Math.min(i + CHUNK_SIZE, firmware.length)
      );
      await bossa.writeBinary(SRAM_OFFSET, chunk);
      await bossa.writeBuffer(SRAM_OFFSET, flashAddr, chunk.length);
      flashAddr += chunk.length;
    }

    // Wait and reset
    console.log("    - Resetting...");
    await new Promise((r) => setTimeout(r, 100));
    await bossa.reset();

    await bossa.disconnect();
  } catch (e) {
    console.error("    ❌ Error during test:", e.message);
  }

  // Step 3: Get actual trace
  const actualTrace = mockPort.trace.map((entry) => ({
    time: entry.time,
    direction: entry.direction,
    ascii: entry.ascii,
  }));
  console.log(`    Generated ${actualTrace.length} trace entries`);

  // Step 4: Print both traces
  console.log("\n[3] REFERENCE TRACE (first 40 entries):");
  for (let i = 0; i < Math.min(40, referenceTrace.length); i++) {
    const e = referenceTrace[i];
    console.log(
      `    [${String(e.time).padStart(5)}] ${e.direction}: ${e.ascii}`
    );
  }
  if (referenceTrace.length > 40) {
    console.log(`    ... (${referenceTrace.length - 40} more entries)`);
  }

  console.log("\n[4] ACTUAL TRACE (first 40 entries):");
  for (let i = 0; i < Math.min(40, actualTrace.length); i++) {
    const e = actualTrace[i];
    console.log(
      `    [${String(e.time).padStart(5)}] ${e.direction}: ${e.ascii}`
    );
  }
  if (actualTrace.length > 40) {
    console.log(`    ... (${actualTrace.length - 40} more entries)`);
  }

  // Step 5: Compare traces
  console.log("\n[5] Comparing traces...");
  const result = compareTraces(referenceTrace, actualTrace);

  // Full trace output
  console.log("\n[6] Full actual trace:");
  mockPort.printTrace();

  return result;
}

// Export for console use
if (typeof window !== "undefined") {
  window.runProtocolTest = runProtocolTest;
  window.MockSerialPort = MockSerialPort;
  window.generateReferenceTrace = generateReferenceTrace;
  window.compareTraces = compareTraces;
}
