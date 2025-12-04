# Arduino Bridge Development Instructions

## Table of Contents

1. [Application Overview](#application-overview)
2. [Port Configuration](#port-configuration)
3. [Version Management](#version-management)
4. [Starting the Application](#starting-the-application)
5. [BOSSA Protocol Reverse Engineering Guide](#bossa-protocol-reverse-engineering-guide)
6. [Board-Specific Implementation Notes](#board-specific-implementation-notes)

---

## Application Overview

The Arduino Bridge is a Web Serial-based firmware upload tool that runs in the browser. It allows uploading Arduino sketches to boards connected to the user's computer via USB, even when the development environment runs in GitHub Codespaces.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Codespaces                          │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │  Vite Dev       │    │  Express Server (API)               │ │
│  │  (Port 3000)    │    │  (Port 3001)                        │ │
│  │  - Frontend UI  │    │  - /api/compile                     │ │
│  │  - Client JS    │    │  - /api/boards                      │ │
│  └────────┬────────┘    │  - /api/sketches                    │ │
│           │             └─────────────────────────────────────┘ │
└───────────┼─────────────────────────────────────────────────────┘
            │ Web Serial API
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   User's Browser                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Web Serial Provider                                        ││
│  │  - Direct USB communication                                 ││
│  │  - Firmware upload via BOSSA/STK500/ESPTool protocols       ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
            │ USB
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Arduino Board                                 │
│  - Arduino Uno R4 WiFi (BOSSA protocol)                        │
│  - Arduino Uno R3 (STK500 protocol)                            │
│  - ESP32 boards (ESPTool protocol)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Port Configuration

### Fixed Ports

The Arduino Bridge **ALWAYS** runs on these ports:

| Port     | Service            | Purpose                                       |
| -------- | ------------------ | --------------------------------------------- |
| **3000** | Vite Dev Server    | Frontend UI, static assets, hot reload        |
| **3001** | Express API Server | Compilation, board listing, sketch management |

### Handling Port Conflicts

**CRITICAL**: Before starting the application, always kill any existing processes on ports 3000-3003:

```bash
# Kill existing processes on required ports
pkill -9 -f "node\|vite" 2>/dev/null
lsof -ti:3000,3001,3002,3003 | xargs -r kill -9 2>/dev/null
sleep 1

# Then start the application
cd /workspaces/TempeHS_Arduino_DevContainer/arduino-bridge && npm start
```

### One-liner to restart cleanly:

```bash
pkill -9 -f "node\|vite" 2>/dev/null; lsof -ti:3000,3001,3002,3003 | xargs -r kill -9 2>/dev/null; sleep 1; cd /workspaces/TempeHS_Arduino_DevContainer/arduino-bridge && npm start
```

---

## Version Management

### Version Tracking

Both client and server have version strings that **MUST** match. These are used to:

1. Detect cache issues (browser serving old JavaScript)
2. Track changes during development
3. Debug protocol issues

### Version Locations

| File                 | Variable         | Purpose             |
| -------------------- | ---------------- | ------------------- |
| `server.js`          | `SERVER_VERSION` | Server-side version |
| `src/client/main.js` | `CLIENT_VERSION` | Client-side version |

### Version Format

Use semantic versioning with descriptive suffix:

```
MAJOR.MINOR.PATCH-description
```

Examples:

- `1.0.5-y-ack-fix` - Fixed Y command acknowledgment
- `1.0.6-wireshark-addr-fix` - Fixed addresses from Wireshark analysis
- `1.0.7-add-W-commands` - Added W commands before erase

### Version Update Protocol

**EVERY code change that affects upload behavior MUST increment the version:**

1. Edit `server.js`:

   ```javascript
   const SERVER_VERSION = "1.0.X-description";
   ```

2. Edit `src/client/main.js`:

   ```javascript
   const CLIENT_VERSION = "1.0.X-description";
   ```

3. **Both versions MUST match exactly**

4. The client checks version match on load:
   ```
   ✅ Client and Server versions match
   ⚠️ VERSION MISMATCH! Client: X, Server: Y
   ```

---

## Starting the Application

### Standard Start

```bash
cd /workspaces/TempeHS_Arduino_DevContainer/arduino-bridge
npm start
```

This runs both:

- `npm run server` - Express API on port 3001
- `npm run dev` - Vite dev server on port 3000

### Clean Restart (Recommended)

```bash
pkill -9 -f "node\|vite" 2>/dev/null; lsof -ti:3000,3001,3002,3003 | xargs -r kill -9 2>/dev/null; sleep 1; cd /workspaces/TempeHS_Arduino_DevContainer/arduino-bridge && npm start
```

### Production Build

```bash
cd /workspaces/TempeHS_Arduino_DevContainer/arduino-bridge
npm run build
```

Output goes to `dist/` folder.

---

## BOSSA Protocol Reverse Engineering Guide

This section documents the methodology used to implement BOSSA firmware upload for the Arduino Uno R4 WiFi. **Use this guide when adding support for new boards.**

### Overview of Approach

When implementing a new upload protocol:

1. **Study the official tool source code** (BOSSA, avrdude, esptool)
2. **Capture USB traffic** using Wireshark during Arduino IDE upload
3. **Decode the protocol** by analyzing captured packets
4. **Implement and test** incrementally
5. **Document findings** for future reference

### Step 1: Find Official Tool Source Code

#### For BOSSA (SAMD/Renesas boards):

**GitHub Repository**: https://github.com/shumatech/BOSSA

Key source files:

- `src/Samba.cpp` - SAM-BA protocol implementation
- `src/Flash.cpp` - Flash base class
- `src/NullFlash.cpp` - For devices where bootloader handles flash internally
- `src/Flasher.cpp` - High-level flash operations

#### Useful GitHub Search Queries:

```
# Find writeBuffer implementation
repo:shumatech/BOSSA writeBuffer

# Find protocol command handling
repo:shumatech/BOSSA "Y%08X"

# Find timeout constants
repo:shumatech/BOSSA TIMEOUT_LONG
```

### Step 2: Capture USB Traffic with Wireshark

#### Setup on Windows:

1. Install Wireshark with USBPcap
2. Open Wireshark, select USBPcap interface
3. Start capture
4. Perform upload from Arduino IDE
5. Stop capture and save as `.pcapng`

#### Key Wireshark Filters:

```
# Filter USB bulk transfers (data packets)
usb.transfer_type == 0x03

# Filter by device address (adjust number)
usb.device_address == 2

# Filter CDC data (serial communication)
usb.endpoint_address.direction == OUT
```

#### Analyzing Captured Packets:

1. Look for "Leftover Capture Data" field - contains actual serial data
2. Data is in hex format - decode to ASCII
3. Identify command patterns:
   - `4e23` = "N#" (Normal mode)
   - `5623` = "V#" (Version)
   - `5823` = "X#" (Erase)
   - `5323` = "S#" (Write to SRAM)
   - `5923` = "Y#" (Copy SRAM to Flash)
   - `4723` = "G#" (Go/Execute)
   - `5723` = "W#" (Write word)

#### Decoding Hex to ASCII:

```python
# Python script to decode Wireshark hex data
hex_data = "5330303030303033342c3030303031303030"
decoded = bytes.fromhex(hex_data).decode('latin-1')
print(decoded)  # S00000034,00001000#
```

### Step 3: Decode the Protocol

#### SAM-BA Extended Protocol Commands:

| Command | Format                     | Description                 |
| ------- | -------------------------- | --------------------------- |
| N#      | `N#`                       | Set normal (binary) mode    |
| V#      | `V#`                       | Get version string          |
| I#      | `I#`                       | Get device info             |
| X#      | `X{addr}#`                 | Erase flash from address    |
| S#      | `S{addr},{size}#` + binary | Write binary data to SRAM   |
| Y#      | `Y{addr},{size}#`          | Copy from SRAM to Flash     |
| W#      | `W{addr},{value}#`         | Write 32-bit word to memory |
| G#      | `G{addr}#`                 | Jump to address (execute)   |

#### Address Format:

All addresses are **8-digit hex**, zero-padded:

- `00000034` = 0x34
- `00004000` = 0x4000
- `00001000` = 0x1000 (4096 bytes)

### Step 4: Key Discoveries from R4 WiFi Analysis

#### Critical Addresses (from Wireshark):

| Parameter   | Expected   | Actual (Wireshark) | Notes                                |
| ----------- | ---------- | ------------------ | ------------------------------------ |
| SRAM Buffer | 0x20001000 | **0x34**           | Bootloader uses low SRAM address     |
| Flash Start | 0x4000     | **0x0000**         | Bootloader handles offset internally |
| Go Address  | 0x4000     | 0x4000             | User code entry point                |
| Chunk Size  | 4096       | 4096 (0x1000)      | Standard chunk size                  |

#### Protocol Sequence (from Wireshark):

```
1. N#                           → Set binary mode
2. (wait for \n\r)              → ACK
3. V#                           → Get version
4. (receive version string)     → "Arduino Bootloader (SAM-BA extended) 2.0 [Arduino:IKXYZ]"
5. W00000030,00004000#          → Configure flash (optional)
6. W00000020,00000000#          → Init flash controller (optional)
7. X00000000#                   → Erase flash
8. (wait for X\n\r)             → ACK

For each 4096-byte chunk:
9.  S00000034,00001000#         → Write to SRAM at 0x34
10. (send 4096 bytes binary)    → Firmware data
11. Y00000034,0#                → Set source address
12. (wait for Y\n\r)            → ACK
13. Y{flash_addr},00001000#     → Copy to flash
14. (wait for Y\n\r)            → ACK

After all chunks:
15. G00004000#                  → Jump to user code
```

#### Baud Rate:

- **230400** - Confirmed from Wireshark USB capture
- The 1200 baud touch triggers bootloader entry

### Step 5: Implementation Notes

#### Y Command Behavior:

The Y command has TWO forms:

1. `Y{src_addr},0#` - Set source address (size=0)
2. `Y{dst_addr},{size}#` - Execute copy to flash

**Important**: BOSSA source shows it waits for "Y\n\r" ACK after each Y command, but in practice the R4 bootloader may not always send ACK. The upload can succeed even without ACK.

#### Timeout Values (from BOSSA source):

```cpp
#define TIMEOUT_NORMAL 100    // 100ms for most commands
#define TIMEOUT_LONG   5000   // 5 seconds for erase/flash write
```

#### Error Recovery:

If Y commands timeout but data was sent, the upload may still succeed. Check by:

1. Sending G# (go) command
2. Observing if device reboots
3. Checking if firmware runs (LED blinks, serial output, etc.)

---

## Board-Specific Implementation Notes

### Arduino Uno R4 WiFi

| Property             | Value                   |
| -------------------- | ----------------------- |
| Protocol             | BOSSA (SAM-BA extended) |
| Bootloader Entry     | 1200 baud touch         |
| Upload Baud          | 230400                  |
| SRAM Buffer          | 0x34                    |
| Flash Start          | 0x0000                  |
| User Code Entry      | 0x4000                  |
| Chunk Size           | 4096 bytes              |
| VID:PID (normal)     | 2341:1002               |
| VID:PID (bootloader) | 2341:006D               |

#### Key Files:

- `src/client/services/strategies/BOSSAStrategy.js` - Upload strategy
- `src/client/services/protocols/Bossa.js` - Protocol implementation

### Arduino Uno R3 (AVR)

| Property         | Value     |
| ---------------- | --------- |
| Protocol         | STK500    |
| Bootloader Entry | DTR pulse |
| Upload Baud      | 115200    |
| VID:PID          | 2341:0043 |

#### Key Files:

- `src/client/services/strategies/AVRStrategy.js` - Upload strategy
- `src/client/services/protocols/STK500.js` - Protocol implementation

### ESP32 Boards

| Property         | Value             |
| ---------------- | ----------------- |
| Protocol         | ESPTool           |
| Bootloader Entry | GPIO0 low + reset |
| Upload Baud      | 921600 (or auto)  |

#### Key Files:

- `src/client/services/strategies/ESP32Strategy.js` - Upload strategy
- `src/client/services/protocols/ESPTool.js` - Protocol implementation

---

## Debugging Tips

### Console Logging

All protocol operations are logged with timestamps:

```
[Bossa 08:56:59.365] TX Command: N#
[Bossa 08:56:59.367] TX Raw (2): 4e 23
[Bossa 08:56:59.368] RX Chunk (2): 0a 0d
[Bossa 08:56:59.368] RX ASCII: <LF><CR>
```

### Common Issues

1. **Version Mismatch**: Clear browser cache or hard refresh (Ctrl+Shift+R)
2. **Port Conflict**: Run the kill command before starting
3. **No ACK**: May still work - check if firmware runs
4. **Wrong Baud**: Check Wireshark capture for actual baud rate
5. **Wrong Addresses**: Compare against Wireshark capture

### Testing Checklist

- [ ] Version strings match (client/server)
- [ ] Ports 3000/3001 are free
- [ ] Board detected (VID:PID logged)
- [ ] 1200 baud touch triggers bootloader
- [ ] N# command gets response
- [ ] V# returns version string
- [ ] X# erase completes with ACK
- [ ] S# writes data to SRAM
- [ ] Y# copies to flash (ACK optional)
- [ ] G# triggers reboot
- [ ] Firmware runs after upload

---

## References

- [BOSSA Source Code](https://github.com/shumatech/BOSSA)
- [SAM-BA Protocol Documentation](https://ww1.microchip.com/downloads/en/AppNotes/Atmel-11071-32-bit-Cortex-M4-Microcontroller-SAM4S_Datasheet.pdf)
- [Arduino Bootloader Source](https://github.com/arduino/ArduinoCore-renesas)
- [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)

---

**Last Updated**: 2025-12-04
**Version**: 1.0
**Maintainer**: TempeHS Arduino Development Team
