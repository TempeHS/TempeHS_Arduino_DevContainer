/**
 * Standardized Result Type
 *
 * Factory functions for creating consistent result objects across the codebase.
 * All async operations should return Result<T> objects for uniform error handling.
 *
 * @module shared/Result
 * @version 1.0.0
 */

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Machine-readable error codes for programmatic error handling
 * @enum {string}
 */
export const ErrorCodes = {
  // General
  UNKNOWN: "UNKNOWN",
  TIMEOUT: "TIMEOUT",
  CANCELLED: "CANCELLED",
  INVALID_INPUT: "INVALID_INPUT",

  // Serial/Port
  PORT_NOT_FOUND: "PORT_NOT_FOUND",
  PORT_BUSY: "PORT_BUSY",
  PORT_DISCONNECTED: "PORT_DISCONNECTED",
  PORT_PERMISSION_DENIED: "PORT_PERMISSION_DENIED",
  PORT_OPEN_FAILED: "PORT_OPEN_FAILED",

  // Upload
  UPLOAD_FAILED: "UPLOAD_FAILED",
  SYNC_FAILED: "SYNC_FAILED",
  BOOTLOADER_NOT_FOUND: "BOOTLOADER_NOT_FOUND",
  FIRMWARE_INVALID: "FIRMWARE_INVALID",
  MANUAL_RESET_REQUIRED: "MANUAL_RESET_REQUIRED",
  BOOTLOADER_PORT_NEEDED: "BOOTLOADER_PORT_NEEDED",

  // Compile
  COMPILE_FAILED: "COMPILE_FAILED",
  SKETCH_NOT_FOUND: "SKETCH_NOT_FOUND",
  BOARD_NOT_SELECTED: "BOARD_NOT_SELECTED",
  ARTIFACT_NOT_FOUND: "ARTIFACT_NOT_FOUND",

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
  RESTART_IN_PROGRESS: "RESTART_IN_PROGRESS",
};

// =============================================================================
// Result Factory Functions
// =============================================================================

/**
 * Create a success result
 *
 * @template T
 * @param {T} data - The result data
 * @param {Object} [options] - Additional options
 * @param {number} [options.duration] - Operation duration in ms
 * @param {string} [options.message] - Success message
 * @returns {{success: true, data: T, duration?: number, message?: string}}
 *
 * @example
 * return success({ boards: [...] });
 * return success(firmwareData, { duration: 1234 });
 */
export function success(data, options = {}) {
  const result = {
    success: true,
    data,
  };

  if (options.duration !== undefined) {
    result.duration = options.duration;
  }

  if (options.message) {
    result.message = options.message;
  }

  return result;
}

/**
 * Create a failure result
 *
 * @param {string} error - Human-readable error message
 * @param {Object} [options] - Additional options
 * @param {string} [options.code] - Machine-readable error code from ErrorCodes
 * @param {number} [options.duration] - Operation duration in ms
 * @param {*} [options.details] - Additional error details
 * @returns {{success: false, error: string, code?: string, duration?: number, details?: *}}
 *
 * @example
 * return failure("Port not found", { code: ErrorCodes.PORT_NOT_FOUND });
 * return failure("CLI timeout", { code: ErrorCodes.CLI_TIMEOUT, duration: 120000 });
 */
export function failure(error, options = {}) {
  const result = {
    success: false,
    error,
  };

  if (options.code) {
    result.code = options.code;
  }

  if (options.duration !== undefined) {
    result.duration = options.duration;
  }

  if (options.details !== undefined) {
    result.details = options.details;
  }

  return result;
}

/**
 * Wrap an async operation with Result error handling
 *
 * @template T
 * @param {Promise<T>} promise - The promise to wrap
 * @param {Object} [options] - Options for error handling
 * @param {string} [options.errorCode] - Default error code if operation fails
 * @param {string} [options.errorMessage] - Override error message
 * @returns {Promise<{success: true, data: T} | {success: false, error: string, code?: string}>}
 *
 * @example
 * const result = await wrapAsync(fetch('/api/data'), { errorCode: ErrorCodes.SERVER_UNAVAILABLE });
 */
export async function wrapAsync(promise, options = {}) {
  const startTime = Date.now();

  try {
    const data = await promise;
    return success(data, { duration: Date.now() - startTime });
  } catch (error) {
    const errorMessage =
      options.errorMessage || error.message || "Unknown error";
    return failure(errorMessage, {
      code: options.errorCode || ErrorCodes.UNKNOWN,
      duration: Date.now() - startTime,
    });
  }
}

/**
 * Create a timeout wrapper for promises
 *
 * @template T
 * @param {Promise<T>} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} [operation] - Description of the operation (for error message)
 * @returns {Promise<T>}
 * @throws {Error} If timeout is exceeded
 *
 * @example
 * const data = await withTimeout(fetchData(), 5000, 'fetch data');
 */
export function withTimeout(promise, timeoutMs, operation = "operation") {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Check if a result is successful
 *
 * @param {Object} result - Result object to check
 * @returns {boolean} True if result.success is true
 */
export function isSuccess(result) {
  return result && result.success === true;
}

/**
 * Check if a result is a failure
 *
 * @param {Object} result - Result object to check
 * @returns {boolean} True if result.success is false
 */
export function isFailure(result) {
  return result && result.success === false;
}
