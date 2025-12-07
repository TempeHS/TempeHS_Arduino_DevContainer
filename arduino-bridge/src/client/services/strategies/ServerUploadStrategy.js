/**
 * ServerUploadStrategy - Uses server-side arduino-cli for upload
 *
 * This strategy bypasses Web Serial entirely and uses the server's
 * arduino-cli to handle the upload. This is necessary for boards
 * where Web Serial doesn't properly trigger USB CDC LINE_CODING events
 * (e.g., Arduino R4 WiFi, MKR series, SAMD boards).
 *
 * The server uses native tools (bossac, avrdude, etc.) that work reliably.
 */

import { UploadLogger } from "../utils/UploadLogger.js";

export class ServerUploadStrategy {
  constructor() {
    this.name = "Server-Side Upload";
    this.log = new UploadLogger("Server");
  }

  /**
   * Prepare is a no-op for server upload - the server handles everything
   */
  async prepare(port, fqbn) {
    this.log.section("PREPARE: Server-Side Upload");
    this.log.info("Server-side upload delegates all operations to arduino-cli");
    this.log.info(
      "The server handles 1200 baud touch, bootloader entry, and flashing"
    );
    this.log.info(`Board FQBN: ${fqbn || "not specified"}`);
  }

  /**
   * Flash using server-side arduino-cli upload
   *
   * @param {SerialPort} port - The Web Serial port (used to get port path info)
   * @param {ArrayBuffer} data - Firmware data (not used - server recompiles)
   * @param {Function} progressCallback - Progress callback
   * @param {string} fqbn - Board FQBN
   * @param {Object} options - Additional options including sketchPath
   */
  async flash(port, data, progressCallback, fqbn, options = {}) {
    this.log.section("FLASH: Server-Side arduino-cli Upload");

    if (progressCallback) progressCallback(5, "Preparing server upload...");

    // Get the sketch path from options or throw error
    const sketchPath = options.sketchPath;
    if (!sketchPath) {
      this.log.error("Missing required sketchPath option");
      throw new Error("ServerUploadStrategy requires sketchPath in options");
    }

    // Get the port path - this is tricky with Web Serial
    const portPath = options.portPath;
    if (!portPath) {
      this.log.error("Missing required portPath option");
      this.log.info("Use /api/ports to discover available serial ports");
      throw new Error(
        "ServerUploadStrategy requires portPath in options. Use /api/ports to discover available ports."
      );
    }

    this.log.info(`Sketch path: ${sketchPath}`);
    this.log.info(`Serial port: ${portPath}`);
    this.log.info(`Board FQBN: ${fqbn}`);

    if (progressCallback) progressCallback(10, "Uploading via server...");

    try {
      this.log.info("Sending upload request to server...");
      this.log.command(
        "POST /api/upload",
        `Request arduino-cli to compile and upload sketch to ${portPath}`
      );

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: sketchPath,
          fqbn: fqbn,
          port: portPath,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (
          Array.isArray(result.missingIncludes) &&
          result.missingIncludes.length
        ) {
          this.log.warn("Missing libraries detected during server compile.");
          result.missingIncludes.forEach((item) => {
            const suggestionNames = Array.isArray(item.suggestions)
              ? item.suggestions.map((lib) => lib.name).filter(Boolean)
              : [];

            if (suggestionNames.length) {
              this.log.info(
                `${item.header} → install ${suggestionNames.join(", ")}`
              );
            } else {
              this.log.info(
                `${item.header} → search Library Manager for "${item.query}"`
              );
            }
          });
        }
        this.log.error("Server upload failed", result.error || result);
        throw new Error(result.error || "Server upload failed");
      }

      if (progressCallback) progressCallback(100, "Upload complete!");
      this.log.success("Server-side upload completed successfully");

      if (result.output) {
        this.log.info("Server output:");
        // Log each line so multi-line CLI output stays readable
        result.output.split("\n").forEach((line) => {
          if (line.trim()) this.log.info(`  ${line}`);
        });
      }

      return result;
    } catch (error) {
      this.log.error("Upload failed", error);
      throw error;
    }
  }
}
