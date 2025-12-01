# Arduino Bridge (Web Serial Edition)

This is a browser-based Serial Terminal and Plotter for Arduino, built with **Web Serial API**, **Vite**, and **xterm.js**.

## Features

- **Web Serial**: Connect directly to Arduino boards from Chrome/Edge without backend drivers.
- **Terminal**: Professional terminal emulation using xterm.js.
- **Plotter**: Real-time data visualization using Chart.js (compatible with Arduino Serial Plotter format).
- **Firmware Upload**: Client-side flashing for AVR boards (Uno R3). *Uno R4 support is planned.*

## Development

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start Dev Server**:
    ```bash
    npm run dev
    ```
    Open the URL shown in the terminal.

## Firmware Uploading

To use the "Upload Hex" feature:

1.  Compile your Arduino sketch.
2.  Run the staging script to copy the hex file to the web server's public folder:
    ```bash
    node ../scripts/stage-firmware.js /path/to/your/sketch.ino.hex
    ```
3.  Click "Upload Hex" in the web interface.

## Architecture

- **`src/client/providers/WebSerialProvider.js`**: Wraps `navigator.serial`.
- **`src/client/services/SerialManager.js`**: Manages connection and line buffering.
- **`src/client/ui/`**: UI components (Terminal, Plotter).
- **`src/client/services/STK500.js`**: AVR flashing protocol implementation.
