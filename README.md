# TempeHS Arduino DevContainer

Cloud-based Arduino development environment for working with Seeed Studio Grove sensors.

## 📚 Documentation

**[View Complete Knowledge Base →](docs/README.md)**

- **[Sensor Guides](docs/sensors/)** - Individual Grove sensor documentation with code examples
- **[Integration Recipes](docs/integrations/)** - Multi-sensor projects for classroom challenges
- **[Library Catalog](docs/libraries/)** - Installation commands and API references
- **[How-To Guides](docs/howto/)** - Student workflows and Copilot usage tips
- **[Contributing](docs/CONTRIBUTING.md)** - Guidelines for maintaining documentation

## 🚀 Quick Start

### 1. Configure Arduino Connection

<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> or <kbd>Command</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>

1. **Select Arduino: Board Manager** to download board packages
2. **Select Arduino: Board Config** to select board (Arduino Uno R4 WiFi)
3. **Select Arduino: Select Serial Port** to select serial port
4. **Select Arduino: Upload** to upload to Arduino
5. **Select Arduino: Open Serial Monitor** to access serial monitor

### 2. Install Libraries

For sensor projects, install required libraries:

```bash
arduino-cli lib install "Grove - Ultrasonic Ranger" "DHT sensor library" "U8g2"
```

See [Library Catalog](docs/libraries/index.md) for complete list.

### 3. Browse Sensor Guides

Start with the base sensor kit:

- [Button](docs/sensors/button/) - Digital input
- [Ultrasonic Ranger](docs/sensors/ultrasonic-ranger/) - Distance measurement
- [Light Sensor](docs/sensors/light-sensor/) - Ambient light detection

### 4. Try Integration Projects

Complete classroom challenges:

- [Challenge #1: Auto LED Brightness](docs/integrations/challenge-01-auto-led.md)
- [Challenge #5: Boom Gate](docs/integrations/challenge-05-boom-gate.md)

## 🎯 For Students

### Asking Good Questions

See [How to Ask Copilot Questions](docs/howto/copilot-questions.md) for tips on getting the best help.

**Example question:**

> "Using docs/sensors/button and docs/sensors/ultrasonic-ranger, help me create code where a button press triggers a distance measurement on Arduino Uno R4 WiFi."

### Hardware Requirements

- **Arduino Uno R4 WiFi** ✅ (tested and working via Web Serial)
- Seeed Grove Base Shield
- Grove sensors from TempeHS collection
- USB-C cable

> **Note:** `random()` is broken on the R4 WiFi core. Use `demo_r4wifi_plotter` instead of `demo_plotter` for plotter demos.

## 🔧 DevContainer Features

This environment includes:

- Arduino CLI for library management
- C/C++ IntelliSense
- GitHub Copilot (agent mode disabled for students)
- Clang-format for code formatting
- All recommended VS Code extensions

## 📦 Repository Structure

```
├── docs/                    # Complete knowledge base
│   ├── sensors/            # Individual sensor guides
│   ├── integrations/       # Multi-sensor projects
│   ├── libraries/          # Library documentation
│   ├── howto/              # Student guides
│   └── resources/          # Inventory and tracking
├── OLD DOCS/               # Legacy documentation (archived)
├── scripts/                # Maintenance scripts
└── .devcontainer/          # Container configuration
```

## 🔗 External Resources

- [Seeed Studio Wiki](https://wiki.seeedstudio.com/)
- [Seeed GitHub Organization](https://github.com/Seeed-Studio/)
- [Arduino Documentation](https://docs.arduino.cc/)

## 🤝 Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines on:

- Adding sensor guides
- Creating integration recipes
- Updating library documentation
- Verifying links and testing code

---

**Last Updated:** 2025-12-04  
**Maintained by:** TempeHS Arduino Development Team
