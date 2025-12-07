/**
 * ReferenceUI - Arduino Language Reference Browser
 * Fetches and displays Arduino documentation from GitHub
 */

import { Logger } from "../../shared/Logger.js";

/** @type {Logger} */
const logger = new Logger("ReferenceUI");

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/arduino/docs-content/main/content";

// Reference data structure - organized by category
const REFERENCE_DATA = {
  digital: {
    title: "Digital I/O",
    icon: "⚡",
    docPath: "functions/digital-io",
    functions: [
      {
        name: "pinMode()",
        desc: "Configures the specified pin as input or output",
        syntax: "pinMode(pin, mode)",
        params: "pin: pin number, mode: INPUT, OUTPUT, or INPUT_PULLUP",
        returns: "Nothing",
        slug: "pinmode",
      },
      {
        name: "digitalWrite()",
        desc: "Write HIGH or LOW to a digital pin",
        syntax: "digitalWrite(pin, value)",
        params: "pin: pin number, value: HIGH or LOW",
        returns: "Nothing",
        slug: "digitalwrite",
      },
      {
        name: "digitalRead()",
        desc: "Reads the value from a digital pin",
        syntax: "digitalRead(pin)",
        params: "pin: pin number",
        returns: "HIGH or LOW",
        slug: "digitalread",
      },
    ],
  },
  analog: {
    title: "Analog I/O",
    icon: "📊",
    docPath: "functions/analog-io",
    functions: [
      {
        name: "analogRead()",
        desc: "Reads the value from an analog pin (0-1023 for 10-bit, 0-16383 for 14-bit on R4)",
        syntax: "analogRead(pin)",
        params: "pin: analog pin number (A0-A5)",
        returns: "int (0-1023 or 0-16383)",
        slug: "analogread",
      },
      {
        name: "analogWrite()",
        desc: "Writes an analog value (PWM) to a pin",
        syntax: "analogWrite(pin, value)",
        params: "pin: PWM pin, value: 0-255",
        returns: "Nothing",
        slug: "analogwrite",
      },
      {
        name: "analogReference()",
        desc: "Configures the reference voltage for analog input",
        syntax: "analogReference(type)",
        params: "type: DEFAULT, INTERNAL, EXTERNAL",
        returns: "Nothing",
        slug: "analogreference",
      },
      {
        name: "analogReadResolution()",
        desc: "Sets the resolution of analogRead() return values",
        syntax: "analogReadResolution(bits)",
        params: "bits: 10 (default) to 14 for R4",
        returns: "Nothing",
        slug: "analogreadresolution",
      },
    ],
  },
  time: {
    title: "Time",
    icon: "⏱️",
    docPath: "functions/time",
    functions: [
      {
        name: "millis()",
        desc: "Returns milliseconds since program started",
        syntax: "millis()",
        params: "None",
        returns: "unsigned long",
      },
      {
        name: "micros()",
        desc: "Returns microseconds since program started",
        syntax: "micros()",
        params: "None",
        returns: "unsigned long",
      },
      {
        name: "delay()",
        desc: "Pauses program for specified milliseconds",
        syntax: "delay(ms)",
        params: "ms: milliseconds to pause",
        returns: "Nothing",
      },
      {
        name: "delayMicroseconds()",
        desc: "Pauses program for specified microseconds",
        syntax: "delayMicroseconds(us)",
        params: "us: microseconds to pause",
        returns: "Nothing",
      },
    ],
  },
  math: {
    title: "Math",
    icon: "🔢",
    docPath: "functions/math",
    functions: [
      {
        name: "min()",
        desc: "Returns the smaller of two numbers",
        syntax: "min(x, y)",
        params: "x, y: numbers to compare",
        returns: "The smaller value",
      },
      {
        name: "max()",
        desc: "Returns the larger of two numbers",
        syntax: "max(x, y)",
        params: "x, y: numbers to compare",
        returns: "The larger value",
      },
      {
        name: "abs()",
        desc: "Returns the absolute value",
        syntax: "abs(x)",
        params: "x: number",
        returns: "Absolute value",
      },
      {
        name: "constrain()",
        desc: "Constrains a number to a range",
        syntax: "constrain(x, a, b)",
        params: "x: value, a: lower bound, b: upper bound",
        returns: "Constrained value",
      },
      {
        name: "map()",
        desc: "Re-maps a number from one range to another",
        syntax: "map(value, fromLow, fromHigh, toLow, toHigh)",
        params: "value: input, from/to ranges",
        returns: "Mapped value",
      },
      {
        name: "pow()",
        desc: "Calculates power of a number",
        syntax: "pow(base, exponent)",
        params: "base: number, exponent: power",
        returns: "Result",
      },
      {
        name: "sqrt()",
        desc: "Calculates square root",
        syntax: "sqrt(x)",
        params: "x: number",
        returns: "Square root",
      },
      {
        name: "random()",
        desc: "Generates pseudo-random number",
        syntax: "random(max) or random(min, max)",
        params: "min: lower bound, max: upper bound",
        returns: "Random number",
      },
      {
        name: "randomSeed()",
        desc: "Initializes random number generator",
        syntax: "randomSeed(seed)",
        params: "seed: number to seed generator",
        returns: "Nothing",
      },
    ],
  },
  serial: {
    title: "Serial Communication",
    icon: "📡",
    docPath: "functions/communication/serial",
    functions: [
      {
        name: "Serial.begin()",
        desc: "Sets the baud rate for serial communication",
        syntax: "Serial.begin(speed)",
        params: "speed: baud rate (9600, 115200, etc.)",
        returns: "Nothing",
      },
      {
        name: "Serial.print()",
        desc: "Prints data to the serial port",
        syntax: "Serial.print(val) or Serial.print(val, format)",
        params: "val: data to print, format: DEC, HEX, BIN",
        returns: "Number of bytes written",
      },
      {
        name: "Serial.println()",
        desc: "Prints data followed by newline",
        syntax: "Serial.println(val)",
        params: "val: data to print",
        returns: "Number of bytes written",
      },
      {
        name: "Serial.read()",
        desc: "Reads incoming serial data",
        syntax: "Serial.read()",
        params: "None",
        returns: "First byte of data or -1",
      },
      {
        name: "Serial.available()",
        desc: "Returns number of bytes available to read",
        syntax: "Serial.available()",
        params: "None",
        returns: "Number of bytes",
      },
      {
        name: "Serial.write()",
        desc: "Writes binary data to serial port",
        syntax: "Serial.write(val)",
        params: "val: byte or string to send",
        returns: "Number of bytes written",
      },
      {
        name: "Serial.parseInt()",
        desc: "Reads characters and converts to integer",
        syntax: "Serial.parseInt()",
        params: "None",
        returns: "Parsed integer",
      },
      {
        name: "Serial.parseFloat()",
        desc: "Reads characters and converts to float",
        syntax: "Serial.parseFloat()",
        params: "None",
        returns: "Parsed float",
      },
      {
        name: "Serial.readString()",
        desc: "Reads serial buffer into a String",
        syntax: "Serial.readString()",
        params: "None",
        returns: "String",
      },
      {
        name: "Serial.setTimeout()",
        desc: "Sets timeout for serial reads",
        syntax: "Serial.setTimeout(time)",
        params: "time: milliseconds",
        returns: "Nothing",
      },
    ],
  },
  advanced: {
    title: "Advanced I/O",
    icon: "🔧",
    docPath: "functions/advanced-io",
    functions: [
      {
        name: "tone()",
        desc: "Generates a square wave on a pin",
        syntax: "tone(pin, frequency) or tone(pin, frequency, duration)",
        params: "pin: output pin, frequency: Hz, duration: ms",
        returns: "Nothing",
      },
      {
        name: "noTone()",
        desc: "Stops tone generation",
        syntax: "noTone(pin)",
        params: "pin: the pin to stop",
        returns: "Nothing",
      },
      {
        name: "pulseIn()",
        desc: "Reads a pulse on a pin",
        syntax: "pulseIn(pin, value, timeout)",
        params: "pin: input, value: HIGH/LOW, timeout: microseconds",
        returns: "Pulse length in microseconds",
      },
      {
        name: "shiftOut()",
        desc: "Shifts out a byte one bit at a time",
        syntax: "shiftOut(dataPin, clockPin, bitOrder, value)",
        params: "pins, MSBFIRST/LSBFIRST, byte value",
        returns: "Nothing",
      },
      {
        name: "shiftIn()",
        desc: "Shifts in a byte one bit at a time",
        syntax: "shiftIn(dataPin, clockPin, bitOrder)",
        params: "pins, MSBFIRST/LSBFIRST",
        returns: "Byte value",
      },
    ],
  },
  variables: {
    title: "Data Types",
    icon: "📦",
    docPath: "variables/data-types",
    functions: [
      {
        name: "boolean",
        desc: "Holds true or false",
        syntax: "boolean var = true;",
        params: "true or false",
        returns: "N/A",
      },
      {
        name: "byte",
        desc: "Stores 8-bit unsigned number (0-255)",
        syntax: "byte var = 255;",
        params: "0 to 255",
        returns: "N/A",
      },
      {
        name: "char",
        desc: "Stores a single character",
        syntax: "char var = 'A';",
        params: "-128 to 127",
        returns: "N/A",
      },
      {
        name: "int",
        desc: "Stores 16-bit signed integer",
        syntax: "int var = 1000;",
        params: "-32768 to 32767",
        returns: "N/A",
      },
      {
        name: "unsigned int",
        desc: "Stores 16-bit unsigned integer",
        syntax: "unsigned int var = 60000;",
        params: "0 to 65535",
        returns: "N/A",
      },
      {
        name: "long",
        desc: "Stores 32-bit signed integer",
        syntax: "long var = 100000L;",
        params: "-2,147,483,648 to 2,147,483,647",
        returns: "N/A",
      },
      {
        name: "unsigned long",
        desc: "Stores 32-bit unsigned integer",
        syntax: "unsigned long var = 4000000000UL;",
        params: "0 to 4,294,967,295",
        returns: "N/A",
      },
      {
        name: "float",
        desc: "Stores floating-point number",
        syntax: "float var = 3.14;",
        params: "±3.4028235E+38",
        returns: "N/A",
      },
      {
        name: "double",
        desc: "Same as float on Arduino Uno",
        syntax: "double var = 3.14159;",
        params: "Same as float",
        returns: "N/A",
      },
      {
        name: "String",
        desc: "Text string object",
        syntax: 'String str = "Hello";',
        params: "Text characters",
        returns: "N/A",
      },
      {
        name: "array",
        desc: "Collection of variables",
        syntax: "int arr[5] = {1,2,3,4,5};",
        params: "Multiple values",
        returns: "N/A",
      },
    ],
  },
  structure: {
    title: "Control Structures",
    icon: "🔀",
    docPath: "structure/control-structure",
    functions: [
      {
        name: "if",
        desc: "Conditional execution",
        syntax: "if (condition) { }",
        params: "condition: expression",
        returns: "N/A",
      },
      {
        name: "if...else",
        desc: "Conditional with alternative",
        syntax: "if (condition) { } else { }",
        params: "condition: expression",
        returns: "N/A",
      },
      {
        name: "for",
        desc: "Loop with counter",
        syntax: "for (init; condition; increment) { }",
        params: "initialization, test, increment",
        returns: "N/A",
      },
      {
        name: "while",
        desc: "Loop while condition is true",
        syntax: "while (condition) { }",
        params: "condition: expression",
        returns: "N/A",
      },
      {
        name: "do...while",
        desc: "Loop at least once",
        syntax: "do { } while (condition);",
        params: "condition: expression",
        returns: "N/A",
      },
      {
        name: "switch...case",
        desc: "Multi-way branch",
        syntax: "switch (var) { case 1: break; }",
        params: "var: variable to test",
        returns: "N/A",
      },
      {
        name: "break",
        desc: "Exit loop or switch",
        syntax: "break;",
        params: "None",
        returns: "N/A",
      },
      {
        name: "continue",
        desc: "Skip to next iteration",
        syntax: "continue;",
        params: "None",
        returns: "N/A",
      },
      {
        name: "return",
        desc: "Return from function",
        syntax: "return value;",
        params: "value: data to return",
        returns: "N/A",
      },
      {
        name: "goto",
        desc: "Jump to label (use sparingly)",
        syntax: "goto label;",
        params: "label: target location",
        returns: "N/A",
      },
    ],
  },
  constants: {
    title: "Constants",
    icon: "📌",
    docPath: "variables/constants",
    functions: [
      {
        name: "HIGH",
        desc: "Digital pin high voltage (5V or 3.3V)",
        syntax: "digitalWrite(pin, HIGH);",
        params: "N/A",
        returns: "N/A",
      },
      {
        name: "LOW",
        desc: "Digital pin low voltage (0V)",
        syntax: "digitalWrite(pin, LOW);",
        params: "N/A",
        returns: "N/A",
      },
      {
        name: "INPUT",
        desc: "Pin mode for reading",
        syntax: "pinMode(pin, INPUT);",
        params: "N/A",
        returns: "N/A",
      },
      {
        name: "OUTPUT",
        desc: "Pin mode for writing",
        syntax: "pinMode(pin, OUTPUT);",
        params: "N/A",
        returns: "N/A",
      },
      {
        name: "INPUT_PULLUP",
        desc: "Input with internal pull-up",
        syntax: "pinMode(pin, INPUT_PULLUP);",
        params: "N/A",
        returns: "N/A",
      },
      {
        name: "LED_BUILTIN",
        desc: "Pin number of built-in LED",
        syntax: "digitalWrite(LED_BUILTIN, HIGH);",
        params: "N/A",
        returns: "N/A",
      },
      {
        name: "true / false",
        desc: "Boolean values",
        syntax: "bool flag = true;",
        params: "N/A",
        returns: "N/A",
      },
    ],
  },
};

export class ReferenceUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.contentEl = document.getElementById("reference-content");
    this.searchInput = document.getElementById("ref-search");
    this.categorySelect = document.getElementById("ref-category");
    this.refreshBtn = document.getElementById("refresh-reference");

    this.currentFilter = "all";
    this.searchTerm = "";
  }

  init() {
    if (!this.contentEl) {
      logger.warn("Content element not found");
      return;
    }

    this.setupEventListeners();
    this.render();
  }

  setupEventListeners() {
    if (this.searchInput) {
      this.searchInput.addEventListener("input", (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.render();
      });
    }

    if (this.categorySelect) {
      this.categorySelect.addEventListener("change", (e) => {
        this.currentFilter = e.target.value;
        this.render();
      });
    }

    if (this.refreshBtn) {
      this.refreshBtn.addEventListener("click", () => {
        this.render();
      });
    }
  }

  render() {
    if (!this.contentEl) return;

    let html = '<div class="reference-sections">';

    for (const [key, category] of Object.entries(REFERENCE_DATA)) {
      // Filter by category
      if (this.currentFilter !== "all" && this.currentFilter !== key) {
        continue;
      }

      // Filter functions by search term
      const filteredFunctions = category.functions.filter((fn) => {
        if (!this.searchTerm) return true;
        return (
          fn.name.toLowerCase().includes(this.searchTerm) ||
          fn.desc.toLowerCase().includes(this.searchTerm) ||
          fn.syntax.toLowerCase().includes(this.searchTerm)
        );
      });

      if (filteredFunctions.length === 0) continue;

      html += `
        <div class="reference-section">
          <h3 class="section-title">
            <span class="section-icon">${category.icon}</span>
            ${category.title}
          </h3>
          <div class="function-grid">
            ${filteredFunctions
              .map((fn) => this.renderFunction(fn, category))
              .join("")}
          </div>
        </div>
      `;
    }

    html += "</div>";

    // Check if any results
    if (html === '<div class="reference-sections"></div>') {
      html = `
        <div class="no-results">
          <span class="no-results-icon">🔍</span>
          <p>No functions found matching "${this.searchTerm}"</p>
        </div>
      `;
    }

    this.contentEl.innerHTML = html;

    // Add click handlers for expandable cards
    this.contentEl.querySelectorAll(".function-card").forEach((card) => {
      card.addEventListener("click", () => {
        card.classList.toggle("expanded");
      });
    });
  }

  renderFunction(fn, category) {
    // Generate documentation URL based on function name
    const funcSlug = fn.slug || fn.name.replace(/[().\s]/g, "").toLowerCase();
    const docPath = category.docPath || "functions";
    const docUrl = `https://docs.arduino.cc/language-reference/en/${docPath}/${funcSlug}/`;

    return `
      <div class="function-card">
        <div class="function-header">
          <code class="function-name">${fn.name}</code>
          <span class="expand-icon">▼</span>
        </div>
        <p class="function-desc">${fn.desc}</p>
        <div class="function-details">
          <div class="detail-row">
            <span class="detail-label">Syntax:</span>
            <code class="detail-value">${fn.syntax}</code>
          </div>
          <div class="detail-row">
            <span class="detail-label">Parameters:</span>
            <span class="detail-value">${fn.params}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Returns:</span>
            <span class="detail-value">${fn.returns}</span>
          </div>
          <a href="${docUrl}" target="_blank" rel="noopener" class="read-more-link" onclick="event.stopPropagation();">
            📖 Read more →
          </a>
        </div>
      </div>
    `;
  }
}
