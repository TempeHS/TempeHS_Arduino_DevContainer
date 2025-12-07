/**
 * Terminal UI Component
 *
 * Provides serial monitor functionality:
 * - XTerm.js-based terminal display
 * - Timestamp mode for debugging
 * - Log download capability
 * - Auto-resize on window changes
 *
 * @module client/ui/TerminalUI
 */

import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

// =============================================================================
// TerminalUI Class
// =============================================================================

/**
 * Terminal UI component for serial monitor display
 */
export class TerminalUI {
  /**
   * Create a new TerminalUI instance
   * @param {string} containerId - DOM element ID for the terminal container
   */
  constructor(containerId) {
    /** @type {HTMLElement} */
    this.container = document.getElementById(containerId);

    /** @type {Terminal} */
    this.term = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
      },
    });

    /** @type {FitAddon} */
    this.fitAddon = new FitAddon();
    this.term.loadAddon(this.fitAddon);

    this.term.open(this.container);
    this.fitAddon.fit();

    window.addEventListener("resize", () => {
      this.fitAddon.fit();
    });

    /** @type {string} Buffer for downloaded log data */
    this.buffer = "";

    /** @type {boolean} Whether to show timestamps */
    this.showTimestamp = false;

    /** @type {boolean} Track if last character was newline (for timestamp insertion) */
    this.lastCharWasNewline = true;
  }

  /**
   * Enable or disable timestamp mode
   * @param {boolean} enabled - Whether to show timestamps
   */
  setTimestampMode(enabled) {
    this.showTimestamp = enabled;
  }

  /**
   * Write data to the terminal
   * @param {string} data - Data to display
   */
  write(data) {
    this.buffer += data;

    if (!this.showTimestamp) {
      const formatted = data.replace(/\n/g, "\r\n");
      this.term.write(formatted);
      return;
    }

    // Handle timestamps
    let output = "";
    for (let i = 0; i < data.length; i++) {
      const char = data[i];

      if (this.lastCharWasNewline) {
        const time =
          new Date().toLocaleTimeString("en-US", { hour12: false }) +
          "." +
          String(new Date().getMilliseconds()).padStart(3, "0");
        output += `[${time}] `;
        this.lastCharWasNewline = false;
      }

      if (char === "\n") {
        output += "\r\n";
        this.lastCharWasNewline = true;
      } else {
        output += char;
      }
    }
    this.term.write(output);
  }

  /**
   * Clear the terminal display and buffer
   */
  clear() {
    this.term.clear();
    this.buffer = "";
  }

  /**
   * Download the terminal log as a text file
   */
  downloadLog() {
    const blob = new Blob([this.buffer], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `serial-log-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Register callback for terminal input data
   * @param {function} callback - Callback function receiving input data
   */
  onData(callback) {
    this.term.onData(callback);
  }

  /**
   * Fit the terminal to its container size
   */
  fit() {
    this.fitAddon.fit();
  }
}
