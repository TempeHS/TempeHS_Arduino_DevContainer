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
        console.log("[WebSerialProvider] Port already open, closing first...");
        try {
          await this.port.close();
        } catch (e) {
          console.warn("[WebSerialProvider] Error closing port:", e);
        }
        // Small delay to let the port fully close
        await new Promise((r) => setTimeout(r, 100));
      }

      console.log(`[WebSerialProvider] Opening port at ${baudRate} baud...`);
      await this.port.open({ baudRate });
      console.log("[WebSerialProvider] Port opened, starting read loop...");

      this.keepReading = true;
      this.readLoop();
      return true;
    } catch (error) {
      console.error("Error connecting to serial port:", error);
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

  async readLoop() {
    console.log(
      "[WebSerialProvider] readLoop started, keepReading:",
      this.keepReading
    );
    console.log("[WebSerialProvider] port.readable:", this.port?.readable);

    while (this.port && this.port.readable && this.keepReading) {
      console.log("[WebSerialProvider] Getting reader...");
      this.reader = this.port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) {
            console.log("[WebSerialProvider] Reader done signal received");
            break;
          }
          if (value) {
            const decoder = new TextDecoder();
            this.emit("data", decoder.decode(value));
          }
        }
      } catch (error) {
        console.error(
          "[WebSerialProvider] Error reading from serial port:",
          error
        );
      } finally {
        console.log("[WebSerialProvider] Releasing reader lock");
        this.reader.releaseLock();
      }
    }
    console.log(
      "[WebSerialProvider] readLoop exited. port:",
      !!this.port,
      "readable:",
      this.port?.readable,
      "keepReading:",
      this.keepReading
    );
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
