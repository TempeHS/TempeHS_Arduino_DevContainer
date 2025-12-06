/**
 * Protocol Trace Test Harness
 *
 * Creates timestamped traces of BOSSA protocol operations to compare:
 * 1. Expected behavior (from Samba.cpp source of truth)
 * 2. Our Bossa.js implementation
 *
 * Usage: node tests/protocol-trace-test.js
 *
 * This produces timestamped output like:
 *   [0000.000] TX: N#
 *   [0000.001] RX: \n\r
 *   [0000.050] TX: V#
 *   [0000.052] RX: Arduino Bootloader (SAM-BA extended) D21\n\r
 *   ...
 */

import { BOSSA_RENESAS } from "../src/client/config/boardProtocols.js";

// Simple timestamp helper
function timestamp(startTime) {
  const elapsed = Date.now() - startTime;
  const secs = Math.floor(elapsed / 1000);
  const ms = elapsed % 1000;
  return `[${String(secs).padStart(4, "0")}.${String(ms).padStart(3, "0")}]`;
}

function hexDump(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

function asciiDump(bytes) {
  return Array.from(bytes)
    .map((b) => {
      if (b === 0x0a) return "<LF>";
      if (b === 0x0d) return "<CR>";
      if (b >= 0x20 && b <= 0x7e) return String.fromCharCode(b);
      return `<0x${b.toString(16).padStart(2, "0")}>`;
    })
    .join("");
}

/**
 * Trace Entry - represents one TX or RX operation
 */
class TraceEntry {
  constructor(direction, data, elapsedMs) {
    this.direction = direction; // 'TX' or 'RX'
    this.data = data; // Uint8Array or string
    this.elapsedMs = elapsedMs;
    this.timestamp = new Date().toISOString();
  }

  toString() {
    const ts = `[${String(Math.floor(this.elapsedMs / 1000)).padStart(
      4,
      "0"
    )}.${String(this.elapsedMs % 1000).padStart(3, "0")}]`;
    const bytes =
      typeof this.data === "string"
        ? new TextEncoder().encode(this.data)
        : this.data;
    const hex = hexDump(bytes);
    const ascii = asciiDump(bytes);
    return `${ts} ${this.direction}: ${ascii.padEnd(40)} | ${hex}`;
  }
}

/**
 * MockPort - Simulates a serial port with configurable responses
 *
 * This allows us to test the exact TX/RX sequence without real hardware
 */
class MockPort {
  constructor(name, responseMap = {}) {
    this.name = name;
    this.responseMap = responseMap;
    this.trace = [];
    this.startTime = Date.now();
    this.rxQueue = [];
    this.closed = false;

    // Create mock reader/writer
    this._setupStreams();
  }

  _setupStreams() {
    const self = this;

    // Mock readable stream
    this.readable = {
      locked: false,
      getReader() {
        this.locked = true;
        return {
          read: async () => {
            // Wait for data in queue
            while (self.rxQueue.length === 0 && !self.closed) {
              await new Promise((r) => setTimeout(r, 10));
            }
            if (self.closed && self.rxQueue.length === 0) {
              return { done: true };
            }
            const data = self.rxQueue.shift();
            return { value: data, done: false };
          },
          releaseLock: () => {
            this.locked = false;
          },
          cancel: async () => {
            self.closed = true;
          },
        };
      },
    };

    // Mock writable stream
    this.writable = {
      locked: false,
      getWriter() {
        this.locked = true;
        return {
          write: async (data) => {
            const elapsed = Date.now() - self.startTime;
            self.trace.push(new TraceEntry("TX", data, elapsed));

            // Find response for this command
            const cmd =
              typeof data === "string" ? data : new TextDecoder().decode(data);
            await self._generateResponse(cmd);
          },
          releaseLock: () => {
            this.locked = false;
          },
          ready: Promise.resolve(),
        };
      },
    };
  }

  async _generateResponse(cmd) {
    // Add small delay to simulate USB latency
    await new Promise((r) => setTimeout(r, 1));

    let response = null;
    const elapsed = Date.now() - this.startTime;

    // Match command patterns
    if (cmd === "N#") {
      // N# (Normal mode) - returns \n\r
      response = new Uint8Array([0x0a, 0x0d]);
    } else if (cmd === "V#") {
      // V# (Version) - returns version string + \n\r
      const version = "Arduino Bootloader (SAM-BA extended) D21";
      response = new TextEncoder().encode(version + "\n\r");
    } else if (cmd === "I#") {
      // I# (Info) - returns device info + \n\r
      response = new TextEncoder().encode("ARDUINO\n\r");
    } else if (cmd.startsWith("X") && cmd.endsWith("#")) {
      // X# (Erase) - simulate flash erase time (~50ms) + X\n\r
      await new Promise((r) => setTimeout(r, 50));
      response = new Uint8Array([0x58, 0x0a, 0x0d]); // X\n\r
    } else if (cmd.startsWith("S") && cmd.endsWith("#")) {
      // S# (SRAM write) - NO ACK, just receives binary data next
      // The binary data will be sent separately
      response = null; // No response for S command header
    } else if (cmd.startsWith("Y") && cmd.endsWith("#")) {
      // Y# (Flash write) - returns Y\n\r
      // Parse to check if it's Y{addr},0# or Y{addr},{size}#
      const match = cmd.match(/Y([0-9a-fA-F]+),([0-9a-fA-F]+)#/);
      if (match) {
        const size = parseInt(match[2], 16);
        if (size > 0) {
          // Flash write - simulate write time (~20ms per 2KB)
          await new Promise((r) => setTimeout(r, 20));
        }
      }
      response = new Uint8Array([0x59, 0x0a, 0x0d]); // Y\n\r
    } else if (cmd.startsWith("Z") && cmd.endsWith("#")) {
      // Z# (CRC) - returns Z{crc}#\n\r
      const crc = "12345678"; // Mock CRC
      response = new TextEncoder().encode(`Z${crc}#\n\r`);
    } else if (cmd === "K#") {
      // K# (Reset) - returns K\n\r then device resets
      response = new Uint8Array([0x4b, 0x0a, 0x0d]); // K\n\r
    } else if (cmd.startsWith("G") && cmd.endsWith("#")) {
      // G# (Go/Jump) - no response, device jumps
      response = null;
    }

    if (response) {
      this.trace.push(
        new TraceEntry("RX", response, Date.now() - this.startTime)
      );
      this.rxQueue.push(response);
    }
  }

  /**
   * Inject raw binary data as if sent (for S command data)
   */
  injectTxBinary(data) {
    const elapsed = Date.now() - this.startTime;
    this.trace.push(new TraceEntry("TX", data, elapsed));
  }

  getInfo() {
    return { usbVendorId: 0x2341, usbProductId: 0x006d };
  }

  async open(options) {
    console.log(`[MockPort:${this.name}] open(${JSON.stringify(options)})`);
    this.closed = false;
  }

  async close() {
    console.log(`[MockPort:${this.name}] close()`);
    this.closed = true;
  }

  async setSignals(signals) {
    console.log(
      `[MockPort:${this.name}] setSignals(${JSON.stringify(signals)})`
    );
  }

  printTrace() {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`TRACE: ${this.name}`);
    console.log(`${"=".repeat(80)}`);
    for (const entry of this.trace) {
      console.log(entry.toString());
    }
    console.log(`${"=".repeat(80)}\n`);
  }
}

/**
 * Reference implementation trace generator
 *
 * This generates the EXPECTED protocol trace based on Samba.cpp behavior
 */
function generateReferenceSambaTrace(firmwareSize) {
  const trace = [];
  let time = 0;
  const CHUNK_SIZE = BOSSA_RENESAS.memory.chunkSize || 4096;
  const SRAM_OFFSET = 0x34;

  const addTx = (cmd) => {
    trace.push({ time: time++, dir: "TX", data: cmd });
  };

  const addRx = (data, delay = 1) => {
    time += delay;
    trace.push({ time, dir: "RX", data });
  };

  // Handshake
  addTx("N#");
  addRx("\\n\\r", 1);

  time += 200; // USB capture shows ~219ms delay

  addTx("V#");
  addRx("Arduino Bootloader (SAM-BA extended) D21\\n\\r", 10);

  time += 25;

  addTx("I#");
  addRx("ARDUINO\\n\\r", 5);

  // Erase
  addTx("X00000000#");
  addRx("X\\n\\r", 50); // Erase takes ~50ms

  // Write chunks
  const numChunks = Math.ceil(firmwareSize / CHUNK_SIZE);

  for (let i = 0; i < numChunks; i++) {
    const chunkSize = Math.min(CHUNK_SIZE, firmwareSize - i * CHUNK_SIZE);
    const flashAddr = i * CHUNK_SIZE;

    const sramHex = SRAM_OFFSET.toString(16).padStart(8, "0");
    const flashHex = flashAddr.toString(16).padStart(8, "0");
    const sizeHex = chunkSize.toString(16).padStart(8, "0");

    // S command (SRAM write) - NO ACK
    addTx(`S${sramHex},${sizeHex}#`);
    time += 1;
    addTx(`[binary: ${chunkSize} bytes]`);

    // Wait for transmission (Samba.cpp: usleep(10000))
    time += 10;

    // Y command 1: Set source offset
    addTx(`Y${sramHex},0#`);
    addRx("Y\\n\\r", 1);

    time += 2; // Small gap between Y commands

    // Y command 2: Execute flash write
    addTx(`Y${flashHex},${sizeHex}#`);
    addRx("Y\\n\\r", 20); // Flash write takes ~20ms

    time += 20; // Inter-chunk delay
  }

  // Wait for completion
  time += 500;

  // Reset
  addTx("K#");
  addRx("K\\n\\r", 1);

  return trace;
}

/**
 * Format trace for display
 */
function formatTrace(trace) {
  const lines = [];
  for (const entry of trace) {
    const ts = `[${String(Math.floor(entry.time)).padStart(6, "0")}]`;
    lines.push(`${ts} ${entry.dir}: ${entry.data}`);
  }
  return lines.join("\n");
}

/**
 * Compare two traces and highlight differences
 */
function compareTraces(refTrace, actualTrace, refName, actualName) {
  console.log("\n" + "=".repeat(100));
  console.log("TRACE COMPARISON");
  console.log("=".repeat(100));
  console.log(`Reference: ${refName}`);
  console.log(`Actual:    ${actualName}`);
  console.log("=".repeat(100));

  const maxLen = Math.max(refTrace.length, actualTrace.length);
  let differences = 0;

  console.log(
    `\n${"#".padEnd(4)} | ${"Reference".padEnd(45)} | ${"Actual".padEnd(
      45
    )} | Match`
  );
  console.log("-".repeat(110));

  for (let i = 0; i < maxLen; i++) {
    const ref = refTrace[i];
    const act = actualTrace[i];

    const refStr = ref
      ? `${ref.dir}: ${ref.data}`.substring(0, 43)
      : "(missing)";
    const actStr = act
      ? `${act.dir}: ${act.data}`.substring(0, 43)
      : "(missing)";

    // Compare direction and command (not exact timing)
    let match = "✓";
    if (!ref || !act) {
      match = "✗ MISSING";
      differences++;
    } else if (ref.dir !== act.dir) {
      match = "✗ DIR";
      differences++;
    } else if (ref.data !== act.data) {
      // Allow timing variations in binary data markers
      if (ref.data.includes("[binary:") && act.data.includes("[binary:")) {
        match = "≈";
      } else {
        match = "✗ DATA";
        differences++;
      }
    }

    console.log(
      `${String(i).padStart(4)} | ${refStr.padEnd(45)} | ${actStr.padEnd(
        45
      )} | ${match}`
    );
  }

  console.log("-".repeat(110));
  console.log(`\nTotal differences: ${differences}`);
  return differences;
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function runTests() {
  console.log(
    "╔════════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║        BOSSA Protocol Trace Test - Source of Truth Comparison      ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════════════╝"
  );

  // Test parameters (simulate demo_plotter: ~63KB)
  const TEST_FIRMWARE_SIZE = 63 * 1024;
  const chunkSize = BOSSA_RENESAS.memory.chunkSize || 4096;

  console.log(`\nTest firmware size: ${TEST_FIRMWARE_SIZE} bytes`);
  console.log(`Chunk size: ${chunkSize} bytes`);
  console.log(`Expected chunks: ${Math.ceil(TEST_FIRMWARE_SIZE / chunkSize)}`);

  // Generate reference trace from Samba.cpp expected behavior
  console.log(
    "\n[1] Generating reference trace (Samba.cpp expected behavior)..."
  );
  const referenceTrace = generateReferenceSambaTrace(TEST_FIRMWARE_SIZE);
  console.log(`Reference trace: ${referenceTrace.length} entries`);

  // Show reference trace
  console.log("\n--- REFERENCE TRACE (Samba.cpp) ---");
  console.log(formatTrace(referenceTrace.slice(0, 30)));
  if (referenceTrace.length > 30) {
    console.log(`... (${referenceTrace.length - 30} more entries)`);
  }

  // Now we would run our implementation and capture its trace
  // For now, generate a "simulated actual" trace to demonstrate comparison
  console.log("\n[2] To test actual implementation:");
  console.log("    1. Import Bossa.js and BOSSAStrategy.js");
  console.log("    2. Use MockPort with trace capture");
  console.log("    3. Run flash() method");
  console.log("    4. Compare captured trace vs reference");

  // Example of what the comparison would look like
  console.log("\n[3] Example comparison output:");

  // Simulate an "actual" trace with some differences for demo
  const simulatedActual = [...referenceTrace];
  // Add a simulated difference - extra N# ping (the bug we fixed)
  if (simulatedActual.length > 20) {
    simulatedActual.splice(15, 0, { time: 100, dir: "TX", data: "N#" });
    simulatedActual.splice(16, 0, { time: 101, dir: "RX", data: "\\n\\r" });
  }

  compareTraces(
    referenceTrace.slice(0, 25),
    simulatedActual.slice(0, 27),
    "Samba.cpp",
    "Bossa.js (with bug)"
  );

  console.log(
    "\n╔════════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║                           TEST COMPLETE                            ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════════════╝"
  );
}

// Run if executed directly
runTests().catch(console.error);

// Export for use in browser/other tests
export {
  MockPort,
  TraceEntry,
  generateReferenceSambaTrace,
  compareTraces,
  formatTrace,
};
