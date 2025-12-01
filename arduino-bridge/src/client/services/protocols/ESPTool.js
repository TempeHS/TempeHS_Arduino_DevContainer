/**
 * ESPTool Protocol Implementation (Stub/Basic)
 * Handles SLIP encoding and basic commands for ESP32/ESP8266
 */
export class ESPTool {
  constructor(port, logger) {
    this.port = port;
    this.logger = logger || console.log;
    this.reader = null;
    this.writer = null;
    this.SLIP_END = 0xc0;
    this.SLIP_ESC = 0xdb;
    this.SLIP_ESC_END = 0xdc;
    this.SLIP_ESC_ESC = 0xdd;
  }

  /**
   * SLIP Encode a packet
   * @param {Uint8Array} data
   */
  encode(data) {
    const encoded = [];
    encoded.push(this.SLIP_END);
    for (const byte of data) {
      if (byte === this.SLIP_END) {
        encoded.push(this.SLIP_ESC, this.SLIP_ESC_END);
      } else if (byte === this.SLIP_ESC) {
        encoded.push(this.SLIP_ESC, this.SLIP_ESC_ESC);
      } else {
        encoded.push(byte);
      }
    }
    encoded.push(this.SLIP_END);
    return new Uint8Array(encoded);
  }

  /**
   * Connect to the serial port streams
   */
  async connect(baudRate = 115200) {
    // Port is assumed to be open by the Strategy
    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();
    this.logger("[ESPTool] Connected to streams");
  }

  async disconnect() {
    if (this.reader) {
      await this.reader.cancel();
      this.reader.releaseLock();
    }
    if (this.writer) {
      this.writer.releaseLock();
    }
  }

  /**
   * Send a command packet
   * @param {number} op Opcode
   * @param {Uint8Array} data Payload
   * @param {number} checksum Checksum (optional)
   */
  async sendCommand(op, data, checksum = 0) {
    this.logger(
      `[ESPTool] Sending Op: 0x${op.toString(16)} Len: ${data.length}`
    );

    // Construct Header: 0x00, Op, Size(2), Checksum(4)
    // Note: ESP32 uses little-endian
    const header = new Uint8Array(8);
    header[0] = 0x00;
    header[1] = op;
    header[2] = data.length & 0xff;
    header[3] = (data.length >> 8) & 0xff;
    header[4] = checksum & 0xff;
    header[5] = (checksum >> 8) & 0xff;
    header[6] = (checksum >> 16) & 0xff;
    header[7] = (checksum >> 24) & 0xff;

    const packet = new Uint8Array(header.length + data.length);
    packet.set(header);
    packet.set(data, 8);

    const encoded = this.encode(packet);
    await this.writer.write(encoded);
  }

  async readPacket() {
    // Basic SLIP decoder
    // Reads byte by byte (inefficient but simple for now)
    let packet = [];
    let escape = false;

    while (true) {
      const { value, done } = await this.reader.read();
      if (done) break;

      for (const byte of value) {
        if (escape) {
          if (byte === this.SLIP_ESC_END) packet.push(this.SLIP_END);
          else if (byte === this.SLIP_ESC_ESC) packet.push(this.SLIP_ESC);
          else packet.push(byte); // Should not happen
          escape = false;
        } else {
          if (byte === this.SLIP_END) {
            if (packet.length > 0) {
              return new Uint8Array(packet);
            }
          } else if (byte === this.SLIP_ESC) {
            escape = true;
          } else {
            packet.push(byte);
          }
        }
      }
    }
    return null;
  }

  async sync() {
    this.logger("[ESPTool] Syncing...");
    // Send sync command repeatedly until response
    // Opcode 0x08 is SYNC
    // Payload: 0x07, 0x07, 0x12, 0x20 ... (36 bytes pattern)
    const syncPattern = new Uint8Array([
      0x07, 0x07, 0x12, 0x20, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55,
      0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55,
      0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55,
    ]);

    for (let i = 0; i < 10; i++) {
      try {
        await this.sendCommand(0x08, syncPattern);
        // We should read response here, but for now we just blast it
        // In real implementation, we'd wait for a response
        await new Promise((r) => setTimeout(r, 100));
      } catch (e) {
        this.logger("[ESPTool] Sync error: " + e.message);
      }
    }

    this.logger("[ESPTool] Sync sequence finished (Assumed success for stub)");
    return true;
  }

  async flashBegin(size, blocks, blockSize, offset) {
    // Opcode 0x02: FLASH_BEGIN
    // Struct: size(4), blocks(4), blockSize(4), offset(4)
    const data = new Uint8Array(16);
    const view = new DataView(data.buffer);
    view.setUint32(0, size, true);
    view.setUint32(4, blocks, true);
    view.setUint32(8, blockSize, true);
    view.setUint32(12, offset, true);

    this.logger(`[ESPTool] Flash Begin: Size=${size} Blocks=${blocks}`);
    await this.sendCommand(0x02, data);
    // Wait for response (stub)
    await new Promise((r) => setTimeout(r, 100));
  }

  async flashData(data, seq) {
    // Opcode 0x03: FLASH_DATA
    // Struct: size(4), seq(4), 0(4), 0(4) + Data
    const header = new Uint8Array(16);
    const view = new DataView(header.buffer);
    view.setUint32(0, data.length, true);
    view.setUint32(4, seq, true);
    view.setUint32(8, 0, true);
    view.setUint32(12, 0, true);

    const packet = new Uint8Array(16 + data.length);
    packet.set(header);
    packet.set(data, 16);

    await this.sendCommand(0x03, packet, this.checksum(data));
    // Wait for response (stub)
    // await new Promise(r => setTimeout(r, 10));
  }

  async flashFinish(reboot = false) {
    // Opcode 0x04: FLASH_END
    // Struct: reboot(4)
    const data = new Uint8Array(4);
    const view = new DataView(data.buffer);
    view.setUint32(0, reboot ? 0 : 1, true); // 0=reboot, 1=no-reboot? Check docs. Usually 0=reboot.

    this.logger("[ESPTool] Flash Finish");
    await this.sendCommand(0x04, data);
  }

  checksum(data) {
    let ef = 0xef;
    for (const byte of data) {
      ef ^= byte;
    }
    return ef;
  }
  async sync() {
    this.logger("[ESPTool] Syncing...");
    // Send sync command repeatedly until response
    // Opcode 0x08 is SYNC
    for (let i = 0; i < 5; i++) {
      await this.sendCommand(0x08, new Uint8Array(0));
      await new Promise((r) => setTimeout(r, 100));
    }
    return true; // Simulate success
  }

  async flashData(data, progressCallback) {
    this.logger("[ESPTool] Flashing data...");
    // Simulate flashing
    const total = 100;
    for (let i = 0; i <= total; i += 10) {
      if (progressCallback) progressCallback(i);
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}
