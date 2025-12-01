const socket = io();
const connectBtn = document.getElementById("connectBtn");
const statusSpan = document.getElementById("status");
const terminalDiv = document.getElementById("terminal");

const DEFAULT_BAUD = 115200;

let port = null;
let reader = null;
let writer = null;
let keepReading = false;
let writeMutex = Promise.resolve();

function log(message) {
  terminalDiv.textContent += message;
  terminalDiv.scrollTop = terminalDiv.scrollHeight;
}

function setStatus(text, color = "#cccccc") {
  statusSpan.textContent = text;
  statusSpan.style.color = color;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function setSignals(signals) {
  if (!port || typeof port.setSignals !== "function") {
    return;
  }
  try {
    await port.setSignals(signals);
  } catch (err) {
    console.warn("setSignals failed", err);
  }
}

async function pulseDTR() {
  if (!port) {
    return;
  }
  log("\n[Local] Reset requested (DTR/RTS pulse).\n");
  await setSignals({ dataTerminalReady: false, requestToSend: false });
  await wait(120);
  await setSignals({ dataTerminalReady: true, requestToSend: true });
}

async function openSerialPort() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: DEFAULT_BAUD });
    await setSignals({ dataTerminalReady: true, requestToSend: true });

    setStatus("Connected", "#00ff90");
    connectBtn.textContent = "Disconnect";
    connectBtn.onclick = disconnectSerial;

    keepReading = true;
    startReadLoop();

    const writable = port.writable;
    writer = writable.getWriter();

    socket.emit("connected", { baud: DEFAULT_BAUD });
    log("Serial port opened.\n");
  } catch (err) {
    console.error("Failed to open serial port", err);
    log(`[Error] ${err.message}\n`);
    setStatus("Connection failed", "#ff5f5f");
  }
}

async function disconnectSerial() {
  keepReading = false;

  if (reader) {
    try {
      await reader.cancel();
    } catch (err) {
      console.warn("Reader cancel error", err);
    }
    reader.releaseLock();
    reader = null;
  }

  if (writer) {
    try {
      await writer.close();
    } catch (err) {
      console.warn("Writer close error", err);
    }
    writer.releaseLock();
    writer = null;
  }

  if (port) {
    try {
      await port.close();
    } catch (err) {
      console.warn("Port close error", err);
    }
    port = null;
  }

  setStatus("Disconnected");
  connectBtn.textContent = "Connect Arduino";
  connectBtn.onclick = openSerialPort;
  socket.emit("disconnected");
  log("Serial port closed.\n");
}

async function startReadLoop() {
  while (port && port.readable && keepReading) {
    try {
      reader = port.readable.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        if (value && value.byteLength > 0) {
          socket.emit("data", value);
        }
      }
    } catch (err) {
      console.error("Read loop error", err);
      log(`[Read error] ${err.message}\n`);
    } finally {
      if (reader) {
        reader.releaseLock();
        reader = null;
      }
    }
  }
}

socket.on("connect", () => {
  log("Bridge connected to server.\n");
});

socket.on("disconnect", () => {
  log("Bridge disconnected from server.\n");
  setStatus("Server offline", "#ff5f5f");
});

socket.on("data", async (payload) => {
  if (!port || !writer) {
    return;
  }
  let buffer;
  if (payload instanceof ArrayBuffer) {
    buffer = new Uint8Array(payload);
  } else if (ArrayBuffer.isView(payload)) {
    buffer = new Uint8Array(payload.buffer);
  } else if (payload?.type === "Buffer" && Array.isArray(payload.data)) {
    buffer = new Uint8Array(payload.data);
  } else {
    buffer = new TextEncoder().encode(String(payload));
  }

  writeMutex = writeMutex.then(async () => {
    try {
      await writer.write(buffer);
    } catch (err) {
      console.error("Write error", err);
      log(`[Write error] ${err.message}\n`);
    }
  });
});

socket.on("pulse-dtr", () => {
  pulseDTR();
});

connectBtn.onclick = openSerialPort;
