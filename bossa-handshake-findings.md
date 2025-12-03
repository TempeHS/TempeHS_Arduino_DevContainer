# BOSSA Handshake Findings

## Problem Summary

- We can reliably put the UNO R4 WiFi into bootloader mode (LED flashing)
- The bootloader stays active and doesn't timeout
- **BUT**: Commands sent to the bootloader receive NO response

## Key Discoveries

### 🔬 CRITICAL FINDING (Dec 3, 2025)

**The USB device does NOT change identity when entering bootloader mode:**

```
Before bootloader:
USB\VID_2341&PID_1002&REV_0100&MI_01
USB\VID_2341&PID_1002&MI_01

After bootloader:
USB\VID_2341&PID_1002&REV_0100&MI_01
USB\VID_2341&PID_1002&MI_01
```

**PID stays 0x1002!** The port-switching hypothesis was WRONG.

### Architecture Implications

The R4 WiFi uses ESP32-S3 as a USB bridge:

1. ESP32-S3 handles USB interface continuously (never disconnects)
2. When RA4M1 enters bootloader mode, ESP32 internally routes serial to it
3. Same COM port, same PID, same USB identity throughout
4. Yet the bootloader doesn't respond...

### Serial Sniffer Results

Using a two-Arduino sniffer setup, we confirmed:

```
[42571ms] 80 80 80 23 4E 23   = Auto-baud sync (0x80 x3) + '#' + N#
[43273ms] 56 23               = V# (Get Version)
```

**Web Serial IS sending correct BOSSA commands!** The bytes arrive correctly.

### Manual Test Confirmation

Typing `V#` and `N#` in Arduino IDE Serial Monitor (while in bootloader mode with LED flashing) also gets **no response**. Same port, same issue.

### Baud Rate Analysis

From analyzing bossac binary:

- `bossac` connects at **921600 baud** (not 115200)
- Upload command: `bossac --port={port} -U -e -w file.bin -R`
- The `-U` flag forces USB port detection

### Bootloader Architecture

- UNO R4 WiFi bootloader source (`arduino-renesas-bootloader/src/bossa.c`) identifies as:
  `"Arduino Bootloader (SAM-BA extended) 2.0 [Arduino:IKXYZ]"`
- Physical UART uses **203400 baud**
- USB CDC should be baud-agnostic (virtual COM port)

---

## 🔑 ROOT CAUSE FOUND (Dec 3, 2025)

### ESP32-S3 Bridge Behavior Analysis

From analyzing `arduino/uno-r4-wifi-usb-bridge` source:

**1200 Baud Touch Handler** (`UNOR4USBBridge.ino` line 220-242):

```cpp
case ARDUINO_USB_CDC_LINE_CODING_EVENT:
  auto baud = data->line_coding.bit_rate;
  if (baud == 1200) {
    digitalWrite(GPIO_BOOT, HIGH);  // BOOT pin HIGH
    digitalWrite(GPIO_RST, LOW/HIGH/LOW/HIGH);  // Reset sequence
    // -> RA4M1 enters bootloader with BOOT held high
  }
```

**Serial Forwarding** (`loop()` line 188-218):

```cpp
// USB Serial → Internal Serial (to RA4M1)
SERIAL_USER.readBytes(buf, i);
SERIAL_USER_INTERNAL.write(buf, i);
```

**INTERNAL Serial Configuration** (line 157):

```cpp
SERIAL_USER_INTERNAL.begin(115200, SERIAL_8N1, 44, 43);
```

### The Problem

The ESP32-S3 bridge relies on USB CDC `LINE_CODING` events to:

1. Detect 1200 baud → trigger bootloader mode
2. Update internal serial baud rate for subsequent communication

**Web Serial API may not send LINE_CODING properly**, causing:

- Bootloader mode triggers (1200 baud touch works)
- But internal serial stays at default baud rate
- Data forwarded at wrong speed = no response from bootloader

### Why Arduino IDE Works

Arduino IDE/CLI uses **native serial libraries** that:

1. Send proper USB CDC control transfers (SET_LINE_CODING)
2. The ESP32 bridge receives the baud change event
3. Internal UART baud rate gets updated
4. Communication with bootloader works

---

## ✅ SOLUTION APPROACH

### Server-Side Upload Won't Work in Codespaces

The server runs in a container with **no USB access**. The Arduino is connected to the **user's browser machine** via Web Serial. Server-side `bossac` cannot access the device.

### Client-Side Fix Required

We need to make Web Serial properly trigger the ESP32 bridge's LINE_CODING event handling.

**What we know works:**

- ✅ 1200 baud touch triggers bootloader mode (LED flashes)
- ✅ Bytes are sent correctly (sniffer confirmed)
- ✅ PID stays 0x1002 (no port switch needed)

**What's broken:**

- ❌ ESP32 bridge not updating internal UART baud rate
- ❌ Bootloader doesn't respond to BOSSA commands

---

## ✅ IMPLEMENTED FIX (Dec 3, 2025)

### Changes Made

**1. `UploadManager.js`** - Reverted to pure client-side BOSSA:

```javascript
this.strategies = {
  "arduino:avr": new AVRStrategy(),
  "arduino:renesas_uno": new BOSSAStrategy(), // Back to client-side
  "arduino:samd": new BOSSAStrategy(), // Back to client-side
  // ...
};
```

**2. `BOSSAStrategy.js`** - Enhanced with aggressive LINE_CODING strategies:

- **Phase 0**: Aggressive baud cycling (115200 → 921600 → 115200)
- **Phase 1**: Force LINE_CODING with close/reopen at each baud
- **Phase 2**: Multiple open/close cycles with extended delays
- **Phase 3**: Full brute-force with signal variations
- **Phase 4**: Blind proceed mode

Key new methods:

- `forceLineCodingBaudChange()` - Close port, wait, reopen at new baud
- `aggressiveBaudCycle()` - Rapid cycling to wake up bridge
- `sendAutoBaudPreamble()` - Extended 0x80 sync bytes
- `toggleSignals()` - DTR/RTS sequence to reset bridge state

**3. `main.js`** - Removed server upload path:

All boards now use client-side Web Serial upload.

### Strategies Implemented

#### Strategy 1: Force LINE_CODING via Port Cycling ✅

Close and reopen port at different baud rates to force CDC events:

```javascript
async forceLineCodingBaudChange(port, targetBaud) {
  await port.close();
  await delay(200);
  await port.open({ baudRate: targetBaud });
}
```

#### Strategy 2: Extended Auto-Baud Preamble ✅

Send longer sync sequence to let bootloader auto-detect:

```javascript
async sendAutoBaudPreamble(port, bossa, count = 50) {
  const preamble = new Uint8Array(count).fill(0x80);
  await writer.write(preamble);
  await writer.write([0x0D, 0x0A, 0x0D, 0x0A]); // CR LF
}
```

#### Strategy 3: Multiple Baud Rates ✅

Testing in this order:

- 115200 (standard SAM-BA)
- 921600 (bossac fast mode)
- 230400, 460800 (intermediate)
- 57600, 38400, 19200, 9600 (legacy)

#### Strategy 4: DTR/RTS Control Signals ✅

Toggle sequence to reset bridge internal state:

```javascript
async toggleSignals(port) {
  const sequences = [
    { dtr: true, rts: true },
    { dtr: false, rts: false },
    { dtr: true, rts: false },
    { dtr: false, rts: true },
    { dtr: true, rts: true },
  ];
  // ...
}
```

---

## Testing Required

The enhanced BOSSAStrategy needs testing with actual R4 WiFi hardware.

**Test sequence:**

1. Open browser to arduino-bridge
2. Connect to R4 WiFi
3. Select demo_blink sketch
4. Click "Compile & Upload"
5. Watch console for detailed phase logs
6. Report which phase/config succeeded (if any)

**Expected console output:**

```
[BOSSA] Phase 0: Aggressive baud cycling...
[BOSSA] Phase 1: Force LINE_CODING with close/reopen...
[BOSSA] SUCCESS at Phase 1! Baud: 115200
```

---

## Future Improvements

1. **Web USB API** - May provide better control than Web Serial for CDC devices
2. **Upstream fix** - Report to Arduino that Web Serial doesn't trigger LINE_CODING events properly

---

_Last updated: December 3, 2025_
