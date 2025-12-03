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

# Install Python dependencies for ESP32 toolchain (esptool)
sudo apt-get install -y python3-pip python3-serial

# Install dependencies for the Arduino Bridge
if [ -d "arduino-bridge" ]; then
    echo "Installing Arduino Bridge dependencies..."
    cd arduino-bridge
    npm install
    cd ..
fi

# Patch the Arduino extension (if installed) - this needs to run before extension loads
# The patch fixes URL construction for Codespaces port forwarding
echo "Attempting to patch Arduino extension for Codespaces compatibility..."
python3 scripts/patch-provider.py || echo "Patch skipped (extension not yet installed)"

echo "Arduino development environment setup complete!"
