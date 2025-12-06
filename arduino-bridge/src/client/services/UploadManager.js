import { AVRStrategy } from "./strategies/AVRStrategy.js";
import { BOSSAStrategy } from "./strategies/BOSSAStrategy.js";
import { ESPToolStrategy } from "./strategies/ESPToolStrategy.js";
import { TeensyStrategy } from "./strategies/TeensyStrategy.js";
import { RP2040Strategy } from "./strategies/RP2040Strategy.js";
import { UploadLogger } from "./utils/UploadLogger.js";

export class UploadManager {
  constructor() {
    this.log = new UploadLogger("Manager");
    this.strategies = {
      "arduino:avr": new AVRStrategy(),
      "arduino:renesas_uno": new BOSSAStrategy(),
      "arduino:samd": new BOSSAStrategy(),
      "arduino:esp32": new ESPToolStrategy(),
      "esp32:esp32": new ESPToolStrategy(),
      "teensy:avr": new TeensyStrategy(),
      "arduino:mbed_nano": new BOSSAStrategy(),
      "arduino:mbed_portenta": new BOSSAStrategy(),
      "arduino:mbed_rp2040": new RP2040Strategy(),
      "rp2040:rp2040": new RP2040Strategy(),
    };
  }

  getStrategy(fqbn) {
    if (!fqbn) return this.strategies["arduino:avr"];

    for (const key of Object.keys(this.strategies)) {
      if (fqbn.startsWith(key)) {
        return this.strategies[key];
      }
    }

    return this.strategies["arduino:avr"];
  }

  async upload(port, hexString, progressCallback, fqbn) {
    const strategy = this.getStrategy(fqbn);
    if (!strategy) {
      throw new Error(`No upload strategy found for board: ${fqbn}`);
    }

    this.log.info(
      `Using ${strategy.name || "unknown strategy"} for ${
        fqbn || "default (arduino:avr)"
      }`
    );

    try {
      await strategy.prepare(port, fqbn);
      await strategy.flash(port, hexString, progressCallback, fqbn);
    } catch (err) {
      this.log.error("Upload failed", err);
      throw err;
    }
  }
}
