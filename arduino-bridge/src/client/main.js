import { SerialManager } from "./services/SerialManager.js";
import { TerminalUI } from "./ui/TerminalUI.js";
import { UploadManager } from "./services/UploadManager.js";
import { PlotterUI } from "./ui/PlotterUI.js";

const serialManager = new SerialManager();
const uploadManager = new UploadManager();
const terminal = new TerminalUI("terminal-container");
const plotter = new PlotterUI("plotter-container");

// UI Elements
const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const baudSelect = document.getElementById("baudRate");
const boardSelect = document.getElementById("boardType");
const sketchSelect = document.getElementById("sketchSelect");
const compileBtn = document.getElementById("compileBtn");
const compileUploadBtn = document.getElementById("compileUploadBtn");
const toggleViewBtn = document.getElementById("toggleViewBtn");
const terminalContainer = document.getElementById("terminal-container");
const plotterContainer = document.getElementById("plotter-container");

// New Toolbar Elements
const timestampCheck = document.getElementById("timestampCheck");
const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");

// Input Bar Elements
const serialInput = document.getElementById("serialInput");
const lineEndingSelect = document.getElementById("lineEnding");
const sendBtn = document.getElementById("sendBtn");

let isPlotterMode = false;

// Timestamp Handler
timestampCheck.addEventListener("change", (e) => {
  terminal.setTimestampMode(e.target.checked);
});

// Clear Button Handler
clearBtn.addEventListener("click", () => {
  if (isPlotterMode) {
    plotter.clear();
  } else {
    terminal.clear();
  }
});

// Download Button Handler
downloadBtn.addEventListener("click", () => {
  terminal.downloadLog();
});

// Toggle View Handler
toggleViewBtn.addEventListener("click", () => {
  isPlotterMode = !isPlotterMode;

  if (isPlotterMode) {
    terminalContainer.style.visibility = "hidden";
    plotterContainer.style.visibility = "visible";
    toggleViewBtn.textContent = "Switch to Monitor";
    plotter.resize();
  } else {
    terminalContainer.style.visibility = "visible";
    plotterContainer.style.visibility = "hidden";
    toggleViewBtn.textContent = "Switch to Plotter";
    terminal.fit(); // Ensure terminal fits new visibility
  }
});

// Load Boards
async function loadBoards() {
  try {
    const response = await fetch("/api/boards");
    if (!response.ok) throw new Error("Failed to load boards");
    const data = await response.json();

    boardSelect.innerHTML = "";
    const boards = data.boards || [];
    boards.sort((a, b) => a.name.localeCompare(b.name));

    boards.forEach((board) => {
      const option = document.createElement("option");
      option.value = board.fqbn;
      option.textContent = board.name;
      if (board.fqbn === "arduino:avr:uno") option.selected = true;
      boardSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading boards:", error);
    boardSelect.innerHTML =
      '<option value="arduino:avr:uno">Arduino Uno (Fallback)</option>';
  }
}

// Load Sketches
async function loadSketches() {
  try {
    const response = await fetch("/api/sketches");
    if (!response.ok) throw new Error("Failed to load sketches");
    const data = await response.json();

    sketchSelect.innerHTML = '<option value="">Select Sketch...</option>';
    const sketches = data.sketches || [];

    sketches.forEach((sketch) => {
      const option = document.createElement("option");
      option.value = sketch.relativePath;
      option.textContent = sketch.name;
      sketchSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading sketches:", error);
  }
}

// Initialize
loadBoards();
loadSketches();

// Enable/Disable Compile Buttons
function updateCompileButtons() {
  const ready = sketchSelect.value && boardSelect.value;
  compileBtn.disabled = !ready;
  compileUploadBtn.disabled = !(ready && serialManager.provider.port);
}

sketchSelect.addEventListener("change", updateCompileButtons);
boardSelect.addEventListener("change", updateCompileButtons);

// Compile Function
async function compileSketch() {
  const sketchPath = sketchSelect.value;
  const fqbn = boardSelect.value;

  terminal.write(`\r\nCompiling ${sketchPath} for ${fqbn}...\r\n`);

  try {
    const response = await fetch("/api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: sketchPath, fqbn: fqbn }),
    });

    const data = await response.json();

    if (data.log) {
      terminal.write(data.log.replace(/\n/g, "\r\n") + "\r\n");
    }

    if (data.success && data.artifact) {
      terminal.write("Compilation Success!\r\n");
      return data.artifact.url;
    } else {
      terminal.write("Compilation Failed.\r\n");
      return null;
    }
  } catch (error) {
    terminal.write(`\r\nError: ${error.message}\r\n`);
    return null;
  }
}

// Compile Button Handler
compileBtn.addEventListener("click", async () => {
  await compileSketch();
});

// Compile & Upload Button Handler
compileUploadBtn.addEventListener("click", async () => {
  if (!serialManager.provider.port) return;

  // Capture port immediately to ensure we have it even if disconnected during compile
  const savedPort = serialManager.provider.port;

  const fqbn = boardSelect.value;
  if (!fqbn.startsWith("arduino:avr:")) {
    const proceed = confirm(
      "Web Upload currently only supports AVR boards (like Uno R3). \n" +
        "Selected board (" +
        fqbn +
        ") might not work.\n\n" +
        "Do you want to try anyway?"
    );
    if (!proceed) return;
  }

  // 1. Compile
  const artifactUrl = await compileSketch();
  if (!artifactUrl) return;

  // 2. Download Hex
  try {
    terminal.write("Downloading firmware...\r\n");
    const response = await fetch(artifactUrl);
    if (!response.ok) throw new Error("Failed to download firmware");
    const hex = await response.text();

    // 3. Disconnect Serial Monitor
    // Check if still connected before disconnecting, to avoid double-close issues if user disconnected
    if (serialManager.provider.port) {
      await serialManager.disconnect();
    }

    // 4. Re-open port for Flashing
    await savedPort.open({ baudRate: 115200 });

    // 5. Flash
    await uploadManager.upload(savedPort, hex, (progress) => {
      terminal.write(`\rFlashing: ${progress}%`);
    });

    terminal.write("\r\nUpload Complete!\r\n");

    // 6. Reconnect Serial Monitor
    try {
      await savedPort.close();
      const baudRate = parseInt(baudSelect.value);
      await serialManager.connect(baudRate, savedPort);
    } catch (e) {
      console.error("Reconnect failed:", e);
      terminal.write("\r\nReconnect failed. Please connect manually.\r\n");
      // Reset UI to disconnected state
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
      baudSelect.disabled = false;
      updateCompileButtons();
      serialInput.disabled = true;
      sendBtn.disabled = true;
    }
  } catch (error) {
    console.error("Upload failed:", error);
    terminal.write(`\r\nUpload Error: ${error.message}\r\n`);

    // Try to reconnect
    try {
      // Ensure port is closed before trying to reopen
      if (savedPort && savedPort.readable) {
        try {
          await savedPort.close();
        } catch (e) {}
      }

      const baudRate = parseInt(baudSelect.value);
      // If we have a saved port, try to reuse it
      if (savedPort) {
        await serialManager.connect(baudRate, savedPort);
      } else {
        await serialManager.connect(baudRate);
      }
    } catch (e) {
      console.error("Recovery reconnect failed:", e);
      // Reset UI to disconnected state
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
      baudSelect.disabled = false;
      updateCompileButtons();
      serialInput.disabled = true;
      sendBtn.disabled = true;
    }
  }
});

// Connect Button Handler
connectBtn.addEventListener("click", async () => {
  try {
    const baudRate = parseInt(baudSelect.value);
    await serialManager.connect(baudRate);

    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
    // baudSelect.disabled = true; // Allow changing baud rate while connected
    updateCompileButtons();

    // Enable Input
    serialInput.disabled = false;
    sendBtn.disabled = false;

    terminal.write("\r\nConnected to Serial Port\r\n");
  } catch (error) {
    console.error("Connection failed:", error);
    terminal.write(`\r\nError: ${error.message}\r\n`);
  }
});

// Disconnect Button Handler
disconnectBtn.addEventListener("click", async () => {
  try {
    await serialManager.disconnect();

    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    // baudSelect.disabled = false; // Always enabled now
    updateCompileButtons();

    // Disable Input
    serialInput.disabled = true;
    sendBtn.disabled = true;

    terminal.write("\r\nDisconnected\r\n");
  } catch (error) {
    console.error("Disconnect failed:", error);
  }
});

// Baud Rate Change Handler
baudSelect.addEventListener("change", async () => {
  // If connected, reconnect with new baud rate
  if (serialManager.provider.port) {
    const newBaudRate = parseInt(baudSelect.value);
    const savedPort = serialManager.provider.port;

    terminal.write(`\r\nChanging baud rate to ${newBaudRate}...\r\n`);

    try {
      await serialManager.disconnect();
      await serialManager.connect(newBaudRate, savedPort);
      terminal.write(`Baud rate changed to ${newBaudRate}\r\n`);
    } catch (error) {
      console.error("Failed to change baud rate:", error);
      terminal.write(`\r\nError changing baud rate: ${error.message}\r\n`);

      // If reconnection failed, update UI to disconnected state
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
      updateCompileButtons();
      serialInput.disabled = true;
      sendBtn.disabled = true;
    }
  }
});

// Handle incoming data for Terminal
serialManager.provider.on("data", (data) => {
  terminal.write(data);
});

// Handle parsed lines for Plotter
serialManager.on("line", (line) => {
  // Simple parser for "Arduino Serial Plotter" format
  // Supports: "val1, val2, val3" or "val1 val2" or "label:val1"

  const trimmed = line.trim();
  if (!trimmed) return;

  // 1. Try to match "Label:Value" pairs first?
  // Actually, standard Arduino plotter is simpler: just look for numbers.
  // But "Label:Value" is a common extension.

  // Regex to find numbers.
  // This splits by comma or space, then checks if parts are numbers.
  const parts = trimmed.split(/[\s,]+/);
  const values = [];

  for (const part of parts) {
    // Check for "Label:Value"
    if (part.includes(":")) {
      const subparts = part.split(":");
      const val = parseFloat(subparts[1]);
      if (!isNaN(val)) values.push(val);
    } else {
      const val = parseFloat(part);
      if (!isNaN(val)) values.push(val);
    }
  }

  if (values.length > 0) {
    const timestamp = new Date().toLocaleTimeString();
    plotter.addData(timestamp, values);
  }
});

// Handle terminal input (direct typing)
terminal.onData((data) => {
  serialManager.write(data);
});

// Handle Input Bar Send
function sendData() {
  const data = serialInput.value;
  const endings = {
    none: "",
    nl: "\n",
    cr: "\r",
    nlcr: "\r\n",
  };
  const ending = endings[lineEndingSelect.value] || "";

  // Send if there is data or just a line ending
  if (data || ending) {
    serialManager.write(data + ending);
    serialInput.value = "";
  }
}

sendBtn.addEventListener("click", sendData);

serialInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendData();
  }
});
