#!/bin/bash
# =============================================================================
# Arduino Bridge Startup Script
# 
# Starts the bridge as a background daemon that survives terminal closure.
# Called by postStartCommand and postAttachCommand in devcontainer.json
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BRIDGE_DIR="${ROOT_DIR}/arduino-bridge"
LOG_FILE="/tmp/arduino-bridge.log"
PID_FILE="/tmp/arduino-bridge.pid"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /tmp/arduino-bridge-start.log
}

# Check if bridge is already running
if [[ -f "${PID_FILE}" ]]; then
    PID=$(cat "${PID_FILE}")
    if kill -0 "${PID}" 2>/dev/null; then
        # Verify it's actually our process
        if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
            log "Bridge already running (PID ${PID})"
            exit 0
        fi
    fi
    rm -f "${PID_FILE}"
fi

# Check if ports are responding (bridge running without PID file)
if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
    log "Bridge already running (detected via health check)"
    exit 0
fi

log "Starting Arduino Bridge..."

# Kill any zombie processes on our ports
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
sleep 1

# Ensure we're in the bridge directory
cd "${BRIDGE_DIR}" || exit 1

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
    log "Installing npm dependencies..."
    npm install
fi

# Start bridge as background daemon using nohup
# This survives terminal closure and Codespace hibernation wake
nohup npm start > "${LOG_FILE}" 2>&1 &
BRIDGE_PID=$!
echo "${BRIDGE_PID}" > "${PID_FILE}"

log "Bridge started (PID ${BRIDGE_PID}). Logs: ${LOG_FILE}"

# Wait for server to be ready
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
        log "Bridge is healthy and ready!"
        
        # Try to open browser
        if command -v "$BROWSER" &>/dev/null; then
            "$BROWSER" "http://127.0.0.1:3000" &
            log "Opened browser to Arduino Bridge UI"
        else
            log "Open http://127.0.0.1:3000 in your browser (Ports tab)"
        fi
        exit 0
    fi
    sleep 1
done

log "WARNING: Bridge started but health check not responding after 30s"
exit 0
