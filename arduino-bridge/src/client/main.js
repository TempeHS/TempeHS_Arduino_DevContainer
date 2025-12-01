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
const dtrCheck = document.getElementById("dtrCheck");
const rtsCheck = document.getElementById("rtsCheck");
const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");

// Input Bar Elements
const serialInput = document.getElementById("serialInput");
const lineEndingSelect = document.getElementById("lineEnding");
const sendBtn = document.getElementById("sendBtn");

// Modal Elements
const bootloaderModal = document.getElementById("bootloaderModal");
const modalSelectPortBtn = document.getElementById("modalSelectPortBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");

let isPlotterMode = false;

// DTR/RTS Handlers
dtrCheck.addEventListener("change", async (e) => {
  if (serialManager.provider.port) {
    await serialManager.setSignals({ dataTerminalReady: e.target.checked });
  }
});

rtsCheck.addEventListener("change", async (e) => {
  if (serialManager.provider.port) {
    await serialManager.setSignals({ requestToSend: e.target.checked });
  }
});

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

let availableBoards = [];

// Load Boards
async function loadBoards() {
  try {
    // Fetch both installed boards (API) and VID/PID metadata (JSON)
    const [apiRes, jsonRes] = await Promise.all([
      fetch("/api/boards"),
      fetch("/boards.json"),
    ]);

    if (!apiRes.ok) throw new Error("Failed to load boards from API");
    const apiData = await apiRes.json();

    let knownBoards = [];
    if (jsonRes.ok) {
      const jsonData = await jsonRes.json();
      knownBoards = jsonData.boards || [];
    }

    boardSelect.innerHTML = "";
    availableBoards = apiData.boards || [];

    // Merge VID/PID from knownBoards into availableBoards for auto-detection
    availableBoards.forEach((board) => {
      const known = knownBoards.find((kb) => kb.fqbn === board.fqbn);
      if (known) {
        board.vid = known.vid;
        board.pid = known.pid;
      }
    });

    availableBoards.sort((a, b) => a.name.localeCompare(b.name));

    availableBoards.forEach((board) => {
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

    // Save current selection if it exists and is still valid
    const currentSelection = sketchSelect.value;

    sketchSelect.innerHTML = '<option value="">Select Sketch...</option>';
    const sketches = data.sketches || [];

    let selectionFound = false;
    sketches.forEach((sketch) => {
      const option = document.createElement("option");
      option.value = sketch.relativePath;
      option.textContent = sketch.name;
      sketchSelect.appendChild(option);

      if (sketch.relativePath === currentSelection) {
        selectionFound = true;
      }
    });

    // Add Refresh Option
    const refreshOption = document.createElement("option");
    refreshOption.value = "__REFRESH__";
    refreshOption.textContent = "🔄 Refresh List...";
    refreshOption.style.fontWeight = "bold";
    refreshOption.style.color = "#007acc";
    sketchSelect.appendChild(refreshOption);

    // Restore selection if it still exists
    if (selectionFound) {
      sketchSelect.value = currentSelection;
    }
  } catch (error) {
    console.error("Error loading sketches:", error);
  }
}

// Initialize
loadBoards();
loadSketches();

// Enable/Disable Compile Buttons
function updateCompileButtons() {
  const ready =
    sketchSelect.value &&
    boardSelect.value &&
    sketchSelect.value !== "__REFRESH__";
  compileBtn.disabled = !ready;
  compileUploadBtn.disabled = !(ready && serialManager.provider.port);
}

sketchSelect.addEventListener("change", async (e) => {
  if (e.target.value === "__REFRESH__") {
    // Show loading state
    const originalText = e.target.options[e.target.selectedIndex].text;
    e.target.options[e.target.selectedIndex].text = "Refreshing...";

    await loadSketches();

    // Reset to default if we just refreshed
    if (sketchSelect.value === "__REFRESH__") {
      sketchSelect.value = "";
    }
    updateCompileButtons();
    return;
  }
  updateCompileButtons();
});
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

// Helper to handle the upload process (reusable for retries)
async function handleUpload(port, firmwareData, fqbn) {
  try {
    // 4. Re-open port for Flashing
    try {
      await port.open({ baudRate: 115200 });
    } catch (e) {
      console.log("Port open check:", e);
    }

    // 5. Flash
    await uploadManager.upload(
      port,
      firmwareData,
      (progress, status) => {
        if (status) {
          terminal.write(`\r${status}: ${progress}%`);
        } else {
          terminal.write(`\rFlashing: ${progress}%`);
        }
      },
      fqbn
    );

    terminal.write("\r\nUpload Complete!\r\n");

    // 6. Reconnect Serial Monitor
    try {
      await port.close();
      const baudRate = parseInt(baudSelect.value);
      await serialManager.connect(baudRate, port);
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
    if (error.code === "RESET_REQUIRED") {
      terminal.write(
        `\r\n\x1b[1;33mAction Required: ${error.message}\x1b[0m\r\n`
      );

      // Show Modal
      bootloaderModal.style.display = "flex";

      const handleSelect = async () => {
        bootloaderModal.style.display = "none";
        cleanup();

        try {
          const newPort = await navigator.serial.requestPort();
          terminal.write("\r\nResuming upload with new port...\r\n");
          await handleUpload(newPort, firmwareData, fqbn);
        } catch (e) {
          terminal.write("\r\nUpload Cancelled.\r\n");
          // Reset UI
          connectBtn.disabled = false;
          disconnectBtn.disabled = true;
          baudSelect.disabled = false;
          updateCompileButtons();
        }
      };

      const handleCancel = () => {
        bootloaderModal.style.display = "none";
        cleanup();
        terminal.write("\r\nUpload Cancelled.\r\n");
        // Reset UI
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        baudSelect.disabled = false;
        updateCompileButtons();
      };

      const cleanup = () => {
        modalSelectPortBtn.removeEventListener("click", handleSelect);
        modalCancelBtn.removeEventListener("click", handleCancel);
      };

      modalSelectPortBtn.addEventListener("click", handleSelect);
      modalCancelBtn.addEventListener("click", handleCancel);

      return;
    }

    console.error("Upload failed:", error);
    terminal.write(`\r\nUpload Error: ${error.message}\r\n`);

    // Try to reconnect
    try {
      // Ensure port is closed before trying to reopen
      if (port && port.readable) {
        try {
          await port.close();
        } catch (e) {}
      }

      const baudRate = parseInt(baudSelect.value);
      // If we have a saved port, try to reuse it
      if (port) {
        await serialManager.connect(baudRate, port);
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
}

// Compile & Upload Button Handler
compileUploadBtn.addEventListener("click", async () => {
  if (!serialManager.provider.port) return;

  // Capture port immediately to ensure we have it even if disconnected during compile
  const savedPort = serialManager.provider.port;

  const fqbn = boardSelect.value;
  // Alert removed as we now support more boards via Strategy Pattern

  // 1. Compile
  const artifactUrl = await compileSketch();
  if (!artifactUrl) return;

  // 2. Download Firmware
  let firmwareData;
  try {
    terminal.write("Downloading firmware...\r\n");
    const response = await fetch(artifactUrl);
    if (!response.ok) throw new Error("Failed to download firmware");
    firmwareData = await response.arrayBuffer();

    // 3. Disconnect Serial Monitor
    // Check if still connected before disconnecting, to avoid double-close issues if user disconnected
    if (serialManager.provider.port) {
      await serialManager.disconnect();
    }

    // Start Upload Process
    await handleUpload(savedPort, firmwareData, fqbn);
  } catch (error) {
    terminal.write(`\r\nError: ${error.message}\r\n`);
  }
});

// Connect Button Handler
connectBtn.addEventListener("click", async () => {
  try {
    const baudRate = parseInt(baudSelect.value);
    await serialManager.connect(baudRate);

    // Auto-select board based on VID/PID
    const portInfo = serialManager.provider.port.getInfo();
    if (portInfo.usbVendorId && portInfo.usbProductId) {
      const vid =
        "0x" + portInfo.usbVendorId.toString(16).toLowerCase().padStart(4, "0");
      const pid =
        "0x" +
        portInfo.usbProductId.toString(16).toLowerCase().padStart(4, "0");

      // Also try without padding if json has short format, but json has 0x0043 etc.
      // My json has 0x0043. toString(16) of 0x43 is "43". padStart(4,'0') -> "0043".
      // Wait, 0x2341 is 9025. toString(16) is "2341".
      // 0x0043 is 67. toString(16) is "43".
      // So I should pad to 4 chars if I want to match "0x0043".
      // But wait, "0x" + "43" is "0x43". My json has "0x0043".
      // I should normalize both sides or ensure my json matches.
      // Let's normalize to just hex string without 0x for comparison?
      // Or just fix the logic here.

      // Let's try to match loosely.
      const matchedBoard = availableBoards.find((b) => {
        if (!b.vid || !b.pid) return false;
        // Check if any VID matches
        const vidMatch = b.vid.some(
          (v) => parseInt(v) === portInfo.usbVendorId
        );
        const pidMatch = b.pid.some(
          (p) => parseInt(p) === portInfo.usbProductId
        );
        return vidMatch && pidMatch;
      });

      if (matchedBoard) {
        boardSelect.value = matchedBoard.fqbn;
        terminal.write(`\r\nAuto-detected board: ${matchedBoard.name}\r\n`);
        updateCompileButtons();
      }
    }

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
