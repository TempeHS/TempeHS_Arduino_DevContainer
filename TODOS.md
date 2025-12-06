# Arduino Bridge – Final TODOs

## TODO 4: Rock-Solid Reliability & Auto-Recovery

**Goal:** Handle all exceptions, auto-restart on failure, ensure high availability.

### Implementation Plan

#### 4.1 Client-Side Resilience (`main.js`, providers, services)

1. **Global error boundary**:
   - `window.onerror` and `window.onunhandledrejection` handlers.
   - Log to terminal, attempt graceful recovery (disconnect port, reset state).
2. **Try/catch every async boundary**:
   - Audit all `await` calls; wrap in try/catch with logging + user feedback.
3. **Port health monitoring**:
   - Detect `disconnect` event from `WebSerialProvider`.
   - Auto-attempt reconnect after 2s delay; notify user if fails.
4. **Timeout guards**:
   - Add timeouts to all serial read/write operations.
   - Abort and surface error rather than hang indefinitely.

#### 4.2 Server-Side Resilience (`server.js`)

1. **Process-level exception handlers**:
   - `process.on('uncaughtException')` / `process.on('unhandledRejection')`.
   - Log error, attempt cleanup, keep server running.
2. **Child process management**:
   - Wrap `arduino-cli` spawns in timeout; kill if exceeds 120s.
   - Catch ENOENT/EPERM and return meaningful error to client.
3. **Port cleanup on crash**:
   - Track open serial ports; on exception, iterate and close.
4. **Health endpoint** (`GET /api/health`):
   - Returns `{ ok: true, uptime: ... }`.
   - Client polls every 30s; if unreachable, show "Bridge offline" banner.

#### 4.3 Supervisor / Auto-Restart (`.devcontainer/start-bridge.sh`)

1. **Wrap server in restart loop**:
   ```bash
   while true; do
     cd /workspaces/TempeHS_Arduino_DevContainer/arduino-bridge
     npm start
     echo "[Bridge] Crashed – restarting in 3s..."
     sleep 3
   done
   ```
2. **Kill zombie ports on restart**:
   - Before `npm start`, run `fuser -k` on common serial device paths.
3. **Log crashes** to `/tmp/arduino-bridge-crash.log` for debugging.

#### 4.4 Graceful Degradation

1. If upload fails mid-flight, surface clear error and suggest manual board reset.
2. If compile fails, keep terminal paused with full error output.
3. If baud detection fails, silently revert; never crash.

### Files to Modify

- `arduino-bridge/src/client/main.js` – global handlers, reconnect logic.
- `arduino-bridge/src/client/providers/WebSerialProvider.js` – timeout guards, disconnect detection.
- `arduino-bridge/server.js` – process handlers, child timeout, health endpoint.
- `.devcontainer/start-bridge.sh` – restart loop, port cleanup.

---

## Acceptance Criteria

- [ ] No unhandled exceptions crash client or server; auto-restart on failure
- [ ] Bridge stays available through intentional abuse (rapid connect/disconnect, bad sketches, wrong board)
