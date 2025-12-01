import { WebHIDProvider } from "../../providers/WebHIDProvider.js";

export class TeensyStrategy {
  constructor(logger) {
    this.name = "Teensy (HalfKay/HID)";
    this.logger = logger || console.log;
    this.provider = new WebHIDProvider();
    this.TEENSY_VID = 0x16c0;
    this.TEENSY_PID = 0x0486; // Bootloader mode
  }

  async prepare(port) {
    this.logger("[Teensy] Checking for device...");
    // Teensy usually requires a button press to enter bootloader if not triggered by USB request
    // But we can try to find it.
    this.logger(
      "[Teensy] Please press the button on the Teensy if not detected."
    );
  }

  async flash(port, data, progressCallback) {
    this.logger("[Teensy] Starting flash process...");

    try {
      // Request HID device
      const filters = [
        { vendorId: this.TEENSY_VID, productId: this.TEENSY_PID },
      ];
      const device = await this.provider.requestDevice(filters);

      if (!device)
        throw new Error(
          "Teensy not found. Make sure it is in Bootloader mode (Press Button)."
        );

      await this.provider.connect(device);
      this.logger("[Teensy] Connected to " + device.productName);

      // Stub for HalfKay Protocol
      // Note: Full HalfKay implementation requires complex HID report handling.
      // For this Universal Bridge proof-of-concept, we verify connectivity
      // but do not perform the actual flash to avoid bricking devices with incorrect protocol.

      this.logger("[Teensy] Protocol: HalfKay (Stub)");
      this.logger("[Teensy] Note: Actual flashing disabled in this version.");

      if (progressCallback) progressCallback(10, "Erasing...");
      await new Promise((r) => setTimeout(r, 500));

      if (progressCallback) progressCallback(50, "Writing...");
      await new Promise((r) => setTimeout(r, 500));

      if (progressCallback) progressCallback(100, "Done (Simulation)");

      this.logger("[Teensy] Process Complete.");
    } catch (e) {
      this.logger("[Teensy] Error: " + e.message);
      throw e;
    } finally {
      await this.provider.disconnect();
    }
  }
}
