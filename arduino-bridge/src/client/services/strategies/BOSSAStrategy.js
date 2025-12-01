import { Bossa } from "../protocols/Bossa.js";

export class BOSSAStrategy {
  constructor() {
    this.name = "BOSSA (SAMD/Renesas)";
  }

  async prepare(port) {
    console.log("[BOSSA] Preparing device...");

    // Check if we can identify if it's already in bootloader mode?
    // For now, we assume if the user clicked upload, they want to flash.
    // We'll try to detect if it's a "touch" scenario.

    // 1200bps Touch to trigger bootloader
    console.log("[BOSSA] Performing 1200bps touch reset...");
    try {
      await port.open({ baudRate: 1200 });
    } catch (e) {
      console.warn(
        "[BOSSA] Failed to open at 1200bps (might be busy or already open):",
        e
      );
      // If it's already open, we might need to close it first?
      // But the port passed in should be closed by the caller usually.
    }

    // Wait a moment to ensure the setting takes effect
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      await port.close();
    } catch (e) {
      console.warn("[BOSSA] Failed to close port:", e);
    }

    console.log("[BOSSA] Touch complete. Device should be resetting.");

    // We throw a special error to stop the upload process and prompt the user
    // This is necessary because we need a new user gesture to select the new bootloader port
    const error = new Error(
      "Device resetting. Please wait for the device to re-appear (pulsing LED), then select the new port and click Upload again."
    );
    error.code = "RESET_REQUIRED";
    throw error;
  }

  async flash(port, data, progressCallback, fqbn) {
    console.log("[BOSSA] Starting flash...");

    await port.open({ baudRate: 115200 });

    const bossa = new Bossa(port);

    try {
      await bossa.connect();

      // Handshake
      if (progressCallback) progressCallback(5, "Handshake...");
      try {
        await bossa.hello();
      } catch (e) {
        console.warn("[BOSSA] Handshake warning:", e);
      }

      if (progressCallback) progressCallback(10, "Connected");

      // Determine Offset based on FQBN
      let offset = 0x2000; // Default for SAMD (MKR)
      if (fqbn && fqbn.includes("renesas_uno")) {
        offset = 0x4000; // Uno R4
      }

      // Prepare Data
      const firmware = new Uint8Array(data);
      const pageSize = 256;
      const totalBytes = firmware.length;

      if (progressCallback) progressCallback(10, "Flashing...");

      let currentAddr = offset;
      for (let i = 0; i < totalBytes; i += pageSize) {
        const chunk = firmware.subarray(i, Math.min(i + pageSize, totalBytes));

        // Write Chunk
        await bossa.writeBinary(currentAddr, chunk);
        currentAddr += chunk.length;

        if (progressCallback) {
          progressCallback(Math.round((i / totalBytes) * 100), "Flashing");
        }

        // Small delay to allow write
        await new Promise((r) => setTimeout(r, 10));
      }

      if (progressCallback) progressCallback(100, "Resetting...");

      // Reset
      // Address to jump to is usually the start of application (offset)
      // But BOSSA usually resets by writing to RSTC or just jumping.
      // Let's try jumping to offset.
      await bossa.go(offset);

      console.log("[BOSSA] Flash complete");
    } finally {
      await bossa.disconnect();
      await port.close();
    }
  }
}
