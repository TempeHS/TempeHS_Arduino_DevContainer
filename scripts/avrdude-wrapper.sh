#!/bin/bash

# Wrapper script to intercept avrdude calls
# This script mimics avrdude arguments but redirects the upload to our Bridge Server

# Default to passing through to real avrdude if it's not an upload command
REAL_AVRDUDE="/usr/bin/avrdude" # Or wherever the real one is, if installed
IS_UPLOAD=false
HEX_FILE=""
PARTNO=""

# Parse arguments to find the hex file and part number
for arg in "$@"; do
    if [[ "$arg" == "-U" ]]; then
        IS_UPLOAD=true
    elif [[ "$IS_UPLOAD" == "true" && "$arg" == flash:w:*:i ]]; then
        # Extract filename from flash:w:FILENAME:i
        HEX_FILE="${arg#flash:w:}"
        HEX_FILE="${HEX_FILE%:i}"
    elif [[ "$arg" == -p* ]]; then
        PARTNO="${arg#-p}"
    fi
done

# If this is an upload for ATmega328P (Uno R3), intercept it!
if [[ "$IS_UPLOAD" == "true" && "$PARTNO" == "atmega328p" && -f "$HEX_FILE" ]]; then
    echo "[Bridge Wrapper] Intercepting Upload for Arduino Uno R3..."
    echo "[Bridge Wrapper] Hex File: $HEX_FILE"
    
    # Call our Node.js uploader script
    # We assume the workspace root is available or we use absolute paths
    WORKSPACE_ROOT="/workspaces/TempeHS_Arduino_DevContainer"
    node "$WORKSPACE_ROOT/scripts/remote-upload.js" "$HEX_FILE" "arduino:avr:uno"
    
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ]; then
        echo "[Bridge Wrapper] Upload completed successfully via Browser Bridge."
        exit 0
    else
        echo "[Bridge Wrapper] Upload failed."
        exit 1
    fi
fi

# Fallback: If we are here, it's either not an upload or not for R3.
# Since we don't have a real avrdude installed in this container (based on 'which' failing),
# we should probably error out or handle R4 differently.
# For now, let's print what we would have done.

echo "[Bridge Wrapper] Pass-through to real avrdude (Not installed or not R3 upload)."
echo "Args: $@"
exit 1
