import { WebSerialProvider } from "../providers/WebSerialProvider.js";

export class SerialManager {
  constructor() {
    this.provider = new WebSerialProvider();
    this.buffer = "";
    this.listeners = {
      line: [],
    };

    this.provider.on("data", (chunk) => {
      this.handleData(chunk);
    });
  }

  async connect(baudRate, port = null) {
    return await this.provider.connect(baudRate, port);
  }

  async disconnect() {
    return await this.provider.disconnect();
  }

  async write(data) {
    return await this.provider.write(data);
  }

  async setSignals(signals) {
    return await this.provider.setSignals(signals);
  }

  handleData(chunk) {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");

    // Process all complete lines
    while (lines.length > 1) {
      const line = lines.shift();
      this.emit("line", line);
    }

    // Keep the last partial line in buffer
    this.buffer = lines[0];
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
