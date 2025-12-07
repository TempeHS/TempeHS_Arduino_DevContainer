/**
 * Library Manager UI Component
 *
 * Provides UI for managing Arduino libraries:
 * - Search and browse available libraries
 * - Install/upgrade/uninstall libraries
 * - Filter by category
 * - Track index freshness
 */

import { Logger } from "../../shared/Logger.js";

/** @type {Logger} */
const logger = new Logger("LibraryManager");

export class LibraryManagerUI {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
    this.libraries = [];
    this.installedLibraries = new Map(); // name -> version
    this.installedLibraryList = [];
    this.searchQuery = "";
    this.categoryFilter = "All";
    this.showInstalled = false;
    this.isLoading = false;
    this.searchTimeout = null;

    // Cache DOM elements
    this.elements = {};
  }

  /**
   * Initialize the UI - must be called after DOM is ready
   */
  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      logger.error(`Container #${this.containerId} not found`);
      return;
    }

    this.cacheElements();
    this.attachEventListeners();
    this.loadIndexStatus();
    this.loadInstalledLibraries();
  }

  cacheElements() {
    this.elements = {
      searchInput: document.getElementById("lib-search"),
      categorySelect: document.getElementById("lib-category"),
      showInstalledCheck: document.getElementById("show-installed-libs"),
      refreshBtn: document.getElementById("refresh-lib-index"),
      customInstallBtn: document.getElementById("lib-custom-install"),
      indexStatus: document.getElementById("lib-index-status"),
      list: document.getElementById("lib-list"),
      jobProgress: document.getElementById("lib-job-progress"),
      progressLog: document.getElementById("lib-progress-log"),
      closeProgress: document.getElementById("close-lib-progress"),
      // Custom install modal elements
      customModal: document.getElementById("lib-custom-modal"),
      closeCustomModal: document.getElementById("close-lib-custom-modal"),
      gitUrlInput: document.getElementById("lib-git-url"),
      installGitBtn: document.getElementById("install-lib-git"),
      zipPathInput: document.getElementById("lib-zip-path"),
      installZipBtn: document.getElementById("install-lib-zip"),
    };
  }

  attachEventListeners() {
    // Search input with debounce
    this.elements.searchInput?.addEventListener("input", (e) => {
      clearTimeout(this.searchTimeout);
      this.searchQuery = e.target.value.trim();
      this.searchTimeout = setTimeout(() => this.handleSearch(), 500);
    });

    // Enter key for immediate search
    this.elements.searchInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        clearTimeout(this.searchTimeout);
        this.handleSearch();
      }
    });

    // Category filter
    this.elements.categorySelect?.addEventListener("change", (e) => {
      this.categoryFilter = e.target.value;
      this.renderLibraryList();
    });

    // Show installed only checkbox
    this.elements.showInstalledCheck?.addEventListener("change", (e) => {
      this.showInstalled = e.target.checked;
      if (this.showInstalled) {
        this.showInstalledOnly();
      } else {
        this.renderLibraryList();
      }
    });

    // Refresh index button
    this.elements.refreshBtn?.addEventListener("click", () => {
      this.updateIndex();
    });

    // Custom install button
    this.elements.customInstallBtn?.addEventListener("click", () => {
      this.showCustomModal();
    });

    // Close custom install modal
    this.elements.closeCustomModal?.addEventListener("click", () => {
      this.hideCustomModal();
    });

    // Install from Git URL
    this.elements.installGitBtn?.addEventListener("click", () => {
      this.installFromGit();
    });

    // Enter key in Git URL input
    this.elements.gitUrlInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.installFromGit();
      }
    });

    // Install from ZIP
    this.elements.installZipBtn?.addEventListener("click", () => {
      this.installFromZip();
    });

    // Enter key in ZIP path input
    this.elements.zipPathInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.installFromZip();
      }
    });

    // Close progress panel
    this.elements.closeProgress?.addEventListener("click", () => {
      this.hideProgress();
    });

    // Delegate click events on library cards
    this.elements.list?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const card = btn.closest(".library-card");
      if (!card) return;

      const libraryName = card.dataset.name;
      const action = btn.dataset.action;
      const versionSelect = card.querySelector(".version-select");
      const version = versionSelect?.value || null;
      const installDeps = card.querySelector(".install-deps")?.checked || false;

      this.performAction(libraryName, action, version, installDeps);
    });

    // Show inline warning when dependencies checkbox is toggled
    this.elements.list?.addEventListener("change", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.classList.contains("install-deps")) return;

      const card = target.closest(".library-card");
      if (!card) return;

      if (target.checked) {
        this.clearDepsWarning(card);
      } else {
        this.showDepsWarning(card);
      }
    });
  }

  async loadIndexStatus() {
    try {
      const res = await fetch("/api/cli/libraries/index/status");
      const status = await res.json();
      this.renderIndexStatus(status);
    } catch (err) {
      logger.error("Failed to load index status", err);
      this.renderIndexStatus({ needsRefresh: true, ageSeconds: null });
    }
  }

  renderIndexStatus(status) {
    if (!this.elements.indexStatus) return;

    if (status.ageSeconds === null) {
      this.elements.indexStatus.innerHTML = `
        <span class="status-warning">⚠️ Library index not yet loaded. Click "Update Index" to download.</span>
      `;
    } else if (status.needsRefresh) {
      const hours = Math.floor(status.ageSeconds / 3600);
      this.elements.indexStatus.innerHTML = `
        <span class="status-warning">⚠️ Index is ${hours}+ hours old. Consider updating.</span>
      `;
    } else {
      const mins = Math.floor(status.ageSeconds / 60);
      this.elements.indexStatus.innerHTML = `
        <span class="status-ok">✓ Index updated ${
          mins < 60 ? mins + " minutes" : Math.floor(mins / 60) + " hours"
        } ago</span>
      `;
    }
  }

  async loadInstalledLibraries() {
    try {
      const res = await fetch("/api/cli/libraries/installed");
      const data = await res.json();

      if (data.success) {
        this.installedLibraryList = (data.libraries || []).map((lib) => ({
          ...lib,
          installedVersion: lib.installedVersion || lib.version || null,
          latestVersion:
            lib.latestVersion || lib.installedVersion || lib.version || null,
          versions:
            lib.versions && lib.versions.length > 0
              ? lib.versions
              : lib.installedVersion
              ? [lib.installedVersion]
              : lib.version
              ? [lib.version]
              : [],
        }));

        this.installedLibraries.clear();
        this.installedLibraryList.forEach((lib) => {
          this.installedLibraries.set(lib.name, lib.installedVersion);
        });

        if (this.showInstalled || !this.searchQuery) {
          this.showInstalledOnly();
        }
      }
    } catch (err) {
      logger.error("Failed to load installed libraries", err);
    }
  }

  showInstalledOnly() {
    if (!this.installedLibraryList || this.installedLibraryList.length === 0) {
      this.elements.list.innerHTML = `
        <div class="empty-state">
          <p>No libraries installed yet.</p>
          <p>Search for libraries to install.</p>
        </div>
      `;
      return;
    }

    // Use cached installed library data as the active list
    this.libraries = this.installedLibraryList.map((lib) => ({
      ...lib,
      installedVersion: lib.installedVersion,
      latestVersion: lib.latestVersion || lib.installedVersion,
      versions:
        lib.versions && lib.versions.length > 0
          ? lib.versions
          : lib.installedVersion
          ? [lib.installedVersion]
          : [],
      category: lib.category || "Installed",
    }));

    this.renderLibraryList();
  }

  async handleSearch() {
    if (!this.searchQuery) {
      this.showInstalledOnly();
      return;
    }

    this.setLoading(true);
    try {
      const res = await fetch(
        `/api/cli/libraries/search?q=${encodeURIComponent(this.searchQuery)}`
      );
      const data = await res.json();

      if (data.success) {
        // Merge with installed info
        this.libraries = data.libraries.map((lib) => ({
          ...lib,
          installedVersion: this.installedLibraries.get(lib.name) || null,
        }));
        this.renderLibraryList();
      } else {
        this.showError(data.error || "Search failed");
      }
    } catch (err) {
      logger.error("Search failed", err);
      this.showError("Failed to search libraries");
    } finally {
      this.setLoading(false);
    }
  }

  async updateIndex() {
    this.showProgress("Updating library index...");
    this.appendProgressLog("Downloading latest library definitions...\n");

    try {
      const res = await fetch("/api/cli/libraries/index/update", {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        this.appendProgressLog(
          `\n✓ Index updated successfully in ${data.duration.toFixed(1)}s\n`
        );
        this.loadIndexStatus();
        this.loadInstalledLibraries();
        // Re-run search if there was a query
        if (this.searchQuery) {
          this.handleSearch();
        }
      } else {
        this.appendProgressLog(
          `\n✗ Update failed: ${data.error || "Unknown error"}\n`
        );
      }
    } catch (err) {
      this.appendProgressLog(`\n✗ Error: ${err.message}\n`);
    }
  }

  async performAction(
    libraryName,
    action,
    version = null,
    installDeps = false
  ) {
    const actionLabels = {
      install: "Installing",
      upgrade: "Upgrading",
      uninstall: "Uninstalling",
    };

    this.showProgress(`${actionLabels[action] || action} ${libraryName}...`);
    this.appendProgressLog(
      `${actionLabels[action]} ${libraryName}${
        version ? "@" + version : ""
      }...\n`
    );

    try {
      const body = { name: libraryName };
      if (version && action === "install") {
        body.version = version;
      }
      if (installDeps && action === "install") {
        body.installDeps = true;
      }

      const res = await fetch(`/api/cli/libraries/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.log) {
        this.appendProgressLog(data.log);
      }

      if (data.success) {
        this.appendProgressLog(
          `\n✓ ${action} completed in ${data.duration.toFixed(1)}s\n`
        );
        // Refresh installed libraries list
        await this.loadInstalledLibraries();
        // Update current display
        if (this.searchQuery) {
          this.handleSearch();
        } else if (this.showInstalled) {
          this.showInstalledOnly();
        }
      } else {
        this.appendProgressLog(
          `\n✗ ${action} failed: ${data.error || "Unknown error"}\n`
        );
      }
    } catch (err) {
      this.appendProgressLog(`\n✗ Error: ${err.message}\n`);
    }
  }

  renderLibraryList() {
    if (!this.elements.list) return;

    let filtered = this.libraries;

    // Filter by category
    if (this.categoryFilter !== "All") {
      filtered = filtered.filter((lib) => lib.category === this.categoryFilter);
    }

    // Filter to installed only
    if (this.showInstalled) {
      filtered = filtered.filter((lib) => lib.installedVersion);
    }

    if (filtered.length === 0) {
      if (this.showInstalled) {
        this.elements.list.innerHTML = `
          <div class="empty-state">
            <p>No installed libraries found${
              this.categoryFilter !== "All" ? " in this category" : ""
            }.</p>
          </div>
        `;
      } else if (this.searchQuery) {
        this.elements.list.innerHTML = `
          <div class="empty-state">
            <p>No libraries found for "${this.searchQuery}"${
          this.categoryFilter !== "All" ? " in " + this.categoryFilter : ""
        }.</p>
            <p>Try a different search term or category.</p>
          </div>
        `;
      } else {
        this.elements.list.innerHTML = `
          <div class="empty-state">
            <p>Enter a search term to find libraries.</p>
          </div>
        `;
      }
      return;
    }

    // Limit display to avoid performance issues
    const displayLibs = filtered.slice(0, 50);
    const hasMore = filtered.length > 50;

    this.elements.list.innerHTML =
      displayLibs.map((lib) => this.renderLibraryCard(lib)).join("") +
      (hasMore
        ? `<div class="more-results">Showing 50 of ${filtered.length} results. Refine your search to see more.</div>`
        : "");
  }

  renderLibraryCard(library) {
    const isInstalled = !!library.installedVersion;
    const versions = library.versions || [library.latestVersion];
    const architectures = library.architectures || [];

    return `
      <div class="library-card ${
        isInstalled ? "installed" : ""
      }" data-name="${this.escapeHtml(library.name)}">
        <div class="library-header">
          <h3>${this.escapeHtml(library.name)}</h3>
          <span class="author">by ${this.escapeHtml(
            library.author || "Unknown"
          )}</span>
        </div>
        ${
          library.sentence
            ? `<p class="library-desc">${this.escapeHtml(library.sentence)}</p>`
            : ""
        }
        <div class="library-meta">
          ${
            library.category
              ? `<span class="category">${this.escapeHtml(
                  library.category
                )}</span>`
              : ""
          }
          ${
            architectures.length > 0
              ? `<span class="architectures">${architectures
                  .slice(0, 4)
                  .join(", ")}${architectures.length > 4 ? "..." : ""}</span>`
              : ""
          }
        </div>
        <div class="library-actions">
          <select class="version-select">
            ${versions
              .slice(0, 10)
              .map(
                (v) =>
                  `<option value="${v}" ${
                    v === library.latestVersion ? "selected" : ""
                  }>${v}${
                    v === library.latestVersion ? " (latest)" : ""
                  }</option>`
              )
              .join("")}
          </select>
          ${
            isInstalled
              ? `
            <span class="installed-badge">✓ ${library.installedVersion}</span>
            <button class="btn-remove" data-action="uninstall">Remove</button>
          `
              : `
            <button class="btn-install" data-action="install">Install</button>
          `
          }
          <label class="checkbox-label install-deps-label" title="Include required dependency libraries">
            <input type="checkbox" class="install-deps" checked /> + deps
          </label>
        </div>
      </div>
    `;
  }

  setLoading(loading) {
    this.isLoading = loading;
    if (loading) {
      this.elements.list.innerHTML = `<div class="loading-placeholder">Searching...</div>`;
    }
  }

  showProgress(title) {
    if (this.elements.jobProgress) {
      this.elements.jobProgress.style.display = "block";
      const titleEl =
        this.elements.jobProgress.querySelector(".progress-title");
      if (titleEl) titleEl.textContent = title;
      if (this.elements.progressLog) {
        this.elements.progressLog.textContent = "";
      }
    }
  }

  appendProgressLog(text) {
    if (this.elements.progressLog) {
      this.elements.progressLog.textContent += text;
      this.elements.progressLog.scrollTop =
        this.elements.progressLog.scrollHeight;
    }
  }

  showDepsWarning(card) {
    const actions = card.querySelector(".library-actions");
    if (!actions) return;

    let warning = card.querySelector(".deps-warning");
    if (!warning) {
      warning = document.createElement("div");
      warning.className = "deps-warning";
      warning.textContent =
        "⚠ Installing without dependency libraries may cause this library to fail.";
      actions.appendChild(warning);
    }

    warning.classList.add("visible");

    const label = card.querySelector(".install-deps-label");
    if (label) {
      label.classList.add("warning");
      label.setAttribute(
        "aria-label",
        "Dependency install disabled; library might not function"
      );
    }
  }

  clearDepsWarning(card) {
    const warning = card.querySelector(".deps-warning");
    if (warning) {
      warning.classList.remove("visible");
    }

    const label = card.querySelector(".install-deps-label");
    if (label) {
      label.classList.remove("warning");
      label.removeAttribute("aria-label");
    }
  }

  hideProgress() {
    if (this.elements.jobProgress) {
      this.elements.jobProgress.style.display = "none";
    }
  }

  showError(message) {
    if (this.elements.list) {
      this.elements.list.innerHTML = `
        <div class="error-state">
          <p>⚠️ ${this.escapeHtml(message)}</p>
        </div>
      `;
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }

  // --- Custom Install Methods ---

  showCustomModal() {
    if (this.elements.customModal) {
      this.elements.customModal.style.display = "flex";
      this.elements.gitUrlInput?.focus();
    }
  }

  hideCustomModal() {
    if (this.elements.customModal) {
      this.elements.customModal.style.display = "none";
      if (this.elements.gitUrlInput) {
        this.elements.gitUrlInput.value = "";
      }
      if (this.elements.zipPathInput) {
        this.elements.zipPathInput.value = "";
      }
    }
  }

  async installFromGit() {
    const url = this.elements.gitUrlInput?.value.trim();
    if (!url) {
      alert("Please enter a Git URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      // Also allow git@host:user/repo format
      if (!/^git@[\w.-]+:[\w./-]+\.git$/.test(url)) {
        alert("Please enter a valid Git URL");
        return;
      }
    }

    this.hideCustomModal();
    this.showProgress(`Installing from Git: ${url}`);

    try {
      const res = await fetch("/api/cli/libraries/install-git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const result = await res.json();
      this.appendProgressLog(result.log || "");

      if (result.success) {
        this.appendProgressLog("\n\n✓ Library installed successfully!");
        // Refresh installed libraries list
        await this.loadInstalledLibraries();
        if (this.showInstalled) {
          this.showInstalledOnly();
        }
      } else {
        this.appendProgressLog(`\n\n✗ Installation failed: ${result.error}`);
      }
    } catch (err) {
      logger.error("Install from Git failed", err);
      this.appendProgressLog(`\n\n✗ Error: ${err.message}`);
    }
  }

  async installFromZip() {
    const zipPath = this.elements.zipPathInput?.value.trim();
    if (!zipPath) {
      alert("Please enter the path to a ZIP file");
      return;
    }

    if (!zipPath.toLowerCase().endsWith(".zip")) {
      alert("File must be a .zip archive");
      return;
    }

    this.hideCustomModal();
    this.showProgress(`Installing from ZIP: ${zipPath}`);

    try {
      const res = await fetch("/api/cli/libraries/install-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: zipPath }),
      });

      const result = await res.json();
      this.appendProgressLog(result.log || "");

      if (result.success) {
        this.appendProgressLog("\n\n✓ Library installed successfully!");
        // Refresh installed libraries list
        await this.loadInstalledLibraries();
        if (this.showInstalled) {
          this.showInstalledOnly();
        }
      } else {
        this.appendProgressLog(`\n\n✗ Installation failed: ${result.error}`);
      }
    } catch (err) {
      logger.error("Install from ZIP failed", err);
      this.appendProgressLog(`\n\n✗ Error: ${err.message}`);
    }
  }
}
