#!/bin/bash

# Update package list
sudo apt-get update

# Install Arduino CLI
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sudo BINDIR=/usr/local/bin sh

# Initialize Arduino CLI config
arduino-cli config init

# Update the index of available platforms and libraries
arduino-cli core update-index

# Install cores for common boards used in this workspace
arduino-cli core install arduino:avr           # Uno / Mega / classic Nanos
arduino-cli core install arduino:renesas_uno   # Arduino Uno R4 family
arduino-cli core install arduino:mbed_rp2040   # Nano RP2040 Connect

# Install clang-format for code formatting
sudo apt-get install -y clang-format

# Install dependencies for the Arduino Bridge
if [ -d "arduino-bridge" ]; then
    echo "Installing Arduino Bridge dependencies..."
    cd arduino-bridge
    npm install

    echo "Starting Arduino Bridge server..."
    nohup npm start > /tmp/arduino-bridge.log 2>&1 &
    BRIDGE_PID=$!
    echo "Arduino Bridge running in background (PID: ${BRIDGE_PID}). Logs: /tmp/arduino-bridge.log"
    cd ..

    if [ -n "$BROWSER" ]; then
        echo "Opening Arduino Bridge UI in browser..."
        "$BROWSER" "http://127.0.0.1:3000" >/dev/null 2>&1 &
    else
        echo "BROWSER variable not set; open http://127.0.0.1:3000 manually via the Ports tab."
    fi
fi

echo "Arduino development environment setup complete!"
