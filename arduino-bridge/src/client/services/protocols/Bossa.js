import { UploadLogger } from "../utils/UploadLogger.js";

/**
 * BOSSA Protocol Implementation for Arduino R4 WiFi
 * Version: 1.2.0-minimal-logging
 */
export class BossaProtocol {
  constructor(port, logger = null) {
    this.port = port;
    this.reader = null;
    this.writer = null;
    this.isSamd = false;
    this.log = logger || new UploadLogger("BOSSA");
  }

  async connect() {
    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();
  }

  async disconnect() {
    if (this.reader) {
      await this.reader.cancel();
      this.reader.releaseLock();
      this.reader = null;
    }
    if (this.writer) {
      this.writer.releaseLock();
      this.writer = null;
    }
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async flush(durationMs = 200) {
    const deadline = Date.now() + durationMs;
    let totalFlushed = 0;
    try {
      while (Date.now() < deadline) {
        const remaining = Math.max(0, deadline - Date.now());
        const waitSlice = Math.min(remaining, 20);
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve("timeout"), waitSlice)
        );
        const result = await Promise.race([this.reader.read(), timeoutPromise]);
        if (result === "timeout") continue;
        const { value, done } = result;
        if (done) break;
        if (value && value.length) totalFlushed += value.length;
        else break;
      }
    } catch (e) {}
    if (totalFlushed > 0)
      this.log.info(
        `Flushed ${totalFlushed} stray byte${
          totalFlushed === 1 ? "" : "s"
        } from serial buffer`
      );
  }

  bytesToPrintable(bytes) {
    if (!bytes || !bytes.length) return "";
    return Array.from(bytes)
      .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : ""))
      .join("")
      .replace(/[\r\n]+/g, "")
      .replace(/>+$/, "")
      .trim();
  }

  async readAck(expectedCmd, timeout = 1000) {
    const collected = [];
    const start = Date.now();
    const expectedByte = expectedCmd.charCodeAt(0);

    while (collected.length < 3) {
      if (Date.now() - start > timeout) {
        this.log.error(`${expectedCmd}# ACK timeout after ${timeout}ms`);
        return false;
      }
      const remaining = Math.max(0, timeout - (Date.now() - start));
      const waitSlice = Math.min(remaining, 50);
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve("timeout"), waitSlice)
      );
      const result = await Promise.race([this.reader.read(), timeoutPromise]);
      if (result === "timeout") continue;
      const { value, done } = result;
      if (done) break;
      if (value && value.length) {
        collected.push(...value);
        if (value.includes(0x0d)) break;
      }
    }

    if (collected.includes(expectedByte)) return true;

    const gotHex = collected
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    this.log.error(
      `${expectedCmd}# ACK mismatch: received [${gotHex || "<empty>"}]`
    );
    return false;
  }

  async readUntilTerminator({ timeout = 1000, maxBytes = 256 }) {
    const collected = [];
    const start = Date.now();
    while (true) {
      if (Date.now() - start > timeout) throw new Error("Timeout");
      const remaining = Math.max(0, timeout - (Date.now() - start));
      const waitSlice = Math.min(remaining, 50);
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve("timeout"), waitSlice)
      );
      const result = await Promise.race([this.reader.read(), timeoutPromise]);
      if (result === "timeout") continue;
      const { value, done } = result;
      if (done) break;
      if (value && value.length) {
        collected.push(...value);
        if (collected.length >= maxBytes || value.includes(0x0d)) break;
      }
    }
    if (!collected.length) throw new Error("Timeout");
    return new Uint8Array(collected);
  }

  async writeCommand(cmd) {
    const encoder = new TextEncoder();
    await this.writer.write(encoder.encode(cmd));
  }

  async hello(options = {}) {
    const { proceedOnFailure = false, attempts = 3 } = options;
    this.log.section("HANDSHAKE");
    let lastError = null;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        this.log.command("N#", "Query bootloader (handshake start)");
        await this.writeCommand("N#");
        try {
          await this.readUntilTerminator({ timeout: 1000, maxBytes: 16 });
          this.log.response("N# ACK", "Bootloader responded to handshake");
        } catch (e) {
          this.log.warn("No ACK received after N# handshake command");
        }

        await this.delay(200);

        this.log.command("V#", "Request bootloader version string");
        await this.writeCommand("V#");
        const versionBytes = await this.readUntilTerminator({
          timeout: 2000,
          maxBytes: 256,
        });
        const version = this.bytesToPrintable(versionBytes);
        if (!version) throw new Error("Empty version");
        this.log.response(version, "Bootloader version string");

        try {
          await this.delay(25);
          this.log.command("I#", "Request bootloader info string");
          await this.writeCommand("I#");
          const infoBytes = await this.readUntilTerminator({
            timeout: 500,
            maxBytes: 64,
          });
          const info = this.bytesToPrintable(infoBytes);
          if (info) this.log.response(info, "Bootloader info string");
        } catch (e) {}

        if (version.includes("Arduino")) this.isSamd = true;
        this.log.success("Handshake successful");
        return version;
      } catch (err) {
        lastError = err;
        this.log.warn(
          `Handshake attempt ${attempt} failed: ${err.message || err}`
        );
        if (attempt < attempts) {
          await this.flush(100);
          await this.delay(200);
        }
      }
    }

    if (proceedOnFailure) {
      this.log.warn(
        "Proceeding despite handshake failure (proceedOnFailure enabled)"
      );
      return "ASSUMED:Arduino Bootloader";
    }
    this.log.error("Handshake failed after all attempts");
    throw lastError || new Error("Handshake failed");
  }

  async chipErase(startAddr) {
    const addrHex = startAddr.toString(16).padStart(8, "0");
    this.log.command(
      `X${addrHex}#`,
      "Chip erase command - bootloader erases flash pages"
    );
    await this.writeCommand(`X${addrHex}#`);

    const start = Date.now();
    const ok = await this.readAck("X", 5000);
    const ms = Date.now() - start;
    if (ok) {
      this.log.response("X# ACK", `Chip erase acknowledged in ${ms}ms`);
    } else {
      this.log.error(`Chip erase failed after ${ms}ms`);
    }
  }

  async writeBinary(address, data) {
    const addrHex = address.toString(16).padStart(8, "0");
    const sizeHex = data.length.toString(16).padStart(8, "0");

    // Log the S# command with first 8 bytes of data for debugging
    const firstBytes = Array.from(data.slice(0, Math.min(8, data.length)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    this.log.command(
      `S${addrHex},${sizeHex}#`,
      `Write ${data.length} bytes to data_buffer[0x${addrHex}]`
    );
    if (data.length)
      this.log.info(`Payload preview: ${firstBytes}... (first bytes)`);

    await this.writeCommand(`S${addrHex},${sizeHex}#`);
    await this.delay(5);

    const SUB_CHUNK_SIZE = 512;
    for (let offset = 0; offset < data.length; offset += SUB_CHUNK_SIZE) {
      const subChunk = data.subarray(
        offset,
        Math.min(offset + SUB_CHUNK_SIZE, data.length)
      );
      if (this.writer.ready) await this.writer.ready;
      await this.writer.write(subChunk);
    }

    const transmitTimeMs = Math.ceil((data.length * 10 * 1000) / 230400);
    await this.delay(transmitTimeMs + 20);
  }

  async writeBuffer(srcAddr, dstAddr, size) {
    const srcHex = srcAddr.toString(16).padStart(8, "0");
    const ySrcStart = Date.now();
    await this.writeCommand(`Y${srcHex},0#`);
    const ack1 = await this.readAck("Y", 1000);
    const ySrcElapsed = Date.now() - ySrcStart;
    if (ack1) {
      this.log.response(
        `Y${srcHex},0# ACK`,
        `Source buffer pointer accepted in ${ySrcElapsed}ms`
      );
    } else {
      this.log.error(`Y${srcHex},0# failed after ${ySrcElapsed}ms`);
    }

    await this.delay(2);

    const dstHex = dstAddr.toString(16).padStart(8, "0");
    const sizeHex = size.toString(16).padStart(8, "0");
    const yFlashStart = Date.now();
    await this.writeCommand(`Y${dstHex},${sizeHex}#`);
    const ack2 = await this.readAck("Y", 5000);
    const yFlashElapsed = Date.now() - yFlashStart;
    if (ack2) {
      this.log.response(
        `Y${dstHex},${sizeHex}# ACK`,
        `Copied ${size} bytes to flash in ${yFlashElapsed}ms`
      );
    } else {
      this.log.error(`Y${dstHex},${sizeHex}# failed after ${yFlashElapsed}ms`);
    }
  }

  async reset() {
    this.log.section("RESET");
    // Flush any pending data in serial buffer before sending reset
    await this.flush(100);
    this.log.command("K#", "System reset via NVIC_SystemReset() call");
    await this.writeCommand("K#");
    // Board resets almost immediately, so we may not get ACK
    const ok = await this.readAck("K", 1000);
    if (ok) {
      this.log.response("K# ACK", "Board acknowledged reset command");
    } else {
      this.log.warn("No ACK to K# (board likely reset immediately)");
    }
  }

  async go(address) {
    const addrHex = address.toString(16).padStart(8, "0");
    this.log.command(
      `G${addrHex}#`,
      `Execute application starting at ${UploadLogger.formatAddr(address)}`
    );
    await this.writeCommand(`G${addrHex}#`);
  }

  async writeWord(address, value) {
    const addrHex = address.toString(16).padStart(8, "0");
    const valHex = value.toString(16).padStart(8, "0");
    await this.writeCommand(`W${addrHex},${valHex}#`);
    await this.delay(2);
  }

  async readBinary(address, size) {
    if (this.isSamd && size > 63) {
      const result = new Uint8Array(size);
      let offset = 0;
      while (offset < size) {
        const chunkSize = Math.min(size - offset, 63);
        const chunk = await this.readBinary(address + offset, chunkSize);
        result.set(chunk, offset);
        offset += chunkSize;
      }
      return result;
    }
    await this.writeCommand(`R${address.toString(16)},${size.toString(16)}#`);
    return await this.readBytes(size, 2000);
  }

  async readBytes(count, timeout = 1000) {
    const result = new Uint8Array(count);
    let offset = 0;
    const startTime = Date.now();
    while (offset < count) {
      if (Date.now() - startTime > timeout)
        throw new Error(`Timeout (got ${offset}/${count})`);
      const remainingTime = timeout - (Date.now() - startTime);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), remainingTime)
      );
      const { value, done } = await Promise.race([
        this.reader.read(),
        timeoutPromise,
      ]);
      if (done) throw new Error("Stream closed");
      if (value) {
        const toCopy = Math.min(value.length, count - offset);
        result.set(value.subarray(0, toCopy), offset);
        offset += toCopy;
      }
    }
    return result;
  }

  static CRC16_TABLE = [
    0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7, 0x8108,
    0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef, 0x1231, 0x0210,
    0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6, 0x9339, 0x8318, 0xb37b,
    0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de, 0x2462, 0x3443, 0x0420, 0x1401,
    0x64e6, 0x74c7, 0x44a4, 0x5485, 0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee,
    0xf5cf, 0xc5ac, 0xd58d, 0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6,
    0x5695, 0x46b4, 0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d,
    0xc7bc, 0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
    0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b, 0x5af5,
    0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12, 0xdbfd, 0xcbdc,
    0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a, 0x6ca6, 0x7c87, 0x4ce4,
    0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41, 0xedae, 0xfd8f, 0xcdec, 0xddcd,
    0xad2a, 0xbd0b, 0x8d68, 0x9d49, 0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13,
    0x2e32, 0x1e51, 0x0e70, 0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a,
    0x9f59, 0x8f78, 0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e,
    0xe16f, 0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
    0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e, 0x02b1,
    0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256, 0xb5ea, 0xa5cb,
    0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d, 0x34e2, 0x24c3, 0x14a0,
    0x0481, 0x7466, 0x6447, 0x5424, 0x4405, 0xa7db, 0xb7fa, 0x8799, 0x97b8,
    0xe75f, 0xf77e, 0xc71d, 0xd73c, 0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657,
    0x7676, 0x4615, 0x5634, 0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9,
    0xb98a, 0xa9ab, 0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882,
    0x28a3, 0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
    0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92, 0xfd2e,
    0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9, 0x7c26, 0x6c07,
    0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1, 0xef1f, 0xff3e, 0xcf5d,
    0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8, 0x6e17, 0x7e36, 0x4e55, 0x5e74,
    0x2e93, 0x3eb2, 0x0ed1, 0x1ef0,
  ];

  static calculateCRC16(data) {
    let crc = 0;
    for (let i = 0; i < data.length; i++) {
      crc =
        ((crc << 8) ^ Bossa.CRC16_TABLE[((crc >> 8) ^ data[i]) & 0xff]) &
        0xffff;
    }
    return crc;
  }

  async verifyCRC(address, size, expectedData) {
    const addrHex = address.toString(16).padStart(8, "0");
    const sizeHex = size.toString(16).padStart(8, "0");
    this.log.command(
      `Z${addrHex},${sizeHex}#`,
      `Verify ${UploadLogger.formatSize(size)} at ${UploadLogger.formatAddr(
        address
      )} using device CRC`
    );
    await this.delay(100);
    await this.flush(50);
    await this.writeCommand(`Z${addrHex},${sizeHex}#`);
    try {
      const response = await this.readUntilTerminator({
        timeout: 5000,
        maxBytes: 16,
      });
      const responseStr = String.fromCharCode(...response);
      const cleanedResponse = responseStr
        .replace(/\r/g, "<CR>")
        .replace(/\n/g, "<LF>");
      this.log.response(
        `Z response: "${cleanedResponse}"`,
        "Device-supplied CRC digest"
      );
      const match = responseStr.match(/Z([0-9A-Fa-f]{8})#/);
      if (!match) {
        this.log.error(
          "CRC verification failed",
          "SAM-BA response did not include CRC value"
        );
        return false;
      }
      const flashCRC = parseInt(match[1], 16);
      const expectedCRC = Bossa.calculateCRC16(expectedData.slice(0, size));
      this.log.info(
        `Flash CRC: 0x${flashCRC
          .toString(16)
          .padStart(4, "0")}, Expected: 0x${expectedCRC
          .toString(16)
          .padStart(4, "0")}`
      );
      const crcMatch = flashCRC === expectedCRC;
      if (crcMatch) {
        this.log.success("Device CRC matches expected image");
      } else {
        this.log.error(
          "Device CRC mismatch",
          `Device reported 0x${flashCRC
            .toString(16)
            .padStart(4, "0")} but expected 0x${expectedCRC
            .toString(16)
            .padStart(4, "0")}`
        );
      }
      return crcMatch;
    } catch (e) {
      this.log.error("CRC verification exception", e);
      return false;
    }
  }
}
