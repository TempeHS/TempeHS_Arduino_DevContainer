/**
 * Board Manager UI Component
 *
 * Provides UI for managing Arduino board/core platforms:
 * - Search and browse available platforms
 * - Install/upgrade/uninstall cores
 * - Track index freshness
 */

import { Logger } from "../../shared/Logger.js";

/** @type {Logger} */
const logger = new Logger("BoardManager");

export class BoardManagerUI {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
    this.platforms = [];
    this.additionalUrls = [];
    this.searchQuery = "";
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
    this.loadAdditionalUrls();
    // Load all platforms by default (not just installed)
    this.loadAllPlatforms();
  }

  cacheElements() {
    this.elements = {
      searchInput: document.getElementById("board-search"),
      showInstalledCheck: document.getElementById("show-installed-boards"),
      refreshBtn: document.getElementById("refresh-board-index"),
      manageUrlsBtn: document.getElementById("manage-board-urls"),
      indexStatus: document.getElementById("board-index-status"),
      list: document.getElementById("board-list"),
      jobProgress: document.getElementById("board-job-progress"),
      progressLog: document.getElementById("board-progress-log"),
      closeProgress: document.getElementById("close-board-progress"),
      // URL modal elements
      urlModal: document.getElementById("board-url-modal"),
      urlList: document.getElementById("board-url-list"),
      urlInput: document.getElementById("board-url-input"),
      addUrlBtn: document.getElementById("add-board-url"),
      closeUrlModal: document.getElementById("close-board-url-modal"),
    };
  }

  attachEventListeners() {
    // Search input with debounce
    this.elements.searchInput?.addEventListener("input", (e) => {
      clearTimeout(this.searchTimeout);
      this.searchQuery = e.target.value.trim();
      this.searchTimeout = setTimeout(() => this.handleSearch(), 300);
    });

    // Enter key for immediate search
    this.elements.searchInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        clearTimeout(this.searchTimeout);
        this.handleSearch();
      }
    });

    // Show installed only checkbox
    this.elements.showInstalledCheck?.addEventListener("change", (e) => {
      this.showInstalled = e.target.checked;
      this.renderPlatformList();
    });

    // Refresh index button
    this.elements.refreshBtn?.addEventListener("click", () => {
      this.updateIndex();
    });

    // Manage URLs button
    this.elements.manageUrlsBtn?.addEventListener("click", () => {
      this.showUrlModal();
    });

    // Close URL modal
    this.elements.closeUrlModal?.addEventListener("click", () => {
      this.hideUrlModal();
    });

    // Add URL button
    this.elements.addUrlBtn?.addEventListener("click", () => {
      this.addUrl();
    });

    // Enter key in URL input
    this.elements.urlInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.addUrl();
      }
    });

    // Delegate remove URL button clicks
    this.elements.urlList?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action='remove-url']");
      if (btn) {
        const url = btn.dataset.url;
        this.removeUrl(url);
      }
    });

    // Close progress panel
    this.elements.closeProgress?.addEventListener("click", () => {
      this.hideProgress();
    });

    // Delegate click events on platform cards
    this.elements.list?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const card = btn.closest(".platform-card");
      if (!card) return;

      const platformId = card.dataset.id;
      const action = btn.dataset.action;
      const versionSelect = card.querySelector(".version-select");
      const version = versionSelect?.value || null;

      this.performAction(platformId, action, version);
    });
  }

  async loadIndexStatus() {
    try {
      const res = await fetch("/api/cli/cores/index/status");
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
        <span class="status-warning">⚠️ Board index not yet loaded. Click "Update Index" to download.</span>
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

  async loadAllPlatforms() {
    this.setLoading(true);
    try {
      // Search with empty query returns all platforms
      const res = await fetch("/api/cli/cores/search?q=");
      const data = await res.json();

      if (data.success) {
        this.platforms = data.platforms;
        this.renderPlatformList();
      } else {
        // Fallback to installed only if search fails
        await this.loadInstalledPlatforms();
      }
    } catch (err) {
      logger.error("Failed to load all platforms", err);
      // Fallback to installed only
      await this.loadInstalledPlatforms();
    } finally {
      this.setLoading(false);
    }
  }

  async loadInstalledPlatforms() {
    this.setLoading(true);
    try {
      const res = await fetch("/api/cli/cores/installed");
      const data = await res.json();

      if (data.success) {
        this.platforms = data.platforms;
        this.renderPlatformList();
      } else {
        this.showError(data.error || "Failed to load installed platforms");
      }
    } catch (err) {
      logger.error("Failed to load platforms", err);
      this.showError("Failed to connect to server");
    } finally {
      this.setLoading(false);
    }
  }

  async handleSearch() {
    if (!this.searchQuery) {
      // If no query, load all platforms
      await this.loadAllPlatforms();
      return;
    }

    this.setLoading(true);
    try {
      const res = await fetch(
        `/api/cli/cores/search?q=${encodeURIComponent(this.searchQuery)}`
      );
      const data = await res.json();

      if (data.success) {
        this.platforms = data.platforms;
        this.renderPlatformList();
      } else {
        this.showError(data.error || "Search failed");
      }
    } catch (err) {
      logger.error("Search failed", err);
      this.showError("Failed to search platforms");
    } finally {
      this.setLoading(false);
    }
  }

  async updateIndex() {
    this.showProgress("Updating board index...");
    this.appendProgressLog("Downloading latest board definitions...\n");

    try {
      const res = await fetch("/api/cli/cores/index/update", {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        this.appendProgressLog(
          `\n✓ Index updated successfully in ${data.duration.toFixed(1)}s\n`
        );
        this.loadIndexStatus();
        // Refresh the list
        if (this.searchQuery) {
          this.handleSearch();
        } else {
          this.loadAllPlatforms();
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

  async performAction(platformId, action, version = null) {
    const actionLabels = {
      install: "Installing",
      upgrade: "Upgrading",
      uninstall: "Uninstalling",
    };

    this.showProgress(`${actionLabels[action] || action} ${platformId}...`);
    this.appendProgressLog(
      `${actionLabels[action]} ${platformId}${
        version ? "@" + version : ""
      }...\n`
    );

    try {
      const body = { platformId };
      if (version && action === "install") {
        body.version = version;
      }

      const res = await fetch(`/api/cli/cores/${action}`, {
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
        // Refresh the list
        if (this.searchQuery) {
          this.handleSearch();
        } else {
          this.loadAllPlatforms();
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

  renderPlatformList() {
    if (!this.elements.list) return;

    let filtered = this.platforms;
    if (this.showInstalled) {
      filtered = filtered.filter((p) => p.installedVersion);
    }

    // Sort: installed first (A-Z), then uninstalled (A-Z)
    filtered = filtered.sort((a, b) => {
      const aInstalled = !!a.installedVersion;
      const bInstalled = !!b.installedVersion;

      // If one is installed and the other isn't, installed comes first
      if (aInstalled && !bInstalled) return -1;
      if (!aInstalled && bInstalled) return 1;

      // Both same install status, sort by name A-Z
      const aName = (a.name || a.id || "").toLowerCase();
      const bName = (b.name || b.id || "").toLowerCase();
      return aName.localeCompare(bName);
    });

    if (filtered.length === 0) {
      if (this.showInstalled) {
        this.elements.list.innerHTML = `
          <div class="empty-state">
            <p>No installed platforms found.</p>
            <p>Search for platforms to install, or uncheck "Installed only".</p>
          </div>
        `;
      } else if (this.searchQuery) {
        this.elements.list.innerHTML = `
          <div class="empty-state">
            <p>No platforms found for "${this.searchQuery}".</p>
            <p>Try a different search term or update the index.</p>
          </div>
        `;
      } else {
        this.elements.list.innerHTML = `
          <div class="empty-state">
            <p>No platforms loaded.</p>
            <p>Search for platforms or click "Update Index" to download the board index.</p>
          </div>
        `;
      }
      return;
    }

    this.elements.list.innerHTML = filtered
      .map((p) => this.renderPlatformCard(p))
      .join("");
  }

  renderPlatformCard(platform) {
    const isInstalled = !!platform.installedVersion;
    const boards = platform.boards || [];
    const versions = platform.versions || [platform.latestVersion];

    return `
      <div class="platform-card ${isInstalled ? "installed" : ""}" data-id="${
      platform.id
    }">
        <div class="platform-header">
          <h3>${this.escapeHtml(platform.name)}</h3>
          <span class="maintainer">by ${this.escapeHtml(
            platform.maintainer
          )}</span>
        </div>
        <div class="platform-id">${this.escapeHtml(platform.id)}</div>
        ${
          boards.length > 0
            ? `
          <div class="platform-boards">
            ${boards
              .slice(0, 5)
              .map(
                (b) =>
                  `<span class="board-chip">${this.escapeHtml(b.name)}</span>`
              )
              .join("")}
            ${
              boards.length > 5
                ? `<span class="board-chip more">+${
                    boards.length - 5
                  } more</span>`
                : ""
            }
          </div>
        `
            : ""
        }
        <div class="platform-actions">
          <select class="version-select">
            ${versions
              .map(
                (v) =>
                  `<option value="${v}" ${
                    v === platform.latestVersion ? "selected" : ""
                  }>${v}${
                    v === platform.latestVersion ? " (latest)" : ""
                  }</option>`
              )
              .join("")}
          </select>
          ${
            isInstalled
              ? `
            <span class="installed-badge">✓ ${platform.installedVersion}</span>
            ${
              platform.hasUpdate
                ? `<button class="btn-upgrade" data-action="upgrade">Upgrade</button>`
                : ""
            }
            <button class="btn-remove" data-action="uninstall">Remove</button>
          `
              : `
            <button class="btn-install" data-action="install">Install</button>
          `
          }
        </div>
      </div>
    `;
  }

  setLoading(loading) {
    this.isLoading = loading;
    if (loading) {
      this.elements.list.innerHTML = `<div class="loading-placeholder">Loading...</div>`;
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

  // --- Additional Board URLs Management ---

  async loadAdditionalUrls() {
    try {
      const res = await fetch("/api/cli/cores/urls");
      const data = await res.json();
      if (data.success) {
        this.additionalUrls = data.urls || [];
        this.renderUrlList();
      }
    } catch (err) {
      logger.error("Failed to load additional URLs", err);
    }
  }

  showUrlModal() {
    if (this.elements.urlModal) {
      this.elements.urlModal.style.display = "flex";
      this.elements.urlInput?.focus();
    }
  }

  hideUrlModal() {
    if (this.elements.urlModal) {
      this.elements.urlModal.style.display = "none";
      if (this.elements.urlInput) {
        this.elements.urlInput.value = "";
      }
    }
  }

  renderUrlList() {
    if (!this.elements.urlList) return;

    if (this.additionalUrls.length === 0) {
      this.elements.urlList.innerHTML = `
        <div class="empty-urls">
          <p>No additional board URLs configured.</p>
          <p class="url-hint">Add URLs for third-party boards like ESP32, ESP8266, etc.</p>
        </div>
      `;
      return;
    }

    this.elements.urlList.innerHTML = this.additionalUrls
      .map(
        (url) => `
        <div class="url-item">
          <span class="url-text" title="${this.escapeHtml(
            url
          )}">${this.escapeHtml(url)}</span>
          <button class="btn-remove-url" data-action="remove-url" data-url="${this.escapeHtml(
            url
          )}" title="Remove URL">×</button>
        </div>
      `
      )
      .join("");
  }

  async addUrl() {
    const url = this.elements.urlInput?.value.trim();
    if (!url) return;

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      alert("Please enter a valid URL");
      return;
    }

    if (this.additionalUrls.includes(url)) {
      alert("This URL is already added");
      return;
    }

    try {
      this.elements.addUrlBtn.disabled = true;
      this.elements.addUrlBtn.textContent = "Adding...";

      const res = await fetch("/api/cli/cores/urls/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (data.success) {
        this.additionalUrls = data.urls || [];
        this.renderUrlList();
        if (this.elements.urlInput) {
          this.elements.urlInput.value = "";
        }
        // Suggest updating index
        this.elements.indexStatus.innerHTML = `
          <span class="status-warning">⚠️ New board URL added. Click "Update Index" to download new boards.</span>
        `;
      } else {
        alert(`Failed to add URL: ${data.error}`);
      }
    } catch (err) {
      logger.error("Failed to add URL", err);
      alert("Failed to add URL. Check console for details.");
    } finally {
      this.elements.addUrlBtn.disabled = false;
      this.elements.addUrlBtn.textContent = "Add";
    }
  }

  async removeUrl(url) {
    if (!confirm(`Remove this board URL?\n\n${url}`)) return;

    try {
      const res = await fetch("/api/cli/cores/urls/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (data.success) {
        this.additionalUrls = data.urls || [];
        this.renderUrlList();
      } else {
        alert(`Failed to remove URL: ${data.error}`);
      }
    } catch (err) {
      logger.error("Failed to remove URL", err);
      alert("Failed to remove URL. Check console for details.");
    }
  }
}
