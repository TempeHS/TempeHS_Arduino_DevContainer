import { STK500 } from "../protocols/STK500.js";

export class AVRStrategy {
  constructor(logger) {
    this.logger = logger || console.log;
  }

  async prepare(port) {
    this.logger("[AVRStrategy] Resetting board via DTR...");
    // Toggle DTR to trigger reset on Uno R3
    await port.setSignals({ dataTerminalReady: false });
    await new Promise((r) => setTimeout(r, 100));
    await port.setSignals({ dataTerminalReady: true });
    await new Promise((r) => setTimeout(r, 100));
  }

  async flash(port, data, progressCallback) {
    // data is ArrayBuffer, convert to string for STK500 (Intel Hex)
    const decoder = new TextDecoder();
    const hexString = decoder.decode(data);

    const flasher = new STK500(port, (msg) => this.logger(`[AVR] ${msg}`));
    await flasher.flashHex(hexString, progressCallback);
  }
}
