# Arduino Bridge Connection & Upload Debug Sequence

Use this document to track the exact point of failure. We will fix one step at a time.

## Phase 1: Server Initialization

**Goal:** Bridge server is running and PTY is linked.

1. [ ] **Command:** `cd arduino-bridge2 && npm start`
2. [ ] **Check:** Terminal output shows:
   - `Initializing Persistent PTY...`
   - `Created PTY at /dev/pts/X`
   - `Created symlink /tmp/arduinoUSB2 -> /dev/pts/X`
   - `Bridge server running on port 3500`
3. [ ] **Verify:** Run `ls -l /tmp/arduinoUSB2` in a new terminal. It must point to a valid PTY.

## Phase 2: Browser Connection

**Goal:** Web client loads and connects to the WebSocket.

1. [ ] **Action:** Open Browser to `http://localhost:3500` (or the forwarded address).
2. [ ] **Check:** Browser Console (F12) shows:
   - `[HH:mm:ss] Bridge connected to server.`
3. [ ] **Check:** Server Terminal shows:
   - `[HH:mm:ss] Browser client connected`

## Phase 3: Serial Connection (Physical)

**Goal:** Browser has access to the physical Arduino via Web Serial.

1. [ ] **Action:** Select "Arduino Uno R3" (or R4) in the dropdown.
2. [ ] **Action:** Click "Connect Arduino" and select the device.
3. [ ] **Check:** Browser Console shows:
   - `[HH:mm:ss] Serial port opened.`
4. [ ] **Check:** UI Status changes to "Connected" (Green).

## Phase 4: Upload Initiation (VS Code)

**Goal:** `avrdude` starts and talks to the PTY.

1. [ ] **Action:** Run Upload in VS Code.
2. [ ] **Check:** VS Code Output shows:
   - `Using Port : /tmp/arduinoUSB2`
   - `Using Programmer : arduino`
   - `Overriding Baud Rate : 115200`
3. [ ] **Check:** Server Terminal shows:
   - `[HH:mm:ss] First data byte detected. Triggering DTR pulse...`
   - `[HH:mm:ss] VS Code -> Browser ... (buffered)` (Data starts queuing)

## Phase 5: The Reset Handshake (CRITICAL)

**Goal:** The Browser resets the Arduino to catch the bootloader.

1. [ ] **Check:** Browser Console shows:
   - `[HH:mm:ss] Received RESET command from server.`
   - `[HH:mm:ss] Performing RESET for R3...`
   - `[R3] Closing port for DTR toggle...`
   - `[R3] Toggling DTR...`
   - `[R3] Re-opening for communication...`
   - `[R3] Reset complete. Listening for upload data...`
2. [ ] **Check:** Server Terminal shows:
   - `[HH:mm:ss] Client reset complete.`
   - `[HH:mm:ss] Flushing X chunks.` (The buffered data is sent to the browser)

## Phase 6: The Upload Stream

**Goal:** Data flows bidirectionally between `avrdude` and Arduino.

1. [ ] **Check:** Browser Console shows:
   - `[WS->Serial] X bytes: 30 20 ...` (Incoming data from Server)
   - `[Serial->WS] X bytes: ...` (Responses from Arduino)
2. [ ] **Check:** Server Terminal shows:
   - `VS Code -> Browser ...`
   - `Browser -> VS Code ...`
3. [ ] **Verify:** If you see `VS Code -> Browser` but **NO** `Browser -> VS Code`, the Arduino is not responding (Reset timing failed).

## Phase 7: Completion

**Goal:** Upload finishes successfully.

1. [ ] **Check:** VS Code Output shows:
   - `avrdude done. Thank you.`
2. [ ] **Check:** Arduino resets and runs the new sketch.

---

### Current Status Recording

_Copy and paste the last successful step here:_

**Last Success:** [Phase 5, Step 1] - Reset logic executes, but physical reset is inconsistent (Sketch continues running).
**Next Step:** [Phase 5] - Tune Reset Pulse Width (increased to 250ms).
