import { SerialManager } from "./services/SerialManager.js";
import { TerminalUI } from "./ui/TerminalUI.js";
import { UploadManager } from "./services/UploadManager.js";
import { PlotterUI } from "./ui/PlotterUI.js";

const serialManager = new SerialManager();
const uploadManager = new UploadManager();
const terminal = new TerminalUI("terminal-container");
const plotter = new PlotterUI("plotter-container");

// Track the last working baud rate for reconnection after upload
let lastWorkingBaudRate = 115200;

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

    // Merge VID/PID and uploadMode from knownBoards into availableBoards
    availableBoards.forEach((board) => {
      const known = knownBoards.find((kb) => kb.fqbn === board.fqbn);
      if (known) {
        board.vid = known.vid;
        board.pid = known.pid;
        board.uploadMode = known.uploadMode;
        board.uploadInstructions = known.uploadInstructions;
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

// Check if selected board uses UF2 download mode (no serial upload)
function getBoardUploadMode() {
  const fqbn = boardSelect.value;
  const board = availableBoards.find((b) => b.fqbn === fqbn);
  return board?.uploadMode || "serial";
}

function getBoardUploadInstructions() {
  const fqbn = boardSelect.value;
  const board = availableBoards.find((b) => b.fqbn === fqbn);
  return board?.uploadInstructions || "";
}

// Enable/Disable Compile Buttons
function updateCompileButtons() {
  const ready =
    sketchSelect.value &&
    boardSelect.value &&
    sketchSelect.value !== "__REFRESH__";

  const uploadMode = getBoardUploadMode();

  console.log(
    "[updateCompileButtons] Board:",
    boardSelect.value,
    "UploadMode:",
    uploadMode,
    "Ready:",
    ready
  );

  compileBtn.disabled = !ready;

  if (uploadMode === "uf2-download") {
    // UF2 boards: Change button text and enable without serial connection
    compileUploadBtn.textContent = "Compile & Download (.uf2)";
    compileUploadBtn.disabled = !ready;
    console.log(
      "[updateCompileButtons] UF2 mode - button enabled:",
      !compileUploadBtn.disabled
    );
  } else {
    // Serial upload boards: Require connection
    compileUploadBtn.textContent = "Compile & Upload";
    const hasPort = !!serialManager.provider.port;
    compileUploadBtn.disabled = !(ready && hasPort);
    console.log(
      "[updateCompileButtons] Serial mode - hasPort:",
      hasPort,
      "button enabled:",
      !compileUploadBtn.disabled
    );
  }
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

boardSelect.addEventListener("change", () => {
  updateCompileButtons();

  // Auto-select default baud rate for this board (only if not connected)
  if (!serialManager.provider.port) {
    const defaultBaud = getDefaultBaudRate(boardSelect.value);
    baudSelect.value = defaultBaud.toString();
  }

  // Show info message for UF2/download boards
  const uploadMode = getBoardUploadMode();
  if (uploadMode === "uf2-download") {
    const board = availableBoards.find((b) => b.fqbn === boardSelect.value);
    const boardName = board?.name || "This board";
    terminal.write(
      `\r\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\r\n`
    );
    terminal.write(`ℹ️  ${boardName} uses download mode.\r\n`);
    terminal.write(
      `   • Click "Compile & Download" to get the firmware file\r\n`
    );
    terminal.write(
      `   • Flash the file to your board using the board's bootloader\r\n`
    );
    terminal.write(
      `   • After flashing, use "Connect" to open the Serial Monitor\r\n`
    );
    terminal.write(
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\r\n`
    );
  }
});

// Compile Function
async function compileSketch() {
  const sketchPath = sketchSelect.value;
  const fqbn = boardSelect.value;

  console.log(
    `[Client] Compiling sketch: '${sketchPath}' for board: '${fqbn}'`
  );
  terminal.write(`\r\n[Debug] Selected Sketch: ${sketchPath}\r\n`);
  terminal.write(`[Debug] Selected Board: ${fqbn}\r\n`);
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
    // Ensure any previous connection is fully closed first
    if (serialManager.provider.port === port) {
      await serialManager.disconnect();
    }

    // Reopen port at 115200 for AVR upload (DTR toggle needs open port)
    if (!port.readable || !port.writable) {
      await port.open({ baudRate: 115200 });
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

    // 6. Reconnect Serial Monitor with auto-detect (new sketch may have different baud rate)
    try {
      // Close port if still open
      if (port.readable || port.writable) {
        await port.close();
      }

      // Auto-detect baud rate for the NEW sketch (it may be different from previous)
      const detectedBaud = await autoDetectBaudRate(port, terminal);
      lastWorkingBaudRate = detectedBaud;
      baudSelect.value = detectedBaud.toString();

      // Connect with detected baud rate
      await serialManager.connect(detectedBaud, port);

      // Success - update UI to connected state
      connectBtn.disabled = true;
      disconnectBtn.disabled = false;
      updateCompileButtons();
      serialInput.disabled = false;
      sendBtn.disabled = false;
      terminal.write("Serial monitor reconnected.\r\n");
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
    // Handle bootloader port switch - device has reset and needs new port selection
    if (error.code === "BOOTLOADER_PORT_NEEDED") {
      terminal.write(`\r\n\x1b[1;36m${error.message}\x1b[0m\r\n`);
      terminal.write(
        `\r\n\x1b[1;33mThe Arduino has entered bootloader mode and appears as a NEW USB device.\x1b[0m\r\n`
      );
      terminal.write(
        `\x1b[1;33mPlease select the bootloader port (may show as "Arduino" or different name).\x1b[0m\r\n`
      );

      // Show Modal for bootloader port selection
      bootloaderModal.style.display = "flex";

      const handleBootloaderSelect = async () => {
        bootloaderModal.style.display = "none";
        cleanupBootloader();

        try {
          // Request new port - filter for Arduino bootloader
          const newPort = await navigator.serial.requestPort({
            filters: [
              { usbVendorId: 0x2341, usbProductId: 0x006d }, // R4 WiFi Bootloader
              { usbVendorId: 0x2341, usbProductId: 0x0054 }, // MKR WiFi 1010 Bootloader
              { usbVendorId: 0x2341, usbProductId: 0x0057 }, // Nano 33 IoT Bootloader
              { usbVendorId: 0x2341 }, // Any Arduino device as fallback
            ],
          });

          const info = newPort.getInfo();
          terminal.write(
            `\r\nSelected bootloader port (VID:${info.usbVendorId?.toString(
              16
            )}, PID:${info.usbProductId?.toString(16)})\r\n`
          );
          terminal.write("\r\nFlashing to bootloader...\r\n");

          // Flash directly to bootloader port (skip prepare)
          await uploadManager.flashToBootloader(
            newPort,
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

          // Try to reconnect to the original port (device reboots after flash)
          try {
            await new Promise((r) => setTimeout(r, 2000)); // Wait for reboot
            const baudRate = parseInt(baudSelect.value);
            await serialManager.connect(baudRate, port);
          } catch (e) {
            terminal.write(
              "\r\nDevice rebooted. Please reconnect manually.\r\n"
            );
            connectBtn.disabled = false;
            disconnectBtn.disabled = true;
            baudSelect.disabled = false;
            updateCompileButtons();
          }
        } catch (e) {
          console.error("Bootloader flash failed:", e);
          terminal.write(`\r\nBootloader flash failed: ${e.message}\r\n`);
          connectBtn.disabled = false;
          disconnectBtn.disabled = true;
          baudSelect.disabled = false;
          updateCompileButtons();
        }
      };

      const handleBootloaderCancel = () => {
        bootloaderModal.style.display = "none";
        cleanupBootloader();
        terminal.write("\r\nUpload Cancelled.\r\n");
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        baudSelect.disabled = false;
        updateCompileButtons();
      };

      const cleanupBootloader = () => {
        modalSelectPortBtn.removeEventListener("click", handleBootloaderSelect);
        modalCancelBtn.removeEventListener("click", handleBootloaderCancel);
      };

      modalSelectPortBtn.addEventListener("click", handleBootloaderSelect);
      modalCancelBtn.addEventListener("click", handleBootloaderCancel);

      return;
    }

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
  const fqbn = boardSelect.value;
  const sketchPath = sketchSelect.value;
  const uploadMode = getBoardUploadMode();

  // UF2 DOWNLOAD MODE (Pico, Teensy, etc.)
  if (uploadMode === "uf2-download") {
    terminal.write(`\r\n[UF2 Download Mode] Board: ${fqbn}\r\n`);

    // 1. Compile
    const artifactUrl = await compileSketch();
    if (!artifactUrl) return;

    terminal.write(`\r\n[Debug] Artifact URL: ${artifactUrl}\r\n`);

    // 2. Download the firmware file
    try {
      terminal.write("Preparing firmware for download...\r\n");
      const response = await fetch(artifactUrl);
      if (!response.ok)
        throw new Error("Failed to download firmware from server");

      const firmwareBlob = await response.blob();

      // Determine filename from URL or generate one
      const urlParts = artifactUrl.split("/");
      let filename = urlParts[urlParts.length - 1];

      // Ensure proper extension based on board type
      if (fqbn.includes("rp2040") || fqbn.includes("rpipico")) {
        if (!filename.endsWith(".uf2")) {
          filename = sketchPath.split("/").pop().replace(".ino", "") + ".uf2";
        }
      } else if (fqbn.includes("teensy")) {
        if (!filename.endsWith(".hex")) {
          filename = sketchPath.split("/").pop().replace(".ino", "") + ".hex";
        }
      }

      // Create download link and trigger browser download
      const downloadUrl = URL.createObjectURL(firmwareBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      terminal.write(
        `\r\n\x1b[1;32mFirmware downloaded: ${filename}\x1b[0m\r\n`
      );

      // Show upload instructions
      const instructions = getBoardUploadInstructions();
      if (instructions) {
        terminal.write(`\r\n\x1b[1;33mNext Steps:\x1b[0m ${instructions}\r\n`);
      }
    } catch (error) {
      terminal.write(`\r\n\x1b[1;31mError: ${error.message}\x1b[0m\r\n`);
    }

    return;
  }

  // SERIAL UPLOAD MODE (AVR, BOSSA, ESP32, etc.)
  if (!serialManager.provider.port) return;

  // Capture port immediately to ensure we have it even if disconnected during compile
  const savedPort = serialManager.provider.port;

  // All uploads use client-side Web Serial (BOSSA, AVR, ESP32, etc.)
  // Note: Server-side upload was attempted but doesn't work in GitHub Codespaces
  // since the Arduino is connected to the user's browser, not the server.

  // 1. Compile
  const artifactUrl = await compileSketch();
  if (!artifactUrl) return;

  terminal.write(`\r\n[Debug] Artifact URL: ${artifactUrl}\r\n`);

  // 2. Download Firmware
  let firmwareData;
  try {
    terminal.write("Downloading firmware...\r\n");
    const response = await fetch(artifactUrl);
    if (!response.ok) throw new Error("Failed to download firmware");
    firmwareData = await response.arrayBuffer();

    // 3. Disconnect Serial Monitor
    if (serialManager.provider.port) {
      await serialManager.disconnect();
    }

    // Start Upload Process
    await handleUpload(savedPort, firmwareData, fqbn);
  } catch (error) {
    terminal.write(`\r\nError: ${error.message}\r\n`);
  }
});

// Get default baud rate for a board (fallback when no auto-detect)
function getDefaultBaudRate(fqbn) {
  // ESP32 boards often use 115200
  if (fqbn && fqbn.includes("esp32")) return 115200;
  // Most Arduino boards default to 9600
  return 9600;
}

// Common baud rates to try (most common first, then low to high)
const BAUD_RATES_TO_TRY = [
  115200, 9600, 19200, 57600, 300, 1200, 2400, 4800, 14400, 28800, 38400, 56000,
  76800, 128000, 230400, 250000,
];

// Auto-detect baud rate by checking if received data is readable ASCII
async function autoDetectBaudRate(port, terminal) {
  terminal.write("\r\nAuto-detecting baud rate...\r\n");

  for (const baudRate of BAUD_RATES_TO_TRY) {
    try {
      // Open port at this baud rate
      await port.open({ baudRate });

      // Wait for Arduino to reset and bootloader to finish (triggered by DTR on open)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Collect data for a short time
      const reader = port.readable.getReader();
      let receivedData = [];
      let dataReceived = false;

      // Set a timeout for data collection (1.5 seconds to catch slow serial prints)
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(resolve, 1500)
      );

      const readPromise = (async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value && value.length > 0) {
              dataReceived = true;
              receivedData.push(...value);
              // Once we have enough data to analyze, stop
              if (receivedData.length >= 20) break;
            }
          }
        } catch (e) {
          // Read interrupted, that's fine
        }
      })();

      // Wait for either timeout or enough data
      await Promise.race([timeoutPromise, readPromise]);

      // Cancel the reader
      try {
        await reader.cancel();
      } catch (e) {}
      reader.releaseLock();

      // Close port
      await port.close();

      // If no data received at this baud rate, try next
      if (!dataReceived || receivedData.length === 0) {
        terminal.write(`  ${baudRate}: no data\r\n`);
        continue;
      }

      // Check if data is readable ASCII (printable chars, newlines, etc.)
      const printableCount = receivedData.filter(
        (byte) =>
          (byte >= 32 && byte <= 126) || // Printable ASCII
          byte === 10 ||
          byte === 13 ||
          byte === 9 // LF, CR, TAB
      ).length;

      const readableRatio = printableCount / receivedData.length;

      terminal.write(
        `  ${baudRate}: ${Math.round(readableRatio * 100)}% readable (${
          receivedData.length
        } bytes)\r\n`
      );

      // If more than 80% is readable ASCII, this is likely the correct baud rate
      if (readableRatio >= 0.8) {
        terminal.write(`\r\n✓ Detected baud rate: ${baudRate}\r\n`);
        return baudRate;
      }
    } catch (e) {
      // Port error, try to close and continue
      try {
        await port.close();
      } catch (e2) {}
      continue;
    }
  }

  // No good match found, return default
  terminal.write("\r\nCould not detect baud rate, using 9600\r\n");
  return 9600;
}

// Connect Button Handler
connectBtn.addEventListener("click", async () => {
  try {
    // First, request the port (user selects from dialog)
    const port = await navigator.serial.requestPort();

    // Get port info for board detection
    const portInfo = port.getInfo();
    let detectedBoard = null;

    if (portInfo.usbVendorId && portInfo.usbProductId) {
      detectedBoard = availableBoards.find((b) => {
        if (!b.vid || !b.pid) return false;
        const vidMatch = b.vid.some(
          (v) => parseInt(v) === portInfo.usbVendorId
        );
        const pidMatch = b.pid.some(
          (p) => parseInt(p) === portInfo.usbProductId
        );
        return vidMatch && pidMatch;
      });

      if (detectedBoard) {
        boardSelect.value = detectedBoard.fqbn;
        terminal.write(`\r\nAuto-detected board: ${detectedBoard.name}\r\n`);
        updateCompileButtons();
      }
    }

    // Try to auto-detect baud rate by sampling data
    const detectedBaud = await autoDetectBaudRate(port, terminal);
    baudSelect.value = detectedBaud.toString();
    lastWorkingBaudRate = detectedBaud; // Save for reconnection after upload

    // Now connect with SerialManager using the detected baud rate and selected port
    await serialManager.connect(detectedBaud, port);

    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
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
  const newBaudRate = parseInt(baudSelect.value);

  // Always track the selected baud rate for reconnection
  lastWorkingBaudRate = newBaudRate;

  // If connected, reconnect with new baud rate
  if (serialManager.provider.port) {
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
