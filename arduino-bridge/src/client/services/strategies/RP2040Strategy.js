import { UploadLogger } from "../utils/UploadLogger.js";

export class RP2040Strategy {
  constructor() {
    this.name = "RP2040 (UF2/Serial)";
    this.log = new UploadLogger("RP2040");
  }

  async prepare(port) {
    this.log.section("PREPARE: Entering RP2040 Bootloader Mode");

    const info = port.getInfo();
    this.log.device(
      info.usbVendorId,
      info.usbProductId,
      "Raspberry Pi RP2040-based board (Pico, etc.)"
    );

    this.log.info("RP2040 uses USB Mass Storage mode for firmware upload");
    this.log.info("1200 baud touch triggers entry into BOOTSEL mode");

    this.log.serialConfig(
      1200,
      "Opening at 1200 baud to trigger bootloader entry"
    );
    try {
      await port.open({ baudRate: 1200 });
      this.log.success("Port opened at 1200 baud");
    } catch (e) {
      this.log.warn(
        `Could not open at 1200 baud: ${e.message} (may already be in bootloader)`
      );
    }

    this.log.wait(100, "Brief pause for USB re-enumeration");
    await new Promise((r) => setTimeout(r, 100));

    try {
      await port.close();
      this.log.success(
        "Port closed - device should re-enumerate as RPI-RP2 mass storage"
      );
    } catch (e) {
      this.log.warn(`Port close warning: ${e.message}`);
    }

    this.log.success("1200 baud touch complete");
    this.log.info(
      "Device should now appear as 'RPI-RP2' USB mass storage drive"
    );
  }

  async flash(port, data, progressCallback) {
    this.log.section("FLASH: RP2040 UF2 Firmware Upload");

    this.log.info(
      `Firmware size: ${UploadLogger.formatSize(data.byteLength)} (UF2 format)`
    );
    this.log.info(
      "RP2040 uses drag-and-drop UF2 file upload (browser cannot write directly)"
    );

    // Create Blob from firmware data (UF2)
    this.log.info("Creating downloadable UF2 file...");
    const blob = new Blob([data], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    // Trigger Download
    this.log.info("Triggering browser download of firmware.uf2");
    const a = document.createElement("a");
    a.href = url;
    a.download = "firmware.uf2";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.log.success(
      "Firmware file downloaded to your browser's download folder"
    );

    // Show instructions
    this.log.info("Manual step required: Drag firmware.uf2 to RPI-RP2 drive");

    const message =
      "RP2040 Upload Steps:\n\n" +
      "1. The device should now be in Bootloader Mode (RPI-RP2 drive).\n" +
      "2. A 'firmware.uf2' file has been downloaded.\n" +
      "3. Drag and drop 'firmware.uf2' onto the RPI-RP2 drive.\n\n" +
      "The device will reboot automatically.";

    alert(message);

    // Mark as done
    if (progressCallback) progressCallback(100, "Done (Manual Drag & Drop)");
    this.log.success("Upload process complete (awaiting manual file copy)");
  }
}
