/**
 * Serial Plotter UI Component
 *
 * Provides real-time data visualization:
 * - Chart.js-based line graph
 * - Multiple data series support
 * - Freeze/resume functionality
 * - PNG export capability
 *
 * @module client/ui/PlotterUI
 */

import Chart from "chart.js/auto";

// =============================================================================
// Constants
// =============================================================================

/** @constant {number} DEFAULT_MAX_DATA_POINTS - Maximum number of data points to display */
const DEFAULT_MAX_DATA_POINTS = 100;

/** @constant {string[]} CHART_COLORS - Color palette for data series */
const CHART_COLORS = [
  "#FF6384", // Red
  "#36A2EB", // Blue
  "#FFCE56", // Yellow
  "#4BC0C0", // Teal
  "#9966FF", // Purple
  "#FF9F40", // Orange
];

// =============================================================================
// PlotterUI Class
// =============================================================================

/**
 * Serial Plotter UI component for real-time data visualization
 */
export class PlotterUI {
  /**
   * Create a new PlotterUI instance
   * @param {string} containerId - DOM element ID for the plotter container
   */
  constructor(containerId) {
    /** @type {HTMLElement} */
    this.container = document.getElementById(containerId);

    /** @type {HTMLCanvasElement} */
    this.canvas = document.createElement("canvas");
    this.container.appendChild(this.canvas);

    /** @type {number} Maximum data points to display */
    this.maxDataPoints = DEFAULT_MAX_DATA_POINTS;

    /** @type {Chart|null} Chart.js instance */
    this.chart = null;

    /** @type {boolean} Whether the chart is frozen */
    this.frozen = false;

    this.initChart();
  }

  /**
   * Initialize the Chart.js chart instance
   * @private
   */
  initChart() {
    const ctx = this.canvas.getContext("2d");
    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: "Time",
            },
          },
          y: {
            display: true,
            title: {
              display: true,
              text: "Value",
            },
          },
        },
        elements: {
          point: {
            radius: 0,
          },
          line: {
            tension: 0.1,
          },
        },
      },
    });
  }

  /**
   * Add a new data point to the chart
   * @param {string} label - X-axis label (timestamp)
   * @param {number[]} values - Array of Y-axis values
   */
  addData(label, values) {
    if (!this.chart || this.frozen) return;

    // Add label
    this.chart.data.labels.push(label);
    if (this.chart.data.labels.length > this.maxDataPoints) {
      this.chart.data.labels.shift();
    }

    // Ensure datasets exist for each value
    values.forEach((value, index) => {
      if (!this.chart.data.datasets[index]) {
        this.chart.data.datasets.push({
          label: `Series ${index + 1}`,
          data: [],
          borderColor: this.getColor(index),
          borderWidth: 2,
          fill: false,
        });
      }

      // Add data point
      this.chart.data.datasets[index].data.push(value);

      // Remove old data point
      if (this.chart.data.datasets[index].data.length > this.maxDataPoints) {
        this.chart.data.datasets[index].data.shift();
      }
    });

    this.chart.update();
  }

  /**
   * Clear all data from the chart
   */
  clear() {
    if (!this.chart) return;
    this.chart.data.labels = [];
    this.chart.data.datasets = [];
    this.chart.update();
  }

  /**
   * Resize the chart to fit its container
   */
  resize() {
    if (this.chart) {
      this.chart.resize();
    }
  }

  /**
   * Get a color from the palette for a data series
   * @param {number} index - Series index
   * @returns {string} CSS color value
   * @private
   */
  getColor(index) {
    return CHART_COLORS[index % CHART_COLORS.length];
  }

  /**
   * Toggle freeze state of the plotter
   * @returns {boolean} New frozen state
   */
  toggleFreeze() {
    this.frozen = !this.frozen;
    return this.frozen;
  }

  /**
   * Check if plotter is frozen
   * @returns {boolean} Whether the plotter is frozen
   */
  isFrozen() {
    return this.frozen;
  }

  /**
   * Set freeze state explicitly
   * @param {boolean} frozen - Whether to freeze the plotter
   */
  setFrozen(frozen) {
    this.frozen = frozen;
  }

  /**
   * Download the current chart as a PNG image
   */
  downloadPNG() {
    if (!this.chart) return;

    // Create a temporary canvas with white background for better visibility
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext("2d");

    // Fill with white background
    tempCtx.fillStyle = "#ffffff";
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw the chart on top
    tempCtx.drawImage(this.canvas, 0, 0);

    // Convert to PNG and download
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.download = `serial-plotter-${timestamp}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
  }
}
