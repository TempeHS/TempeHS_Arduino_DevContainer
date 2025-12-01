// Clean Client Implementation (Optimized)
const connectBtn = document.getElementById("connectBtn");
const statusSpan = document.getElementById("status");
const terminalDiv = document.getElementById("terminal");
const refreshSketchesBtn = document.getElementById("refreshSketches");
const sketchSelect = document.getElementById("sketchSelect");
const sketchStatusEl = document.getElementById("sketchStatus");
const boardSelect = document.getElementById("boardSelect");
const compileBtn = document.getElementById("compileBtn");
const compileStatusEl = document.getElementById("compileStatus");
const compileLogEl = document.getElementById("compileLog");
const downloadArtifactLink = document.getElementById("downloadArtifact");
const uploadBtn = document.getElementById("uploadBtn");
const uploadStatusEl = document.getElementById("uploadStatus");

const BAUD_RATE = 115200;
let port;
let reader;
let writer;
let keepReading = false;
let selectedSketchPath = "";
let selectedBoardFqbn = "";
const decoder = new TextDecoder();

// --- Logging & Status ---

function log(message) {
  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", { hour12: false }) + "." + String(now.getMilliseconds()).padStart(3, "0");
  
  // Optimization: Use appendChild with TextNode to avoid O(N^2) DOM reparsing
  // This prevents browser freezing when receiving fast serial data
  const textNode = document.createTextNode(`[${timeString}] ${message}`);
  terminalDiv.appendChild(textNode);
  
  // Prune old logs to prevent memory exhaustion (keep last ~2000 chunks)
  if (terminalDiv.childNodes.length > 2000) {
    for (let i = 0; i < 200; i++) {
      if (terminalDiv.firstChild) terminalDiv.removeChild(terminalDiv.firstChild);
    }
  }
  
  terminalDiv.scrollTop = terminalDiv.scrollHeight;
}

function setStatus(msg, color = "#cccccc") {
  statusSpan.textContent = msg;
  statusSpan.style.color = color;
}

function setUploadStatus(msg, color = "#cccccc") {
  if (uploadStatusEl) {
    uploadStatusEl.textContent = msg;
    uploadStatusEl.style.color = color;
  }
}

function setCompileStatus(msg, color = "#cccccc") {
  if (compileStatusEl) {
    compileStatusEl.textContent = msg;
    compileStatusEl.style.color = color;
  }
}

// --- Serial Port Management ---

async function openSerialPort() {
  if (!port) return;
  await port.open({ baudRate: BAUD_RATE });
  reader = port.readable.getReader();
  writer = port.writable.getWriter();
  keepReading = true;
  readLoop();
  setStatus("Connected", "#00ff00");
  connectBtn.disabled = false;
  connectBtn.textContent = "Disconnect";
  updateUIState();
}

async function closeSerialPort() {
  keepReading = false;
  if (reader) {
    try { await reader.cancel(); } catch (e) {}
    reader.releaseLock();
    reader = null;
  }
  if (writer) {
    try { await writer.close(); } catch (e) {}
    writer.releaseLock();
    writer = null;
  }
  if (port) {
    try { await port.close(); } catch (e) {}
  }
  setStatus("Disconnected", "#cccccc");
  connectBtn.disabled = false;
  connectBtn.textContent = "Connect Arduino";
  updateUIState();
}

async function readLoop() {
  while (port.readable && keepReading) {
    try {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        const text = decoder.decode(value);
        log(text); 
      }
    } catch (e) {
      console.error("Read error", e);
      break;
    }
  }
}

connectBtn.addEventListener("click", async () => {
  if (!navigator.serial) return alert("Web Serial not supported");
  
  // Handle Disconnect
  if (port && keepReading) {
    await closeSerialPort();
    port = null;
    return;
  }

  // Handle Connect
  try {
    port = await navigator.serial.requestPort();
    await openSerialPort();
  } catch (e) {
    console.error(e);
    setStatus("Connection failed", "red");
  }
});

// --- Board & Sketch Management ---

async function loadBoards() {
  try {
    const res = await fetch("/api/boards");
    const data = await res.json();
    boardSelect.innerHTML = "";
    
    const boards = data.boards || [];
    boards.sort((a, b) => a.name.localeCompare(b.name));

    boards.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.fqbn;
      opt.textContent = b.name;
      if (b.fqbn === "arduino:avr:uno") opt.selected = true; 
      boardSelect.appendChild(opt);
    });
    
    if (boardSelect.value) selectedBoardFqbn = boardSelect.value;
  } catch (e) {
    console.error("Failed to load boards", e);
  }
}

async function loadSketches() {
  sketchSelect.innerHTML = "<option>Loading...</option>";
  try {
    const res = await fetch("/api/sketches");
    const data = await res.json();
    sketchSelect.innerHTML = "";
    data.sketches.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.relativePath;
      opt.textContent = s.name;
      sketchSelect.appendChild(opt);
    });
    if (sketchSelect.options.length > 0) {
      sketchSelect.selectedIndex = 0;
      selectedSketchPath = sketchSelect.value;
    }
    updateUIState();
  } catch (e) {
    sketchSelect.innerHTML = "<option>Error loading sketches</option>";
  }
}

sketchSelect.addEventListener("change", () => {
  selectedSketchPath = sketchSelect.value;
  updateUIState();
});

boardSelect.addEventListener("change", () => {
  selectedBoardFqbn = boardSelect.value;
  updateUIState();
});

refreshSketchesBtn.addEventListener("click", loadSketches);

function updateUIState() {
  const ready = selectedSketchPath && selectedBoardFqbn;
  compileBtn.disabled = !ready;
  uploadBtn.disabled = !(ready && port); 
}

// --- Compile & Upload ---

async function compileSketch() {
  setCompileStatus("Compiling...", "#ffff00");
  compileLogEl.textContent = "";
  
  try {
    const res = await fetch("/api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selectedSketchPath, fqbn: selectedBoardFqbn })
    });
    const data = await res.json();
    
    compileLogEl.textContent = data.log || "";
    
    if (data.success) {
      setCompileStatus("Success", "#00ff00");
      if (data.artifact) {
        downloadArtifactLink.href = data.artifact.url;
        downloadArtifactLink.textContent = `Download ${data.artifact.name}`;
        downloadArtifactLink.classList.remove("hidden");
        return data.artifact.url;
      }
    } else {
      setCompileStatus("Failed", "red");
    }
  } catch (e) {
    setCompileStatus("Error: " + e.message, "red");
  }
  return null;
}

compileBtn.addEventListener("click", compileSketch);

uploadBtn.addEventListener("click", async () => {
  if (!port) return alert("Connect Arduino first");
  
  // 1. Compile
  setUploadStatus("Compiling...", "#ffff00");
  const artifactUrl = await compileSketch();
  if (!artifactUrl) {
    setUploadStatus("Compile failed, aborting upload", "red");
    return;
  }
  
  // 2. Download Hex
  setUploadStatus("Downloading Hex...", "#ffff00");
  try {
    const res = await fetch(artifactUrl);
    const hexData = await res.text(); 
    
    // 3. Flash
    setUploadStatus("Flashing...", "#ffff00");
    await handleHexUpload(hexData);
    setUploadStatus("Upload Complete", "#00ff00");
    log("\n[Upload] Success!\n");
    
  } catch (e) {
    console.error(e);
    setUploadStatus("Upload Failed: " + e.message, "red");
    log(`\n[Upload] Failed: ${e.message}\n`);
  }
});

async function handleHexUpload(hexData) {
  await closeSerialPort();
  
  try {
    await port.open({ baudRate: 115200 }); 
    
    // Reset Pulse
    await port.setSignals({ dataTerminalReady: false });
    await new Promise(r => setTimeout(r, 100));
    await port.setSignals({ dataTerminalReady: true });
    await new Promise(r => setTimeout(r, 100));
    await port.setSignals({ dataTerminalReady: false });
    await new Promise(r => setTimeout(r, 100));

    const stk = new STK500(port, (msg) => log(`[STK500] ${msg}\n`));
    await stk.flashHex(hexData, (progress) => {
      setUploadStatus(`Flashing: ${progress}%`, "#ffff00");
    });

  } finally {
    try { await port.close(); } catch(e) {} 
    await openSerialPort();
  }
}

// Init
loadBoards();
loadSketches();
