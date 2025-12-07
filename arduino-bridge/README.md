# Arduino Bridge (Web Serial Edition)

A browser-based Serial Terminal, Plotter, Board Manager, Library Manager, and Firmware Upload tool for Arduino, built with **Web Serial API**, **Vite**, and **xterm.js**.

## Features

- **Web Serial**: Connect directly to Arduino boards from Chrome/Edge without backend drivers.
- **Terminal**: Professional terminal emulation using xterm.js.
- **Plotter**: Real-time data visualization using Chart.js (compatible with Arduino Serial Plotter format).
- **Board Manager**: Search, install, upgrade, and remove Arduino board cores via arduino-cli.
- **Library Manager**: Search, install, upgrade, and remove Arduino libraries via arduino-cli.
- **Firmware Upload**: Client-side flashing for AVR boards (Uno R3). _Uno R4 support is planned._
- **REST API**: Backend API for arduino-cli integration and protocol testing.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Server runs on http://localhost:3001
# Vite dev server on http://localhost:3000 (proxies to 3001)
```

## REST API Endpoints

The bridge server provides REST endpoints for arduino-cli integration:

### Board Management

| Endpoint                   | Method | Description                                     |
| -------------------------- | ------ | ----------------------------------------------- |
| `/api/boards`              | GET    | List all installed Arduino boards               |
| `/api/board-details/:fqbn` | GET    | Get detailed board info (protocol, upload tool) |
| `/api/strategies`          | GET    | List available upload strategies                |

### Compilation & Upload

| Endpoint        | Method | Description                           |
| --------------- | ------ | ------------------------------------- |
| `/api/sketches` | GET    | List sketch directories in workspace  |
| `/api/compile`  | POST   | Compile a sketch for a board          |
| `/api/upload`   | POST   | Compile and upload to connected board |

### Server Control

| Endpoint       | Method | Description               |
| -------------- | ------ | ------------------------- |
| `/api/version` | GET    | Get server version info   |
| `/api/restart` | POST   | Restart the bridge server |

### Board Manager (CLI)

| Endpoint                      | Method | Description                       |
| ----------------------------- | ------ | --------------------------------- |
| `/api/cli/health`             | GET    | Check arduino-cli availability    |
| `/api/cli/cores/index/status` | GET    | Get board index freshness         |
| `/api/cli/cores/index/update` | POST   | Update board index                |
| `/api/cli/cores/search?q=`    | GET    | Search available board platforms  |
| `/api/cli/cores/installed`    | GET    | List installed platforms          |
| `/api/cli/cores/install`      | POST   | Install a board platform          |
| `/api/cli/cores/upgrade`      | POST   | Upgrade a board platform          |
| `/api/cli/cores/uninstall`    | POST   | Remove a board platform           |
| `/api/cli/cores/urls`         | GET    | Get additional board manager URLs |
| `/api/cli/cores/urls/add`     | POST   | Add additional board URL          |
| `/api/cli/cores/urls/remove`  | POST   | Remove additional board URL       |

### Library Manager (CLI)

| Endpoint                          | Method | Description                 |
| --------------------------------- | ------ | --------------------------- |
| `/api/cli/libraries/index/status` | GET    | Get library index freshness |
| `/api/cli/libraries/index/update` | POST   | Update library index        |
| `/api/cli/libraries/search?q=`    | GET    | Search available libraries  |
| `/api/cli/libraries/installed`    | GET    | List installed libraries    |
| `/api/cli/libraries/install`      | POST   | Install a library           |
| `/api/cli/libraries/upgrade`      | POST   | Upgrade a library           |
| `/api/cli/libraries/uninstall`    | POST   | Remove a library            |
| `/api/cli/libraries/install-git`  | POST   | Install from Git URL        |
| `/api/cli/libraries/install-zip`  | POST   | Install from local ZIP file |

### Example: Get Board Protocol

```bash
# Get protocol details for Arduino UNO R4 WiFi
curl "http://localhost:3001/api/board-details/arduino:renesas_uno:unor4wifi"

# Response:
{
  "fqbn": "arduino:renesas_uno:unor4wifi",
  "name": "Arduino UNO R4 WiFi",
  "uploadTool": "bossac",
  "protocolType": "bossa",
  "use1200bpsTouch": true
}
```

### Example: Compile a Sketch

```bash
curl -X POST http://localhost:3001/api/compile \
  -H "Content-Type: application/json" \
  -d '{"path": "demo_blink", "fqbn": "arduino:avr:uno"}'
```

## Firmware Uploading

To use the "Upload Hex" feature:

1.  Compile your Arduino sketch.
2.  Run the staging script to copy the hex file to the web server's public folder:
    ```bash
    node ../scripts/stage-firmware.js /path/to/your/sketch.ino.hex
    ```
3.  Click "Upload Hex" in the web interface.

## Architecture

```
arduino-bridge/
├── server.js              # Express server with REST API
├── src/
│   ├── server/            # Server-side modules
│   │   ├── cli-executor.js      # arduino-cli spawn wrapper
│   │   ├── core-manager.js      # Board/core operations
│   │   └── library-manager.js   # Library operations
│   └── client/
│       ├── providers/
│       │   └── WebSerialProvider.js  # WebSerial API wrapper
│       ├── services/
│       │   ├── SerialManager.js      # Connection management
│       │   └── STK500.js             # AVR flashing protocol
│       └── ui/
│           ├── BoardManagerUI.js     # Board Manager component
│           ├── LibraryManagerUI.js   # Library Manager component
│           └── ...                   # Other UI components
├── public/
│   └── boards.json        # Board definitions
└── tests/                 # Protocol test files
```

## Board Manager

The Board Manager allows you to install Arduino board cores directly from the web interface:

1. Click the **"Board Manager"** tab
2. Search for boards (e.g., "esp32", "arduino")
3. Click **Install** to add a platform
4. Use **"Additional URLs"** button to add third-party board sources

### Adding Third-Party Boards (ESP32, ESP8266, etc.)

1. Click **"🔗 Additional URLs"** in Board Manager
2. Add the board package URL (e.g., `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`)
3. Click **"🔄 Update Index"** to download new board definitions
4. Search and install the new boards

## Library Manager

The Library Manager allows you to install Arduino libraries:

1. Click the **"Library Manager"** tab
2. Search for libraries (e.g., "servo", "adafruit")
3. Click **Install** to add a library
4. Use **"📦 Install from URL/ZIP"** for libraries not in the index

### Installing from Git or ZIP

1. Click **"📦 Install from URL/ZIP"** in Library Manager
2. Enter a Git URL (e.g., `https://github.com/arduino-libraries/Servo.git`)
3. Or enter a path to a local ZIP file
4. Click **Install**

## Related Projects

- [Arduino Upload to WebSerial API Tool](../Arduino_Upload_to_WebSerialAPI_Tool/) - Strategy generation and testing
- [TempeHS Arduino DevContainer](https://github.com/TempeHS/TempeHS_Arduino_DevContainer) - Main development environment

## License

MIT License

---

**Author:** TempeHS Arduino Development Team  
**Last Updated:** December 2025
