# Arduino Bridge (Web Serial Edition)

A browser-based Serial Terminal, Plotter, and Firmware Upload tool for Arduino, built with **Web Serial API**, **Vite**, and **xterm.js**.

## Features

- **Web Serial**: Connect directly to Arduino boards from Chrome/Edge without backend drivers.
- **Terminal**: Professional terminal emulation using xterm.js.
- **Plotter**: Real-time data visualization using Chart.js (compatible with Arduino Serial Plotter format).
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
│   └── client/
│       ├── providers/
│       │   └── WebSerialProvider.js  # WebSerial API wrapper
│       ├── services/
│       │   ├── SerialManager.js      # Connection management
│       │   └── STK500.js             # AVR flashing protocol
│       └── ui/                       # UI components
├── public/
│   └── boards.json        # Board definitions
└── tests/                 # Protocol test files
```

## Related Projects

- [Arduino Upload to WebSerial API Tool](../Arduino_Upload_to_WebSerialAPI_Tool/) - Strategy generation and testing
- [TempeHS Arduino DevContainer](https://github.com/TempeHS/TempeHS_Arduino_DevContainer) - Main development environment

## License

MIT License

---

**Author:** TempeHS Arduino Development Team  
**Last Updated:** January 2025
