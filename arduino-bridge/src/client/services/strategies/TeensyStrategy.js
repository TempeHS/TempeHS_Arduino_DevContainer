import { WebHIDProvider } from "../../providers/WebHIDProvider.js";
import { UploadLogger } from "../utils/UploadLogger.js";

export class TeensyStrategy {
  constructor() {
    this.name = "Teensy (HalfKay/HID)";
    this.log = new UploadLogger("Teensy");
    this.provider = new WebHIDProvider();
    this.TEENSY_VID = 0x16c0;
    this.TEENSY_PID = 0x0486; // Bootloader mode
  }

  async prepare(port) {
    this.log.section("PREPARE: Teensy HID Bootloader Detection");

    this.log.info("Teensy boards use HID-based HalfKay bootloader protocol");
    this.log.info("Looking for Teensy in bootloader mode...");
    this.log.device(
      this.TEENSY_VID,
      this.TEENSY_PID,
      "Teensy bootloader (HalfKay protocol)"
    );

    this.log.warn(
      "If Teensy is not detected, press the PROGRAM button on the board"
    );
    this.log.info("The button forces entry into bootloader mode");
  }

  async flash(port, data, progressCallback) {
    this.log.section("FLASH: Uploading Firmware via HalfKay HID Protocol");

    this.log.info(`Firmware size: ${UploadLogger.formatSize(data.byteLength)}`);

    try {
      // Request HID device
      this.log.info("Requesting WebHID device access...");
      this.log.device(
        this.TEENSY_VID,
        this.TEENSY_PID,
        "Searching for Teensy bootloader"
      );

      const filters = [
        { vendorId: this.TEENSY_VID, productId: this.TEENSY_PID },
      ];
      const device = await this.provider.requestDevice(filters);

      if (!device) {
        this.log.error("Teensy not found in bootloader mode");
        throw new Error(
          "Teensy not found. Make sure it is in Bootloader mode (Press Button)."
        );
      }

      await this.provider.connect(device);
      this.log.success(`Connected to ${device.productName}`);
      this.log.info(`Product: ${device.productName}`);
      this.log.info(`Manufacturer: ${device.manufacturerName || "PJRC"}`);

      // Protocol info
      this.log.info("Protocol: HalfKay (Teensy-specific HID bootloader)");
      this.log.warn(
        "NOTE: Full HalfKay implementation disabled in this version"
      );
      this.log.warn(
        "This is a proof-of-concept - actual flashing disabled to prevent bricking"
      );

      if (progressCallback) progressCallback(10, "Erasing...");
      this.log.info("Simulating erase phase...");
      await new Promise((r) => setTimeout(r, 500));

      if (progressCallback) progressCallback(50, "Writing...");
      this.log.info("Simulating write phase...");
      await new Promise((r) => setTimeout(r, 500));

      if (progressCallback) progressCallback(100, "Done (Simulation)");
      this.log.success("Simulation complete");
      this.log.info(
        "For actual Teensy programming, use Teensy Loader application"
      );
    } catch (e) {
      this.log.error("Flash failed", e);
      throw e;
    } finally {
      this.log.info("Disconnecting from HID device");
      await this.provider.disconnect();
    }
  }
}
