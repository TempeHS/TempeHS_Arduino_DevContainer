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
      await this.port.open({ baudRate });

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
    while (this.port && this.port.readable && this.keepReading) {
      this.reader = this.port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) {
            break;
          }
          if (value) {
            const decoder = new TextDecoder();
            this.emit("data", decoder.decode(value));
          }
        }
      } catch (error) {
        console.error("Error reading from serial port:", error);
      } finally {
        this.reader.releaseLock();
      }
    }
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
