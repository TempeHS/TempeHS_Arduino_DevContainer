/**
 * BOSSA Protocol Implementation
 * Reference: https://github.com/shumatech/BOSSA/blob/master/src/Samba.cpp
 */
export class Bossa {
  constructor(port) {
    this.port = port;
    this.reader = null;
    this.writer = null;
  }

  async connect() {
    // Assume port is already open
    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();
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

  async readResponse() {
    const decoder = new TextDecoder();
    let response = "";
    while (true) {
      const { value, done } = await this.reader.read();
      if (done) break;
      if (value) {
        response += decoder.decode(value);
        // SAM-BA responses usually end with \n or \r
        if (response.includes("\n") || response.includes("\r")) {
          break;
        }
      }
    }
    return response.trim();
  }

  async writeCommand(cmd) {
    const encoder = new TextEncoder();
    await this.writer.write(encoder.encode(cmd));
  }

  async hello() {
    console.log("[Bossa] Handshake...");

    // Set Normal Mode
    await this.writeCommand("N#");
    // Note: 'N#' might not return a response on some versions, or returns \n\r
    // We'll try to read just in case, but with a timeout?
    // Actually, let's try getting the version.

    await this.writeCommand("V#");
    const version = await this.readResponse();
    console.log(`[Bossa] Device Version: ${version}`);
    return version;
  }

  async writeBinary(address, data) {
    // Command: S[addr],[size]#
    const cmd = `S${address.toString(16)},${data.length.toString(16)}#`;
    await this.writeCommand(cmd);

    // Send Data
    await this.writer.write(data);
  }

  async readBinary(address, size) {
    // Command: R[addr],[size]#
    const cmd = `R${address.toString(16)},${size.toString(16)}#`;
    await this.writeCommand(cmd);

    // Read binary response
    // This is tricky because we need to read exactly 'size' bytes
    // The current reader is locked to the stream.

    const result = new Uint8Array(size);
    let offset = 0;

    while (offset < size) {
      const { value, done } = await this.reader.read();
      if (done) break;
      if (value) {
        result.set(value, offset);
        offset += value.length;
      }
    }
    return result;
  }

  async go(address) {
    // Command: G[addr]#
    const cmd = `G${address.toString(16)}#`;
    await this.writeCommand(cmd);
  }
}
