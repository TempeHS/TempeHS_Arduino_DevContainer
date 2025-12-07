/**
 * Upload Logger Utility
 *
 * Provides consistent, developer-friendly logging for upload strategies:
 * - Timestamps for timing analysis
 * - Clear event/action descriptions
 * - TX/RX byte logging with hex and ASCII representation
 * - Progress bars for long operations
 * - Hardware signal logging (DTR, RTS)
 * - Memory operation tracking
 *
 * @module client/services/utils/UploadLogger
 */

/**
 * Consistent logging utility for upload operations
 */
export class UploadLogger {
  /**
   * Create a new UploadLogger instance
   * @param {string} [prefix="Upload"] - Log message prefix
   */
  constructor(prefix = "Upload") {
    /** @type {string} Log message prefix */
    this.prefix = prefix;

    /** @type {number} Start time for elapsed calculations */
    this.startTime = Date.now();
  }

  /**
   * Get timestamp relative to upload start (or absolute HH:MM:SS.mmm)
   * @returns {string} Formatted timestamp
   */
  getTimestamp() {
    const now = new Date();
    return now.toISOString().slice(11, 23); // HH:MM:SS.mmm
  }

  /**
   * Get elapsed time since logger creation
   * @returns {number} Elapsed time in milliseconds
   */
  getElapsed() {
    return Date.now() - this.startTime;
  }

  /**
   * Format bytes as hex string
   * @param {Uint8Array|ArrayBuffer} bytes - Bytes to format
   * @param {number} [maxBytes=32] - Maximum bytes to display
   * @returns {string} Formatted hex string
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
   * @param {Uint8Array|ArrayBuffer} bytes - Bytes to format
   * @param {number} [maxBytes=64] - Maximum bytes to display
   * @returns {string} Formatted ASCII string
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
   * @param {number} addr - Address to format
   * @returns {string} Formatted address string
   */
  static formatAddr(addr) {
    return `0x${addr.toString(16).padStart(8, "0").toUpperCase()}`;
  }

  /**
   * Format size with unit
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
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
   * @param {string} title - Section title
   */
  section(title) {
    console.log(`\n[${this.prefix}] ════════════════════════════════════════`);
    console.log(`[${this.prefix}] ${title}`);
    console.log(`[${this.prefix}] ════════════════════════════════════════`);
  }

  /**
   * Log an informational message
   * @param {string} message - Message to log
   * @param {*} [details] - Additional details
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
   * @param {string} message - Success message
   */
  success(message) {
    const ts = this.getTimestamp();
    console.log(`[${this.prefix} ${ts}] ✅ ${message}`);
  }

  /**
   * Log a warning message
   * @param {string} message - Warning message
   * @param {*} [details] - Additional details
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
   * @param {string} message - Error message
   * @param {Error|string} [err] - Error object or message
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
   * @param {string} description - Description of the transmission
   * @param {Uint8Array} [bytes] - Bytes being sent
   * @param {string} [explanation] - Additional explanation
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
   * @param {string} description - Description of the reception
   * @param {Uint8Array} [bytes] - Bytes received
   * @param {string} [explanation] - Additional explanation
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
   * @param {string} cmd - Command being sent
   * @param {string} explanation - Explanation of the command
   */
  command(cmd, explanation) {
    const ts = this.getTimestamp();
    console.log(`[${this.prefix} ${ts}] 📤 CMD: ${cmd}`);
    console.log(`[${this.prefix} ${ts}]     └─ ${explanation}`);
  }

  /**
   * Log a response received (for text-based protocols)
   * @param {string} response - Response received
   * @param {string} [explanation] - Explanation of the response
   * @param {boolean} [success=true] - Whether the response indicates success
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
   * @param {number} percent - Progress percentage (0-100)
   * @param {string} stage - Current stage description
   * @param {string} [details] - Additional details
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
   * @param {string} operation - Operation being timed
   * @param {number} durationMs - Duration in milliseconds
   */
  timing(operation, durationMs) {
    const ts = this.getTimestamp();
    console.log(`[${this.prefix} ${ts}] ⏱️  ${operation}: ${durationMs}ms`);
  }

  /**
   * Log hardware signal changes (DTR, RTS, etc.)
   * @param {string} signalName - Signal name (e.g., "DTR", "RTS")
   * @param {boolean} value - Signal value (true=HIGH, false=LOW)
   * @param {string} explanation - Explanation of the signal change
   */
  signal(signalName, value, explanation) {
    const ts = this.getTimestamp();
    const valueStr = value ? "HIGH (1)" : "LOW (0)";
    console.log(`[${this.prefix} ${ts}] 🔌 ${signalName} = ${valueStr}`);
    console.log(`[${this.prefix} ${ts}]     └─ ${explanation}`);
  }

  /**
   * Log serial port configuration
   * @param {number} baudRate - Baud rate
   * @param {string} explanation - Explanation of the configuration
   */
  serialConfig(baudRate, explanation) {
    const ts = this.getTimestamp();
    console.log(`[${this.prefix} ${ts}] 🔧 Serial: ${baudRate} baud`);
    console.log(`[${this.prefix} ${ts}]     └─ ${explanation}`);
  }

  /**
   * Log memory operation (erase, write, read)
   * @param {string} operation - Operation type (e.g., "WRITE", "ERASE")
   * @param {number} address - Memory address
   * @param {number} size - Size in bytes
   * @param {string} explanation - Explanation of the operation
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
   * @param {number} chunkNum - Current chunk number
   * @param {number} totalChunks - Total number of chunks
   * @param {number} address - Chunk address
   * @param {number} size - Chunk size in bytes
   * @param {boolean} [isLast=false] - Whether this is the last chunk
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
   * @param {number} durationMs - Wait duration in milliseconds
   * @param {string} reason - Reason for the wait
   */
  wait(durationMs, reason) {
    const ts = this.getTimestamp();
    console.log(
      `[${this.prefix} ${ts}] ⏳ Waiting ${durationMs}ms - ${reason}`
    );
  }

  /**
   * Log device detection info
   * @param {number} vid - USB Vendor ID
   * @param {number} pid - USB Product ID
   * @param {string} description - Device description
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
   * @returns {Function} Bound log function
   */
  getLogFunction() {
    return (msg) => {
      const ts = this.getTimestamp();
      console.log(`[${this.prefix} ${ts}] ${msg}`);
    };
  }
}

/** @type {UploadLogger} Default singleton logger instance */
export const uploadLogger = new UploadLogger("Upload");
