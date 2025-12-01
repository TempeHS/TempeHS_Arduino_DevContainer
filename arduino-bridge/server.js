import express from "express";
import http from "http";
import fs from "fs";
import path from "path";
import { spawn, exec } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const PORT = 3001; // API Server Port
const WORKSPACE_ROOT = path.resolve(__dirname, "..");
const BUILD_ROOT = path.join(WORKSPACE_ROOT, "build", "sketches");
const MAX_SCAN_DEPTH = 3;
const ROOT_IGNORE_DIRS = new Set([
  "arduino-bridge",
  "docs",
  "scripts",
  "build",
  ".git",
  ".github",
  ".vscode",
  ".devcontainer",
  "node_modules",
]);
const INTERNAL_IGNORE_DIRS = new Set([
  "build",
  "cmake-build",
  "node_modules",
  "dist",
  "out",
  ".git",
  ".vscode",
]);

fs.mkdirSync(BUILD_ROOT, { recursive: true });

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use("/artifacts", express.static(BUILD_ROOT));

// --- Helper Functions ---

function isHiddenDir(name) {
  return name.startsWith(".");
}

function folderContainsIno(targetPath, depth = 0) {
  if (depth > MAX_SCAN_DEPTH) return false;
  let entries;
  try {
    entries = fs.readdirSync(targetPath, { withFileTypes: true });
  } catch (err) {
    return false;
  }
  for (const entry of entries) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".ino"))
      return true;
    if (entry.isDirectory()) {
      const dirName = entry.name;
      if (isHiddenDir(dirName) || INTERNAL_IGNORE_DIRS.has(dirName)) continue;
      if (folderContainsIno(path.join(targetPath, dirName), depth + 1))
        return true;
    }
  }
  return false;
}

function listSketchDirectories() {
  let entries = [];
  try {
    entries = fs.readdirSync(WORKSPACE_ROOT, { withFileTypes: true });
  } catch (err) {
    console.error("Failed to read workspace root", err);
    return [];
  }
  const sketches = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirName = entry.name;
    if (isHiddenDir(dirName) || ROOT_IGNORE_DIRS.has(dirName)) continue;
    const absolutePath = path.join(WORKSPACE_ROOT, dirName);
    if (folderContainsIno(absolutePath)) {
      sketches.push({ name: dirName, relativePath: dirName });
    }
  }
  return sketches.sort((a, b) => a.name.localeCompare(b.name));
}

function validateSketchPath(relativePath) {
  if (!relativePath || typeof relativePath !== "string") return null;
  const normalized = path.normalize(relativePath).replace(/^\/+/, "");
  if (normalized.includes("..")) return null;
  const absolutePath = path.join(WORKSPACE_ROOT, normalized);
  if (!absolutePath.startsWith(WORKSPACE_ROOT)) return null;
  if (!fs.existsSync(absolutePath) || !fs.lstatSync(absolutePath).isDirectory())
    return null;
  return { absolutePath, normalized };
}

function slugify(value) {
  return (
    value
      .replace(/[^a-zA-Z0-9/_-]+/g, "-")
      .replace(/[\/]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "sketch"
  );
}

function findArtifactFile(outputDir) {
  // Priority: UF2 (RP2040/Renesas) > BIN (ESP32) > HEX (AVR)
  const preferredExtensions = [".uf2", ".bin", ".hex"];
  let entries = [];
  try {
    entries = fs.readdirSync(outputDir);
  } catch (e) {
    return null;
  }

  for (const ext of preferredExtensions) {
    const match = entries.find((file) => file.toLowerCase().endsWith(ext));
    if (match) return path.join(outputDir, match);
  }
  return null;
}

function runArduinoCompile({ sketchPath, fqbn, outputDir }) {
  return new Promise((resolve) => {
    const args = [
      "compile",
      "--fqbn",
      fqbn,
      "--output-dir",
      outputDir,
      sketchPath,
    ];
    console.log(`Running: arduino-cli ${args.join(" ")}`);
    const child = spawn("arduino-cli", args, {
      cwd: sketchPath,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => (stdout += data.toString()));
    child.stderr.on("data", (data) => (stderr += data.toString()));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.on("error", (err) => (stderr += `\nSpawn error: ${err.message}`));
  });
}

async function prepareCompile(relativePath, fqbn) {
  if (!relativePath || !fqbn)
    return { ok: false, status: 400, error: "Missing path or fqbn" };
  const normalizedFqbn = String(fqbn).trim();
  const resolved = validateSketchPath(relativePath);
  if (!resolved)
    return { ok: false, status: 400, error: "Invalid sketch path" };
  if (!folderContainsIno(resolved.absolutePath))
    return {
      ok: false,
      status: 400,
      error: "Selected folder does not contain .ino files",
    };

  const slug = slugify(resolved.normalized);
  const outputDir = path.join(BUILD_ROOT, slug);

  try {
    fs.rmSync(outputDir, { recursive: true, force: true });
    fs.mkdirSync(outputDir, { recursive: true });
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: "Unable to prepare build directory",
    };
  }

  const compileResult = await runArduinoCompile({
    sketchPath: resolved.absolutePath,
    fqbn: normalizedFqbn,
    outputDir,
  });

  const compileLog = [compileResult.stdout, compileResult.stderr]
    .filter(Boolean)
    .join("\n")
    .trim();
  if (compileResult.code !== 0)
    return { ok: false, status: 500, error: "Compile failed", log: compileLog };

  let artifactPath;
  try {
    artifactPath = findArtifactFile(outputDir);
  } catch (err) {}

  if (!artifactPath)
    return {
      ok: false,
      status: 500,
      error: "Compile succeeded but no artifact was found",
      log: compileLog,
    };

  const artifactStats = fs.statSync(artifactPath);
  const artifactName = path.basename(artifactPath);

  return {
    ok: true,
    status: 200,
    normalizedFqbn,
    resolved,
    slug,
    outputDir,
    artifact: {
      name: artifactName,
      url: `/artifacts/${slug}/${artifactName}`,
      size: artifactStats.size,
    },
    log: compileLog,
  };
}

// --- API Endpoints ---

app.get("/api/sketches", (req, res) => {
  try {
    const sketches = listSketchDirectories();
    res.json({ sketches });
  } catch (err) {
    res.status(500).json({ error: "Unable to list sketches" });
  }
});

app.get("/api/boards", (req, res) => {
  exec("arduino-cli board listall --format json", (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).json({ error: "Failed to list boards" });
    }
    try {
      const data = JSON.parse(stdout);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to parse board list" });
    }
  });
});

app.post("/api/compile", async (req, res) => {
  const { path: relativePath, fqbn } = req.body || {};
  const compileResult = await prepareCompile(relativePath, fqbn);

  if (!compileResult.ok) {
    return res
      .status(compileResult.status)
      .json({ error: compileResult.error, log: compileResult.log });
  }

  res.json({
    success: true,
    fqbn: compileResult.normalizedFqbn,
    sketch: compileResult.resolved.normalized,
    artifact: compileResult.artifact,
    log: compileResult.log,
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Bridge API server running on port ${PORT}`);
});
