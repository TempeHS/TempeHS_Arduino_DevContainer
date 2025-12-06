import { UploadLogger } from "../services/utils/UploadLogger.js";

const serialLogger = new UploadLogger("Serial");

export class WebSerialProvider {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.keepReading = false;
    this.listeners = {
      data: [],
      disconnect: [],
    };
  }

  async connect(baudRate = 9600, port = null) {
    try {
      this.port = port || (await navigator.serial.requestPort());

      // Check if port is already open, close it first
      if (this.port.readable || this.port.writable) {
        serialLogger.warn("Port already open, closing before reconnect");
        try {
          await this.port.close();
        } catch (e) {
          serialLogger.warn("Error closing existing port", e);
        }
        // Small delay to let the port fully close
        await new Promise((r) => setTimeout(r, 100));
      }

      serialLogger.info(`Opening port at ${baudRate} baud...`);
      await this.port.open({ baudRate });

      // Native USB boards (e.g., Uno R4) buffer output until DTR is asserted.
      // Raise both DTR/RTS like Arduino IDE so sketches start streaming data immediately.
      try {
        await this.port.setSignals({
          dataTerminalReady: true,
          requestToSend: true,
        });
      } catch (signalError) {
        serialLogger.warn("Unable to assert control signals", signalError);
      }
      serialLogger.success("Port opened - starting read loop");

      this.keepReading = true;
      this.readLoop();
      return true;
    } catch (error) {
      serialLogger.error("Error connecting to serial port", error);
      throw error;
    }
  }

  async disconnect() {
    this.keepReading = false;
    if (this.reader) {
      await this.reader.cancel();
    }
    if (this.writer) {
      await this.writer.close();
    }
    if (this.port) {
      try {
        await this.port.setSignals({
          dataTerminalReady: false,
          requestToSend: false,
        });
      } catch (signalError) {
        serialLogger.warn("Unable to clear control signals", signalError);
      }
      await this.port.close();
    }
    this.port = null;
    this.emit("disconnect");
  }

  async write(data) {
    if (!this.port || !this.port.writable) return;

    const encoder = new TextEncoder();
    const writer = this.port.writable.getWriter();
    await writer.write(encoder.encode(data));
    writer.releaseLock();
  }

  async setSignals(signals) {
    if (!this.port) return;
    await this.port.setSignals(signals);
  }

  /**
   * Close and reopen the port at a new baud rate without losing the port reference.
   * Used for baud rate detection/scanning.
   * @param {number} baudRate - New baud rate to open at
   * @returns {Promise<boolean>} - true if successful
   */
  async reopenAtBaud(baudRate) {
    if (!this.port) {
      serialLogger.error("Cannot reopen - no port connected");
      return false;
    }

    try {
      // Stop reading
      this.keepReading = false;
      if (this.reader) {
        await this.reader.cancel().catch(() => {});
        this.reader = null;
      }

      // Close the port
      try {
        await this.port.close();
      } catch (e) {
        serialLogger.warn("Error closing port during reopen", e);
      }

      // Small delay to let the port fully close
      await new Promise((r) => setTimeout(r, 100));

      // Reopen at new baud rate
      serialLogger.info(`Reopening port at ${baudRate} baud...`);
      await this.port.open({ baudRate });

      // Reassert DTR/RTS
      try {
        await this.port.setSignals({
          dataTerminalReady: true,
          requestToSend: true,
        });
      } catch (signalError) {
        serialLogger.warn(
          "Unable to assert control signals after reopen",
          signalError
        );
      }

      serialLogger.success(`Port reopened at ${baudRate} baud`);

      // Restart read loop
      this.keepReading = true;
      this.readLoop();

      return true;
    } catch (error) {
      serialLogger.error(`Failed to reopen at ${baudRate} baud`, error);
      return false;
    }
  }

  async readLoop() {
    serialLogger.info("Serial read loop started", {
      keepReading: this.keepReading,
      hasReadable: !!this.port?.readable,
    });

    while (this.port && this.port.readable && this.keepReading) {
      this.reader = this.port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) {
            serialLogger.info("Serial reader signaled completion");
            break;
          }
          if (value) {
            const decoder = new TextDecoder();
            this.emit("data", decoder.decode(value));
          }
        }
      } catch (error) {
        serialLogger.error("Error reading from serial port", error);
      } finally {
        this.reader.releaseLock();
        serialLogger.info("Serial reader released lock");
      }
    }
    serialLogger.info("Serial read loop stopped", {
      hasPort: !!this.port,
      hasReadable: !!this.port?.readable,
      keepReading: this.keepReading,
    });
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }
}
