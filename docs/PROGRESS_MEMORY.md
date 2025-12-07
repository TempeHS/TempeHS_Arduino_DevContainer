# Arduino Bridge Development Progress & Memory

**Date:** January 2025
**Status:** Active Development - BOSSA Upload v1.1.0 (Bootloader Source Analysis)

## 🎯 Project Goal

Enable flashing of Arduino hardware directly from a GitHub Codespace (or Dev Container) using the browser's Web Serial API, bypassing the need for local software installation.

## 🔥 Latest Critical Fix (January 2025)

### BOSSA Protocol - Bootloader Source Code Analysis

**Version:** 1.1.0-bootloader-source-fix

We discovered the official Arduino bootloader source code at `arduino/arduino-renesas-bootloader` and analyzed the exact protocol implementation in `src/bossa.c`. This is the AUTHORITATIVE reference for the R4 WiFi upload protocol.

**Key Discoveries from `bossa.c` (lines 244-280):**

1. **S Command (SRAM Write)**:

   - Format: `S{addr},{size}#` + binary data
   - The `addr` is an **OFFSET into an internal data_buffer[8192]**, NOT an absolute RAM address!
   - `S00000034,00001000#` writes 4096 bytes starting at `data_buffer[0x34]`

2. **Y Command (Flash Write) - TWO FORMS**:

   ```c
   // Form 1: Y{addr},0# (size=0) - Just sets copyOffset
   copyOffset = addr;
   R_SCI_UART_Write(&g_uart_ctrl, "Y\n\r", 3);  // ACK sent

   // Form 2: Y{addr},{size}# (size>0) - Execute flash write
   __disable_irq();  // CRITICAL: Interrupts disabled during write!
   R_FLASH_LP_Write(&data_buffer[copyOffset], SKETCH_FLASH_OFFSET + addr, size);
   __enable_irq();
   R_SCI_UART_Write(&g_uart_ctrl, "Y\n\r", 3);  // ACK sent AFTER write
   ```

3. **Flash Offset Added Internally**:

   - `SKETCH_FLASH_OFFSET = 0x4000` (16KB) for non-DFU boards
   - So `Y00000000,00001000#` writes to **physical flash 0x4000**
   - The G command uses absolute address: `G00004000#` jumps to user code

4. **ACKs Are Always Sent**:
   - Bootloader ALWAYS sends `"Y\n\r"` after Y commands
   - If we timeout waiting for ACK, it's likely USB CDC buffering issues

**Protocol Flow (Correct):**

```
S00000034,00001000# + [4096 bytes]   -> Write to data_buffer[0x34..0x1033]
Y00000034,0#                          -> Set copyOffset = 0x34, ACK "Y\n\r"
Y00000000,00001000#                   -> Write data_buffer to flash 0x4000, ACK "Y\n\r"
...repeat with Y00001000, Y00002000, etc...
G00004000#                            -> Jump to user code
```

### Previous Fix: 1200bps Touch Reset

**Problem:** Arduino Uno R4 WiFi was NOT entering bootloader mode after 1200bps touch.

**Root Cause:** Incorrect DTR/RTS signals. Official implementation only sets DTR=false, not RTS.

**The Fix:**

```javascript
await port.open({ baudRate: 1200 });
await port.setSignals({ dataTerminalReady: false }); // DTR=false only
await port.close(); // Close immediately triggers reset
await new Promise((r) => setTimeout(r, 500)); // Wait after close
```

## 🏗️ Architecture Overview

We now maintain three bridge implementations in the repo:

### 1. Bridge 1 (Web IDE)

- **Port:** 3000
- **Virtual Port:** `/tmp/arduinoUSB`
- **Function:** A self-contained Web UI that handles **Compilation** (server-side) and **Uploading** (browser-side).
- **Status:** ✅ **Functional**.
  - Successfully compiles sketches.
  - Successfully uploads to the user's Uno clone.
  - **Key Fix:** Implemented `node-pty` with `encoding: null` and byte-by-byte writing to solve STK500 protocol sync errors.

### 2. Bridge 2 (VS Code Extension Link)

- **Port:** 3500
- **Virtual Port:** `/tmp/arduinoUSB2`
- **Function:** A "dumb pipe" that connects the browser's serial port to a virtual PTY. This allows the **native VS Code Arduino Extension** to see the board as if it were local.
- **Status:** ⚠️ **Partially Functional / Flaky**.
  - **Connection:** Works. VS Code can see `/tmp/arduinoUSB2`.
  - **Uploads:** Inconsistent. Often fails with `stk500_getsync` errors (not in sync).
  - **Behavior:** "First upload works, second fails" or "Timeouts waiting for packet".

### 3. Bridge 3 (socat PTY Proxy)

- **Port:** 3600
- **Virtual Port:** `/tmp/arduinoUSB3`
- **Function:** Runs a long-lived `socat` process to create a true PTY pair, exposing one end as `/tmp/arduinoUSB3` for VS Code while the bridge talks to the peer PTY via the `serialport` library. Browser still handles the physical Arduino via Web Serial.
- **Status:** 🧪 **Prototype**.
  - Successfully launches `socat`, captures the remote PTY, and opens it with `serialport`.
  - Forwards binary data between VS Code and the browser with buffered writes and drains.
  - Triggers browser-side DTR pulses when STK500 sync bytes are detected (same heuristic as Bridge 2).
  - First VS Code upload attempt still fails with `ioctl("TIOCMGET")` warnings; the board keeps running the sketch (`resp=0x4c` → "L"), so the bootloader never resets. Need to confirm whether additional `socat` options or a different PTY proxy can satisfy avrdude’s modem control expectations.

## 🧩 Technical Challenges & Solutions

### The "Protocol Error" (Solved in Bridge 1)

`avrdude` uses the STK500 protocol, which is highly sensitive to timing and binary integrity.

- **Issue:** `node-pty` defaults to UTF-8, corrupting binary data.
- **Fix:** Spawn PTY with `encoding: null`.
- **Issue:** Writing large buffers to the PTY caused data loss or echo confusion.
- **Fix:** Throttled writing to the PTY (1 byte per 1ms).

### The "Auto-Reset" Problem (Current Blocker for Bridge 2)

When `avrdude` opens a serial port, it toggles DTR to reset the Arduino. This triggers the bootloader to accept a new program.

- **In Bridge 1:** The browser controls the whole process. It resets the board _before_ sending data. This is easy to coordinate.
- **In Bridge 2:** VS Code controls `avrdude`. We have to **sniff** the traffic to guess when to reset the board.
  - **Current Heuristic:** We look for the STK500 Sync byte (`0x30 0x20`) in the data stream from VS Code.
  - **Action:** When detected, the server sends a `pulse-dtr` event to the browser.
  - **Browser Action:** Toggles DTR (and RTS) to reset the physical board.
  - **Problem:** Network latency (VS Code -> Server -> Browser -> Board) means the reset might happen too late, or the board might not be ready when `avrdude` expects it.

## 📝 Current State of Files

### `arduino-bridge2/server.js`

- **Logic:**
  - Creates PTY and Symlink `/tmp/arduinoUSB2`.
  - Sniffs PTY data for `0x30 0x20` (Sync) and `0x11 0x20` (Exit).
  - Implements a debounce timer (2.5s) to prevent multiple resets during one upload attempt.
- **Pending:** Might need tuning for specific board timings.

### `arduino-bridge2/public/client.js`

- **Logic:**
  - Connects to Web Serial.
  - Asserts DTR/RTS on connection.
  - Listens for `pulse-dtr` from server and toggles DTR/RTS (100ms pulse).
  - Contains unused `perform1200bpsTouch` function (for Leonardo/Uno R4).

### New: `arduino-bridge3/`

- **server.js:**
  - Spawns `socat -d -d pty,raw,echo=0,link=/tmp/arduinoUSB3 ... pty,raw,echo=0` and parses STDERR to capture the dynamically generated peer PTY.
  - Opens the peer PTY using the `serialport` library and keeps DTR/RTS asserted.
  - Bridges bytes between VS Code and the browser; throttles writes with `drain()` to preserve ordering.
  - Emits `pulse-dtr` to the browser on STK500 sync detection (with 2.5s debounce).
- **public/index.html & client.js:**
  - Minimal UI (connect/disconnect + log view).
  - Web Serial client mirrors Bridge 2, including DTR/RTS pulse handling.
  - Logs reset activity to aid debugging.

## 🔮 Next Steps / To-Do

1.  **Hardware Comparison**:

    - Test Bridge 2 with an **Official Arduino Uno R3**. Clones often have different USB-Serial chips (CH340 vs ATmega16U2) which behave differently regarding DTR resets.
    - Test with **Arduino Uno R4 WiFi**. This board requires a "1200bps touch" reset, not a DTR pulse. We have code for this in `client.js` but it's not wired up.

2.  **Refine Auto-Reset**:

    - If the heuristic continues to be flaky, consider a **Manual Reset Mode**:
      - User clicks "Reset & Upload" in the browser.
      - Browser resets board.
      - User immediately triggers Upload in VS Code.

3.  **Bridge 3 Validation (socat PTY Proxy)**

- Experiment with additional `socat` options (`wait-slave`, `rawer`, `crnl`) or alternate PTY proxies (e.g., tty0tty, com0com) to resolve the `TIOCMGET` ioctl error.
- Add instrumentation around `serialport.get()` / `port.on('signal', ...)` to detect VS Code toggling DTR/RTS, and drive a coordinated browser reset.
- Test with both the existing Uno clone and an official Uno R3 to rule out hardware-specific behavior.
- Evaluate CPU/memory overhead of keeping `socat` running inside the dev container.

4.  **Alternative Architecture (Recommended): "Hybrid Upload"**
    - **Concept:** Decouple compilation from uploading.
    - **Workflow:**
      1.  VS Code compiles the sketch (generating `.hex`).
      2.  A VS Code Task (script) sends the `.hex` file to the Bridge Server (via HTTP POST).
      3.  The **Bridge Server** (not VS Code) runs `avrdude` locally in the container, targeting the PTY.
      4.  Since the Server controls the start of `avrdude`, it can trigger the DTR reset exactly when needed (just like Bridge 1).
    - **Benefit:** Eliminates the "sniffing" guesswork. We get the reliability of Bridge 1 with the IDE experience of VS Code.

## 🚀 How to Resume

1.  **Start the Bridges**:
    ```bash
    nohup node arduino-bridge/server.js > bridge1.log 2>&1 &
    nohup node arduino-bridge2/server.js > bridge2.log 2>&1 &
    nohup node arduino-bridge3/server.js > bridge3.log 2>&1 &
    ```
2.  **Check Logs**: `tail -f bridge2.log bridge3.log`
3.  **Open Port 3500** (Bridge 2) or Port 3600 (Bridge 3) in the Browser.
4.  **Connect Arduino**.
5.  **Upload from VS Code**.
