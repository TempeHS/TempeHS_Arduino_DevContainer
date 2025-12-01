export class RP2040Strategy {
  constructor(logger) {
    this.name = "RP2040 (UF2/Serial)";
    this.logger = logger || console.log;
  }

  async prepare(port) {
    this.logger("[RP2040] Preparing...");
    // For Arduino Mbed core: 1200bps touch triggers bootloader (BOSSA style or MSD)
    // For Earle Philhower core: 1200bps touch triggers bootloader (RPI-RP2 MSD)

    this.logger("[RP2040] Performing 1200bps touch reset...");
    try {
      await port.open({ baudRate: 1200 });
    } catch (e) {
      // Ignore
    }
    await new Promise((r) => setTimeout(r, 100));
    try {
      await port.close();
    } catch (e) {
      // Ignore
    }

    this.logger("[RP2040] Touch complete.");
  }

  async flash(port, data, progressCallback) {
    this.logger("[RP2040] Flash Strategy");

    // Create Blob from firmware data (UF2)
    const blob = new Blob([data], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    // Trigger Download
    const a = document.createElement("a");
    a.href = url;
    a.download = "firmware.uf2";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.logger("[RP2040] Firmware downloaded.");

    // Show Modal or Alert
    const message =
      "RP2040 Upload Steps:\n\n" +
      "1. The device should now be in Bootloader Mode (RPI-RP2 drive).\n" +
      "2. A 'firmware.uf2' file has been downloaded.\n" +
      "3. Drag and drop 'firmware.uf2' onto the RPI-RP2 drive.\n\n" +
      "The device will reboot automatically.";

    alert(message);

    // Mark as done
    if (progressCallback) progressCallback(100, "Done (Manual Drag & Drop)");
  }
}
