/**
 * CLI Executor Module
 *
 * Provides a robust wrapper around arduino-cli with:
 * - Timeout handling
 * - Progress streaming
 * - Mutex for concurrent operation protection
 * - JSON output parsing
 */

import { spawn } from "child_process";

/**
 * Simple mutex to prevent concurrent CLI operations that might conflict
 */
class CliMutex {
  constructor() {
    this.locked = false;
    this.queue = [];
  }

  async acquire() {
    if (!this.locked) {
      this.locked = true;
      return;
    }

    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    } else {
      this.locked = false;
    }
  }
}

// Global mutex for operations that shouldn't run concurrently
const cliMutex = new CliMutex();

/**
 * Execute an arduino-cli command with JSON output
 *
 * @param {string[]} args - Command arguments (without 'arduino-cli' prefix)
 * @param {object} options - Execution options
 * @param {number} options.timeout - Timeout in ms (default: 120000 = 2 min)
 * @param {function} options.onProgress - Callback for progress data
 * @param {boolean} options.useMutex - Whether to use mutex (default: false)
 * @param {boolean} options.addJsonFlag - Whether to add --format json (default: true)
 * @returns {Promise<{success: boolean, data: object|null, log: string, duration: number, exitCode?: number}>}
 */
export async function executeCliCommand(args, options = {}) {
  const {
    timeout = 120000,
    onProgress = null,
    useMutex = false,
    addJsonFlag = true,
  } = options;

  const startTime = Date.now();
  const commandArgs = addJsonFlag ? [...args, "--format", "json"] : args;

  // Acquire mutex if needed
  if (useMutex) {
    await cliMutex.acquire();
  }

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let resolved = false;

    const cleanup = () => {
      if (useMutex) {
        cliMutex.release();
      }
    };

    const finalize = (result) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(result);
      }
    };

    const child = spawn("arduino-cli", commandArgs, {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        child.kill("SIGTERM");
        finalize({
          success: false,
          data: null,
          log: `Command timed out after ${timeout}ms`,
          duration: (Date.now() - startTime) / 1000,
          exitCode: -1,
          timedOut: true,
        });
      }
    }, timeout);

    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      stdout += chunk;
      if (onProgress) {
        onProgress({ type: "stdout", data: chunk });
      }
    });

    child.stderr.on("data", (data) => {
      const chunk = data.toString();
      stderr += chunk;
      if (onProgress) {
        onProgress({ type: "stderr", data: chunk });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeoutId);
      finalize({
        success: false,
        data: null,
        log: `Failed to spawn arduino-cli: ${err.message}`,
        duration: (Date.now() - startTime) / 1000,
        exitCode: -1,
        error: err.message,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      const duration = (Date.now() - startTime) / 1000;

      if (code === 0) {
        // Try to parse JSON output
        try {
          const data = JSON.parse(stdout);
          finalize({
            success: true,
            data,
            log: stderr,
            duration,
          });
        } catch (e) {
          // Command succeeded but output wasn't JSON
          finalize({
            success: true,
            data: null,
            log: stdout + stderr,
            duration,
            rawOutput: stdout,
          });
        }
      } else {
        finalize({
          success: false,
          data: null,
          log: stderr || stdout,
          duration,
          exitCode: code,
        });
      }
    });
  });
}

/**
 * Check if arduino-cli is available
 * @returns {Promise<{available: boolean, version?: string, commit?: string, error?: string}>}
 */
export async function checkCliAvailable() {
  try {
    const result = await executeCliCommand(["version"], {
      timeout: 5000,
      addJsonFlag: true,
    });

    if (result.success && result.data) {
      return {
        available: true,
        version: result.data.VersionString,
        commit: result.data.Commit,
        date: result.data.Date,
      };
    }

    return {
      available: false,
      error: result.log || "Unknown error",
    };
  } catch (err) {
    return {
      available: false,
      error: err.message,
    };
  }
}

/**
 * Parse common CLI error messages into user-friendly text
 * @param {string} errorLog - Raw error output from CLI
 * @returns {string} User-friendly error message
 */
export function parseCliError(errorLog) {
  const lower = errorLog.toLowerCase();

  if (lower.includes("not found") || lower.includes("no matching")) {
    if (lower.includes("platform") || lower.includes("core")) {
      return "Platform not found in index. Try updating the board index first.";
    }
    if (lower.includes("library")) {
      return "Library not found. Try updating the library index first.";
    }
  }

  if (lower.includes("already installed")) {
    return "Already installed at the latest version.";
  }

  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Operation timed out. Check your network connection.";
  }

  if (lower.includes("no space") || lower.includes("disk full")) {
    return "Insufficient disk space for installation.";
  }

  if (lower.includes("permission denied")) {
    return "Permission denied. Check file system permissions.";
  }

  // Return original if no pattern matched
  return errorLog;
}

export { cliMutex };
