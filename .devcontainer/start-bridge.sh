#!/bin/bash
set -euo pipefail

exec > >(tee -a /tmp/arduino-bridge-start.log) 2>&1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BRIDGE_DIR="${ROOT_DIR}/arduino-bridge"
LOG_FILE="/tmp/arduino-bridge.log"
PID_FILE="/tmp/arduino-bridge.pid"

echo "[$(date)] Starting Arduino bridge bootstrap script..."

if [[ ! -d "${BRIDGE_DIR}" ]]; then
  echo "Arduino bridge directory not found at ${BRIDGE_DIR}; skipping start."
  exit 0
fi

if pgrep -f "node.*arduino-bridge/server.js" >/dev/null 2>&1; then
  echo "Arduino Bridge already running; skipping start."
  exit 0
fi

cd "${BRIDGE_DIR}"

if [[ -f package.json ]]; then
  echo "Ensuring Arduino bridge npm dependencies are installed..."
  npm install --silent || npm install
fi

nohup npm start >"${LOG_FILE}" 2>&1 &
BRIDGE_PID=$!

echo "${BRIDGE_PID}" >"${PID_FILE}"
echo "Arduino Bridge started (PID ${BRIDGE_PID}). Logs: ${LOG_FILE}"

if [[ -n "${BROWSER:-}" ]]; then
  echo "Attempting to open Arduino bridge UI via BROWSER helper..."
  "${BROWSER}" "http://127.0.0.1:3000" >/dev/null 2>&1 || true
else
  echo "BROWSER helper not available. Open http://127.0.0.1:3000 manually (Ports tab)."
fi
