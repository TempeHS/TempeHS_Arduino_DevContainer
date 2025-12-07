#!/bin/bash
# Generate c_cpp_properties.json for Arduino IntelliSense
# Usage: ./generate-intellisense.sh [board_fqbn]
# Example: ./generate-intellisense.sh arduino:avr:uno
#          ./generate-intellisense.sh arduino:renesas_uno:unor4wifi

BOARD_FQBN="${1:-arduino:avr:uno}"
ARDUINO15_PATH="$HOME/.arduino15"
VSCODE_PATH="/workspaces/TempeHS_Arduino_DevContainer/.vscode"
LIBRARIES_PATH="$HOME/Arduino/libraries"

echo "Generating IntelliSense configuration for board: $BOARD_FQBN"

# Parse the FQBN (handles both 3-part and 4-part FQBNs)
IFS=':' read -r VENDOR ARCH BOARD VARIANT_OPT <<< "$BOARD_FQBN"

# Find the latest installed version in a directory (handles version changes)
find_latest_version() {
  local base_path=$1
  if [ -d "$base_path" ]; then
    # Get the latest version directory (sorted, last one)
    ls -1 "$base_path" 2>/dev/null | sort -V | tail -1
  fi
}

# Find tool path dynamically (handles version changes)
find_tool_path() {
  local tool_name=$1
  local tool_base="$ARDUINO15_PATH/packages/arduino/tools/$tool_name"
  if [ -d "$tool_base" ]; then
    local version=$(find_latest_version "$tool_base")
    if [ -n "$version" ]; then
      echo "$tool_base/$version"
    fi
  fi
}

# Find hardware version dynamically
HW_PATH="$ARDUINO15_PATH/packages/arduino/hardware/$ARCH"
VERSION=$(find_latest_version "$HW_PATH")
if [ -z "$VERSION" ]; then
  echo "Error: Could not find installed version for architecture: $ARCH"
  exit 1
fi

CORE_PATH="$HW_PATH/$VERSION"
echo "Using core path: $CORE_PATH"

# Determine paths based on architecture
case "$ARCH" in
  avr)
    COMPILER_PATH=$(find_tool_path "avr-gcc")
    if [ -z "$COMPILER_PATH" ]; then
      echo "Warning: avr-gcc not found, using fallback"
      COMPILER_PATH="$ARDUINO15_PATH/packages/arduino/tools/avr-gcc/7.3.0-atmel3.6.1-arduino7"
    fi
    COMPILER_BIN="$COMPILER_PATH/bin/avr-g++"
    CPU_FREQ="16000000L"
    BOARD_DEFINE="ARDUINO_AVR_UNO"
    ARCH_DEFINE="ARDUINO_ARCH_AVR"
    INTELLISENSE_MODE="gcc-x64"
    CPP_STANDARD="c++11"
    VARIANT="standard"
    
    # AVR-specific includes - find GCC version dynamically
    GCC_VERSION=$(ls "$COMPILER_PATH/lib/gcc/avr/" 2>/dev/null | head -1)
    EXTRA_INCLUDES=(
      "$COMPILER_PATH/lib/gcc/avr/$GCC_VERSION/include"
      "$COMPILER_PATH/lib/gcc/avr/$GCC_VERSION/include-fixed"
      "$COMPILER_PATH/avr/include"
    )
    ;;
  renesas_uno)
    # Find the ARM compiler dynamically
    COMPILER_PATH=$(find_tool_path "arm-none-eabi-gcc")
    if [ -z "$COMPILER_PATH" ]; then
      echo "Warning: arm-none-eabi-gcc not found, using fallback"
      COMPILER_PATH="$ARDUINO15_PATH/packages/arduino/tools/arm-none-eabi-gcc/7-2017q4"
    fi
    COMPILER_BIN="$COMPILER_PATH/bin/arm-none-eabi-g++"
    CPU_FREQ="48000000L"
    
    # Map board name to variant folder (variant folder names differ from board names)
    if [[ "$BOARD" == "unor4wifi" ]]; then
      BOARD_DEFINE="ARDUINO_UNOR4_WIFI"
      VARIANT="UNOWIFIR4"  # Actual folder name
    elif [[ "$BOARD" == "nanor4" ]]; then
      BOARD_DEFINE="ARDUINO_NANO_RP2040_CONNECT"
      VARIANT="NANOR4"
    else
      BOARD_DEFINE="ARDUINO_UNOR4_MINIMA"
      VARIANT="MINIMA"
    fi
    
    ARCH_DEFINE="ARDUINO_ARCH_RENESAS_UNO"
    INTELLISENSE_MODE="gcc-arm"
    CPP_STANDARD="c++17"
    
    # ARM-specific includes - find GCC version dynamically
    GCC_VERSION=$(ls "$COMPILER_PATH/arm-none-eabi/include/c++/" 2>/dev/null | head -1)
    EXTRA_INCLUDES=(
      "$COMPILER_PATH/arm-none-eabi/include"
      "$COMPILER_PATH/arm-none-eabi/include/c++/$GCC_VERSION"
      "$CORE_PATH/variants/$VARIANT"
      "$CORE_PATH/variants/$VARIANT/includes/**"
    )
    ;;
  mbed_rp2040)
    COMPILER_PATH=$(find_tool_path "arm-none-eabi-gcc")
    if [ -z "$COMPILER_PATH" ]; then
      echo "Warning: arm-none-eabi-gcc not found, using fallback"
      COMPILER_PATH="$ARDUINO15_PATH/packages/arduino/tools/arm-none-eabi-gcc/7-2017q4"
    fi
    COMPILER_BIN="$COMPILER_PATH/bin/arm-none-eabi-g++"
    CPU_FREQ="133000000L"
    BOARD_DEFINE="ARDUINO_RASPBERRY_PI_PICO"
    ARCH_DEFINE="ARDUINO_ARCH_MBED_RP2040"
    INTELLISENSE_MODE="gcc-arm"
    CPP_STANDARD="c++14"
    VARIANT="RASPBERRY_PI_PICO"
    
    # ARM-specific includes - find GCC version dynamically
    GCC_VERSION=$(ls "$COMPILER_PATH/arm-none-eabi/include/c++/" 2>/dev/null | head -1)
    EXTRA_INCLUDES=(
      "$COMPILER_PATH/arm-none-eabi/include"
      "$COMPILER_PATH/arm-none-eabi/include/c++/$GCC_VERSION"
    )
    ;;
  *)
    echo "Unknown architecture: $ARCH - using defaults"
    COMPILER_BIN="/usr/bin/g++"
    CPU_FREQ="16000000L"
    BOARD_DEFINE="ARDUINO_BOARD"
    ARCH_DEFINE="ARDUINO_ARCH_UNKNOWN"
    INTELLISENSE_MODE="gcc-x64"
    CPP_STANDARD="c++11"
    VARIANT="standard"
    EXTRA_INCLUDES=()
    ;;
esac

# Find Arduino.h for forced include
ARDUINO_H="$CORE_PATH/cores/arduino/Arduino.h"
if [ ! -f "$ARDUINO_H" ]; then
  echo "Warning: Arduino.h not found at $ARDUINO_H"
  ARDUINO_H=""
fi

# Build include paths array
INCLUDE_PATHS=(
  "$CORE_PATH/cores/arduino"
  "$CORE_PATH/variants/$VARIANT"
  "$CORE_PATH/libraries/**"
  "$CORE_PATH/libraries/**/src"
)

# Add extra includes (handle glob patterns separately)
for inc in "${EXTRA_INCLUDES[@]}"; do
  # If it contains **, add it directly (it's a glob pattern)
  if [[ "$inc" == *"**"* ]]; then
    # Check if the base path exists (remove ** and anything after)
    base_path="${inc%%\*\**}"
    if [ -d "$base_path" ]; then
      INCLUDE_PATHS+=("$inc")
    fi
  elif [ -d "$inc" ] || [ -f "$inc" ]; then
    INCLUDE_PATHS+=("$inc")
  fi
done

# Add user libraries
if [ -d "$LIBRARIES_PATH" ]; then
  INCLUDE_PATHS+=("$LIBRARIES_PATH/**")
  INCLUDE_PATHS+=("$LIBRARIES_PATH/**/src")
fi

# Add workspace
INCLUDE_PATHS+=("\${workspaceFolder}/**")

# Generate include paths JSON array
INCLUDE_JSON=""
for inc in "${INCLUDE_PATHS[@]}"; do
  if [ -n "$INCLUDE_JSON" ]; then
    INCLUDE_JSON="$INCLUDE_JSON,"$'\n'
  fi
  INCLUDE_JSON="$INCLUDE_JSON                \"$inc\""
done

# Generate forced includes
FORCED_INCLUDE_JSON=""
if [ -n "$ARDUINO_H" ]; then
  FORCED_INCLUDE_JSON="\"$ARDUINO_H\""
fi

# Generate the JSON
cat > "$VSCODE_PATH/c_cpp_properties.json" << EOF
{
    "version": 4,
    "configurations": [
        {
            "name": "Arduino",
            "compilerPath": "$COMPILER_BIN",
            "compilerArgs": [
                "-w",
                "-std=gnu++11",
                "-fpermissive",
                "-fno-exceptions",
                "-ffunction-sections",
                "-fdata-sections",
                "-fno-threadsafe-statics"
            ],
            "intelliSenseMode": "$INTELLISENSE_MODE",
            "includePath": [
$INCLUDE_JSON
            ],
            "forcedInclude": [
                $FORCED_INCLUDE_JSON
            ],
            "cStandard": "c11",
            "cppStandard": "$CPP_STANDARD",
            "defines": [
                "F_CPU=$CPU_FREQ",
                "ARDUINO=10607",
                "$BOARD_DEFINE",
                "$ARCH_DEFINE",
                "USBCON",
                "__cplusplus=201103L"
            ]
        }
    ]
}
EOF

echo "Generated $VSCODE_PATH/c_cpp_properties.json"
echo "Board: $BOARD_FQBN"
echo "Core: $CORE_PATH"
echo "Variant: $VARIANT"
echo "IntelliSense mode: $INTELLISENSE_MODE"
