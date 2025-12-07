/**
 * Unified Logger
 *
 * Provides consistent logging across client and server with:
 * - Log levels (debug, info, warn, error)
 * - Timestamps
 * - Context prefixes
 * - Colored output (terminal/console)
 *
 * @module shared/Logger
 * @version 1.0.0
 */

// =============================================================================
// Log Levels
// =============================================================================

/**
 * Log level values for filtering
 * @enum {number}
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

// =============================================================================
// Module State
// =============================================================================

/** @type {number} Current minimum log level */
let currentLevel = LogLevel.INFO;

// =============================================================================
// Configuration
// =============================================================================

/**
 * Set the minimum log level
 * @param {number} level - LogLevel value
 */
export function setLogLevel(level) {
  if (level >= LogLevel.DEBUG && level <= LogLevel.NONE) {
    currentLevel = level;
  }
}

/**
 * Get the current log level
 * @returns {number} Current LogLevel value
 */
export function getLogLevel() {
  return currentLevel;
}

// =============================================================================
// Logger Class
// =============================================================================

/**
 * Logger class for consistent logging with context
 */
export class Logger {
  /**
   * Create a new Logger instance
   * @param {string} context - Logger context (e.g., 'Server', 'Client', 'BOSSA')
   */
  constructor(context) {
    /** @type {string} Logger context prefix */
    this.context = context;
  }

  /**
   * Get formatted timestamp
   * @returns {string} HH:MM:SS.mmm format
   * @private
   */
  _timestamp() {
    return new Date().toISOString().slice(11, 23);
  }

  /**
   * Format message with context and timestamp
   * @param {string} level - Level name
   * @param {string} icon - Level icon
   * @param {string} message - Message to format
   * @returns {string}
   * @private
   */
  _format(level, icon, message) {
    return `[${this.context}] ${this._timestamp()} ${icon} ${message}`;
  }

  /**
   * Log debug message (verbose, development info)
   * @param {string} message - Message to log
   * @param {*} [data] - Optional data to log
   */
  debug(message, data) {
    if (currentLevel <= LogLevel.DEBUG) {
      const formatted = this._format("DEBUG", "🔍", message);
      if (data !== undefined) {
        console.debug(formatted, data);
      } else {
        console.debug(formatted);
      }
    }
  }

  /**
   * Log info message (normal operational info)
   * @param {string} message - Message to log
   * @param {*} [data] - Optional data to log
   */
  info(message, data) {
    if (currentLevel <= LogLevel.INFO) {
      const formatted = this._format("INFO", "ℹ️", message);
      if (data !== undefined) {
        console.info(formatted, data);
      } else {
        console.info(formatted);
      }
    }
  }

  /**
   * Log warning message (potential issues)
   * @param {string} message - Message to log
   * @param {*} [data] - Optional data to log
   */
  warn(message, data) {
    if (currentLevel <= LogLevel.WARN) {
      const formatted = this._format("WARN", "⚠️", message);
      if (data !== undefined) {
        console.warn(formatted, data);
      } else {
        console.warn(formatted);
      }
    }
  }

  /**
   * Log error message (errors that affect operation)
   * @param {string} message - Message to log
   * @param {Error|*} [error] - Optional error or data
   */
  error(message, error) {
    if (currentLevel <= LogLevel.ERROR) {
      const formatted = this._format("ERROR", "❌", message);
      if (error !== undefined) {
        const errorDetail =
          error instanceof Error
            ? `${error.message}${error.stack ? "\n" + error.stack : ""}`
            : error;
        console.error(formatted, errorDetail);
      } else {
        console.error(formatted);
      }
    }
  }

  /**
   * Log success message (completion of significant operations)
   * Uses INFO level
   * @param {string} message - Message to log
   */
  success(message) {
    if (currentLevel <= LogLevel.INFO) {
      const formatted = this._format("SUCCESS", "✅", message);
      console.log(formatted);
    }
  }

  /**
   * Create a child logger with additional context
   * @param {string} subContext - Additional context to append
   * @returns {Logger} New logger with combined context
   *
   * @example
   * const serverLog = new Logger('Server');
   * const uploadLog = serverLog.child('Upload');
   * uploadLog.info('Starting...'); // [Server:Upload] INFO ℹ️ Starting...
   */
  child(subContext) {
    return new Logger(`${this.context}:${subContext}`);
  }

  /**
   * Log with explicit level
   * @param {number} level - LogLevel value
   * @param {string} message - Message to log
   * @param {*} [data] - Optional data
   */
  log(level, message, data) {
    switch (level) {
      case LogLevel.DEBUG:
        this.debug(message, data);
        break;
      case LogLevel.INFO:
        this.info(message, data);
        break;
      case LogLevel.WARN:
        this.warn(message, data);
        break;
      case LogLevel.ERROR:
        this.error(message, data);
        break;
    }
  }

  /**
   * Time an operation and log the duration
   * @param {string} operation - Name of the operation
   * @returns {{end: Function}} Object with end() method to call when operation completes
   *
   * @example
   * const timer = log.time('Compile');
   * await compile();
   * timer.end(); // [Server] INFO ℹ️ Compile completed in 1234ms
   */
  time(operation) {
    const startTime = Date.now();
    return {
      end: (status = "completed") => {
        const duration = Date.now() - startTime;
        this.info(`${operation} ${status} in ${duration}ms`);
        return duration;
      },
    };
  }
}

// =============================================================================
// Pre-configured Loggers
// =============================================================================

/** Server-side logger */
export const serverLogger = new Logger("Server");

/** Client-side logger */
export const clientLogger = new Logger("Client");

/** CLI operations logger */
export const cliLogger = new Logger("CLI");

/** Serial communication logger */
export const serialLogger = new Logger("Serial");
