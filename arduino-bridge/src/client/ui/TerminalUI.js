import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

export class TerminalUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.term = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
      },
    });
    this.fitAddon = new FitAddon();
    this.term.loadAddon(this.fitAddon);

    this.term.open(this.container);
    this.fitAddon.fit();

    window.addEventListener("resize", () => {
      this.fitAddon.fit();
    });

    this.buffer = ""; // Store all data for download
    this.showTimestamp = false;
    this.lastCharWasNewline = true;
  }

  setTimestampMode(enabled) {
    this.showTimestamp = enabled;
  }

  write(data) {
    this.buffer += data;

    if (!this.showTimestamp) {
      // Convert newlines to CRLF for xterm
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

  clear() {
    this.term.clear();
    this.buffer = "";
  }

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

  onData(callback) {
    this.term.onData(callback);
  }

  fit() {
    this.fitAddon.fit();
  }
}
