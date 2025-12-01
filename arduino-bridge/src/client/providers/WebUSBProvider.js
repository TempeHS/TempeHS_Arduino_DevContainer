export class WebUSBProvider {
  constructor() {
    this.device = null;
    this.interfaceNumber = 0;
    this.endpointIn = 0;
    this.endpointOut = 0;
  }

  async requestDevice(filters = []) {
    try {
      this.device = await navigator.usb.requestDevice({ filters });
      return this.device;
    } catch (error) {
      console.error("Error requesting USB device:", error);
      throw error;
    }
  }

  async connect(device) {
    this.device = device;
    await this.device.open();
    if (this.device.configuration === null) {
      await this.device.selectConfiguration(1);
    }

    // Find the first interface with bulk endpoints
    const configuration = this.device.configuration;
    let foundInterface = null;

    for (const iface of configuration.interfaces) {
      const alternate = iface.alternates[0];
      const endpoints = alternate.endpoints;

      const inEndpoint = endpoints.find(
        (e) => e.direction === "in" && e.type === "bulk"
      );
      const outEndpoint = endpoints.find(
        (e) => e.direction === "out" && e.type === "bulk"
      );

      if (inEndpoint && outEndpoint) {
        foundInterface = iface;
        this.interfaceNumber = iface.interfaceNumber;
        this.endpointIn = inEndpoint.endpointNumber;
        this.endpointOut = outEndpoint.endpointNumber;
        break;
      }
    }

    if (!foundInterface) {
      // Fallback to interface 0 if no bulk endpoints found (might be control transfer only?)
      this.interfaceNumber = 0;
      console.warn("No bulk endpoints found. Defaulting to Interface 0.");
    }

    await this.device.claimInterface(this.interfaceNumber);
  }

  async disconnect() {
    if (this.device) {
      await this.device.close();
      this.device = null;
    }
  }

  async transferOut(data) {
    if (!this.device) throw new Error("Device not connected");
    return await this.device.transferOut(this.endpointOut, data);
  }

  async transferIn(length) {
    if (!this.device) throw new Error("Device not connected");
    return await this.device.transferIn(this.endpointIn, length);
  }
}
