# BOSSA Handshake Findings

## Problem Summary

- We can reliably put the UNO R4 WiFi into bootloader mode (LED flashing)
- The bootloader stays active and doesn't timeout
- **SOLVED**: The correct baud rate is **230400**, not 115200 or 921200!

---

## 🚨 CRITICAL BUG FIX (Latest - Version 1.0.5)

### The Problem

Upload completed successfully (62900 bytes written, no errors) but:

- LED never blinks after upload
- Firmware doesn't persist to flash
- Rebooting runs old firmware

### Root Cause: BOSSA Y Command ACK Handling

Deep-diving into Arduino's BOSSA source (`arduino/BOSSA/src/Samba.cpp` lines 651-680), the Y command protocol requires **waiting for acknowledgment**:

```cpp
void Samba::writeBuffer(uint32_t src_addr, uint32_t dst_addr, uint32_t size)
{
    // Step 1: Set source address
    snprintf(cmd, "Y%08X,0#", src_addr);
    _port->write(cmd, l);
    _port->read(cmd, 3); // ← WAITS FOR "Y\n\r" ACK!

    // Step 2: Copy to flash
    snprintf(cmd, "Y%08X,%08X#", dst_addr, size);
    _port->write(cmd, l);
    _port->read(cmd, 3); // ← WAITS FOR "Y\n\r" ACK!
}
```

**Our bug**: We only had `await this.delay(2)` instead of reading the response!

The bootloader expects us to consume the "Y\n\r" acknowledgment before the next command. Without reading it:

1. ACK data sits in buffer
2. Next S command gets mixed with stale ACK
3. Command parsing fails
4. Flash write never actually happens

### Fix Applied (v1.0.5-y-ack-fix)

```javascript
// Step 1: Y[src],0# - set source
await this.writeCommand(`Y${srcHex},0#`);
await this.readUntilTerminator({ timeout: 100 }); // ← NOW READS ACK

// Step 2: Y[dst],[size]# - write to flash
await this.writeCommand(`Y${dstHex},${sizeHex}#`);
await this.readUntilTerminator({ timeout: 5000 }); // ← NOW WAITS FOR FLASH COMPLETE
```

### Key Insight: NullFlash Class

BOSSA uses `NullFlash` class for devices where the bootloader handles flash internally (like R4 WiFi). From `NullFlash.cpp`:

```cpp
void NullFlash::writeBuffer(uint32_t dst_addr, uint32_t size)
{
    if (_eraseAuto) erase(dst_addr, size);
    Flash::writeBuffer(dst_addr, size);  // ← Delegates to base class
}
```

The base `Flash::writeBuffer()` uses `Samba::writeBuffer()` which sends two Y commands. The R4 bootloader implements SAM-BA protocol internally and handles the actual Renesas flash operations.

---

## 🆕 Previous Fix: Flash Programming Protocol (Dec 2025)

### Earlier Problem

Writing to wrong SRAM addresses.

### Earlier Root Cause

The `Y` command has **two stages**:

```cpp
// From Samba.cpp
void Samba::writeBuffer(uint32_t src_addr, uint32_t dst_addr, uint32_t size)
{
    snprintf(cmd, "Y%08X,0#", src_addr);  // Step 1: Set source
    snprintf(cmd, "Y%08X,%08X#", dst_addr, size);  // Step 2: Copy to flash
}
```

### Correct Sequence

1. `S[sram_buffer],[size]#` + binary - Write to SRAM buffer at 0x20001000
2. `Y[sram_buffer],0#` - Set source address (+ wait for ACK!)
3. `Y[flash_addr],[size]#` - Copy from SRAM to flash (+ wait for ACK!)

## ✅ KEY DISCOVERY FROM WIRESHARK (Dec 3, 2025)

**Analyzed the actual Arduino IDE upload using Wireshark USB capture!**

See `docs/R4-USB-Protocol-Analysis.md` for detailed packet-by-packet analysis.

### Critical Finding: BOSSA Baud Rate is 230400

From `R4.pcapng`, the exact sequence is:

```
Frame 2589: SET LINE CODING = 1200 baud (bootloader touch)
Frame 2593: SET CONTROL LINE STATE = DTR=1, RTS=1
Frame 2595: SET LINE CODING = 1200 baud (again)
Frame 2601: SET CONTROL LINE STATE = DTR=0, RTS=1 (triggers reset!)
            ~500ms wait
Frame 2671: SET LINE CODING = 230400 baud (BOSSA connection!)
Frame 2675: SET CONTROL LINE STATE = DTR=1, RTS=1
Frame 2681: BULK OUT = "N#" (BOSSA Normal mode)
Frame 2683: BULK IN = "\n\r" (ACK)
Frame 2685: BULK OUT = "V#" (Get Version)
Frame 2687: BULK IN = "Arduino Bootloader (SAM-BA extended) 2.0 [Arduino:IKXYZ]"
```

**The baud rate payloads (little-endian):**

- 1200 baud: `b0 04 00 00` = 0x000004B0 = 1200
- 230400 baud: `00 84 03 00` = 0x00038400 = 230400

## Previous Key Discoveries (Retained for Context)

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
