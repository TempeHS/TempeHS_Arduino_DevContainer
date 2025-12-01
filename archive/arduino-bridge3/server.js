const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { SerialPort } = require("serialport");

const PORT = 3600;
const LINK_PATH = "/tmp/arduinoUSB3";
const SOCAT_ARGS = [
  "-d",
  "-d",
  `pty,raw,echo=0,link=${LINK_PATH},mode=666`,
  "pty,raw,echo=0,mode=666",
];

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

let socatProcess = null;
let remotePtyPath = null;
let serialPort = null;
let lastDtrPulseTime = 0;
let vsToBrowserSeq = 0;
let browserToVsSeq = 0;
let handshakeActive = false;
let pendingHandshakeChunk = null;
let handshakeTimer = null;

const HANDSHAKE_PATTERN = Buffer.from([0x30, 0x20]);
const HANDSHAKE_FLUSH_DELAY_MS = 150;

function ts() {
  return new Date().toISOString();
}

function hexPreview(buffer, limit = 64) {
  if (!buffer) return "";
  const slice = buffer.length > limit ? buffer.subarray(0, limit) : buffer;
  const hex = Array.from(slice)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(" ");
  return buffer.length > limit
    ? `${hex} … (+${buffer.length - limit} bytes)`
    : hex;
}

function cleanupLink() {
  try {
    if (fs.existsSync(LINK_PATH)) {
      fs.unlinkSync(LINK_PATH);
      console.log(`[${ts()}] Removed existing link at ${LINK_PATH}`);
    }
  } catch (err) {
    console.error("Failed to remove existing link", err);
  }
}

function startSocat() {
  return new Promise((resolve, reject) => {
    cleanupLink();

    const ptyPaths = [];
    socatProcess = spawn("socat", SOCAT_ARGS, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const handleLine = (line) => {
      const match = line.match(/PTY is (.*)$/);
      if (match) {
        const pty = match[1].trim();
        ptyPaths.push(pty);
        console.log(`[${ts()}] socat reported PTY: ${pty}`);
        if (ptyPaths.length === 2) {
          // Second PTY is the bridge side (first is the linked one)
          remotePtyPath = ptyPaths[1];
          resolve(remotePtyPath);
        }
      }
    };

    socatProcess.stdout.on("data", (chunk) => {
      chunk.toString().split(/\r?\n/).filter(Boolean).forEach(handleLine);
    });

    socatProcess.stderr.on("data", (chunk) => {
      chunk.toString().split(/\r?\n/).filter(Boolean).forEach(handleLine);
    });

    socatProcess.on("exit", (code) => {
      console.error(`[${ts()}] socat exited with code ${code}`);
      remotePtyPath = null;
      if (serialPort) {
        serialPort.close(() => {
          serialPort = null;
        });
      }
    });

    socatProcess.on("error", (err) => {
      reject(err);
    });

    setTimeout(() => {
      if (!remotePtyPath) {
        reject(new Error("Timed out waiting for socat to create PTYs"));
      }
    }, 5000);
  });
}

function ensureSerialPort() {
  if (serialPort && serialPort.isOpen) {
    return Promise.resolve(serialPort);
  }
  if (!remotePtyPath) {
    return Promise.reject(new Error("Remote PTY path not ready"));
  }

  return new Promise((resolve, reject) => {
    serialPort = new SerialPort({
      path: remotePtyPath,
      baudRate: 115200,
      autoOpen: false,
    });

    serialPort.open((err) => {
      if (err) {
        return reject(err);
      }
      console.log(`[${ts()}] Opened bridge PTY ${remotePtyPath}`);
      serialPort.set({ dtr: true, rts: true }, () => {});
      resolve(serialPort);
    });
  });
}

function pulseDtr(socket) {
  const now = Date.now();
  if (now - lastDtrPulseTime < 2500) {
    return;
  }
  lastDtrPulseTime = now;
  console.log(`[${ts()}] Emitting pulse-dtr to browser (debounced)`);
  socket.emit("pulse-dtr");
}

(async () => {
  try {
    await startSocat();
    await ensureSerialPort();
  } catch (err) {
    console.error("Failed to initialize bridge:", err);
    process.exit(1);
  }
})();

io.on("connection", (socket) => {
  console.log(`[${ts()}] Browser client connected to bridge3`);
  vsToBrowserSeq = 0;
  browserToVsSeq = 0;

  let writeQueue = Promise.resolve();

  const logOutbound = (chunk, note = "") => {
    vsToBrowserSeq += 1;
    const suffix = note ? ` ${note}` : "";
    console.log(
      `[${ts()}] VS Code -> Browser [${vsToBrowserSeq}] (${
        chunk.length
      } bytes) | ${hexPreview(chunk)}${suffix}`
    );
  };

  const scheduleHandshakeFlush = () => {
    if (handshakeTimer) {
      clearTimeout(handshakeTimer);
    }
    handshakeTimer = setTimeout(() => {
      if (pendingHandshakeChunk) {
        logOutbound(pendingHandshakeChunk, "(handshake flush)");
        socket.emit("data", pendingHandshakeChunk);
      } else {
        console.log(
          `[${ts()}] Handshake flush triggered with no pending chunk`
        );
      }
      pendingHandshakeChunk = null;
      handshakeActive = false;
      handshakeTimer = null;
    }, HANDSHAKE_FLUSH_DELAY_MS);
  };

  const onSerialData = (data) => {
    if (!data || data.length === 0) {
      return;
    }

    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

    if (handshakeActive) {
      pendingHandshakeChunk = Buffer.from(buffer);
      console.log(
        `[${ts()}] Updated queued handshake chunk (${buffer.length} bytes)`
      );
      scheduleHandshakeFlush();
      return;
    }

    const detectedSync = buffer.includes(HANDSHAKE_PATTERN);

    // Detect STK500 sync attempt to trigger reset
    if (detectedSync) {
      console.log(
        `[${ts()}] Detected potential STK500 sync pattern; deferring chunk and pulsing DTR`
      );
      handshakeActive = true;
      pendingHandshakeChunk = Buffer.from(buffer);
      pulseDtr(socket);
      scheduleHandshakeFlush();
      return;
    }

    logOutbound(buffer);
    socket.emit("data", buffer);
  };

  const onSerialError = (err) => {
    console.error(`[${ts()}] Serial port error:`, err);
    socket.emit("error", "Bridge serial port error");
  };

  ensureSerialPort()
    .then((port) => {
      port.on("data", onSerialData);
      port.on("error", onSerialError);
    })
    .catch((err) => {
      console.error(`[${ts()}] Unable to open serial port:`, err);
      socket.emit("error", "Unable to open bridge serial port");
    });

  socket.on("data", (payload) => {
    if (!serialPort || !serialPort.isOpen) {
      return;
    }
    let buffer;
    if (payload instanceof ArrayBuffer) {
      buffer = Buffer.from(payload);
    } else if (Buffer.isBuffer(payload)) {
      buffer = payload;
    } else if (payload?.type === "Buffer" && Array.isArray(payload.data)) {
      buffer = Buffer.from(payload.data);
    } else {
      buffer = Buffer.from(payload);
    }

    browserToVsSeq += 1;
    console.log(
      `[${ts()}] Browser -> VS Code [${browserToVsSeq}] (${
        buffer.length
      } bytes) | ${hexPreview(buffer)}`
    );

    writeQueue = writeQueue.then(
      () =>
        new Promise((resolve, reject) => {
          const start = Date.now();
          serialPort.write(buffer, (err) => {
            if (err) {
              console.error(`[${ts()}] Serial write failed`, err);
              return reject(err);
            }
            serialPort.drain((drainErr) => {
              if (drainErr) {
                console.error(`[${ts()}] Serial drain failed`, drainErr);
                return reject(drainErr);
              }
              const elapsed = Date.now() - start;
              console.log(
                `[${ts()}] Serial write complete (${
                  buffer.length
                } bytes, ${elapsed} ms)`
              );
              resolve();
            });
          });
        })
    );
  });

  socket.on("disconnect", () => {
    console.log(`[${ts()}] Browser client disconnected from bridge3`);
    if (serialPort) {
      serialPort.removeListener("data", onSerialData);
      serialPort.removeListener("error", onSerialError);
    }
    if (handshakeTimer) {
      clearTimeout(handshakeTimer);
      handshakeTimer = null;
    }
    pendingHandshakeChunk = null;
    handshakeActive = false;
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[${ts()}] Bridge3 server running on port ${PORT}`);
  console.log(
    `[${ts()}] Exposed VS Code serial port: ${LINK_PATH}. Browse to forwarded port ${PORT}.`
  );
});

process.on("SIGINT", () => {
  if (serialPort && serialPort.isOpen) {
    serialPort.close(() => {});
  }
  if (socatProcess) {
    socatProcess.kill();
  }
  cleanupLink();
  process.exit(0);
});
