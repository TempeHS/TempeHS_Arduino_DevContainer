# Arduino Bridge Implementation Plan v2.0

**Date:** December 7, 2025  
**Version:** 2.0  
**Status:** ✅ COMPLETE  
**Breaking Changes:** Yes (no backwards compatibility required)

---

## ✅ Implementation Complete (December 7, 2025)

All 6 phases have been successfully implemented. See `TODOS.md` for the detailed implementation summary.

### Summary of Changes:

- **Phase 1**: Created `src/shared/Result.js` with `success()`/`failure()` factories and 22 ErrorCodes
- **Phase 2**: Renamed protocol classes (STK500→STK500Protocol, Bossa→BossaProtocol, ESPTool→ESPToolProtocol)
- **Phase 3**: Created `src/shared/Logger.js` with unified Logger class and log levels
- **Phase 4**: Added global error handlers, health monitoring, offline banner to `main.js`
- **Phase 5**: Added process handlers, health endpoint, CLI timeout to `server.js`
- **Phase 6**: Rewrote `start-bridge.sh` as supervisor with restart loop and crash logging

**Build Status**: ✅ Verified (npm run build successful)

---

## Executive Summary

This document outlines a comprehensive implementation plan that combines:

1. **TODO 4: Rock-Solid Reliability & Auto-Recovery** - Exception handling, auto-restart, high availability
2. **Consistency Improvements** - Error patterns, protocol naming, logging standardization

Since backwards compatibility is NOT required, we will make breaking changes to establish clean, consistent patterns throughout the codebase.

---

## Table of Contents

1. [Phase 1: Standardized Result Type](#phase-1-standardized-result-type)
2. [Phase 2: Protocol Class Renaming](#phase-2-protocol-class-renaming)
3. [Phase 3: Unified Logging System](#phase-3-unified-logging-system)
4. [Phase 4: Client-Side Resilience](#phase-4-client-side-resilience)
5. [Phase 5: Server-Side Resilience](#phase-5-server-side-resilience)
6. [Phase 6: Supervisor & Auto-Restart](#phase-6-supervisor--auto-restart)
7. [Implementation Order](#implementation-order)
8. [File Change Matrix](#file-change-matrix)
9. [Testing Strategy](#testing-strategy)
10. [Acceptance Criteria](#acceptance-criteria)

---

## Phase 1: Standardized Result Type

### 1.1 Problem Statement

Currently, the codebase uses multiple inconsistent patterns for returning operation results:

| Pattern   | Example                                            | Used In                                              |
| --------- | -------------------------------------------------- | ---------------------------------------------------- |
| Pattern A | `{ success: boolean, data?, error? }`              | cli-executor.js, library-manager.js, core-manager.js |
| Pattern B | `{ ok: boolean, status, error }`                   | server.js (prepareCompile)                           |
| Pattern C | `{ available: boolean, version?, error? }`         | cli-executor.js (checkCliAvailable)                  |
| Pattern D | `{ success: boolean, needsManualReset?, reason? }` | BOSSAStrategy.js                                     |

### 1.2 Solution: Unified `Result<T>` Pattern

Create a standardized result type used across ALL functions:

```typescript
// Type definition (for documentation - implemented as plain JS)
interface Result<T> {
  success: boolean; // Whether operation succeeded
  data?: T; // Result data on success
  error?: string; // Error message on failure
  code?: string; // Machine-readable error code (optional)
  duration?: number; // Operation duration in ms (optional)
}
```

### 1.3 Implementation Details

#### 1.3.1 Create Result Factory (`src/shared/Result.js`)

```javascript
/**
 * Standardized Result Type
 *
 * Factory functions for creating consistent result objects across the codebase.
 *
 * @module shared/Result
 */

/**
 * Create a success result
 * @template T
 * @param {T} data - The result data
 * @param {Object} [options] - Additional options
 * @param {number} [options.duration] - Operation duration in ms
 * @returns {Result<T>}
 */
export function success(data, options = {}) {
  return {
    success: true,
    data,
    ...(options.duration !== undefined && { duration: options.duration }),
  };
}

/**
 * Create a failure result
 * @param {string} error - Error message
 * @param {Object} [options] - Additional options
 * @param {string} [options.code] - Machine-readable error code
 * @param {number} [options.duration] - Operation duration in ms
 * @returns {Result<never>}
 */
export function failure(error, options = {}) {
  return {
    success: false,
    error,
    ...(options.code && { code: options.code }),
    ...(options.duration !== undefined && { duration: options.duration }),
  };
}

/**
 * Error codes for machine-readable error handling
 */
export const ErrorCodes = {
  // General
  UNKNOWN: "UNKNOWN",
  TIMEOUT: "TIMEOUT",
  CANCELLED: "CANCELLED",

  // Serial/Port
  PORT_NOT_FOUND: "PORT_NOT_FOUND",
  PORT_BUSY: "PORT_BUSY",
  PORT_DISCONNECTED: "PORT_DISCONNECTED",
  PORT_PERMISSION_DENIED: "PORT_PERMISSION_DENIED",

  // Upload
  UPLOAD_FAILED: "UPLOAD_FAILED",
  SYNC_FAILED: "SYNC_FAILED",
  BOOTLOADER_NOT_FOUND: "BOOTLOADER_NOT_FOUND",
  FIRMWARE_INVALID: "FIRMWARE_INVALID",
  MANUAL_RESET_REQUIRED: "MANUAL_RESET_REQUIRED",

  // Compile
  COMPILE_FAILED: "COMPILE_FAILED",
  SKETCH_NOT_FOUND: "SKETCH_NOT_FOUND",
  BOARD_NOT_SELECTED: "BOARD_NOT_SELECTED",

  // CLI
  CLI_NOT_FOUND: "CLI_NOT_FOUND",
  CLI_TIMEOUT: "CLI_TIMEOUT",
  CLI_ERROR: "CLI_ERROR",

  // Library/Core
  LIBRARY_NOT_FOUND: "LIBRARY_NOT_FOUND",
  CORE_NOT_FOUND: "CORE_NOT_FOUND",
  INDEX_UPDATE_FAILED: "INDEX_UPDATE_FAILED",

  // Server
  SERVER_UNAVAILABLE: "SERVER_UNAVAILABLE",
  INVALID_REQUEST: "INVALID_REQUEST",
};
```

#### 1.3.2 Files to Update

| File                                              | Current Pattern    | Changes Required                       |
| ------------------------------------------------- | ------------------ | -------------------------------------- |
| `server.js`                                       | Mixed (ok/success) | Convert all to `success()`/`failure()` |
| `src/server/cli-executor.js`                      | Pattern A + C      | Standardize, add error codes           |
| `src/server/core-manager.js`                      | Pattern A          | Add error codes                        |
| `src/server/library-manager.js`                   | Pattern A          | Add error codes                        |
| `src/client/services/strategies/BOSSAStrategy.js` | Pattern D          | Convert to standard + error codes      |
| `src/client/services/strategies/AVRStrategy.js`   | Throws             | Convert to Result pattern              |
| `src/client/services/UploadManager.js`            | Mixed              | Standardize                            |
| `src/client/services/SerialManager.js`            | Mixed              | Standardize                            |

#### 1.3.3 API Response Standardization

All Express route handlers will return:

```javascript
// Success
res.json({ success: true, data: { ... } });

// Error
res.status(400).json({ success: false, error: "message", code: "ERROR_CODE" });
```

### 1.4 Migration Examples

**Before (server.js):**

```javascript
return { ok: false, status: 400, error: "Missing path or fqbn" };
```

**After:**

```javascript
import { failure, ErrorCodes } from "./src/shared/Result.js";
return failure("Missing path or fqbn", { code: ErrorCodes.INVALID_REQUEST });
```

**Before (BOSSAStrategy.js):**

```javascript
return { success: false, needsManualReset: true, reason: "no_response" };
```

**After:**

```javascript
import { failure, ErrorCodes } from "../../shared/Result.js";
return failure("No response from bootloader - manual reset required", {
  code: ErrorCodes.MANUAL_RESET_REQUIRED,
});
```

---

## Phase 2: Protocol Class Renaming

### 2.1 Problem Statement

Protocol classes lack consistent naming suffix, making it unclear what type of class they are:

| Current Name | Type     | Issue                                      |
| ------------ | -------- | ------------------------------------------ |
| `STK500`     | Protocol | No suffix - unclear purpose                |
| `Bossa`      | Protocol | No suffix - unclear purpose                |
| `ESPTool`    | Protocol | No suffix - sounds like tool, not protocol |

### 2.2 Solution: Add `Protocol` Suffix

Rename all protocol classes to include `Protocol` suffix:

| Current   | New               | File Rename                         |
| --------- | ----------------- | ----------------------------------- |
| `STK500`  | `STK500Protocol`  | `STK500.js` → `STK500Protocol.js`   |
| `Bossa`   | `BossaProtocol`   | `Bossa.js` → `BossaProtocol.js`     |
| `ESPTool` | `ESPToolProtocol` | `ESPTool.js` → `ESPToolProtocol.js` |

### 2.3 Implementation Details

#### 2.3.1 File Renames

```bash
# Rename files
mv src/client/services/protocols/STK500.js src/client/services/protocols/STK500Protocol.js
mv src/client/services/protocols/Bossa.js src/client/services/protocols/BossaProtocol.js
mv src/client/services/protocols/ESPTool.js src/client/services/protocols/ESPToolProtocol.js
```

#### 2.3.2 Class Renames

**STK500Protocol.js:**

```javascript
export class STK500Protocol {
  // ... implementation unchanged
}
```

**BossaProtocol.js:**

```javascript
export class BossaProtocol {
  // ... implementation unchanged
}
```

**ESPToolProtocol.js:**

```javascript
export class ESPToolProtocol {
  // ... implementation unchanged
}
```

#### 2.3.3 Update Imports

| File                 | Change                                                              |
| -------------------- | ------------------------------------------------------------------- |
| `AVRStrategy.js`     | `import { STK500Protocol } from "../protocols/STK500Protocol.js"`   |
| `BOSSAStrategy.js`   | `import { BossaProtocol } from "../protocols/BossaProtocol.js"`     |
| `ESPToolStrategy.js` | `import { ESPToolProtocol } from "../protocols/ESPToolProtocol.js"` |

---

## Phase 3: Unified Logging System

### 3.1 Problem Statement

The codebase uses inconsistent logging approaches:

1. **Direct console calls** with inconsistent prefixes
2. **UploadLogger** for upload operations only
3. **No structured logging** for debugging/production
4. **Mixed console methods** (log, info, warn, error) without clear guidelines

### 3.2 Solution: Unified Logger Class

Create a unified `Logger` class that:

- Provides consistent interface across client and server
- Supports log levels (debug, info, warn, error)
- Includes timestamps and context prefixes
- Can be extended for file logging (server) or remote logging (client)

### 3.3 Implementation Details

#### 3.3.1 Create Logger (`src/shared/Logger.js`)

```javascript
/**
 * Unified Logger
 *
 * Provides consistent logging across client and server with:
 * - Log levels (debug, info, warn, error)
 * - Timestamps
 * - Context prefixes
 * - Structured data support
 *
 * @module shared/Logger
 */

/** @enum {number} Log levels */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

/** @type {number} Current minimum log level */
let currentLevel = LogLevel.INFO;

/**
 * Set the minimum log level
 * @param {number} level - LogLevel value
 */
export function setLogLevel(level) {
  currentLevel = level;
}

/**
 * Logger class for consistent logging
 */
export class Logger {
  /**
   * Create a new Logger instance
   * @param {string} context - Logger context (e.g., 'Server', 'Client', 'BOSSA')
   */
  constructor(context) {
    this.context = context;
  }

  /**
   * Get formatted timestamp
   * @returns {string}
   * @private
   */
  _timestamp() {
    return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  }

  /**
   * Format message with context and timestamp
   * @param {string} level - Level indicator
   * @param {string} message - Message to log
   * @returns {string}
   * @private
   */
  _format(level, message) {
    return `[${this.context} ${this._timestamp()}] ${level} ${message}`;
  }

  /**
   * Log debug message
   * @param {string} message
   * @param {*} [data] - Optional data to log
   */
  debug(message, data) {
    if (currentLevel <= LogLevel.DEBUG) {
      if (data !== undefined) {
        console.debug(this._format("🔍", message), data);
      } else {
        console.debug(this._format("🔍", message));
      }
    }
  }

  /**
   * Log info message
   * @param {string} message
   * @param {*} [data] - Optional data to log
   */
  info(message, data) {
    if (currentLevel <= LogLevel.INFO) {
      if (data !== undefined) {
        console.info(this._format("ℹ️ ", message), data);
      } else {
        console.info(this._format("ℹ️ ", message));
      }
    }
  }

  /**
   * Log warning message
   * @param {string} message
   * @param {*} [data] - Optional data to log
   */
  warn(message, data) {
    if (currentLevel <= LogLevel.WARN) {
      if (data !== undefined) {
        console.warn(this._format("⚠️ ", message), data);
      } else {
        console.warn(this._format("⚠️ ", message));
      }
    }
  }

  /**
   * Log error message
   * @param {string} message
   * @param {Error|*} [error] - Optional error or data
   */
  error(message, error) {
    if (currentLevel <= LogLevel.ERROR) {
      if (error !== undefined) {
        const errorMsg = error instanceof Error ? error.message : error;
        console.error(this._format("❌", message), errorMsg);
      } else {
        console.error(this._format("❌", message));
      }
    }
  }

  /**
   * Log success message (always INFO level)
   * @param {string} message
   */
  success(message) {
    if (currentLevel <= LogLevel.INFO) {
      console.log(this._format("✅", message));
    }
  }

  /**
   * Create a child logger with additional context
   * @param {string} subContext - Additional context
   * @returns {Logger}
   */
  child(subContext) {
    return new Logger(`${this.context}:${subContext}`);
  }
}

// Pre-configured loggers for common contexts
export const serverLogger = new Logger("Server");
export const clientLogger = new Logger("Client");
```

#### 3.3.2 Extend UploadLogger to Use Logger

Modify `UploadLogger` to extend the base `Logger`:

```javascript
import { Logger } from "../../shared/Logger.js";

/**
 * Extended logger for upload operations
 * Provides additional methods for protocol-specific logging
 */
export class UploadLogger extends Logger {
  constructor(context) {
    super(context);
    this.startTime = Date.now();
  }

  // ... existing methods (section, tx, rx, etc.) unchanged
  // They now inherit debug/info/warn/error from Logger
}
```

#### 3.3.3 Files to Update

| File                   | Current                                  | Change                                      |
| ---------------------- | ---------------------------------------- | ------------------------------------------- |
| `server.js`            | `console.log("[Server]...")`             | `serverLogger.info(...)`                    |
| `main.js`              | `console.info("[Client]...")`            | `clientLogger.info(...)`                    |
| `BoardManagerUI.js`    | `console.error("[BoardManagerUI]...")`   | `new Logger('BoardManagerUI').error(...)`   |
| `LibraryManagerUI.js`  | `console.error("[LibraryManagerUI]...")` | `new Logger('LibraryManagerUI').error(...)` |
| `ReferenceUI.js`       | `console.warn("[ReferenceUI]...")`       | `new Logger('ReferenceUI').warn(...)`       |
| `WebSerialProvider.js` | Uses UploadLogger                        | Keep using UploadLogger                     |
| `library-manager.js`   | `console.log("[LibManager]...")`         | `new Logger('LibManager').info(...)`        |
| All other files        | Various console.\*                       | Use appropriate Logger instance             |

#### 3.3.4 Logging Guidelines

| Level     | When to Use                             | Example                             |
| --------- | --------------------------------------- | ----------------------------------- |
| `debug`   | Detailed debugging info, verbose output | Protocol byte traces, state changes |
| `info`    | Normal operational messages             | "Connected", "Upload complete"      |
| `warn`    | Recoverable issues, deprecations        | "Port already open, closing"        |
| `error`   | Errors that affect operation            | "Upload failed", "Connection lost"  |
| `success` | Completion of significant operations    | "Firmware uploaded successfully"    |

---

## Phase 4: Client-Side Resilience

### 4.1 Global Error Boundary

#### 4.1.1 Implementation (`main.js`)

```javascript
import { clientLogger } from "./shared/Logger.js";
import { failure, ErrorCodes } from "./shared/Result.js";

// Global error handlers
window.onerror = (message, source, lineno, colno, error) => {
  clientLogger.error(`Uncaught error: ${message}`, {
    source,
    lineno,
    colno,
    error,
  });
  handleGlobalError(error || new Error(message));
  return true; // Prevent default handling
};

window.onunhandledrejection = (event) => {
  clientLogger.error("Unhandled promise rejection", event.reason);
  handleGlobalError(event.reason);
  event.preventDefault();
};

/**
 * Handle global errors with graceful recovery
 * @param {Error} error
 */
async function handleGlobalError(error) {
  // Show error to user
  showError(`Unexpected error: ${error.message}`);

  // Attempt recovery
  try {
    if (serialManager?.isConnected()) {
      clientLogger.info("Attempting graceful disconnect after error");
      await serialManager.disconnect();
    }
  } catch (recoveryError) {
    clientLogger.warn("Recovery disconnect failed", recoveryError);
  }

  // Reset UI state
  updateConnectionUI(false);
}
```

### 4.2 Port Health Monitoring

#### 4.2.1 Implementation (`WebSerialProvider.js`)

```javascript
/** @constant {number} RECONNECT_DELAY_MS */
const RECONNECT_DELAY_MS = 2000;

/** @constant {number} MAX_RECONNECT_ATTEMPTS */
const MAX_RECONNECT_ATTEMPTS = 3;

/**
 * Handle port disconnect with auto-reconnect
 * @private
 */
async _handleDisconnect() {
  this.log.warn('Port disconnected');
  this.emit('disconnect');

  // Auto-reconnect if we have port reference
  if (this.port && this.autoReconnect) {
    for (let attempt = 1; attempt <= MAX_RECONNECT_ATTEMPTS; attempt++) {
      this.log.info(`Reconnect attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS}`);
      await new Promise(r => setTimeout(r, RECONNECT_DELAY_MS));

      try {
        await this.connect(this.lastBaudRate, this.port);
        this.log.success('Reconnected successfully');
        this.emit('reconnect');
        return;
      } catch (e) {
        this.log.warn(`Reconnect attempt ${attempt} failed`, e);
      }
    }

    this.log.error('All reconnect attempts failed');
    this.emit('reconnect_failed');
  }
}
```

### 4.3 Timeout Guards

#### 4.3.1 Implementation (`WebSerialProvider.js`)

```javascript
/** @constant {number} READ_TIMEOUT_MS */
const READ_TIMEOUT_MS = 5000;

/** @constant {number} WRITE_TIMEOUT_MS */
const WRITE_TIMEOUT_MS = 5000;

/**
 * Write data with timeout
 * @param {string} data
 * @returns {Promise<Result<void>>}
 */
async write(data) {
  if (!this.port || !this.port.writable) {
    return failure('Port not writable', { code: ErrorCodes.PORT_DISCONNECTED });
  }

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Write timeout')), WRITE_TIMEOUT_MS)
  );

  try {
    const encoder = new TextEncoder();
    const writer = this.port.writable.getWriter();

    await Promise.race([
      writer.write(encoder.encode(data)),
      timeoutPromise
    ]);

    writer.releaseLock();
    return success(undefined);
  } catch (error) {
    return failure(error.message, {
      code: error.message.includes('timeout') ? ErrorCodes.TIMEOUT : ErrorCodes.UNKNOWN
    });
  }
}
```

### 4.4 Server Health Polling

#### 4.4.1 Implementation (`main.js`)

```javascript
/** @constant {number} HEALTH_CHECK_INTERVAL_MS */
const HEALTH_CHECK_INTERVAL_MS = 30000;

let healthCheckInterval = null;
let serverOnline = true;

/**
 * Start server health monitoring
 */
function startHealthMonitoring() {
  healthCheckInterval = setInterval(
    checkServerHealth,
    HEALTH_CHECK_INTERVAL_MS
  );
}

/**
 * Check server health
 */
async function checkServerHealth() {
  try {
    const response = await fetch("/api/health", {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      if (!serverOnline) {
        clientLogger.success("Server back online");
        hideBridgeOfflineBanner();
        serverOnline = true;
      }
    } else {
      throw new Error("Health check failed");
    }
  } catch (error) {
    if (serverOnline) {
      clientLogger.error("Server offline", error);
      showBridgeOfflineBanner();
      serverOnline = false;
    }
  }
}

/**
 * Show bridge offline banner
 */
function showBridgeOfflineBanner() {
  let banner = document.getElementById("bridge-offline-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "bridge-offline-banner";
    banner.className = "offline-banner";
    banner.innerHTML =
      "⚠️ Arduino Bridge is offline - some features unavailable";
    document.body.prepend(banner);
  }
  banner.style.display = "block";
}

/**
 * Hide bridge offline banner
 */
function hideBridgeOfflineBanner() {
  const banner = document.getElementById("bridge-offline-banner");
  if (banner) {
    banner.style.display = "none";
  }
}
```

---

## Phase 5: Server-Side Resilience

### 5.1 Process-Level Exception Handlers

#### 5.1.1 Implementation (`server.js`)

```javascript
import { serverLogger } from "./src/shared/Logger.js";

// Process-level error handlers
process.on("uncaughtException", (error) => {
  serverLogger.error("Uncaught exception", error);
  attemptGracefulRecovery(error);
});

process.on("unhandledRejection", (reason, promise) => {
  serverLogger.error("Unhandled rejection", { reason, promise });
  attemptGracefulRecovery(reason);
});

/**
 * Attempt graceful recovery after error
 * @param {Error|*} error
 */
function attemptGracefulRecovery(error) {
  serverLogger.info("Attempting graceful recovery");

  // Clean up any tracked resources
  cleanupResources();

  // Log to crash file
  const crashLog = `/tmp/arduino-bridge-crash-${Date.now()}.log`;
  fs.appendFileSync(
    crashLog,
    `${new Date().toISOString()}: ${error}\n${error.stack || ""}\n\n`
  );

  // Don't exit - keep server running
  serverLogger.warn("Recovery complete - server continuing");
}

/**
 * Clean up tracked resources
 */
function cleanupResources() {
  // Kill any lingering child processes
  activeProcesses.forEach((proc) => {
    try {
      proc.kill("SIGTERM");
    } catch (e) {
      serverLogger.warn("Failed to kill process", e);
    }
  });
  activeProcesses.clear();
}
```

### 5.2 Child Process Management

#### 5.2.1 Implementation (`cli-executor.js`)

```javascript
import { Logger } from '../shared/Logger.js';
import { success, failure, ErrorCodes } from '../shared/Result.js';

const log = new Logger('CLI');

/** @constant {number} DEFAULT_TIMEOUT_MS */
const DEFAULT_TIMEOUT_MS = 120000; // 2 minutes

/** @type {Set<ChildProcess>} Track active processes */
const activeProcesses = new Set();

/**
 * Execute CLI command with timeout and error handling
 * @param {string[]} args
 * @param {Object} options
 * @returns {Promise<Result<Object>>}
 */
export async function executeCliCommand(args, options = {}) {
  const { timeout = DEFAULT_TIMEOUT_MS } = options;
  const startTime = Date.now();

  return new Promise((resolve) => {
    let proc;
    let killed = false;

    // Timeout handler
    const timeoutId = setTimeout(() => {
      killed = true;
      if (proc) {
        log.warn(`Command timeout after ${timeout}ms, killing process`);
        proc.kill('SIGTERM');
        setTimeout(() => proc.kill('SIGKILL'), 1000); // Force kill if needed
      }
      resolve(failure('Command timeout', {
        code: ErrorCodes.CLI_TIMEOUT,
        duration: Date.now() - startTime
      }));
    }, timeout);

    try {
      proc = spawn('arduino-cli', args, { /* ... */ });
      activeProcesses.add(proc);

      proc.on('close', (code) => {
        activeProcesses.delete(proc);
        clearTimeout(timeoutId);

        if (killed) return; // Already handled by timeout

        const duration = Date.now() - startTime;
        if (code === 0) {
          resolve(success(/* parsed output */, { duration }));
        } else {
          resolve(failure(`CLI exited with code ${code}`, {
            code: ErrorCodes.CLI_ERROR,
            duration
          }));
        }
      });

      proc.on('error', (error) => {
        activeProcesses.delete(proc);
        clearTimeout(timeoutId);

        if (killed) return;

        // Handle specific errors
        if (error.code === 'ENOENT') {
          resolve(failure('arduino-cli not found', { code: ErrorCodes.CLI_NOT_FOUND }));
        } else if (error.code === 'EPERM') {
          resolve(failure('Permission denied', { code: ErrorCodes.PORT_PERMISSION_DENIED }));
        } else {
          resolve(failure(error.message, { code: ErrorCodes.CLI_ERROR }));
        }
      });

    } catch (error) {
      clearTimeout(timeoutId);
      resolve(failure(error.message, { code: ErrorCodes.CLI_ERROR }));
    }
  });
}

// Export for cleanup
export { activeProcesses };
```

### 5.3 Health Endpoint

#### 5.3.1 Implementation (`server.js`)

```javascript
const serverStartTime = Date.now();

/**
 * Health check endpoint
 */
app.get("/api/health", (req, res) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);

  res.json({
    success: true,
    data: {
      status: "healthy",
      uptime,
      uptimeFormatted: formatUptime(uptime),
      version: SERVER_VERSION,
      memory: process.memoryUsage(),
      activeProcesses: activeProcesses.size,
    },
  });
});

/**
 * Format uptime in human-readable format
 * @param {number} seconds
 * @returns {string}
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
```

---

## Phase 6: Supervisor & Auto-Restart

### 6.1 Start Script (`.devcontainer/start-bridge.sh`)

```bash
#!/bin/bash

# Arduino Bridge Supervisor Script
# Provides auto-restart on crash with logging

BRIDGE_DIR="/workspaces/TempeHS_Arduino_DevContainer/arduino-bridge"
CRASH_LOG="/tmp/arduino-bridge-crash.log"
RESTART_DELAY=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

cleanup_ports() {
    log "${YELLOW}Cleaning up ports...${NC}"

    # Kill any processes using our ports
    fuser -k 3000/tcp 2>/dev/null
    fuser -k 3001/tcp 2>/dev/null

    # Kill any zombie serial port processes
    pkill -f "arduino-cli.*serial" 2>/dev/null

    sleep 1
}

log "${GREEN}Arduino Bridge Supervisor Starting${NC}"

# Main restart loop
while true; do
    cleanup_ports

    log "${GREEN}Starting Arduino Bridge...${NC}"
    cd "$BRIDGE_DIR"

    # Run npm start and capture exit code
    npm start
    EXIT_CODE=$?

    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

    if [ $EXIT_CODE -eq 0 ]; then
        log "${YELLOW}Bridge exited normally (code 0)${NC}"
    else
        log "${RED}Bridge crashed with exit code: $EXIT_CODE${NC}"
        echo "[$TIMESTAMP] Crashed with exit code: $EXIT_CODE" >> "$CRASH_LOG"
    fi

    log "${YELLOW}Restarting in ${RESTART_DELAY}s...${NC}"
    sleep $RESTART_DELAY
done
```

### 6.2 DevContainer Configuration

Update `.devcontainer/devcontainer.json`:

```json
{
  "postStartCommand": "bash .devcontainer/start-bridge.sh &"
}
```

---

## Implementation Order

### Week 1: Foundation

| Day | Task                                       | Files                                                         |
| --- | ------------------------------------------ | ------------------------------------------------------------- |
| 1-2 | Create `Result.js` and `Logger.js`         | `src/shared/Result.js`, `src/shared/Logger.js`                |
| 3   | Update cli-executor.js with Result pattern | `src/server/cli-executor.js`                                  |
| 4-5 | Update server managers                     | `src/server/core-manager.js`, `src/server/library-manager.js` |

### Week 2: Server Updates

| Day | Task                                     | Files                           |
| --- | ---------------------------------------- | ------------------------------- |
| 1-2 | Update server.js with Result pattern     | `server.js`                     |
| 3   | Add health endpoint and process handlers | `server.js`                     |
| 4-5 | Create supervisor script                 | `.devcontainer/start-bridge.sh` |

### Week 3: Client Services

| Day | Task                                       | Files                                      |
| --- | ------------------------------------------ | ------------------------------------------ |
| 1-2 | Rename protocol classes                    | `protocols/*.js`, `strategies/*.js`        |
| 3   | Update UploadLogger to extend Logger       | `UploadLogger.js`                          |
| 4-5 | Update SerialManager and WebSerialProvider | `SerialManager.js`, `WebSerialProvider.js` |

### Week 4: Client UI & Final Integration

| Day | Task                                                  | Files          |
| --- | ----------------------------------------------------- | -------------- |
| 1-2 | Update main.js with error boundary and health polling | `main.js`      |
| 3   | Update UI components with Logger                      | `*UI.js` files |
| 4-5 | Testing and bug fixes                                 | All files      |

---

## File Change Matrix

| File                                                | Phase 1 (Result) | Phase 2 (Rename) | Phase 3 (Logger) | Phase 4 (Client) | Phase 5 (Server) |
| --------------------------------------------------- | ---------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| `src/shared/Result.js`                              | ✅ CREATE        |                  |                  |                  |                  |
| `src/shared/Logger.js`                              |                  |                  | ✅ CREATE        |                  |                  |
| `server.js`                                         | ✅               |                  | ✅               |                  | ✅               |
| `src/server/cli-executor.js`                        | ✅               |                  | ✅               |                  | ✅               |
| `src/server/core-manager.js`                        | ✅               |                  | ✅               |                  |                  |
| `src/server/library-manager.js`                     | ✅               |                  | ✅               |                  |                  |
| `src/client/main.js`                                | ✅               |                  | ✅               | ✅               |                  |
| `src/client/services/SerialManager.js`              | ✅               |                  | ✅               | ✅               |                  |
| `src/client/services/UploadManager.js`              | ✅               |                  | ✅               |                  |                  |
| `src/client/providers/WebSerialProvider.js`         | ✅               |                  | ✅               | ✅               |                  |
| `src/client/services/protocols/STK500.js`           | ✅               | ✅ RENAME        | ✅               |                  |                  |
| `src/client/services/protocols/Bossa.js`            | ✅               | ✅ RENAME        | ✅               |                  |                  |
| `src/client/services/protocols/ESPTool.js`          | ✅               | ✅ RENAME        | ✅               |                  |                  |
| `src/client/services/strategies/AVRStrategy.js`     | ✅               | ✅               | ✅               |                  |                  |
| `src/client/services/strategies/BOSSAStrategy.js`   | ✅               | ✅               | ✅               |                  |                  |
| `src/client/services/strategies/ESPToolStrategy.js` | ✅               | ✅               | ✅               |                  |                  |
| `src/client/services/utils/UploadLogger.js`         |                  |                  | ✅ EXTEND        |                  |                  |
| `src/client/ui/BoardManagerUI.js`                   |                  |                  | ✅               |                  |                  |
| `src/client/ui/LibraryManagerUI.js`                 |                  |                  | ✅               |                  |                  |
| `src/client/ui/ReferenceUI.js`                      |                  |                  | ✅               |                  |                  |
| `.devcontainer/start-bridge.sh`                     |                  |                  |                  |                  | ✅ CREATE        |

---

## Testing Strategy

### Unit Tests

1. **Result.js**

   - Test `success()` returns correct structure
   - Test `failure()` returns correct structure with error codes
   - Test all ErrorCodes are defined

2. **Logger.js**
   - Test log level filtering
   - Test timestamp formatting
   - Test child logger creation

### Integration Tests

1. **Server Health**

   - `/api/health` returns correct structure
   - Server survives uncaught exceptions
   - Child processes are killed on timeout

2. **Client Resilience**
   - Global error handler catches errors
   - Port disconnect triggers reconnect
   - Offline banner shows when server unavailable

### Manual Tests

1. **Reliability**
   - Rapidly connect/disconnect serial port
   - Upload bad firmware
   - Kill server mid-upload
   - Disconnect USB mid-upload

---

## Acceptance Criteria

### Phase 1: Standardized Result Type

- [ ] All functions return `Result<T>` objects
- [ ] Error codes are machine-readable
- [ ] API responses follow `{ success, data?, error?, code? }` format

### Phase 2: Protocol Class Renaming

- [ ] All protocol classes have `Protocol` suffix
- [ ] All imports updated
- [ ] No broken references

### Phase 3: Unified Logging System

- [ ] All console.\* calls replaced with Logger
- [ ] Log levels configurable
- [ ] Timestamps on all log messages
- [ ] UploadLogger extends Logger

### Phase 4: Client-Side Resilience

- [ ] Global error boundary catches all errors
- [ ] Auto-reconnect on port disconnect
- [ ] Timeout guards on all serial operations
- [ ] Server health polling with offline banner

### Phase 5: Server-Side Resilience

- [ ] Process handlers prevent crashes
- [ ] Child processes have timeouts
- [ ] Health endpoint works
- [ ] Resources cleaned up on error

### Phase 6: Supervisor & Auto-Restart

- [ ] Server auto-restarts on crash
- [ ] Crash log created
- [ ] Ports cleaned up before restart

### Overall

- [ ] No unhandled exceptions crash client or server
- [ ] Bridge stays available through intentional abuse
- [ ] All code uses consistent patterns

---

## Appendix A: Error Code Reference

| Code                     | Description                    | Recovery Action               |
| ------------------------ | ------------------------------ | ----------------------------- |
| `UNKNOWN`                | Unknown error                  | Log and continue              |
| `TIMEOUT`                | Operation timed out            | Retry or abort                |
| `CANCELLED`              | Operation cancelled by user    | Clean up                      |
| `PORT_NOT_FOUND`         | Serial port not found          | Prompt user to connect device |
| `PORT_BUSY`              | Port in use by another process | Close other applications      |
| `PORT_DISCONNECTED`      | Port disconnected              | Auto-reconnect                |
| `PORT_PERMISSION_DENIED` | No permission to access port   | Check permissions             |
| `UPLOAD_FAILED`          | Upload failed                  | Suggest manual reset          |
| `SYNC_FAILED`            | Bootloader sync failed         | Reset board                   |
| `BOOTLOADER_NOT_FOUND`   | Bootloader not responding      | Manual reset required         |
| `FIRMWARE_INVALID`       | Invalid firmware file          | Check file                    |
| `MANUAL_RESET_REQUIRED`  | Manual reset needed            | Press reset button            |
| `COMPILE_FAILED`         | Compilation failed             | Check code                    |
| `SKETCH_NOT_FOUND`       | Sketch file not found          | Check path                    |
| `BOARD_NOT_SELECTED`     | No board selected              | Select board                  |
| `CLI_NOT_FOUND`          | arduino-cli not installed      | Install CLI                   |
| `CLI_TIMEOUT`            | CLI command timed out          | Retry                         |
| `CLI_ERROR`              | CLI returned error             | Check output                  |
| `LIBRARY_NOT_FOUND`      | Library not found              | Install library               |
| `CORE_NOT_FOUND`         | Core not found                 | Install core                  |
| `INDEX_UPDATE_FAILED`    | Index update failed            | Check network                 |
| `SERVER_UNAVAILABLE`     | Server not responding          | Check server                  |
| `INVALID_REQUEST`        | Invalid API request            | Check parameters              |

---

**Document Version:** 2.0  
**Created:** December 7, 2025  
**Author:** GitHub Copilot
