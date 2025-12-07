/**
 * Arduino Bridge Server
 *
 * Main server application that provides:
 * - REST API for Arduino CLI operations (compile, upload, board/library management)
 * - Static file serving for the web client
 * - IntelliSense configuration generation
 * - Sketch and artifact management
 * - Health monitoring and auto-recovery
 *
 * @module server
 * @version 1.0.15
 */

import express from "express";
import http from "http";
import fs from "fs";
import path from "path";
import { spawn, exec } from "child_process";
import { fileURLToPath } from "url";
import { serverLogger } from "./src/shared/Logger.js";
import { success, failure, ErrorCodes } from "./src/shared/Result.js";

// CLI Manager imports
import { checkCliAvailable } from "./src/server/cli-executor.js";
import * as coreManager from "./src/server/core-manager.js";
import * as libraryManager from "./src/server/library-manager.js";

// =============================================================================
// Constants
// =============================================================================

/** Server version for cache debugging - update when making changes */
const SERVER_VERSION = "1.0.15";

/** Server start time for uptime calculation */
const SERVER_START_TIME = Date.now();

/** @type {Set<ChildProcess>} Track active child processes for cleanup */
const activeProcesses = new Set();

/** @type {string} Path to crash log file */
const CRASH_LOG_PATH = "/tmp/arduino-bridge-crash.log";

serverLogger.info(`Version: ${SERVER_VERSION}`);
serverLogger.info(`Started at: ${new Date().toISOString()}`);

// =============================================================================
// Process-Level Exception Handlers
// =============================================================================

/**
 * Log crash to file for debugging
 * @param {string} type - Type of error (uncaughtException, unhandledRejection)
 * @param {Error|*} error - The error that occurred
 */
function logCrash(type, error) {
  const timestamp = new Date().toISOString();
  const errorMessage =
    error instanceof Error
      ? `${error.message}\n${error.stack || ""}`
      : String(error);
  const logEntry = `[${timestamp}] ${type}:\n${errorMessage}\n\n`;

  try {
    fs.appendFileSync(CRASH_LOG_PATH, logEntry);
  } catch (e) {
    // Ignore write errors
  }
}

/**
 * Clean up tracked resources after error
 */
function cleanupResources() {
  serverLogger.info(`Cleaning up ${activeProcesses.size} active processes...`);

  activeProcesses.forEach((proc) => {
    try {
      proc.kill("SIGTERM");
      setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch (e) {
          /* ignore */
        }
      }, 1000);
    } catch (e) {
      serverLogger.warn(`Failed to kill process: ${e.message}`);
    }
  });

  activeProcesses.clear();
}

/**
 * Attempt graceful recovery after error
 * @param {string} type - Type of error
 * @param {Error|*} error - The error that occurred
 */
function attemptRecovery(type, error) {
  serverLogger.error(`${type}:`, error);
  logCrash(type, error);
  cleanupResources();
  serverLogger.warn("Recovery complete - server continuing");
}

// Catch uncaught exceptions - keep server running
process.on("uncaughtException", (error) => {
  attemptRecovery("Uncaught Exception", error);
});

// Catch unhandled promise rejections - keep server running
process.on("unhandledRejection", (reason, promise) => {
  attemptRecovery("Unhandled Rejection", reason);
});

// Graceful shutdown handlers
process.on("SIGTERM", () => {
  serverLogger.info("Received SIGTERM, shutting down gracefully...");
  cleanupResources();
  process.exit(0);
});

process.on("SIGINT", () => {
  serverLogger.info("Received SIGINT, shutting down gracefully...");
  cleanupResources();
  process.exit(0);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

/** API server port */
const PORT = 3001;

/** Root workspace directory */
const WORKSPACE_ROOT = path.resolve(__dirname, "..");

/** Directory for compiled sketch artifacts */
const BUILD_ROOT = path.join(WORKSPACE_ROOT, "build", "sketches");

/** Path to bridge restart script */
const START_SCRIPT = path.join(
  WORKSPACE_ROOT,
  ".devcontainer",
  "start-bridge.sh"
);

/** Path to upload strategies directory */
const STRATEGIES_ROOT = path.join(
  WORKSPACE_ROOT,
  "Arduino_Upload_to_WebSerialAPI_Tool",
  "src",
  "strategies"
);

/** Maximum depth for sketch directory scanning */
const MAX_SCAN_DEPTH = 3;

/** Directories to ignore when scanning workspace root for sketches */
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

// =============================================================================
// State
// =============================================================================

/** Current board FQBN for IntelliSense regeneration */
let currentFqbn = "arduino:renesas_uno:unor4wifi";

/** Flag to prevent concurrent restart operations */
let restartInProgress = false;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Regenerate IntelliSense configuration for the current board
 * @param {string} reason - Reason for regeneration (for logging)
 * @returns {Promise<{success: boolean, fqbn?: string, error?: string}>}
 */
async function regenerateIntelliSense(reason = "unknown") {
  if (!currentFqbn) {
    console.log("[IntelliSense] No current FQBN set, skipping regeneration");
    return { success: false, error: "No board selected" };
  }

  console.log(
    `[IntelliSense] Regenerating for ${currentFqbn} (reason: ${reason})`
  );

  const scriptPath = path.join(
    __dirname,
    "scripts",
    "generate-intellisense.sh"
  );

  if (!fs.existsSync(scriptPath)) {
    console.warn("[IntelliSense] Script not found:", scriptPath);
    return { success: false, error: "IntelliSense script not found" };
  }

  try {
    const { promisify } = await import("util");
    const execPromise = promisify(exec);

    const { stdout, stderr } = await execPromise(
      `bash "${scriptPath}" "${currentFqbn}"`
    );
    console.log(`[IntelliSense] Updated: ${stdout.trim()}`);
    if (stderr) console.warn(`[IntelliSense] stderr: ${stderr}`);

    return { success: true, fqbn: currentFqbn };
  } catch (error) {
    console.error(`[IntelliSense] Error:`, error.message);
    return { success: false, error: error.message };
  }
}

/** Directories to ignore when scanning inside sketch folders */
const INTERNAL_IGNORE_DIRS = new Set([
  "build",
  "cmake-build",
  "node_modules",
  "dist",
  "out",
  ".git",
  ".vscode",
]);

/** Standard C/C++ library headers that should not trigger library suggestions */
const STANDARD_LIBRARY_HEADERS = new Set(
  [
    "assert",
    "arduino",
    "complex",
    "ctype",
    "errno",
    "float",
    "inttypes",
    "limits",
    "locale",
    "math",
    "setjmp",
    "signal",
    "stdarg",
    "stdbool",
    "stddef",
    "stdint",
    "stdio",
    "stdlib",
    "string",
    "time",
  ].map((name) => name.toLowerCase())
);

/**
 * Pattern to detect include style from source code line
 * - #include <header.h> = library include (use Library Manager)
 * - #include "header.h" = local include (file should be in sketch folder)
 */
const INCLUDE_STYLE_PATTERN = /#include\s*([<"])([^>"]+)[>"]/;

/** Patterns to detect missing include errors from compiler output */
const MISSING_INCLUDE_PATTERNS = [
  // GCC style: fatal error: Servo.h: No such file or directory
  /fatal error:\s*([^\s:]+\.h(?:pp|xx)?)\s*:\s*No such file or directory/i,
  // Clang style with quotes/angles
  /fatal error:\s*['"]([^'"]+)['"]\s*file not found/i,
  /error:\s*['"]([^'"]+)['"]\s*file not found/i,
  // Generic fallback
  /No such file or directory[:]?\s*['"]?([^'":\s]+\.h(?:pp|xx)?)['"]?/i,
];

/**
 * Normalize a library name for comparison
 * @param {string} name - Library name to normalize
 * @returns {string} Normalized name (lowercase, alphanumeric only)
 */
function normalizeLibraryName(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Detect missing includes from compiler output and suggest libraries
 * @param {string|string[]} compileLog - Compiler output
 * @returns {Promise<Array<{header: string, query: string, isLibraryInclude: boolean|null, suggestions: Array}>>}
 */
async function detectMissingIncludes(compileLog) {
  if (!compileLog) return [];

  const lines = Array.isArray(compileLog)
    ? compileLog.join("\n").split(/\r?\n/)
    : String(compileLog).split(/\r?\n/);

  const missingHeaders = new Map();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of MISSING_INCLUDE_PATTERNS) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const rawHeader = match[1].trim();
        const headerName = path.basename(rawHeader);
        const baseName = headerName.replace(/\.(h|hh|hpp|hxx)$/i, "");
        const normalizedBase = normalizeLibraryName(baseName);

        // Look at surrounding lines (GCC often shows the source line after the error)
        // The #include line might be on the next line or previous lines
        let isAngleBracket = null;
        for (
          let j = Math.max(0, i - 2);
          j < Math.min(lines.length, i + 3);
          j++
        ) {
          const nearbyLine = lines[j];
          const includeMatch = nearbyLine.match(INCLUDE_STYLE_PATTERN);
          console.log(
            `[MissingLib] Checking line ${j}: "${nearbyLine.substring(
              0,
              50
            )}" includeMatch:`,
            includeMatch ? includeMatch[1] : null
          );
          if (includeMatch && nearbyLine.includes(rawHeader)) {
            isAngleBracket = includeMatch[1] === "<";
            console.log(
              `[MissingLib] Found include style: ${includeMatch[1]} -> isAngleBracket: ${isAngleBracket}`
            );
            break;
          }
        }

        console.log(
          `[MissingLib] Found: "${rawHeader}" -> base: "${baseName}", angleBracket: ${isAngleBracket}`
        );

        if (!baseName || normalizedBase.length < 2) continue;
        if (STANDARD_LIBRARY_HEADERS.has(normalizedBase)) continue;

        missingHeaders.set(normalizedBase, {
          header: rawHeader,
          baseName,
          isLibraryInclude: isAngleBracket,
        });
        break;
      }
    }
  }

  console.log(`[MissingLib] Detected ${missingHeaders.size} missing headers`);

  if (missingHeaders.size === 0) return [];

  let installedLibrariesNormalized = new Set();
  try {
    const installed = await libraryManager.listInstalledLibraries();
    if (installed.success && Array.isArray(installed.libraries)) {
      installedLibrariesNormalized = new Set(
        installed.libraries
          .map((lib) => normalizeLibraryName(lib.name))
          .filter(Boolean)
      );
    }
  } catch (error) {
    console.warn("[Compile] Unable to list installed libraries:", error);
  }

  const suggestions = [];

  for (const [normalizedBase, info] of missingHeaders.entries()) {
    if (installedLibrariesNormalized.has(normalizedBase)) continue;

    let librarySuggestions = [];
    let searchError = null;

    // Only search for library suggestions if it's a library-style include
    if (info.isLibraryInclude !== false) {
      try {
        const searchResult = await libraryManager.searchLibraries(
          info.baseName
        );
        if (searchResult.success && Array.isArray(searchResult.libraries)) {
          librarySuggestions = searchResult.libraries
            .slice(0, 3)
            .map((lib) => ({
              name: lib.name,
              latestVersion: lib.latestVersion,
              author: lib.author,
            }));
        }
      } catch (error) {
        searchError = error.message;
      }
    }

    suggestions.push({
      header: info.header,
      query: info.baseName,
      isLibraryInclude: info.isLibraryInclude,
      suggestions: librarySuggestions,
      error: librarySuggestions.length === 0 ? searchError : undefined,
    });
  }

  return suggestions;
}

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

// Version endpoint for client verification
app.get("/api/version", (req, res) => {
  res.json({
    version: SERVER_VERSION,
    timestamp: new Date().toISOString(),
    component: "server",
  });
});

// =============================================================================
// Health Endpoint
// =============================================================================

/**
 * Format uptime in human-readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime string
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}

/**
 * Health check endpoint for monitoring
 * Client polls this every 30s to detect server availability
 */
app.get("/api/health", (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME) / 1000);
  const memUsage = process.memoryUsage();

  res.json({
    success: true,
    data: {
      status: "healthy",
      version: SERVER_VERSION,
      uptime: uptimeSeconds,
      uptimeFormatted: formatUptime(uptimeSeconds),
      activeProcesses: activeProcesses.size,
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
      },
    },
  });
});

// ==========================================
// CLI Manager API Routes
// ==========================================

// --- Health & Diagnostics ---
app.get("/api/cli/health", async (req, res) => {
  try {
    const cliInfo = await checkCliAvailable();
    const coreIndexStatus = coreManager.getCoreIndexStatus();
    const libIndexStatus = libraryManager.getLibraryIndexStatus();

    // Get counts of installed items
    const [installedCores, installedLibs] = await Promise.all([
      coreManager.listInstalledCores(),
      libraryManager.listInstalledLibraries(),
    ]);

    res.json({
      available: cliInfo.available,
      version: cliInfo.version || null,
      commit: cliInfo.commit || null,
      coresIndexAge: coreIndexStatus.ageSeconds,
      librariesIndexAge: libIndexStatus.ageSeconds,
      coresIndexNeedsRefresh: coreIndexStatus.needsRefresh,
      librariesIndexNeedsRefresh: libIndexStatus.needsRefresh,
      installedCoresCount: installedCores.success
        ? installedCores.platforms.length
        : 0,
      installedLibrariesCount: installedLibs.success
        ? installedLibs.libraries.length
        : 0,
      error: cliInfo.available ? null : cliInfo.error,
    });
  } catch (error) {
    console.error("[CLI Health] Error:", error);
    res.status(500).json({
      available: false,
      error: error.message,
    });
  }
});

// --- Core/Board Index Management ---
app.get("/api/cli/cores/index/status", (req, res) => {
  res.json(coreManager.getCoreIndexStatus());
});

app.post("/api/cli/cores/index/update", async (req, res) => {
  try {
    console.log("[CLI] Updating core index...");
    const result = await coreManager.updateCoreIndex();
    res.json(result);
  } catch (error) {
    console.error("[CLI] Core index update error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Additional Board URLs ---
app.get("/api/cli/cores/urls", async (req, res) => {
  try {
    const result = await coreManager.getAdditionalBoardUrls();
    res.json(result);
  } catch (error) {
    console.error("[CLI] Get board URLs error:", error);
    res.status(500).json({ success: false, urls: [], error: error.message });
  }
});

app.post("/api/cli/cores/urls/add", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res
        .status(400)
        .json({ success: false, urls: [], error: "URL is required" });
    }
    console.log(`[CLI] Adding board URL: ${url}`);
    const result = await coreManager.addBoardUrl(url);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("[CLI] Add board URL error:", error);
    res.status(500).json({ success: false, urls: [], error: error.message });
  }
});

app.post("/api/cli/cores/urls/remove", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res
        .status(400)
        .json({ success: false, urls: [], error: "URL is required" });
    }
    console.log(`[CLI] Removing board URL: ${url}`);
    const result = await coreManager.removeBoardUrl(url);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("[CLI] Remove board URL error:", error);
    res.status(500).json({ success: false, urls: [], error: error.message });
  }
});

// --- Core Search & List ---
app.get("/api/cli/cores/search", async (req, res) => {
  try {
    const query = req.query.q || "";
    console.log(`[CLI] Searching cores: "${query}"`);
    const result = await coreManager.searchCores(query);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("[CLI] Core search error:", error);
    res
      .status(500)
      .json({ success: false, platforms: [], error: error.message });
  }
});

app.get("/api/cli/cores/installed", async (req, res) => {
  try {
    const result = await coreManager.listInstalledCores();
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("[CLI] List installed cores error:", error);
    res
      .status(500)
      .json({ success: false, platforms: [], error: error.message });
  }
});

// --- Core Install/Upgrade/Uninstall ---
app.post("/api/cli/cores/install", async (req, res) => {
  try {
    const { platformId, version } = req.body;
    if (!platformId) {
      return res
        .status(400)
        .json({ success: false, error: "platformId is required" });
    }

    console.log(
      `[CLI] Installing core: ${platformId}${version ? "@" + version : ""}`
    );
    const result = await coreManager.installCore(platformId, version);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("[CLI] Core install error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/cli/cores/upgrade", async (req, res) => {
  try {
    const { platformId } = req.body;
    if (!platformId) {
      return res
        .status(400)
        .json({ success: false, error: "platformId is required" });
    }

    console.log(`[CLI] Upgrading core: ${platformId}`);
    const result = await coreManager.upgradeCore(platformId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("[CLI] Core upgrade error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/cli/cores/uninstall", async (req, res) => {
  try {
    const { platformId } = req.body;
    if (!platformId) {
      return res
        .status(400)
        .json({ success: false, error: "platformId is required" });
    }

    console.log(`[CLI] Uninstalling core: ${platformId}`);
    const result = await coreManager.uninstallCore(platformId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("[CLI] Core uninstall error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Library Index Management ---
app.get("/api/cli/libraries/index/status", (req, res) => {
  res.json(libraryManager.getLibraryIndexStatus());
});

app.post("/api/cli/libraries/index/update", async (req, res) => {
  try {
    console.log("[CLI] Updating library index...");
    const result = await libraryManager.updateLibraryIndex();
    res.json(result);
  } catch (error) {
    console.error("[CLI] Library index update error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Library Search & List ---
app.get("/api/cli/libraries/search", async (req, res) => {
  try {
    const query = req.query.q || "";
    if (!query) {
      return res.status(400).json({
        success: false,
        libraries: [],
        error: "Search query (q) is required",
      });
    }

    console.log(`[CLI] Searching libraries: "${query}"`);
    const result = await libraryManager.searchLibraries(query);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("[CLI] Library search error:", error);
    res
      .status(500)
      .json({ success: false, libraries: [], error: error.message });
  }
});

app.get("/api/cli/libraries/installed", async (req, res) => {
  try {
    const result = await libraryManager.listInstalledLibraries();
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("[CLI] List installed libraries error:", error);
    res
      .status(500)
      .json({ success: false, libraries: [], error: error.message });
  }
});

// --- Library Install/Upgrade/Uninstall ---
app.post("/api/cli/libraries/install", async (req, res) => {
  try {
    const { name, version, installDeps } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, error: "name is required" });
    }

    console.log(
      `[CLI] Installing library: ${name}${version ? "@" + version : ""}${
        installDeps ? " (with deps)" : ""
      }`
    );
    const result = await libraryManager.installLibrary(
      name,
      version,
      installDeps
    );

    if (result.success) {
      // Regenerate IntelliSense to pick up new library
      await regenerateIntelliSense(`library install: ${name}`);
      // Sync library examples to workspace
      await libraryManager.syncLibraryExamples();
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("[CLI] Library install error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/cli/libraries/upgrade", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, error: "name is required" });
    }

    console.log(`[CLI] Upgrading library: ${name}`);
    const result = await libraryManager.upgradeLibrary(name);

    if (result.success) {
      // Regenerate IntelliSense in case library paths changed
      await regenerateIntelliSense(`library upgrade: ${name}`);
      // Sync library examples in case examples changed
      await libraryManager.syncLibraryExamples();
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("[CLI] Library upgrade error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/cli/libraries/uninstall", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, error: "name is required" });
    }

    console.log(`[CLI] Uninstalling library: ${name}`);
    const result = await libraryManager.uninstallLibrary(name);

    if (result.success) {
      // Regenerate IntelliSense to remove library paths
      await regenerateIntelliSense(`library uninstall: ${name}`);
      // Remove stale example symlinks
      await libraryManager.syncLibraryExamples();
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("[CLI] Library uninstall error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Library Install from Git URL ---
app.post("/api/cli/libraries/install-git", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res
        .status(400)
        .json({ success: false, error: "Git URL is required" });
    }

    console.log(`[CLI] Installing library from Git: ${url}`);
    const result = await libraryManager.installLibraryFromGit(url);

    if (result.success) {
      // Regenerate IntelliSense to pick up new library
      await regenerateIntelliSense(`library install from git: ${url}`);
      // Sync library examples
      await libraryManager.syncLibraryExamples();
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("[CLI] Library install from Git error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Library Install from ZIP file ---
app.post("/api/cli/libraries/install-zip", async (req, res) => {
  try {
    const { path: zipPath } = req.body;
    if (!zipPath) {
      return res
        .status(400)
        .json({ success: false, error: "ZIP file path is required" });
    }

    console.log(`[CLI] Installing library from ZIP: ${zipPath}`);
    const result = await libraryManager.installLibraryFromZip(zipPath);

    if (result.success) {
      // Regenerate IntelliSense to pick up new library
      await regenerateIntelliSense(`library install from zip: ${zipPath}`);
      // Sync library examples
      await libraryManager.syncLibraryExamples();
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("[CLI] Library install from ZIP error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Library Examples API ---
app.post("/api/cli/libraries/examples/sync", async (req, res) => {
  try {
    console.log("[CLI] Syncing library examples...");
    const result = await libraryManager.syncLibraryExamples();

    if (result.success) {
      console.log(
        `[CLI] Synced ${result.synced} library examples, removed ${result.removed} stale links`
      );
    } else {
      console.warn("[CLI] Examples sync completed with errors:", result.errors);
    }

    res.json(result);
  } catch (error) {
    console.error("[CLI] Library examples sync error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/cli/libraries/:name/examples", async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, error: "Library name is required" });
    }

    const result = await libraryManager.getLibraryExamples(name);
    res.json(result);
  } catch (error) {
    console.error("[CLI] Get library examples error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/cli/libraries/examples/copy", async (req, res) => {
  try {
    const { examplePath, targetName } = req.body;
    if (!examplePath) {
      return res
        .status(400)
        .json({ success: false, error: "Example path is required" });
    }

    console.log(
      `[CLI] Copying example: ${examplePath} -> ${targetName || "(auto)"}`
    );
    const result = await libraryManager.copyExampleToWorkspace(
      examplePath,
      targetName
    );

    if (result.success) {
      console.log(`[CLI] Example copied to: ${result.targetPath}`);
    }

    res.json(result);
  } catch (error) {
    console.error("[CLI] Copy example error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// End CLI Manager API Routes
// ==========================================

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

function listStrategies() {
  try {
    const entries = fs.readdirSync(STRATEGIES_ROOT, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
      .map((entry) => ({
        name: entry.name.replace(/\.js$/, ""),
        file: entry.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("Failed to list strategies", err);
    return [];
  }
}

function runRestartSequence() {
  if (restartInProgress) {
    return Promise.resolve({ inProgress: true });
  }

  restartInProgress = true;

  const restartCmd = [
    'pkill -9 -f "node.*arduino-bridge" 2>/dev/null || true',
    "lsof -ti:3000,3001,3002,3003 | xargs -r kill -9 2>/dev/null || true",
    "sleep 1",
    `bash "${START_SCRIPT}"`,
  ].join(" && ");

  return new Promise((resolve) => {
    const child = spawn("bash", ["-c", restartCmd], {
      cwd: WORKSPACE_ROOT,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      restartInProgress = false;
      resolve({ code, stdout, stderr });
    });

    child.on("error", (error) => {
      restartInProgress = false;
      resolve({ code: -1, stdout, stderr: error?.message || "" });
    });
  });
}

function validateSketchPath(relativePath) {
  if (!relativePath || typeof relativePath !== "string") return null;

  // Handle library example paths (prefixed with __EXAMPLE__:)
  if (relativePath.startsWith("__EXAMPLE__:")) {
    const examplePath = relativePath.substring("__EXAMPLE__:".length);
    // Validate the example path exists and is a directory
    if (
      !fs.existsSync(examplePath) ||
      !fs.lstatSync(examplePath).isDirectory()
    ) {
      return null;
    }
    // For examples, use the full path directly
    return { absolutePath: examplePath, normalized: examplePath };
  }

  // Standard workspace-relative path handling
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

function findArtifactFile(outputDir, fqbn) {
  // Determine preference based on FQBN
  let preferredExtensions = [".uf2", ".bin", ".hex"];

  if (fqbn && fqbn.includes(":avr:")) {
    // AVR boards (Uno R3, Mega, Nano) need HEX for STK500
    preferredExtensions = [".hex", ".bin", ".uf2"];
  }

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

/** @constant {number} CLI_TIMEOUT_MS - Maximum time for CLI operations */
const CLI_TIMEOUT_MS = 120000; // 2 minutes

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
    serverLogger.info(`Running: arduino-cli ${args.join(" ")}`);

    let resolved = false;
    const child = spawn("arduino-cli", args, {
      cwd: sketchPath,
      env: process.env,
    });

    // Track process for cleanup
    activeProcesses.add(child);

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        serverLogger.warn(
          `Compile timed out after ${CLI_TIMEOUT_MS}ms, killing process`
        );
        child.kill("SIGTERM");
        setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch (e) {
            /* ignore */
          }
        }, 1000);
        activeProcesses.delete(child);
        resolve({
          code: -1,
          stdout: "",
          stderr: `Compile timed out after ${CLI_TIMEOUT_MS}ms`,
        });
      }
    }, CLI_TIMEOUT_MS);

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => (stdout += data.toString()));
    child.stderr.on("data", (data) => (stderr += data.toString()));

    child.on("close", (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        activeProcesses.delete(child);
        resolve({ code, stdout, stderr });
      }
    });

    child.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        activeProcesses.delete(child);

        // Handle specific spawn errors
        if (err.code === "ENOENT") {
          resolve({
            code: -1,
            stdout: "",
            stderr: "arduino-cli not found. Is it installed and in PATH?",
          });
        } else if (err.code === "EPERM") {
          resolve({
            code: -1,
            stdout: "",
            stderr: `Permission denied: ${err.message}`,
          });
        } else {
          resolve({
            code: -1,
            stdout: "",
            stderr: `Spawn error: ${err.message}`,
          });
        }
      }
    });
  });
}

async function prepareCompile(relativePath, fqbn) {
  serverLogger.info(`Preparing compile for: ${relativePath} (${fqbn})`);
  if (!relativePath || !fqbn)
    return { ok: false, status: 400, error: "Missing path or fqbn" };
  const normalizedFqbn = String(fqbn).trim();
  const resolved = validateSketchPath(relativePath);
  serverLogger.debug(`Resolved path:`, resolved);
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
  const missingIncludes =
    compileResult.code !== 0 ? await detectMissingIncludes(compileLog) : [];
  if (compileResult.code !== 0)
    return {
      ok: false,
      status: 500,
      error: "Compile failed",
      log: compileLog,
      missingIncludes,
    };

  let artifactPath;
  try {
    artifactPath = findArtifactFile(outputDir, normalizedFqbn);
  } catch (err) {}

  if (!artifactPath)
    return {
      ok: false,
      status: 500,
      error: "Compile succeeded but no artifact was found",
      log: compileLog,
      missingIncludes,
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
    missingIncludes,
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

// Get detailed board info including upload protocol
app.get("/api/board-details/:fqbn(*)", (req, res) => {
  const fqbn = req.params.fqbn;
  if (!fqbn) {
    return res.status(400).json({ error: "Missing FQBN parameter" });
  }

  exec(
    `arduino-cli board details --fqbn "${fqbn}" --format json`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`[Board Details] Error for ${fqbn}:`, error.message);
        return res
          .status(500)
          .json({ error: `Failed to get board details: ${error.message}` });
      }
      try {
        const data = JSON.parse(stdout);

        // Extract upload protocol from build_properties
        let uploadTool = null;
        let uploadProtocol = null;
        let use1200bpsTouch = false;

        if (data.build_properties) {
          for (const prop of data.build_properties) {
            if (prop.startsWith("upload.tool.default=")) {
              uploadTool = prop.split("=")[1];
            } else if (prop.startsWith("upload.tool=") && !uploadTool) {
              uploadTool = prop.split("=")[1];
            } else if (prop.startsWith("upload.protocol=")) {
              uploadProtocol = prop.split("=")[1];
            } else if (prop === "upload.use_1200bps_touch=true") {
              use1200bpsTouch = true;
            }
          }
        }

        // Also check tools_dependencies for protocol hints
        const toolNames = (data.tools_dependencies || []).map((t) => t.name);

        // Determine protocol type from upload tool
        let protocolType = "unknown";
        if (uploadTool) {
          const toolLower = uploadTool.toLowerCase();
          if (toolLower.includes("bossac") || toolLower.includes("bossa")) {
            protocolType = "bossa";
          } else if (toolLower.includes("avrdude")) {
            protocolType = "stk500";
          } else if (
            toolLower.includes("esptool") ||
            toolLower.includes("esp")
          ) {
            protocolType = "esptool";
          } else if (
            toolLower.includes("picotool") ||
            toolLower.includes("rp2040")
          ) {
            protocolType = "rp2040";
          } else if (toolLower.includes("teensy")) {
            protocolType = "teensy";
          } else if (toolLower.includes("dfu")) {
            protocolType = "dfu";
          } else if (toolLower.includes("openocd")) {
            protocolType = "openocd";
          }
        }

        // Fallback: check tools_dependencies
        if (protocolType === "unknown" && toolNames.length > 0) {
          if (toolNames.some((t) => t.includes("bossac"))) {
            protocolType = "bossa";
          } else if (toolNames.some((t) => t.includes("avrdude"))) {
            protocolType = "stk500";
          } else if (toolNames.some((t) => t.includes("esptool"))) {
            protocolType = "esptool";
          }
        }

        res.json({
          fqbn: data.fqbn,
          name: data.name,
          version: data.version,
          uploadTool,
          uploadProtocol,
          protocolType,
          use1200bpsTouch,
          toolsDependencies: toolNames,
          // Include raw data for debugging
          _raw: {
            buildPropertiesCount: data.build_properties?.length || 0,
            programmersCount: data.programmers?.length || 0,
          },
        });
      } catch (e) {
        console.error(`[Board Details] Parse error for ${fqbn}:`, e.message);
        res.status(500).json({ error: "Failed to parse board details" });
      }
    }
  );
});

app.get("/api/strategies", (req, res) => {
  const strategies = listStrategies();
  res.json({ strategies });
});

app.post("/api/compile", async (req, res) => {
  console.log("[API] Received compile request:", req.body);
  const { path: relativePath, fqbn } = req.body || {};
  const compileResult = await prepareCompile(relativePath, fqbn);

  if (!compileResult.ok) {
    return res.status(compileResult.status).json({
      error: compileResult.error,
      log: compileResult.log,
      missingIncludes: compileResult.missingIncludes || [],
    });
  }

  res.json({
    success: true,
    fqbn: compileResult.normalizedFqbn,
    sketch: compileResult.resolved.normalized,
    artifact: compileResult.artifact,
    log: compileResult.log,
    missingIncludes: compileResult.missingIncludes || [],
  });
});

// --- Server-Side Upload Endpoint ---
// Uses native bossac/arduino-cli for reliable uploads
// Workaround for Web Serial limitations with R4 WiFi
app.post("/api/upload", async (req, res) => {
  console.log("[API] Received upload request:", req.body);
  const { path: relativePath, fqbn, port } = req.body || {};

  if (!relativePath || !fqbn || !port) {
    return res.status(400).json({ error: "Missing path, fqbn, or port" });
  }

  // First compile
  const compileResult = await prepareCompile(relativePath, fqbn);
  if (!compileResult.ok) {
    return res.status(compileResult.status).json({
      error: compileResult.error,
      log: compileResult.log,
      missingIncludes: compileResult.missingIncludes || [],
    });
  }

  // Then upload using arduino-cli
  const artifactPath = path.join(
    compileResult.outputDir,
    compileResult.artifact.name
  );

  console.log(
    `[Upload] Uploading ${artifactPath} to ${port} for board ${fqbn}`
  );

  const uploadResult = await new Promise((resolve) => {
    const args = [
      "upload",
      "--fqbn",
      fqbn,
      "--port",
      port,
      "--input-file",
      artifactPath,
      "--verbose",
    ];

    console.log(`Running: arduino-cli ${args.join(" ")}`);
    const child = spawn("arduino-cli", args, {
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      const str = data.toString();
      stdout += str;
      console.log("[Upload stdout]", str);
    });
    child.stderr.on("data", (data) => {
      const str = data.toString();
      stderr += str;
      console.log("[Upload stderr]", str);
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.on("error", (err) => {
      stderr += `\nSpawn error: ${err.message}`;
      resolve({ code: 1, stdout, stderr });
    });
  });

  const uploadLog = [
    compileResult.log,
    "--- UPLOAD ---",
    uploadResult.stdout,
    uploadResult.stderr,
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  if (uploadResult.code !== 0) {
    return res.status(500).json({
      success: false,
      error: "Upload failed",
      log: uploadLog,
    });
  }

  res.json({
    success: true,
    fqbn: compileResult.normalizedFqbn,
    sketch: compileResult.resolved.normalized,
    log: uploadLog,
  });
});

// --- List Serial Ports ---
app.get("/api/ports", (req, res) => {
  exec("arduino-cli board list --format json", (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).json({ error: "Failed to list ports" });
    }
    try {
      const data = JSON.parse(stdout);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to parse port list" });
    }
  });
});

// --- Update IntelliSense Configuration ---
app.post("/api/intellisense", async (req, res) => {
  const { fqbn } = req.body || {};

  if (!fqbn) {
    return res.status(400).json({ error: "Missing fqbn" });
  }

  // Track current FQBN for library change regeneration
  currentFqbn = fqbn;
  console.log(`[IntelliSense] Updating configuration for board: ${fqbn}`);

  const scriptPath = path.join(
    __dirname,
    "scripts",
    "generate-intellisense.sh"
  );

  if (!fs.existsSync(scriptPath)) {
    return res.status(500).json({ error: "IntelliSense script not found" });
  }

  try {
    const { promisify } = await import("util");
    const execPromise = promisify(exec);

    const { stdout, stderr } = await execPromise(
      `bash "${scriptPath}" "${fqbn}"`
    );

    console.log(`[IntelliSense] ${stdout}`);
    if (stderr) console.warn(`[IntelliSense] stderr: ${stderr}`);

    res.json({
      success: true,
      fqbn,
      message: "IntelliSense configuration updated",
      log: stdout,
    });
  } catch (error) {
    console.error(`[IntelliSense] Error:`, error);
    res.status(500).json({
      error: "Failed to update IntelliSense configuration",
      details: error.message,
    });
  }
});

app.post("/api/restart", async (req, res) => {
  if (restartInProgress) {
    return res.status(409).json({ error: "Restart already in progress" });
  }

  if (!fs.existsSync(START_SCRIPT)) {
    return res
      .status(500)
      .json({ success: false, error: "start-bridge.sh not found" });
  }

  const result = await runRestartSequence();

  if (result.inProgress) {
    return res.status(409).json({ error: "Restart already in progress" });
  }

  const log = [result.stdout, result.stderr].filter(Boolean).join("\n");

  if (result.code !== 0) {
    return res
      .status(500)
      .json({ success: false, error: "Bridge restart failed", log });
  }

  res.json({ success: true, log });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Bridge API server running on port ${PORT}`);
});
