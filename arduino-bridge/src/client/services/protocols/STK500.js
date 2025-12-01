export class STK500 {
  constructor(port, logger) {
    this.port = port;
    this.logger = logger || ((msg) => console.log(`[STK500] ${msg}`));
    this.reader = null;
    this.writer = null;
    this.debug = true;
  }

  log(msg) {
    if (this.debug) this.logger(msg);
  }

  async connect() {
    this.writer = this.port.writable.getWriter();
    this.reader = this.port.readable.getReader();
  }

  async disconnect() {
    if (this.writer) {
      this.writer.releaseLock();
      this.writer = null;
    }
    if (this.reader) {
      // Just release the lock. Port close will handle the rest.
      this.reader.releaseLock();
      this.reader = null;
    }
  }

  async send(data) {
    const uint8 = new Uint8Array(data);
    const hex = Array.from(uint8)
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join(" ");
    this.log(`TX: ${hex}`);
    await this.writer.write(uint8);
  }

  async receive(length, timeout = 1000) {
    const buffer = new Uint8Array(length);
    let offset = 0;
    const start = Date.now();

    while (offset < length) {
      if (Date.now() - start > timeout) {
        this.log(`Timeout waiting for ${length} bytes, got ${offset}`);
        throw new Error("Timeout receiving data");
      }

      const { value, done } = await this.reader.read();
      if (done) throw new Error("Port closed");

      if (value) {
        const hex = Array.from(value)
          .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
          .join(" ");
        this.log(`RX: ${hex}`);

        for (let i = 0; i < value.length && offset < length; i++) {
          buffer[offset++] = value[i];
        }
      }
    }
    return buffer;
  }

  async sync(attempts = 5) {
    for (let i = 0; i < attempts; i++) {
      try {
        this.log(`Sync attempt ${i + 1}...`);
        await this.send([0x30, 0x20]); // GET_SYNC, CRC_EOP
        const resp = await this.receive(2, 200);
        if (resp[0] === 0x14 && resp[1] === 0x10) {
          this.log("Synced!");
          return true;
        } else {
          this.log(
            `Sync failed: Expected 14 10, got ${resp[0].toString(
              16
            )} ${resp[1].toString(16)}`
          );
        }
      } catch (e) {
        this.log(`Sync attempt failed: ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("Failed to sync");
  }

  async enterProgMode() {
    this.log("Entering programming mode...");
    await this.send([0x50, 0x20]); // ENTER_PROGMODE, CRC_EOP
    const resp = await this.receive(2);
    if (resp[0] !== 0x14 || resp[1] !== 0x10)
      throw new Error(
        `Failed to enter prog mode. Got: ${resp[0].toString(
          16
        )} ${resp[1].toString(16)}`
      );
  }

  async leaveProgMode() {
    this.log("Leaving programming mode...");
    await this.send([0x51, 0x20]); // LEAVE_PROGMODE, CRC_EOP
    const resp = await this.receive(2);
    if (resp[0] !== 0x14 || resp[1] !== 0x10)
      throw new Error("Failed to leave prog mode");
  }

  async loadAddress(addr) {
    // Address is word-based for flash
    const low = addr & 0xff;
    const high = (addr >> 8) & 0xff;
    await this.send([0x55, low, high, 0x20]); // LOAD_ADDRESS
    const resp = await this.receive(2);
    if (resp[0] !== 0x14 || resp[1] !== 0x10)
      throw new Error("Failed to load address");
  }

  async progPage(data) {
    const blockSize = data.length;
    const high = (blockSize >> 8) & 0xff;
    const low = blockSize & 0xff;

    const cmd = new Uint8Array(5 + blockSize);
    cmd[0] = 0x64; // PROG_PAGE
    cmd[1] = high;
    cmd[2] = low;
    cmd[3] = 0x46; // 'F' for Flash
    cmd.set(data, 4);
    cmd[4 + blockSize] = 0x20; // CRC_EOP

    await this.send(cmd);
    const resp = await this.receive(2);
    if (resp[0] !== 0x14 || resp[1] !== 0x10)
      throw new Error("Failed to program page");
  }

  async flashHex(hexString, progressCallback) {
    // Parse Hex
    const data = this.parseHex(hexString);
    const pageSize = 128; // Atmega328P page size
    const totalBytes = data.length;

    this.log(`Flashing ${totalBytes} bytes...`);

    await this.connect();

    try {
      if (progressCallback) progressCallback(0, "Syncing...");
      await this.sync(20);

      if (progressCallback) progressCallback(0, "Entering Programming Mode...");
      await this.enterProgMode();

      let pageAddr = 0;
      for (let addr = 0; addr < totalBytes; addr += pageSize) {
        const chunk = data.subarray(
          addr,
          Math.min(addr + pageSize, totalBytes)
        );

        // Load Address (Word address)
        await this.loadAddress(pageAddr >> 1);

        // Write Page
        await this.progPage(chunk);

        pageAddr += chunk.length;

        if (progressCallback) {
          progressCallback(Math.round((addr / totalBytes) * 100), "Flashing");
        }
      }

      if (progressCallback) progressCallback(100, "Finalizing...");
      await this.leaveProgMode();
      this.log("Flash complete!");
    } finally {
      await this.disconnect();
    }
  }

  parseHex(hex) {
    // Simple Intel Hex parser
    const lines = hex.split("\n");
    const memory = new Uint8Array(32 * 1024); // 32KB max for Uno
    let maxAddr = 0;

    for (const line of lines) {
      if (!line.startsWith(":")) continue;
      const len = parseInt(line.substr(1, 2), 16);
      const addr = parseInt(line.substr(3, 4), 16);
      const type = parseInt(line.substr(7, 2), 16);

      if (type === 0) {
        // Data
        for (let i = 0; i < len; i++) {
          const byte = parseInt(line.substr(9 + i * 2, 2), 16);
          memory[addr + i] = byte;
        }
        if (addr + len > maxAddr) maxAddr = addr + len;
      }
    }

    return memory.subarray(0, maxAddr);
  }
}
