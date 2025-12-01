import { STK500 } from "./STK500.js";

export class UploadManager {
  constructor() {
    this.flasher = null;
  }

  async upload(port, hexString, progressCallback) {
    // For now, we assume AVR/STK500 (Uno R3)
    // Future: Detect board type and choose strategy (e.g. BOSSA for R4)

    // We need to toggle DTR to reset the board
    await port.setSignals({ dataTerminalReady: false });
    await new Promise((r) => setTimeout(r, 100));
    await port.setSignals({ dataTerminalReady: true });
    await new Promise((r) => setTimeout(r, 100));

    this.flasher = new STK500(port, (msg) => console.log(msg));
    await this.flasher.flashHex(hexString, progressCallback);
  }
}
