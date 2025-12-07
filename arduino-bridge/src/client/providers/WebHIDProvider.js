import { Logger } from "../../shared/Logger.js";

/** @type {Logger} */
const logger = new Logger("WebHID");

export class WebHIDProvider {
  constructor() {
    this.device = null;
  }

  async requestDevice(filters = []) {
    try {
      const devices = await navigator.hid.requestDevice({ filters });
      this.device = devices[0];
      return this.device;
    } catch (error) {
      logger.error("Error requesting HID device", error);
      throw error;
    }
  }

  async connect(device) {
    this.device = device;
    if (!this.device.opened) {
      await this.device.open();
    }
  }

  async disconnect() {
    if (this.device) {
      await this.device.close();
      this.device = null;
    }
  }

  async sendReport(reportId, data) {
    if (!this.device) throw new Error("Device not connected");
    await this.device.sendReport(reportId, data);
  }

  onInputReport(callback) {
    if (!this.device) throw new Error("Device not connected");
    this.device.addEventListener("inputreport", callback);
  }
}
