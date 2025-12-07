/**
 * Core Manager Module
 *
 * Handles all board/core platform operations:
 * - Index management (update, status)
 * - Search platforms
 * - Install/upgrade/uninstall cores
 * - List installed cores
 * - Additional board manager URLs
 */

import { executeCliCommand, parseCliError } from "./cli-executor.js";

// Track last index update time (in-memory, resets on server restart)
let lastCoreIndexUpdate = null;

/**
 * Get current additional board manager URLs from arduino-cli config
 * @returns {Promise<{success: boolean, urls: string[], error?: string}>}
 */
export async function getAdditionalBoardUrls() {
  const result = await executeCliCommand(
    ["config", "dump", "--format", "json"],
    {
      timeout: 10000,
    }
  );

  if (result.success && result.data) {
    const urls = result.data.board_manager?.additional_urls || [];
    return {
      success: true,
      urls,
    };
  }

  return {
    success: false,
    urls: [],
    error: parseCliError(result.log) || "Failed to get config",
  };
}

/**
 * Add an additional board manager URL
 * @param {string} url - The URL to add
 * @returns {Promise<{success: boolean, urls: string[], error?: string}>}
 */
export async function addBoardUrl(url) {
  if (!url || !isValidUrl(url)) {
    return {
      success: false,
      urls: [],
      error: "Invalid URL format",
    };
  }

  const result = await executeCliCommand(
    ["config", "add", "board_manager.additional_urls", url],
    {
      timeout: 10000,
      useMutex: true,
    }
  );

  if (result.success) {
    // Return updated list
    return getAdditionalBoardUrls();
  }

  return {
    success: false,
    urls: [],
    error: parseCliError(result.log) || "Failed to add URL",
  };
}

/**
 * Remove an additional board manager URL
 * @param {string} url - The URL to remove
 * @returns {Promise<{success: boolean, urls: string[], error?: string}>}
 */
export async function removeBoardUrl(url) {
  if (!url) {
    return {
      success: false,
      urls: [],
      error: "URL is required",
    };
  }

  const result = await executeCliCommand(
    ["config", "remove", "board_manager.additional_urls", url],
    {
      timeout: 10000,
      useMutex: true,
    }
  );

  if (result.success) {
    // Return updated list
    return getAdditionalBoardUrls();
  }

  return {
    success: false,
    urls: [],
    error: parseCliError(result.log) || "Failed to remove URL",
  };
}

/**
 * Validate URL format
 */
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

/**
 * Get the status of the core index
 * @returns {Promise<{lastUpdate: string|null, ageSeconds: number|null, needsRefresh: boolean}>}
 */
export function getCoreIndexStatus() {
  const now = Date.now();
  const ageSeconds = lastCoreIndexUpdate
    ? Math.floor((now - lastCoreIndexUpdate) / 1000)
    : null;

  return {
    lastUpdate: lastCoreIndexUpdate
      ? new Date(lastCoreIndexUpdate).toISOString()
      : null,
    ageSeconds,
    // Recommend refresh if never updated or older than 24 hours
    needsRefresh: !lastCoreIndexUpdate || ageSeconds > 86400,
  };
}

/**
 * Update the core/board index
 * @param {function} onProgress - Progress callback
 * @returns {Promise<{success: boolean, log: string, duration: number}>}
 */
export async function updateCoreIndex(onProgress = null) {
  const result = await executeCliCommand(["core", "update-index"], {
    timeout: 60000, // 1 minute for index update
    onProgress,
    useMutex: true,
  });

  if (result.success) {
    lastCoreIndexUpdate = Date.now();
  }

  return {
    success: result.success,
    log: result.log || result.rawOutput || "",
    duration: result.duration,
  };
}

/**
 * Search for available platforms/cores
 * @param {string} query - Search query (empty string returns all)
 * @returns {Promise<{success: boolean, platforms: Array, error?: string}>}
 */
export async function searchCores(query = "") {
  const args = ["core", "search"];
  if (query) {
    args.push(query);
  }

  const result = await executeCliCommand(args, {
    timeout: 30000,
  });

  if (result.success && result.data) {
    // Transform platforms for easier UI consumption
    const platforms = (result.data.platforms || []).map(transformPlatform);
    return {
      success: true,
      platforms,
    };
  }

  return {
    success: false,
    platforms: [],
    error: parseCliError(result.log),
  };
}

/**
 * List installed cores only
 * @returns {Promise<{success: boolean, platforms: Array, error?: string}>}
 */
export async function listInstalledCores() {
  const result = await executeCliCommand(["core", "list"], {
    timeout: 15000,
  });

  if (result.success && result.data) {
    const platforms = (result.data.platforms || []).map(transformPlatform);
    return {
      success: true,
      platforms,
    };
  }

  return {
    success: false,
    platforms: [],
    error: parseCliError(result.log),
  };
}

/**
 * Install a core/platform
 * @param {string} platformId - Platform ID (e.g., 'arduino:avr')
 * @param {string} version - Optional version to install
 * @param {function} onProgress - Progress callback
 * @returns {Promise<{success: boolean, log: string, duration: number, error?: string}>}
 */
export async function installCore(
  platformId,
  version = null,
  onProgress = null
) {
  if (!platformId || !isValidPlatformId(platformId)) {
    return {
      success: false,
      log: "",
      duration: 0,
      error:
        "Invalid platform ID format. Expected format: vendor:architecture (e.g., arduino:avr)",
    };
  }

  const target = version ? `${platformId}@${version}` : platformId;

  const result = await executeCliCommand(["core", "install", target], {
    timeout: 180000, // 3 minutes for large cores
    onProgress,
    useMutex: true,
  });

  return {
    success: result.success,
    log: result.log || result.rawOutput || "",
    duration: result.duration,
    error: result.success ? undefined : parseCliError(result.log),
  };
}

/**
 * Upgrade a core/platform to latest version
 * @param {string} platformId - Platform ID (e.g., 'arduino:avr')
 * @param {function} onProgress - Progress callback
 * @returns {Promise<{success: boolean, log: string, duration: number, error?: string}>}
 */
export async function upgradeCore(platformId, onProgress = null) {
  if (!platformId || !isValidPlatformId(platformId)) {
    return {
      success: false,
      log: "",
      duration: 0,
      error: "Invalid platform ID format.",
    };
  }

  const result = await executeCliCommand(["core", "upgrade", platformId], {
    timeout: 180000,
    onProgress,
    useMutex: true,
  });

  return {
    success: result.success,
    log: result.log || result.rawOutput || "",
    duration: result.duration,
    error: result.success ? undefined : parseCliError(result.log),
  };
}

/**
 * Uninstall a core/platform
 * @param {string} platformId - Platform ID (e.g., 'arduino:avr')
 * @returns {Promise<{success: boolean, log: string, duration: number, error?: string}>}
 */
export async function uninstallCore(platformId) {
  if (!platformId || !isValidPlatformId(platformId)) {
    return {
      success: false,
      log: "",
      duration: 0,
      error: "Invalid platform ID format.",
    };
  }

  const result = await executeCliCommand(["core", "uninstall", platformId], {
    timeout: 30000,
    useMutex: true,
  });

  return {
    success: result.success,
    log: result.log || result.rawOutput || "",
    duration: result.duration,
    error: result.success ? undefined : parseCliError(result.log),
  };
}

/**
 * Transform raw CLI platform data into UI-friendly format
 */
function transformPlatform(platform) {
  const latestVersion = platform.latest_version || platform.latest;
  const installedVersion = platform.installed_version || platform.installed;
  const releases = platform.releases || {};
  const latestRelease = releases[latestVersion] || {};

  return {
    id: platform.id,
    name: latestRelease.name || platform.name || platform.id,
    maintainer: platform.maintainer || "Unknown",
    website: platform.website || null,
    installedVersion: installedVersion || null,
    latestVersion: latestVersion || null,
    hasUpdate:
      installedVersion && latestVersion && installedVersion !== latestVersion,
    boards: (latestRelease.boards || []).map((b) => ({
      name: b.name,
      fqbn: b.fqbn,
    })),
    versions: Object.keys(releases).sort(compareVersions).reverse(),
    indexed: platform.indexed !== false,
  };
}

/**
 * Validate platform ID format (vendor:architecture)
 */
function isValidPlatformId(id) {
  // Platform IDs should be like "arduino:avr" or "esp32:esp32"
  return /^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Compare semantic version strings
 */
function compareVersions(a, b) {
  const partsA = a.split(".").map((n) => parseInt(n, 10) || 0);
  const partsB = b.split(".").map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) {
      return numA - numB;
    }
  }
  return 0;
}

export { lastCoreIndexUpdate };
