# Codespaces to Local Upload Flow Plan

## Goals

- Browse only valid sketch folders in the workspace (skip `docs/`, `.git`, `.vscode`, `arduino-bridge/`, `scripts/`, hidden directories, etc.).
- Compile the selected sketch in Codespaces via `arduino-cli compile --fqbn <board> <folder>`.
- Host the resulting artifact (`.hex`/`.bin`) for download.
- Let the browser download that artifact and upload it to the locally connected board via Web Serial/WebUSB.

## Server Changes (arduino-bridge)

1. **Directory Listing Endpoint**

   - Route: `GET /sketches`.
   - Logic: walk workspace root, ignore filtered folders, include directories containing at least one `.ino`.
   - Response: array of `{ name, relativePath }`.

2. **Compile Endpoint**

   - Route: `POST /compile` with `{ path, fqbn }`.
   - Run `arduino-cli compile --fqbn <fqbn> --output-dir build/<slug>`.
   - Capture stdout/stderr; on success return artifact metadata (filename, size, URL).

3. **Artifact Hosting**
   - Serve `build/<slug>/<sketch>.hex` via static middleware or dedicated `GET /artifacts/:id` route.

## Browser (public/client.js + new UI)

1. Fetch `/sketches` on load, render dropdown/list.
2. On “Compile” click:
   - POST `/compile` with chosen folder and board.
   - Show build log streaming or final status.
3. On success, show “Upload” button:
   - Fetch artifact (e.g., `fetch('/artifacts/abc.hex')` → `ArrayBuffer`).
   - Use Web Serial to connect (existing connect flow) and stream the binary per WebUSB demo (handle DTR, chunk writes, verify response).
4. Keep Serial Monitor tab using existing socket bridge if desired.

## Open Questions

- Board selection UX (default to Uno R4 WiFi, allow override?).
- Where to store compile logs for later download.
- Whether to clean up old build artifacts automatically.
