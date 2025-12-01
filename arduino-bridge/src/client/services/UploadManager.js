import { AVRStrategy } from "./strategies/AVRStrategy.js";
import { BOSSAStrategy } from "./strategies/BOSSAStrategy.js";
import { ESPToolStrategy } from "./strategies/ESPToolStrategy.js";
import { TeensyStrategy } from "./strategies/TeensyStrategy.js";
import { RP2040Strategy } from "./strategies/RP2040Strategy.js";

export class UploadManager {
  constructor() {
    this.strategies = {
      "arduino:avr": new AVRStrategy(),
      "arduino:renesas_uno": new BOSSAStrategy(),
      "arduino:samd": new BOSSAStrategy(),
      "esp32:esp32": new ESPToolStrategy(),
      "teensy:avr": new TeensyStrategy(),
      "arduino:mbed_nano": new BOSSAStrategy(), // Nano RP2040 Connect uses BOSSA
      "rp2040:rp2040": new RP2040Strategy(), // Generic RP2040
    };
  }

  getStrategy(fqbn) {
    if (!fqbn) return this.strategies["arduino:avr"];

    // Check for exact match or prefix match
    for (const key of Object.keys(this.strategies)) {
      if (fqbn.startsWith(key)) {
        return this.strategies[key];
      }
    }

    // Default to AVR
    return this.strategies["arduino:avr"];
  }

  async upload(port, hexString, progressCallback, fqbn) {
    const strategy = this.getStrategy(fqbn);
    if (!strategy) {
      throw new Error(`No upload strategy found for board: ${fqbn}`);
    }

    console.log(
      `[UploadManager] Using strategy for ${fqbn || "default (AVR)"}`
    );

    try {
      await strategy.prepare(port);
      await strategy.flash(port, hexString, progressCallback, fqbn);
    } catch (err) {
      console.error("[UploadManager] Upload failed:", err);
      throw err;
    }
  }
}
