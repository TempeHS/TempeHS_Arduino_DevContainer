import { ESPTool } from "../protocols/ESPTool.js";

export class ESPToolStrategy {
  constructor(logger) {
    this.name = "ESPTool (ESP32/ESP8266)";
    this.logger = logger || console.log;
  }

  async prepare(port) {
    this.logger("[ESPTool] Entering Bootloader Mode...");

    // Standard ESP32 Reset Sequence (NodeMCU/DevKit)
    // DTR controls IO0 (Boot), RTS controls EN (Reset)
    // Logic is inverted by transistors on most boards:
    // DTR = 1 -> IO0 = 0 (Low)
    // RTS = 1 -> EN = 0 (Low/Reset)

    // 1. Reset (EN=Low, IO0=High/Don't Care)
    // RTS=True, DTR=False
    await port.setSignals({ dataTerminalReady: false, requestToSend: true });
    await new Promise((r) => setTimeout(r, 100));

    // 2. Bootloader (EN=High, IO0=Low)
    // RTS=False, DTR=True
    await port.setSignals({ dataTerminalReady: true, requestToSend: false });
    await new Promise((r) => setTimeout(r, 1200)); // Wait for bootloader to init

    // 3. Release (EN=High, IO0=High)
    // RTS=False, DTR=False
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await new Promise((r) => setTimeout(r, 100));

    this.logger("[ESPTool] Reset sequence complete.");
  }

  async flash(port, data, progressCallback) {
    this.logger("[ESPTool] Starting flash process...");

    // ESP32 usually uses 115200 for initial connection, then can switch higher
    // But we assume the port is already open at 115200 from main.js

    const esptool = new ESPTool(port, this.logger);

    try {
      await esptool.connect();

      // 1. Sync
      const synced = await esptool.sync();
      if (!synced) throw new Error("Failed to sync with ESP32");

      // 2. Flash
      // data is ArrayBuffer (binary firmware)
      const firmware = new Uint8Array(data);
      const blockSize = 1024;
      const blocks = Math.ceil(firmware.length / blockSize);
      const offset = 0x10000; // Standard app offset for ESP32

      if (progressCallback) progressCallback(0, "Erasing...");
      await esptool.flashBegin(firmware.length, blocks, blockSize, offset);

      // Wait for erase (can take time)
      await new Promise((r) => setTimeout(r, 2000));

      for (let i = 0; i < blocks; i++) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, firmware.length);
        const chunk = firmware.subarray(start, end);

        await esptool.flashData(chunk, i);

        if (progressCallback) {
          progressCallback(Math.round(((i + 1) / blocks) * 100), "Flashing");
        }
      }

      if (progressCallback) progressCallback(100, "Finalizing...");
      await esptool.flashFinish(true);

      this.logger("[ESPTool] Flash complete.");

      // Reset to run code
      await port.setSignals({ dataTerminalReady: false, requestToSend: true });
      await new Promise((r) => setTimeout(r, 100));
      await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    } finally {
      await esptool.disconnect();
    }
  }
}
