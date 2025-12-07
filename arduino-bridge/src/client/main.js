/**
 * Arduino Bridge Client
 *
 * Main client application that provides:
 * - Serial monitor and plotter functionality
 * - Board and library management UI
 * - Compile and upload workflow
 * - WebSerial API integration
 * - Global error handling and resilience
 *
 * @module client/main
 * @version 1.0.15
 */

import { SerialManager } from "./services/SerialManager.js";
import { TerminalUI } from "./ui/TerminalUI.js";
import { UploadManager } from "./services/UploadManager.js";
import { PlotterUI } from "./ui/PlotterUI.js";
import { BoardManagerUI } from "./ui/BoardManagerUI.js";
import { LibraryManagerUI } from "./ui/LibraryManagerUI.js";
import { ReferenceUI } from "./ui/ReferenceUI.js";
import { Logger } from "../shared/Logger.js";

// =============================================================================
// Constants
// =============================================================================

/** @type {Logger} Client-side logger for structured logging */
const logger = new Logger("Client");

/** Client version for cache debugging - update when making changes */
const CLIENT_VERSION = "1.0.15";

/** Default baud rate for serial connections */
const DEFAULT_BAUD_RATE = 115200;

/** Health check polling interval in milliseconds */
const HEALTH_CHECK_INTERVAL_MS = 30000;

/** Reconnection delay after port disconnect */
const RECONNECT_DELAY_MS = 2000;

/** Maximum reconnection attempts */
const MAX_RECONNECT_ATTEMPTS = 3;

// =============================================================================
// Global Error Handlers
// =============================================================================

/** @type {boolean} Track server online status */
let serverOnline = true;

/** @type {number|null} Health check interval ID */
let healthCheckInterval = null;

/**
 * Global error handler for uncaught exceptions
 * Logs error and attempts graceful recovery
 */
window.onerror = (message, source, lineno, colno, error) => {
  logger.error(`Global Error: ${message}`, { source, lineno, colno, error });
  handleGlobalError(error || new Error(message));
  return true; // Prevent default error handling
};

/**
 * Global handler for unhandled promise rejections
 */
window.onunhandledrejection = (event) => {
  logger.error("Unhandled Rejection", event.reason);
  handleGlobalError(event.reason);
  event.preventDefault();
};

/**
 * Handle global errors with graceful recovery
 * @param {Error|*} error - The error that occurred
 */
async function handleGlobalError(error) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Show error to user via terminal if available
  if (typeof terminal !== "undefined" && terminal.write) {
    terminal.write(`\r\n\x1b[1;31m[Error] ${errorMessage}\x1b[0m\r\n`);
  }

  // Attempt graceful recovery - disconnect port if connected
  try {
    if (typeof serialManager !== "undefined" && serialManager.provider?.port) {
      logger.info("Attempting graceful disconnect after error");
      await serialManager.disconnect().catch(() => {});
    }
  } catch (recoveryError) {
    logger.warn("Disconnect failed", recoveryError);
  }

  // Reset UI state
  updateConnectionUIState(false);
}

/**
 * Update connection UI elements to reflect connection state
 * @param {boolean} connected - Whether serial is connected
 */
function updateConnectionUIState(connected) {
  const connectBtn = document.getElementById("connectBtn");
  const disconnectBtn = document.getElementById("disconnectBtn");
  const serialInput = document.getElementById("serialInput");
  const sendBtn = document.getElementById("sendBtn");

  if (connectBtn) connectBtn.disabled = connected;
  if (disconnectBtn) disconnectBtn.disabled = !connected;
  if (serialInput) serialInput.disabled = !connected;
  if (sendBtn) sendBtn.disabled = !connected;
}

// =============================================================================
// Server Health Monitoring
// =============================================================================

/**
 * Start periodic server health monitoring
 */
function startHealthMonitoring() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  healthCheckInterval = setInterval(
    checkServerHealth,
    HEALTH_CHECK_INTERVAL_MS
  );
  logger.info("Started server health monitoring");
}

/**
 * Check server health and update UI
 */
async function checkServerHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("/api/health", {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();

      if (!serverOnline) {
        logger.info("Server back online", data.data);
        serverOnline = true;
        hideBridgeOfflineBanner();
      }
    } else {
      throw new Error(`Health check failed: HTTP ${response.status}`);
    }
  } catch (error) {
    if (serverOnline) {
      logger.error("Server offline", error.message);
      serverOnline = false;
      showBridgeOfflineBanner();
    }
  }
}

/**
 * Show banner indicating bridge server is offline
 */
function showBridgeOfflineBanner() {
  let banner = document.getElementById("health-offline-banner");

  if (!banner) {
    banner = document.createElement("div");
    banner.id = "health-offline-banner";
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff6b6b;
      color: white;
      padding: 8px 16px;
      text-align: center;
      font-weight: bold;
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
    `;
    banner.innerHTML = `
      <span>⚠️ Arduino Bridge is offline - some features unavailable</span>
      <button id="retryHealthBtn" style="
        background: white;
        color: #ff6b6b;
        border: none;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      ">Retry</button>
    `;
    document.body.prepend(banner);

    document
      .getElementById("retryHealthBtn")
      ?.addEventListener("click", async () => {
        await checkServerHealth();
      });
  }

  banner.style.display = "flex";
}

/**
 * Hide the bridge offline banner
 */
function hideBridgeOfflineBanner() {
  const banner = document.getElementById("health-offline-banner");
  if (banner) {
    banner.style.display = "none";
  }
}

// Start health monitoring on load
startHealthMonitoring();

// =============================================================================
// UI Component Initialization
// =============================================================================

const terminal = new TerminalUI("terminal-container");
const plotter = new PlotterUI("plotter-container");
const boardManager = new BoardManagerUI("boards-view");
const libraryManager = new LibraryManagerUI("libraries-view");
const referenceUI = new ReferenceUI("reference-view");

setupConsoleBridge(terminal);

logger.info(`Version: ${CLIENT_VERSION}`);
logger.info(`Loaded at: ${new Date().toISOString()}`);

const serialManager = new SerialManager();
const uploadManager = new UploadManager();

// Initialize manager UIs
boardManager.init();
libraryManager.init();
referenceUI.init();

// Set up main navigation view switching
setupNavigation();

// =============================================================================
// Version Verification
// =============================================================================

// Fetch and display server version for cache verification
verifyServerVersion();

/**
 * Verify server version matches client version
 * Shows warning banner if versions mismatch
 */
async function verifyServerVersion() {
  try {
    const response = await fetch("/api/version");
    const data = await response.json();

    logger.info(`Server Version: ${data.version}`);

    if (data.version !== CLIENT_VERSION) {
      logger.warn(
        `VERSION MISMATCH! Client: ${CLIENT_VERSION}, Server: ${data.version}`
      );
      setBridgeStatus({
        online: false,
        message: "Version mismatch detected",
        detail: `Client ${CLIENT_VERSION}, Server ${data.version}. Restart to resync`,
      });
    } else {
      logger.info("Client and Server versions match");
      setBridgeStatus({ online: true });
    }
  } catch (error) {
    handleBridgeError("Version check", error);
  }
}

// =============================================================================
// State
// =============================================================================

/** Track the last working baud rate for reconnection after upload */
let lastWorkingBaudRate = DEFAULT_BAUD_RATE;

// UI Elements
const bridgeStatusBanner = document.getElementById("bridge-status");
const bridgeStatusText = document.getElementById("bridgeStatusText");
const bridgeStatusDetail = document.getElementById("bridgeStatusDetail");
const restartBridgeBtn = document.getElementById("restartBridgeBtn");
const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const baudSelect = document.getElementById("baudRate");
const boardSelect = document.getElementById("boardType");
const sketchSelect = document.getElementById("sketchSelect");
const includeExamplesCheck = document.getElementById("includeExamplesCheck");
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
const freezePlotBtn = document.getElementById("freezePlotBtn");
const downloadPlotBtn = document.getElementById("downloadPlotBtn");

// Input Bar Elements
const serialInput = document.getElementById("serialInput");
const lineEndingSelect = document.getElementById("lineEnding");
const sendBtn = document.getElementById("sendBtn");

// Modal Elements
const bootloaderModal = document.getElementById("bootloaderModal");
const modalSelectPortBtn = document.getElementById("modalSelectPortBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");

// Mismatch Modal Elements
const mismatchModal = document.getElementById("mismatchModal");
const mismatchMessage = document.getElementById("mismatchMessage");
const mismatchConnected = document.getElementById("mismatchConnected");
const mismatchSelected = document.getElementById("mismatchSelected");
const mismatchContinueBtn = document.getElementById("mismatchContinueBtn");
const mismatchCancelBtn = document.getElementById("mismatchCancelBtn");

let isPlotterMode = false;

function setupConsoleBridge(terminalInstance) {
  if (!terminalInstance || typeof terminalInstance.write !== "function") {
    return;
  }

  const original = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug
      ? console.debug.bind(console)
      : console.log.bind(console),
  };

  const levelStyles = {
    log: { icon: "ℹ️", color: "\u001b[36m" },
    info: { icon: "ℹ️", color: "\u001b[36m" },
    warn: { icon: "⚠️", color: "\u001b[33m" },
    error: { icon: "❌", color: "\u001b[31m" },
    debug: { icon: "🐞", color: "\u001b[90m" },
  };

  const formatArg = (arg) => {
    if (arg instanceof Error) {
      return arg.stack || `${arg.name}: ${arg.message}`;
    }
    if (typeof arg === "object" && arg !== null) {
      if (arg instanceof ArrayBuffer) {
        return `ArrayBuffer(${arg.byteLength})`;
      }
      if (ArrayBuffer.isView(arg)) {
        return `${arg.constructor.name}(${arg.length})`;
      }
      try {
        return JSON.stringify(arg, null, 2);
      } catch (jsonError) {
        return String(arg);
      }
    }
    return String(arg);
  };

  const writeToTerminal = (level, args) => {
    const style = levelStyles[level] || levelStyles.log;
    const timestamp = new Date().toISOString().slice(11, 23);
    const message = args.length
      ? args.map((arg) => formatArg(arg)).join(" ")
      : "";
    if (!message) {
      return;
    }
    const normalized = message.replace(/\r\n|\r|\n/g, "\r\n");
    terminalInstance.write(
      `\r\n${style.color}[${timestamp}] ${style.icon} ${normalized}\u001b[0m\r\n`
    );
  };

  console.log = (...args) => {
    writeToTerminal("log", args);
    original.log(...args);
  };

  console.info = (...args) => {
    writeToTerminal("info", args);
    original.info(...args);
  };

  console.warn = (...args) => {
    writeToTerminal("warn", args);
    original.warn(...args);
  };

  console.error = (...args) => {
    writeToTerminal("error", args);
    original.error(...args);
  };

  console.debug = (...args) => {
    writeToTerminal("debug", args);
    original.debug(...args);
  };
}

function setBridgeStatus({ online, message = "", detail = "", busy = false }) {
  if (!bridgeStatusBanner) return;

  if (online) {
    bridgeStatusBanner.classList.add("hidden");
    bridgeStatusBanner.classList.remove("busy");
    bridgeStatusText.textContent = message || "Bridge online";
    bridgeStatusDetail.textContent = "";
    if (restartBridgeBtn) restartBridgeBtn.disabled = false;
    return;
  }

  bridgeStatusBanner.classList.remove("hidden");
  if (busy) {
    bridgeStatusBanner.classList.add("busy");
  } else {
    bridgeStatusBanner.classList.remove("busy");
  }
  bridgeStatusText.textContent = message || "Bridge server unavailable";
  bridgeStatusDetail.textContent = detail;
  if (restartBridgeBtn) restartBridgeBtn.disabled = busy;
}

function handleBridgeError(context, error) {
  const message = error?.message || String(error || "unknown error");
  logger.error(`Bridge Error - ${context}`, message);
  setBridgeStatus({
    online: false,
    message: "Bridge server unreachable",
    detail: `${context}: ${message}`,
  });
}

async function requestBridgeRestart() {
  if (!restartBridgeBtn) return;
  setBridgeStatus({
    online: false,
    busy: true,
    message: "Restarting Arduino Bridge...",
    detail: "Killing existing processes and relaunching (≈5s)",
  });

  try {
    const response = await fetch("/api/restart", { method: "POST" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    setBridgeStatus({
      online: false,
      busy: true,
      message: "Bridge restarting...",
      detail: "Reloading shortly to reconnect",
    });
    setTimeout(() => window.location.reload(), 4000);
  } catch (error) {
    handleBridgeError("Bridge restart", error);
    if (restartBridgeBtn) restartBridgeBtn.disabled = false;
  }
}

if (restartBridgeBtn) {
  restartBridgeBtn.addEventListener("click", requestBridgeRestart);
}

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

// Freeze Plot Button Handler
freezePlotBtn.addEventListener("click", () => {
  const frozen = plotter.toggleFreeze();
  freezePlotBtn.textContent = frozen ? "▶ Resume Plot" : "⏸ Freeze Plot";
  freezePlotBtn.style.backgroundColor = frozen ? "#4caf50" : "";
});

// Download Plot as PNG Button Handler
downloadPlotBtn.addEventListener("click", () => {
  plotter.downloadPNG();
});

// Toggle View Handler
toggleViewBtn.addEventListener("click", () => {
  isPlotterMode = !isPlotterMode;

  if (isPlotterMode) {
    terminalContainer.style.visibility = "hidden";
    plotterContainer.style.visibility = "visible";
    toggleViewBtn.textContent = "Switch to Monitor";
    freezePlotBtn.style.display = "inline-block";
    downloadPlotBtn.style.display = "inline-block";
    plotter.resize();
  } else {
    terminalContainer.style.visibility = "visible";
    plotterContainer.style.visibility = "hidden";
    toggleViewBtn.textContent = "Switch to Plotter";
    freezePlotBtn.style.display = "none";
    downloadPlotBtn.style.display = "none";
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

    setBridgeStatus({ online: true });
  } catch (error) {
    logger.error("Error loading boards", error);
    handleBridgeError("Load boards", error);
    boardSelect.innerHTML =
      '<option value="arduino:avr:uno">Arduino Uno (Fallback)</option>';
  }
}

// Load Sketches (and optionally library examples)
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

    // Add workspace sketches
    sketches.forEach((sketch) => {
      const option = document.createElement("option");
      option.value = sketch.relativePath;
      option.textContent = sketch.name;
      sketchSelect.appendChild(option);

      if (sketch.relativePath === currentSelection) {
        selectionFound = true;
      }
    });

    // If "Include Examples" is checked, load library examples
    if (includeExamplesCheck && includeExamplesCheck.checked) {
      await loadLibraryExamples(currentSelection, (found) => {
        if (found) selectionFound = true;
      });
    }

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
    logger.error("Error loading sketches", error);
    handleBridgeError("Load sketches", error);
  }
}

// Load library examples into the sketch dropdown
async function loadLibraryExamples(currentSelection, onSelectionFound) {
  try {
    // Get list of installed libraries
    const libResponse = await fetch("/api/cli/libraries/installed");
    if (!libResponse.ok) return;

    const libData = await libResponse.json();
    const libraries = libData.libraries || [];

    if (libraries.length === 0) return;

    // Add separator before examples
    const separator = document.createElement("option");
    separator.disabled = true;
    separator.textContent = "── Library Examples ──";
    separator.style.color = "#888";
    sketchSelect.appendChild(separator);

    // For each installed library, get its examples
    for (const lib of libraries) {
      const examplesResponse = await fetch(
        `/api/cli/libraries/${encodeURIComponent(lib.name)}/examples`
      );

      if (!examplesResponse.ok) continue;

      const examplesData = await examplesResponse.json();
      if (
        !examplesData.success ||
        !examplesData.examples ||
        examplesData.examples.length === 0
      ) {
        continue;
      }

      // Add examples for this library
      examplesData.examples.forEach((example) => {
        const option = document.createElement("option");
        // Use the full path as value, prefixed to identify as example
        option.value = `__EXAMPLE__:${example.path}`;
        // Display as "LibraryName/ExampleName"
        const libNameClean = lib.name.replace(/_/g, " ");
        option.textContent = `📁 ${libNameClean}/${example.name}`;
        option.style.color = "#9cdcfe";
        sketchSelect.appendChild(option);

        if (option.value === currentSelection) {
          onSelectionFound(true);
        }
      });
    }
  } catch (error) {
    logger.error("Error loading library examples", error);
    // Don't throw - examples are optional
  }
}

// Handle "Include Examples" checkbox change
if (includeExamplesCheck) {
  includeExamplesCheck.addEventListener("change", () => {
    loadSketches();
  });
}

// Initialize - load boards and sketches
async function initialize() {
  await Promise.all([loadBoards(), loadSketches()]);
  updateCompileButtons();
}

initialize();

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

  compileBtn.disabled = !ready;

  if (uploadMode === "uf2-download") {
    // UF2 boards: Change button text and enable without serial connection
    compileUploadBtn.textContent = "Compile & Download (.uf2)";
    compileUploadBtn.disabled = !ready;
  } else {
    // Serial upload boards: Require connection
    compileUploadBtn.textContent = "Compile & Upload";
    const hasPort = !!serialManager.provider.port;
    compileUploadBtn.disabled = !(ready && hasPort);
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

boardSelect.addEventListener("change", async () => {
  updateCompileButtons();

  // Auto-select default baud rate for this board (only if not connected)
  if (!serialManager.provider.port) {
    const defaultBaud = getDefaultBaudRate(boardSelect.value);
    baudSelect.value = defaultBaud.toString();
  }

  // Update IntelliSense configuration for the selected board
  const fqbn = boardSelect.value;
  if (fqbn) {
    try {
      const response = await fetch("/api/intellisense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fqbn }),
      });
      if (response.ok) {
        logger.info(`IntelliSense updated for: ${fqbn}`);
        terminal.write(`\r\n✨ IntelliSense updated for ${fqbn}\r\n`);
      } else {
        logger.warn("IntelliSense: Failed to update configuration");
      }
    } catch (error) {
      logger.warn("IntelliSense: Error updating configuration", error);
    }
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

  logger.info(`Compiling sketch: '${sketchPath}' for board: '${fqbn}'`);
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

    if (Array.isArray(data.missingIncludes) && data.missingIncludes.length) {
      // Separate local includes ("header.h") from library includes (<header.h>)
      const localIncludes = data.missingIncludes.filter(
        (item) => item.isLibraryInclude === false
      );
      const libraryIncludes = data.missingIncludes.filter(
        (item) => item.isLibraryInclude !== false
      );

      if (localIncludes.length > 0) {
        terminal.write(
          '\r\n⚠ Missing local files (using #include "file.h" syntax):\r\n'
        );
        localIncludes.forEach((item) => {
          terminal.write(
            `   • "${item.header}" → Add ${item.header} and ${item.query}.cpp to your sketch folder\r\n`
          );
        });
      }

      if (libraryIncludes.length > 0) {
        terminal.write(
          "\r\n⚠ Missing libraries (using #include <lib.h> syntax):\r\n"
        );
        libraryIncludes.forEach((item) => {
          const suggestionNames = Array.isArray(item.suggestions)
            ? item.suggestions.map((lib) => lib.name).filter(Boolean)
            : [];

          if (suggestionNames.length) {
            terminal.write(
              `   • <${
                item.header
              }> → Install via Library Manager: ${suggestionNames.join(
                ", "
              )}\r\n`
            );
          } else {
            terminal.write(
              `   • <${item.header}> → Search Library Manager for "${item.query}"\r\n`
            );
          }
        });
        terminal.write(
          "   💡 After installing, recompile to refresh IntelliSense\r\n"
        );
      }
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

    // 6. Reconnect Serial Monitor using current baud selection
    try {
      // Close port if still open
      if (port.readable || port.writable) {
        await port.close();
      }

      const reconnectBaud =
        parseInt(baudSelect.value, 10) ||
        lastWorkingBaudRate ||
        getDefaultBaudRate(boardSelect.value);
      lastWorkingBaudRate = reconnectBaud;
      baudSelect.value = reconnectBaud.toString();

      // Connect with selected baud rate
      await serialManager.connect(reconnectBaud, port);

      try {
        await serialManager.write("\r\n");
      } catch (handshakeError) {
        logger.warn("Unable to send reconnection handshake", handshakeError);
      }

      // Success - update UI to connected state
      connectBtn.disabled = true;
      disconnectBtn.disabled = false;
      updateCompileButtons();
      serialInput.disabled = false;
      sendBtn.disabled = false;

      // Resume serial monitor after successful upload
      serialManager.resume();
      terminal.write("Serial monitor reconnected.\r\n");
    } catch (e) {
      logger.error("Reconnect failed", e);
      terminal.write("\r\nReconnect failed. Please connect manually.\r\n");
      // Resume serial monitor even on reconnect failure
      serialManager.resume();
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
            const baudRate =
              parseInt(baudSelect.value, 10) ||
              lastWorkingBaudRate ||
              getDefaultBaudRate(boardSelect.value);
            lastWorkingBaudRate = baudRate;
            baudSelect.value = baudRate.toString();
            await serialManager.connect(baudRate, port);

            try {
              await serialManager.write("\r\n");
            } catch (handshakeError) {
              logger.warn(
                "Unable to send post-bootloader handshake",
                handshakeError
              );
            }
            // Resume serial monitor after successful bootloader reconnect
            serialManager.resume();
          } catch (e) {
            terminal.write(
              "\r\nDevice rebooted. Please reconnect manually.\r\n"
            );
            serialManager.resume();
            connectBtn.disabled = false;
            disconnectBtn.disabled = true;
            baudSelect.disabled = false;
            updateCompileButtons();
          }
        } catch (e) {
          logger.error("Bootloader flash failed", e);
          terminal.write(`\r\nBootloader flash failed: ${e.message}\r\n`);
          serialManager.resume();
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
        serialManager.resume();
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
          serialManager.resume();
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
        serialManager.resume();
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

    logger.error("Upload failed", error);
    terminal.write(`\r\nUpload Error: ${error.message}\r\n`);

    // Try to reconnect
    try {
      // Ensure port is closed before trying to reopen
      if (port && port.readable) {
        try {
          await port.close();
        } catch (e) {}
      }

      const baudRate =
        parseInt(baudSelect.value, 10) ||
        lastWorkingBaudRate ||
        getDefaultBaudRate(boardSelect.value);
      lastWorkingBaudRate = baudRate;
      baudSelect.value = baudRate.toString();
      // If we have a saved port, try to reuse it
      if (port) {
        await serialManager.connect(baudRate, port);
      } else {
        await serialManager.connect(baudRate);
      }

      try {
        await serialManager.write("\r\n");
      } catch (handshakeError) {
        logger.warn("Unable to send recovery handshake", handshakeError);
      }
      // Resume serial monitor after error recovery
      serialManager.resume();
    } catch (e) {
      logger.error("Recovery reconnect failed", e);
      serialManager.resume();
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

  // Check for board mismatch before starting upload
  const shouldProceed = await checkBoardMismatch(savedPort, fqbn);
  if (!shouldProceed) {
    return; // User cancelled due to mismatch
  }

  // Pause serial monitor during compile/upload to avoid garbled output
  serialManager.pause();
  terminal.write("\r\n[Serial Monitor paused during compile/upload]\r\n");

  // All uploads use client-side Web Serial (BOSSA, AVR, ESP32, etc.)
  // Note: Server-side upload was attempted but doesn't work in GitHub Codespaces
  // since the Arduino is connected to the user's browser, not the server.

  // 1. Compile
  const artifactUrl = await compileSketch();
  if (!artifactUrl) {
    // Resume on compile failure
    serialManager.resume();
    terminal.write("[Serial Monitor resumed]\r\n");
    return;
  }

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

// Get default baud rate for a board (used when user hasn't selected a baud)
function getDefaultBaudRate(fqbn) {
  // Legacy AVR boards (Uno, Mega, Nano) traditionally used 9600
  // but 115200 is fine for them too and more responsive
  // Only return 9600 for very old/slow boards if needed
  return 115200;
}

/**
 * Check if the connected port's VID/PID matches the selected board.
 * Returns a promise that resolves to true if upload should proceed,
 * false if user cancelled.
 * @param {SerialPort} port - The connected serial port
 * @param {string} fqbn - The selected board FQBN
 * @returns {Promise<boolean>} - true if upload should proceed
 */
function checkBoardMismatch(port, fqbn) {
  return new Promise((resolve) => {
    if (!port) {
      resolve(true); // No port, let upload handle the error
      return;
    }

    const portInfo = port.getInfo();
    const selectedBoard = availableBoards.find((b) => b.fqbn === fqbn);

    // If no VID/PID info or no board metadata, skip check
    if (!portInfo.usbVendorId || !portInfo.usbProductId || !selectedBoard) {
      resolve(true);
      return;
    }

    // If board has no VID/PID metadata, skip check
    if (!selectedBoard.vid || !selectedBoard.pid) {
      resolve(true);
      return;
    }

    // Check if connected VID/PID matches any of the board's known VID/PIDs
    const vidMatch = selectedBoard.vid.some(
      (v) => parseInt(v) === portInfo.usbVendorId
    );
    const pidMatch = selectedBoard.pid.some(
      (p) => parseInt(p) === portInfo.usbProductId
    );

    if (vidMatch && pidMatch) {
      resolve(true); // Match found, proceed
      return;
    }

    // Mismatch detected - try to find what board IS connected
    const connectedBoard = availableBoards.find((b) => {
      if (!b.vid || !b.pid) return false;
      const vMatch = b.vid.some((v) => parseInt(v) === portInfo.usbVendorId);
      const pMatch = b.pid.some((p) => parseInt(p) === portInfo.usbProductId);
      return vMatch && pMatch;
    });

    // Format VID/PID for display
    const vidHex = portInfo.usbVendorId
      .toString(16)
      .toUpperCase()
      .padStart(4, "0");
    const pidHex = portInfo.usbProductId
      .toString(16)
      .toUpperCase()
      .padStart(4, "0");
    const connectedLabel = connectedBoard
      ? connectedBoard.name
      : `Unknown device (VID:${vidHex}, PID:${pidHex})`;

    // Update modal content
    mismatchConnected.textContent = connectedLabel;
    mismatchSelected.textContent = selectedBoard.name;

    // Show modal
    mismatchModal.style.display = "flex";

    const handleContinue = () => {
      mismatchModal.style.display = "none";
      cleanup();
      logger.warn(
        `Board Mismatch: User chose to proceed. Connected: ${connectedLabel}, Selected: ${selectedBoard.name}`
      );
      resolve(true);
    };

    const handleCancel = () => {
      mismatchModal.style.display = "none";
      cleanup();
      terminal.write(
        "\r\n\x1b[1;33mUpload cancelled due to board mismatch.\x1b[0m\r\n"
      );
      resolve(false);
    };

    const cleanup = () => {
      mismatchContinueBtn.removeEventListener("click", handleContinue);
      mismatchCancelBtn.removeEventListener("click", handleCancel);
    };

    mismatchContinueBtn.addEventListener("click", handleContinue);
    mismatchCancelBtn.addEventListener("click", handleCancel);
  });
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

    // Use selected baud rate (fallback to board default if unset)
    const selectedBaud =
      parseInt(baudSelect.value, 10) || getDefaultBaudRate(boardSelect.value);
    lastWorkingBaudRate = selectedBaud;
    baudSelect.value = selectedBaud.toString();

    // Connect with SerialManager using the selected baud rate and port
    await serialManager.connect(selectedBaud, port);

    // Send newline so sketches can detect the serial monitor opening
    try {
      await serialManager.write("\r\n");
    } catch (handshakeError) {
      logger.warn("Unable to send connection handshake", handshakeError);
    }

    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
    updateCompileButtons();

    // Enable Input
    serialInput.disabled = false;
    sendBtn.disabled = false;

    terminal.write("\r\nConnected to Serial Port\r\n");
  } catch (error) {
    logger.error("Connection failed", error);
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
  let newBaudRate = parseInt(baudSelect.value, 10);
  if (Number.isNaN(newBaudRate)) {
    newBaudRate = lastWorkingBaudRate || getDefaultBaudRate(boardSelect.value);
    baudSelect.value = newBaudRate.toString();
  }

  // Always track the selected baud rate for reconnection
  lastWorkingBaudRate = newBaudRate;

  // If connected, reconnect with new baud rate
  if (serialManager.provider.port) {
    const savedPort = serialManager.provider.port;

    terminal.write(`\r\nChanging baud rate to ${newBaudRate}...\r\n`);

    try {
      await serialManager.disconnect();
      await serialManager.connect(newBaudRate, savedPort);
      try {
        await serialManager.write("\r\n");
      } catch (handshakeError) {
        console.warn(
          "[Client] Unable to send baud-change handshake:",
          handshakeError
        );
      }
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

// ==========================================
// Main Navigation Setup
// ==========================================

function setupNavigation() {
  const navTabs = document.querySelectorAll(".nav-tab");
  const views = document.querySelectorAll(".view-container");
  const inputBar = document.querySelector(".input-bar");
  const toolbarGroup = document.querySelector(".toolbar-group");

  // Handle navigation tab clicks
  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetView = tab.dataset.view;

      // Update active tab
      navTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // Update active view
      views.forEach((v) => v.classList.remove("active"));
      const targetViewEl = document.getElementById(`${targetView}-view`);
      if (targetViewEl) {
        targetViewEl.classList.add("active");
      }

      // Show/hide serial-specific UI elements
      const isSerialView = targetView === "serial";
      if (inputBar) {
        inputBar.style.display = isSerialView ? "flex" : "none";
      }
      if (toolbarGroup) {
        toolbarGroup.style.display = isSerialView ? "flex" : "none";
      }

      // Resize terminal when switching to serial view
      if (isSerialView && terminal && terminal.fit) {
        setTimeout(() => terminal.fit(), 100);
      }
    });
  });

  // Handle hash-based routing (for deep links)
  function handleHashRoute() {
    const hash = window.location.hash.replace("#/", "").replace("#", "");
    const validViews = ["serial", "boards", "libraries", "reference"];

    if (validViews.includes(hash)) {
      const tab = document.querySelector(`.nav-tab[data-view="${hash}"]`);
      if (tab) {
        tab.click();
      }
    }
  }

  // Listen for hash changes
  window.addEventListener("hashchange", handleHashRoute);

  // Check initial hash on load
  if (window.location.hash) {
    handleHashRoute();
  }
}
