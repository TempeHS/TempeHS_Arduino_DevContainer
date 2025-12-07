/**
 * Library Manager Module
 *
 * Handles all library operations:
 * - Index management (update, status)
 * - Search libraries
 * - Install/upgrade/uninstall libraries
 * - Install from Git URL or ZIP file
 * - List installed libraries
 * - Sync library examples to workspace
 */

import { executeCliCommand, parseCliError } from "./cli-executor.js";
import { Logger } from "../shared/Logger.js";
import path from "path";
import fs from "fs";
import { promises as fsPromises } from "fs";

// Track last index update time (in-memory, resets on server restart)
let lastLibraryIndexUpdate = null;

// Workspace paths for library examples
const WORKSPACE_ROOT = "/workspaces/TempeHS_Arduino_DevContainer";
const EXAMPLES_DIR = path.join(WORKSPACE_ROOT, "library-examples");

/** @type {Logger} */
const logger = new Logger("LibManager");

/**
 * Get the status of the library index
 * @returns {Promise<{lastUpdate: string|null, ageSeconds: number|null, needsRefresh: boolean}>}
 */
export function getLibraryIndexStatus() {
  const now = Date.now();
  const ageSeconds = lastLibraryIndexUpdate
    ? Math.floor((now - lastLibraryIndexUpdate) / 1000)
    : null;

  return {
    lastUpdate: lastLibraryIndexUpdate
      ? new Date(lastLibraryIndexUpdate).toISOString()
      : null,
    ageSeconds,
    // Recommend refresh if never updated or older than 24 hours
    needsRefresh: !lastLibraryIndexUpdate || ageSeconds > 86400,
  };
}

/**
 * Update the library index
 * @param {function} onProgress - Progress callback
 * @returns {Promise<{success: boolean, log: string, duration: number}>}
 */
export async function updateLibraryIndex(onProgress = null) {
  const result = await executeCliCommand(["lib", "update-index"], {
    timeout: 60000, // 1 minute for index update
    onProgress,
    useMutex: true,
  });

  if (result.success) {
    lastLibraryIndexUpdate = Date.now();
  }

  return {
    success: result.success,
    log: result.log || result.rawOutput || "",
    duration: result.duration,
  };
}

/**
 * Search for available libraries
 * @param {string} query - Search query
 * @returns {Promise<{success: boolean, libraries: Array, error?: string}>}
 */
export async function searchLibraries(query = "") {
  if (!query) {
    return {
      success: false,
      libraries: [],
      error: "Search query is required for library search",
    };
  }

  const result = await executeCliCommand(["lib", "search", query], {
    timeout: 30000,
  });

  if (result.success && result.data) {
    const libraries = (result.data.libraries || []).map(transformLibrary);
    return {
      success: true,
      libraries,
    };
  }

  return {
    success: false,
    libraries: [],
    error: parseCliError(result.log),
  };
}

/**
 * List installed libraries
 * @returns {Promise<{success: boolean, libraries: Array, error?: string}>}
 */
export async function listInstalledLibraries() {
  const result = await executeCliCommand(["lib", "list"], {
    timeout: 15000,
  });

  if (result.success && result.data) {
    const libraries = (result.data.installed_libraries || []).map((item) => {
      // installed_libraries has a slightly different structure
      const lib = item.library || item;
      return {
        name: lib.name,
        installedVersion: lib.version || lib.installed_version,
        latestVersion: lib.version, // May need to query for updates
        author: lib.author || "Unknown",
        sentence: lib.sentence || "",
        paragraph: lib.paragraph || "",
        category: lib.category || "Uncategorized",
        architectures: lib.architectures || [],
        website: lib.website || null,
        location: lib.location || null,
      };
    });

    return {
      success: true,
      libraries,
    };
  }

  return {
    success: false,
    libraries: [],
    error: parseCliError(result.log),
  };
}

/**
 * Install a library
 * @param {string} name - Library name
 * @param {string} version - Optional version to install
 * @param {boolean} installDeps - Whether to install dependencies (default: true)
 * @param {function} onProgress - Progress callback
 * @returns {Promise<{success: boolean, log: string, duration: number, error?: string}>}
 */
export async function installLibrary(
  name,
  version = null,
  installDeps = true,
  onProgress = null
) {
  if (!name || !isValidLibraryName(name)) {
    return {
      success: false,
      log: "",
      duration: 0,
      error: "Invalid library name",
    };
  }

  const target = version ? `${name}@${version}` : name;
  const args = ["lib", "install", target];

  // Dependencies are installed by default in arduino-cli
  // Use --no-deps flag only when user explicitly unchecks the dependencies checkbox
  if (!installDeps) {
    args.push("--no-deps");
  }

  const result = await executeCliCommand(args, {
    timeout: 60000, // 1 minute for library install
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
 * Upgrade a library to latest version
 * @param {string} name - Library name
 * @param {function} onProgress - Progress callback
 * @returns {Promise<{success: boolean, log: string, duration: number, error?: string}>}
 */
export async function upgradeLibrary(name, onProgress = null) {
  if (!name || !isValidLibraryName(name)) {
    return {
      success: false,
      log: "",
      duration: 0,
      error: "Invalid library name",
    };
  }

  const result = await executeCliCommand(["lib", "upgrade", name], {
    timeout: 60000,
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
 * Uninstall a library
 * @param {string} name - Library name
 * @returns {Promise<{success: boolean, log: string, duration: number, error?: string}>}
 */
export async function uninstallLibrary(name) {
  if (!name || !isValidLibraryName(name)) {
    return {
      success: false,
      log: "",
      duration: 0,
      error: "Invalid library name",
    };
  }

  const result = await executeCliCommand(["lib", "uninstall", name], {
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
 * Install a library from a Git URL
 * @param {string} gitUrl - Git repository URL (e.g., https://github.com/user/repo.git)
 * @param {function} onProgress - Progress callback
 * @returns {Promise<{success: boolean, log: string, duration: number, error?: string}>}
 */
export async function installLibraryFromGit(gitUrl, onProgress = null) {
  if (!gitUrl || !isValidGitUrl(gitUrl)) {
    return {
      success: false,
      log: "",
      duration: 0,
      error: "Invalid Git URL. Must be a valid http(s) or git:// URL",
    };
  }

  const result = await executeCliCommand(
    ["lib", "install", "--git-url", gitUrl],
    {
      timeout: 120000, // 2 minutes for git clone
      onProgress,
      useMutex: true,
    }
  );

  return {
    success: result.success,
    log: result.log || result.rawOutput || "",
    duration: result.duration,
    error: result.success ? undefined : parseCliError(result.log),
  };
}

/**
 * Install a library from a ZIP file path
 * @param {string} zipPath - Path to the ZIP file
 * @param {function} onProgress - Progress callback
 * @returns {Promise<{success: boolean, log: string, duration: number, error?: string}>}
 */
export async function installLibraryFromZip(zipPath, onProgress = null) {
  // Validate file exists and is a zip
  if (!zipPath) {
    return {
      success: false,
      log: "",
      duration: 0,
      error: "ZIP file path is required",
    };
  }

  // Check if file exists
  try {
    const stats = fs.statSync(zipPath);
    if (!stats.isFile()) {
      return {
        success: false,
        log: "",
        duration: 0,
        error: "Path is not a file",
      };
    }
  } catch (err) {
    return {
      success: false,
      log: "",
      duration: 0,
      error: `File not found: ${zipPath}`,
    };
  }

  // Validate it's a zip file
  if (!zipPath.toLowerCase().endsWith(".zip")) {
    return {
      success: false,
      log: "",
      duration: 0,
      error: "File must be a .zip archive",
    };
  }

  const result = await executeCliCommand(
    ["lib", "install", "--zip-path", zipPath],
    {
      timeout: 60000,
      onProgress,
      useMutex: true,
    }
  );

  return {
    success: result.success,
    log: result.log || result.rawOutput || "",
    duration: result.duration,
    error: result.success ? undefined : parseCliError(result.log),
  };
}

/**
 * Validate Git URL format
 */
function isValidGitUrl(url) {
  try {
    const parsed = new URL(url);
    // Accept http, https, or git protocols
    return ["http:", "https:", "git:"].includes(parsed.protocol);
  } catch {
    // Also accept git@host:user/repo format
    return /^git@[\w.-]+:[\w./-]+\.git$/.test(url);
  }
}

/**
 * Transform raw CLI library data into UI-friendly format
 */
function transformLibrary(library) {
  const releases = library.releases || {};
  const versions = Object.keys(releases).sort(compareVersions).reverse();
  const latestVersion = versions[0] || library.version;
  const latestRelease = releases[latestVersion] || {};

  return {
    name: library.name,
    latestVersion,
    versions,
    author: latestRelease.author || library.author || "Unknown",
    maintainer: latestRelease.maintainer || "",
    sentence: latestRelease.sentence || library.sentence || "",
    paragraph: latestRelease.paragraph || library.paragraph || "",
    website: latestRelease.website || library.website || null,
    category: latestRelease.category || library.category || "Uncategorized",
    architectures: latestRelease.architectures || library.architectures || [],
    types: latestRelease.types || library.types || [],
    installedVersion: null, // Will be filled in by combining with installed list
  };
}

/**
 * Validate library name (basic check)
 */
function isValidLibraryName(name) {
  // Library names can contain letters, numbers, spaces, hyphens, underscores
  // Must be at least 1 character
  return typeof name === "string" && name.length > 0 && name.length < 256;
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

/**
 * Sync library example symlinks to the workspace
 * Creates symlinks in /workspaces/TempeHS_Arduino_DevContainer/library-examples/
 * for each installed library's examples folder
 *
 * @returns {Promise<{success: boolean, synced: number, removed: number, errors: string[]}>}
 */
export async function syncLibraryExamples() {
  const errors = [];
  let synced = 0;
  let removed = 0;

  try {
    // Ensure examples directory exists
    await fsPromises.mkdir(EXAMPLES_DIR, { recursive: true });

    // Get installed libraries with their example paths
    const result = await executeCliCommand(["lib", "list"], { timeout: 15000 });

    if (!result.success || !result.data) {
      return {
        success: false,
        synced: 0,
        removed: 0,
        errors: ["Failed to list installed libraries"],
      };
    }

    const libraries = result.data.installed_libraries || [];
    const currentLibraries = new Set();

    // Create/update symlinks for each library's examples
    for (const item of libraries) {
      const lib = item.library;
      if (!lib || !lib.examples || lib.examples.length === 0) {
        continue;
      }

      // Sanitize library name for filesystem (replace spaces with underscores)
      const libName = lib.name
        .replace(/\s+/g, "_")
        .replace(/[<>:"/\\|?*]/g, "");
      currentLibraries.add(libName);

      // Get the parent examples directory from the first example path
      // e.g., /home/vscode/Arduino/libraries/Servo/examples/Sweep -> .../examples
      const firstExample = lib.examples[0];
      const examplesPath = path.dirname(firstExample);

      // Check if examples directory exists
      try {
        await fsPromises.access(examplesPath);
      } catch {
        errors.push(`Examples directory not found for ${lib.name}`);
        continue;
      }

      const linkPath = path.join(EXAMPLES_DIR, libName);

      try {
        // Check if link already exists and points to the right place
        const existingTarget = await fsPromises
          .readlink(linkPath)
          .catch(() => null);

        if (existingTarget === examplesPath) {
          // Already correct, skip
          synced++;
          continue;
        }

        // Remove existing link/file if present
        await fsPromises.rm(linkPath, { force: true, recursive: true });

        // Create symlink to examples directory
        await fsPromises.symlink(examplesPath, linkPath);
        synced++;
        logger.info(`Created symlink: ${libName} -> ${examplesPath}`);
      } catch (err) {
        errors.push(`Failed to create symlink for ${lib.name}: ${err.message}`);
      }
    }

    // Clean up stale symlinks for uninstalled libraries
    try {
      const existingEntries = await fsPromises.readdir(EXAMPLES_DIR);

      for (const entry of existingEntries) {
        // Skip special files
        if (entry.startsWith(".") || entry === "README.md") {
          continue;
        }

        // If library is no longer installed, remove the symlink
        if (!currentLibraries.has(entry)) {
          const entryPath = path.join(EXAMPLES_DIR, entry);
          try {
            await fsPromises.rm(entryPath, { force: true, recursive: true });
            removed++;
            logger.info(`Removed stale symlink: ${entry}`);
          } catch (err) {
            errors.push(
              `Failed to remove stale symlink ${entry}: ${err.message}`
            );
          }
        }
      }
    } catch (err) {
      errors.push(`Failed to clean stale symlinks: ${err.message}`);
    }

    return {
      success: errors.length === 0,
      synced,
      removed,
      errors,
    };
  } catch (err) {
    return {
      success: false,
      synced,
      removed,
      errors: [...errors, `Unexpected error: ${err.message}`],
    };
  }
}

/**
 * Get examples for a specific installed library
 * @param {string} libraryName - Name of the library
 * @returns {Promise<{success: boolean, examples: Array<{name: string, path: string}>, error?: string}>}
 */
export async function getLibraryExamples(libraryName) {
  if (!libraryName) {
    return { success: false, examples: [], error: "Library name is required" };
  }

  // lib examples doesn't support JSON output, so disable the flag
  const result = await executeCliCommand(["lib", "examples", libraryName], {
    timeout: 10000,
    addJsonFlag: false,
  });

  if (result.success && result.log) {
    // Strip ANSI escape codes from output
    const cleanLog = result.log.replace(/\x1b\[[0-9;]*m/g, "");

    // Parse the output - arduino-cli lib examples returns paths
    const lines = cleanLog.split("\n").filter((line) => line.trim());
    const examples = [];

    for (const line of lines) {
      // Skip the header line
      if (line.includes("Examples for library")) continue;

      // Extract example path (lines starting with " - ")
      const match = line.match(/^\s*-\s*(.+)$/);
      if (match) {
        const examplePath = match[1].trim();
        const exampleName = path.basename(examplePath);
        examples.push({ name: exampleName, path: examplePath });
      }
    }

    return { success: true, examples };
  }

  return {
    success: false,
    examples: [],
    error: parseCliError(result.log) || "Failed to get examples",
  };
}

/**
 * Copy a library example to the workspace
 * @param {string} examplePath - Full path to the example directory
 * @param {string} targetName - Optional custom name for the copied folder
 * @returns {Promise<{success: boolean, targetPath?: string, error?: string}>}
 */
export async function copyExampleToWorkspace(examplePath, targetName = null) {
  if (!examplePath) {
    return { success: false, error: "Example path is required" };
  }

  try {
    // Verify source exists
    await fsPromises.access(examplePath);

    // Determine target folder name
    const baseName = targetName || path.basename(examplePath);
    let targetPath = path.join(WORKSPACE_ROOT, baseName);

    // If target exists, add a suffix
    let suffix = 1;
    while (true) {
      try {
        await fsPromises.access(targetPath);
        // Exists, try next suffix
        targetPath = path.join(WORKSPACE_ROOT, `${baseName}_${suffix}`);
        suffix++;
      } catch {
        // Doesn't exist, we can use this path
        break;
      }
    }

    // Copy the directory recursively
    await fsPromises.cp(examplePath, targetPath, { recursive: true });

    logger.info(`Copied example: ${examplePath} -> ${targetPath}`);

    return { success: true, targetPath };
  } catch (err) {
    return { success: false, error: `Failed to copy example: ${err.message}` };
  }
}

export { lastLibraryIndexUpdate };
