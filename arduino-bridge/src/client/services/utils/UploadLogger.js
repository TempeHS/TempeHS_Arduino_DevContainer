/**
 * UploadLogger - Consistent logging utility for upload strategies
 *
 * Provides developer-friendly logging with:
 * - Timestamps for timing analysis
 * - Clear event/action descriptions
 * - TX/RX byte logging with hex and ASCII representation
 * - Consistent formatting across all upload strategies
 */

export class UploadLogger {
  constructor(prefix = "Upload") {
    this.prefix = prefix;
    this.startTime = Date.now();
  }

  /**
   * Get timestamp relative to upload start (or absolute HH:MM:SS.mmm)
   */
  getTimestamp() {
    const now = new Date();
    return now.toISOString().slice(11, 23); // HH:MM:SS.mmm
  }

  /**
   * Get elapsed time since logger creation
   */
  getElapsed() {
    return Date.now() - this.startTime;
  }

  /**
   * Format bytes as hex string
   */
  static bytesToHex(bytes, maxBytes = 32) {
    if (!bytes || !bytes.length) return "(empty)";
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const truncated = arr.length > maxBytes;
    const display = arr.slice(0, maxBytes);
    const hex = Array.from(display)
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join(" ");
    return truncated ? `${hex}... (+${arr.length - maxBytes} more)` : hex;
  }

  /**
   * Format bytes as ASCII with control character notation
   */
  static bytesToAscii(bytes, maxBytes = 64) {
    if (!bytes || !bytes.length) return "(empty)";
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const truncated = arr.length > maxBytes;
    const display = arr.slice(0, maxBytes);
    const ascii = Array.from(display)
      .map((b) => {
        if (b === 0x0a) return "<LF>";
        if (b === 0x0d) return "<CR>";
        if (b === 0x00) return "<NUL>";
        if (b >= 0x20 && b <= 0x7e) return String.fromCharCode(b);
        return `<${b.toString(16).padStart(2, "0")}>`;
      })
      .join("");
    return truncated ? `${ascii}... (+${arr.length - maxBytes} more)` : ascii;
  }

  /**
   * Format an address as 8-digit hex
   */
  static formatAddr(addr) {
    return `0x${addr.toString(16).padStart(8, "0").toUpperCase()}`;
  }

  /**
   * Format size with unit
   */
  static formatSize(bytes) {
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)}KB (${bytes} bytes)`;
    }
    return `${bytes} bytes`;
  }

  // ============ Core Logging Methods ============

  /**
   * Log a section header (major phase of upload)
   */
  section(title) {
    console.log(`\n[${this.prefix}] ════════════════════════════════════════`);
    console.log(`[${this.prefix}] ${title}`);
    console.log(`[${this.prefix}] ════════════════════════════════════════`);
  }

  /**
   * Log an informational message
   */
  info(message, details = null) {
    const ts = this.getTimestamp();
    if (details) {
      console.info(`[${this.prefix} ${ts}] ℹ️  ${message}`, details);
    } else {
      console.info(`[${this.prefix} ${ts}] ℹ️  ${message}`);
    }
  }

  /**
   * Log a success message
   */
  success(message) {
    const ts = this.getTimestamp();
    console.log(`[${this.prefix} ${ts}] ✅ ${message}`);
  }

  /**
   * Log a warning message
   */
  warn(message, details = null) {
    const ts = this.getTimestamp();
    if (details) {
      console.warn(`[${this.prefix} ${ts}] ⚠️  ${message}`, details);
    } else {
      console.warn(`[${this.prefix} ${ts}] ⚠️  ${message}`);
    }
  }

  /**
   * Log an error message
   */
  error(message, err = null) {
    const ts = this.getTimestamp();
    if (err) {
      console.error(
        `[${this.prefix} ${ts}] ❌ ${message}:`,
        err.message || err
      );
    } else {
      console.error(`[${this.prefix} ${ts}] ❌ ${message}`);
    }
  }

  /**
   * Log data being transmitted (TX)
   */
  tx(description, bytes = null, explanation = null) {
    const ts = this.getTimestamp();
    console.log(`[${this.prefix} ${ts}] 📤 TX: ${description}`);
    if (explanation) {
      console.log(`[${this.prefix} ${ts}]     └─ ${explanation}`);
    }
    if (bytes) {
      console.log(
        `[${this.prefix} ${ts}]     └─ Hex: ${UploadLogger.bytesToHex(bytes)}`
      );
    }
  }

  /**
   * Log data being received (RX)
   */
  rx(description, bytes = null, explanation = null) {
    const ts = this.getTimestamp();
    console.log(`[${this.prefix} ${ts}] 📥 RX: ${description}`);
    if (explanation) {
      console.log(`[${this.prefix} ${ts}]     └─ ${explanation}`);
    }
    if (bytes) {
      console.log(
        `[${this.prefix} ${ts}]     └─ Hex: ${UploadLogger.bytesToHex(bytes)}`
      );
      console.log(
        `[${this.prefix} ${ts}]     └─ ASCII: ${UploadLogger.bytesToAscii(
          bytes
        )}`
      );
    }
  }

  /**
   * Log a command being sent (for text-based protocols)
   */
  command(cmd, explanation) {
    const ts = this.getTimestamp();
    console.log(`[${this.prefix} ${ts}] 📤 CMD: ${cmd}`);
    console.log(`[${this.prefix} ${ts}]     └─ ${explanation}`);
  }

  /**
   * Log a response received (for text-based protocols)
   */
  response(response, explanation = null, success = true) {
    const ts = this.getTimestamp();
    const icon = success ? "📥" : "📥❌";
    console.log(`[${this.prefix} ${ts}] ${icon} RSP: ${response}`);
    if (explanation) {
      console.log(`[${this.prefix} ${ts}]     └─ ${explanation}`);
    }
  }

  /**
   * Log progress update
   */
  progress(percent, stage, details = null) {
    const ts = this.getTimestamp();
    const bar =
      "█".repeat(Math.floor(percent / 5)) +
      "░".repeat(20 - Math.floor(percent / 5));
    console.log(`[${this.prefix} ${ts}] [${bar}] ${percent}% - ${stage}`);
    if (details) {
      console.log(`[${this.prefix} ${ts}]     └─ ${details}`);
    }
  }

  /**
   * Log a timing measurement
   */
  timing(operation, durationMs) {
    const ts = this.getTimestamp();
    console.log(`[${this.prefix} ${ts}] ⏱️  ${operation}: ${durationMs}ms`);
  }

  /**
   * Log hardware signal changes (DTR, RTS, etc.)
   */
  signal(signalName, value, explanation) {
    const ts = this.getTimestamp();
    const valueStr = value ? "HIGH (1)" : "LOW (0)";
    console.log(`[${this.prefix} ${ts}] 🔌 ${signalName} = ${valueStr}`);
    console.log(`[${this.prefix} ${ts}]     └─ ${explanation}`);
  }

  /**
   * Log serial port configuration
   */
  serialConfig(baudRate, explanation) {
    const ts = this.getTimestamp();
    console.log(`[${this.prefix} ${ts}] 🔧 Serial: ${baudRate} baud`);
    console.log(`[${this.prefix} ${ts}]     └─ ${explanation}`);
  }

  /**
   * Log memory operation (erase, write, read)
   */
  memory(operation, address, size, explanation) {
    const ts = this.getTimestamp();
    const addrStr = UploadLogger.formatAddr(address);
    const sizeStr = UploadLogger.formatSize(size);
    console.log(
      `[${this.prefix} ${ts}] 💾 ${operation} @ ${addrStr}, ${sizeStr}`
    );
    console.log(`[${this.prefix} ${ts}]     └─ ${explanation}`);
  }

  /**
   * Log chunk write progress
   */
  chunk(chunkNum, totalChunks, address, size, isLast = false) {
    const ts = this.getTimestamp();
    const addrStr = UploadLogger.formatAddr(address);
    const lastTag = isLast ? " [FINAL]" : "";
    console.log(
      `[${this.prefix} ${ts}] 📝 Chunk ${chunkNum}/${totalChunks} @ ${addrStr} (${size} bytes)${lastTag}`
    );
  }

  /**
   * Log wait/delay with reason
   */
  wait(durationMs, reason) {
    const ts = this.getTimestamp();
    console.log(
      `[${this.prefix} ${ts}] ⏳ Waiting ${durationMs}ms - ${reason}`
    );
  }

  /**
   * Log device detection info
   */
  device(vid, pid, description) {
    const ts = this.getTimestamp();
    const vidStr = vid ? `0x${vid.toString(16).padStart(4, "0")}` : "unknown";
    const pidStr = pid ? `0x${pid.toString(16).padStart(4, "0")}` : "unknown";
    console.log(
      `[${this.prefix} ${ts}] 🔌 Device: VID=${vidStr}, PID=${pidStr}`
    );
    console.log(`[${this.prefix} ${ts}]     └─ ${description}`);
  }

  /**
   * Create a bound logger function for passing to protocols
   */
  getLogFunction() {
    return (msg) => {
      const ts = this.getTimestamp();
      console.log(`[${this.prefix} ${ts}] ${msg}`);
    };
  }
}

// Singleton instance for default usage
export const uploadLogger = new UploadLogger("Upload");
