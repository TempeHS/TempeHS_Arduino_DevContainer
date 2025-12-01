# Arduino Codespaces Bridge

This application bridges the gap between your local Arduino device (connected via USB) and the Codespaces environment.

## How it works

1.  **Web Client**: The web interface (running in your browser) uses the Web Serial API to connect to your local Arduino.
2.  **Socket.io**: Data is sent from the browser to the Node.js server running in Codespaces.
3.  **PTY**: The server writes data to a pseudo-terminal (PTY).
4.  **Symlink**: The PTY is symlinked to `/tmp/arduinoUSB`.
5.  **Arduino Tools**: Tools like `arduino-cli` or the Serial Monitor in VS Code can connect to `/tmp/arduinoUSB` as if it were a real serial port.

## Usage

1.  Open the "Ports" tab in VS Code and click the globe icon next to port 3000 to open the web interface.
2.  Click "Connect to Arduino".
3.  Select your Arduino device from the list.
4.  The bridge is now active! You can upload code or monitor serial output from Codespaces.

## Baud Rate

The bridge defaults to **115200** baud. Ensure your Arduino sketch uses `Serial.begin(115200);`.
