import { ESPToolProtocol } from "../protocols/ESPTool.js";
import { UploadLogger } from "../utils/UploadLogger.js";

export class ESPToolStrategy {
  constructor() {
    this.name = "ESPTool (ESP32/ESP8266)";
    this.log = new UploadLogger("ESP");
  }

  async prepare(port) {
    this.log.section("PREPARE: Entering ESP32/ESP8266 Bootloader Mode");

    const info = port.getInfo();
    this.log.device(
      info.usbVendorId,
      info.usbProductId,
      "ESP32/ESP8266 board with USB-UART bridge"
    );

    this.log.info("ESP32 Reset Sequence (NodeMCU/DevKit style)");
    this.log.info("DTR controls IO0 (Boot pin), RTS controls EN (Reset)");
    this.log.info("Logic is inverted by transistors on most dev boards");

    // 1. Reset (EN=Low, IO0=High/Don't Care)
    this.log.signal("DTR", false, "IO0 = HIGH (don't care during reset)");
    this.log.signal("RTS", true, "EN = LOW → Hold chip in reset state");
    await port.setSignals({ dataTerminalReady: false, requestToSend: true });
    this.log.wait(100, "Hold reset");
    await new Promise((r) => setTimeout(r, 100));

    // 2. Bootloader (EN=High, IO0=Low)
    this.log.signal("DTR", true, "IO0 = LOW → Select bootloader mode");
    this.log.signal(
      "RTS",
      false,
      "EN = HIGH → Release reset, boot into bootloader"
    );
    await port.setSignals({ dataTerminalReady: true, requestToSend: false });
    this.log.wait(1200, "Wait for ROM bootloader to initialize (~1.2 seconds)");
    await new Promise((r) => setTimeout(r, 1200));

    // 3. Release (EN=High, IO0=High)
    this.log.signal("DTR", false, "IO0 = HIGH → Release boot pin");
    this.log.signal("RTS", false, "EN = HIGH → Keep running");
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    this.log.wait(100, "Stabilize");
    await new Promise((r) => setTimeout(r, 100));

    this.log.success(
      "Reset sequence complete - ESP should be in bootloader mode"
    );
  }

  async flash(port, data, progressCallback) {
    this.log.section("FLASH: Uploading Firmware via ESPTool Protocol");

    const firmware = new Uint8Array(data);
    this.log.info(
      `Firmware size: ${UploadLogger.formatSize(firmware.length)} (binary)`
    );
    this.log.info("Using SLIP-encoded serial protocol for ESP ROM bootloader");

    const esptool = new ESPToolProtocol(port, this.log.getLogFunction());

    try {
      this.log.info("Connecting to ESP bootloader streams");
      await esptool.connect();

      // 1. Sync
      this.log.info("Sending SYNC command to establish communication");
      const synced = await esptool.sync();
      if (!synced) {
        this.log.error("Failed to sync with ESP bootloader");
        throw new Error("Failed to sync with ESP32");
      }
      this.log.success("Synced with ESP bootloader");

      // 2. Flash setup
      const blockSize = 1024;
      const blocks = Math.ceil(firmware.length / blockSize);
      const offset = 0x10000; // Standard app offset for ESP32

      this.log.memory(
        "FLASH_BEGIN",
        offset,
        firmware.length,
        `Prepare to write ${blocks} blocks of ${blockSize} bytes each`
      );

      if (progressCallback) progressCallback(0, "Erasing...");
      this.log.info("Sending FLASH_BEGIN - this triggers flash erase");
      await esptool.flashBegin(firmware.length, blocks, blockSize, offset);

      this.log.wait(
        2000,
        "Wait for flash erase to complete (can take several seconds)"
      );
      await new Promise((r) => setTimeout(r, 2000));

      // 3. Write blocks
      this.log.info(`Writing ${blocks} blocks to flash...`);
      for (let i = 0; i < blocks; i++) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, firmware.length);
        const chunk = firmware.subarray(start, end);

        this.log.chunk(
          i + 1,
          blocks,
          offset + start,
          chunk.length,
          i === blocks - 1
        );
        await esptool.flashData(chunk, i);

        if (progressCallback) {
          progressCallback(Math.round(((i + 1) / blocks) * 100), "Flashing");
        }
      }

      // 4. Finalize
      if (progressCallback) progressCallback(100, "Finalizing...");
      this.log.info("Sending FLASH_END command to finalize and reboot");
      await esptool.flashFinish(true);

      this.log.success("Flash complete!");

      // Reset to run code
      this.log.info("Triggering reset to run new firmware");
      this.log.signal("RTS", true, "EN = LOW → Reset");
      await port.setSignals({ dataTerminalReady: false, requestToSend: true });
      await new Promise((r) => setTimeout(r, 100));
      this.log.signal("RTS", false, "EN = HIGH → Run");
      await port.setSignals({ dataTerminalReady: false, requestToSend: false });

      this.log.success("ESP32 should now be running the new firmware");
    } finally {
      await esptool.disconnect();
    }
  }
}
