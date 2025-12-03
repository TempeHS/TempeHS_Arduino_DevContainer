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

export class ServerUploadStrategy {
  constructor() {
    this.name = "Server-Side Upload";
  }

  /**
   * Prepare is a no-op for server upload - the server handles everything
   */
  async prepare(port, fqbn) {
    console.log("[ServerUpload] Prepare called - server will handle reset");
    // No preparation needed - arduino-cli handles the 1200 baud touch
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
    console.log("[ServerUpload] Starting server-side upload...");

    if (progressCallback) progressCallback(5, "Preparing server upload...");

    // Get the sketch path from options or throw error
    const sketchPath = options.sketchPath;
    if (!sketchPath) {
      throw new Error("ServerUploadStrategy requires sketchPath in options");
    }

    // Get the port path - this is tricky with Web Serial
    // We need to get it from the server's perspective
    const portPath = options.portPath;
    if (!portPath) {
      throw new Error(
        "ServerUploadStrategy requires portPath in options. Use /api/ports to discover available ports."
      );
    }

    if (progressCallback) progressCallback(10, "Uploading via server...");

    try {
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
        console.error("[ServerUpload] Upload failed:", result);
        throw new Error(result.error || "Server upload failed");
      }

      if (progressCallback) progressCallback(100, "Upload complete!");
      console.log("[ServerUpload] Upload successful");

      return result;
    } catch (error) {
      console.error("[ServerUpload] Error:", error);
      throw error;
    }
  }
}
