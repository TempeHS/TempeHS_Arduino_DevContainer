# Bridging Local Arduino Uploads in Codespaces

This note captures the two practical paths we investigated when trying to upload sketches to a locally connected Arduino while developing inside Codespaces.

## 1. Browser-Native Upload (WebUSB / Web Serial)

**Source references:**

- WICG Serial API spec: <https://wicg.github.io/serial/>
- WebUSB team demo repo: <https://github.com/webusb/arduino>

**Concept:**
Let Chrome (or another Chromium browser) talk directly to the Arduino over WebUSB or Web Serial and perform the firmware upload locally. Codespaces is only used for editing/building; the final flashing step stays on the user’s computer.

**Advantages:**

- Full modem control (DTR/RTS, `TIOCMGET`, etc.) is handled by the operating system and browser, so avrdude or the Arduino IDE can reset the board normally.
- No pseudo-terminal emulation is required in Codespaces; the workflow matches the official Arduino CLI/IDE behavior.
- Easy to explain to students: “Open the hosted sketch, click upload in the browser.”

**Limitations:**

- Requires Chrome/Edge/Opera with Web Serial/WebUSB enabled.
- Upload automation must be implemented in the web client (the `webusb/arduino` repo already provides reference code, but it lives outside Codespaces).
- Serial monitor output also stays in the browser, so VS Code’s built-in monitor won’t see `/tmp/arduinoUSB` traffic.

**When to choose it:**

- You want the most reliable uploads and can accept doing the flashing step outside Codespaces.
- Classroom setting where keeping instructions close to official Arduino docs matters.

## 2. Virtual Port via Codespaces (node-pty + PTY symlink or `socat`)

**Current implementation:**

- Node bridge (`arduino-bridge/server.js`) spawns `node-pty`, exposes the slave path via `/tmp/arduinoUSB`, and forwards browser Web Serial bytes over Socket.IO.

**Problem observed:**

- `node-pty` does not emulate modem-control ioctls (`TIOCMGET`, `TIOCMSET`), so avrdude can’t detect/reset the bootloader. Even with DTR pulses from the browser, the CLI still throws `ioctl("TIOCMGET"): Inappropriate ioctl for device` and fails.

**Potential enhancement:**

- Replace the raw PTY with a tool like `socat` that can create a pseudo-TTY pair with modem-signal support. Example command:
  ```sh
  socat -d -d PTY,link=/tmp/arduinoUSB,raw,echo=0 PTY,raw,echo=0
  ```
  The bridge would write to one end, while avrdude connects to `/tmp/arduinoUSB`. `socat` handles the ioctls so the CLI sees a “real” serial port.

**Advantages:**

- Keeps the entire workflow inside Codespaces (compile + upload from VS Code).
- Works with existing Arduino CLI tasks and serial monitor integrations once the modem control issue is solved.

**Limitations / Open work:**

- Needs additional tooling (installing and supervising `socat` or an equivalent multiplexer) inside the dev container.
- More moving pieces: the Node bridge, the PTY proxy, and the browser connection must all stay in sync.
- Still experimental—was not completed during the investigation.

**When to choose it:**

- You must upload directly from Codespaces and are willing to maintain the extra PTY emulation layer.

---

**Recommendation:**
Use the browser-native upload path for immediate reliability. If direct CLI uploads inside Codespaces remain a goal, plan a follow-up spike to prototype the `socat` (or similar) PTY proxy and verify that it satisfies avrdude’s modem control requirements.
