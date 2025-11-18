#!/bin/bash

# Update package list
sudo apt-get update

# Install Arduino CLI
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sudo BINDIR=/usr/local/bin sh

# Initialize Arduino CLI config
arduino-cli config init

# Update the index of available platforms and libraries
arduino-cli core update-index

# Install common Arduino cores (you can customize this)
# Uncomment the platforms you need:
# arduino-cli core install arduino:avr      # For Arduino Uno, Mega, etc.
# arduino-cli core install arduino:megaavr  # For Arduino Nano Every, etc.
# arduino-cli core install arduino:samd     # For Arduino Zero, MKR boards, etc.

# Install clang-format for code formatting
sudo apt-get install -y clang-format

echo "Arduino development environment setup complete!"
