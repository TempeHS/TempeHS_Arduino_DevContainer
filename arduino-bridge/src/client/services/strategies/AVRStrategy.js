import { STK500 } from "../protocols/STK500.js";
import { UploadLogger } from "../utils/UploadLogger.js";

export class AVRStrategy {
  constructor() {
    this.name = "AVR (STK500)";
    this.log = new UploadLogger("AVR");
  }

  async prepare(port) {
    this.log.section("PREPARE: Entering Bootloader Mode");

    const info = port.getInfo();
    this.log.device(
      info.usbVendorId,
      info.usbProductId,
      "AVR-based board (Uno R3, Nano, Mega, etc.)"
    );

    this.log.info("Triggering board reset via DTR toggle");
    this.log.signal(
      "DTR",
      false,
      "Pull DTR LOW to trigger hardware reset on AVR boards"
    );
    await port.setSignals({ dataTerminalReady: false });

    this.log.wait(100, "Allow reset circuit to respond");
    await new Promise((r) => setTimeout(r, 100));

    this.log.signal(
      "DTR",
      true,
      "Release DTR - board enters bootloader for ~1 second"
    );
    await port.setSignals({ dataTerminalReady: true });

    this.log.wait(100, "Wait for bootloader to initialize");
    await new Promise((r) => setTimeout(r, 100));

    this.log.success("Reset sequence complete - bootloader should be active");
  }

  async flash(port, data, progressCallback) {
    this.log.section("FLASH: Uploading Firmware via STK500 Protocol");

    // data is ArrayBuffer, convert to string for STK500 (Intel Hex)
    const decoder = new TextDecoder();
    const hexString = decoder.decode(data);

    this.log.info(`Firmware size: ${data.byteLength} bytes (Intel HEX format)`);
    this.log.info("STK500 protocol used by AVR bootloaders (optiboot, etc.)");

    const flasher = new STK500(port, this.log.getLogFunction());
    await flasher.flashHex(hexString, progressCallback);

    this.log.success("Firmware upload complete!");
  }
}
