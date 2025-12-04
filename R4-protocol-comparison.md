# Arduino UNO R4 WiFi Protocol Comparison: Current Implementation vs USB Capture

> **Created**: December 2025  
> **Purpose**: Line-by-line code review comparing current Web Serial implementation to Arduino IDE USB capture  
> **Goal**: Identify differences to improve upload algorithm

---

## Executive Summary

This document compares the **current implementation** in `BOSSAStrategy.js` and `Bossa.js` against the **exact sequence** captured from Arduino IDE via Wireshark (`R4.pcapng`).

### Key Findings

| Area                | Current Implementation | USB Capture (Arduino IDE)          | Status      |
| ------------------- | ---------------------- | ---------------------------------- | ----------- |
| BOSSA Baud          | 230400 ✅              | 230400                             | **MATCH**   |
| 1200 Touch Sequence | Different pattern      | SET_LINE_CODING × 2, DTR toggle    | **DIFFERS** |
| V# Command          | Sent with N#           | V# sent separately, 219ms after N# | **DIFFERS** |
| I# Command          | Sent                   | I# sent (optional)                 | **MATCH**   |
| Flash Write Method  | S + two-stage Y        | S + Y (applet-based)               | **SIMILAR** |
| Timing              | Various delays         | Precise 500ms wait                 | **DIFFERS** |

---

## Order of Operations Comparison

### Summary Table

| Step | USB Capture (Arduino IDE)             | Current Implementation (BOSSAStrategy.js) |
| ---- | ------------------------------------- | ----------------------------------------- |
| 1    | SET_LINE_CODING = 1200                | `port.open({ baudRate: 1200 })`           |
| 2    | SET_CONTROL_LINE_STATE = DTR=1, RTS=1 | `setSignals({ dtr: true, rts: true })`    |
| 3    | SET_LINE_CODING = 1200 (again)        | _(not sent - single open)_                |
| 4    | SET_CONTROL_LINE_STATE = DTR=0, RTS=1 | `setSignals({ dtr: false, rts: true })`   |
| 5    | Wait ~500ms                           | Wait 600ms                                |
| 6    | SET_LINE_CODING = 230400              | `port.open({ baudRate: 230400 })`         |
| 7    | SET_CONTROL_LINE_STATE = DTR=1, RTS=1 | `setSignals({ dtr: true, rts: true })`    |
| 8    | SET_LINE_CODING = 230400 (again)      | _(not sent - single open)_                |
| 9    | Wait ~111ms                           | Wait 100ms                                |
| 10   | Send `N#`                             | Send `N#`                                 |
| 11   | Receive `\n\r` ACK                    | Read ACK (optional)                       |
| 12   | Wait ~219ms                           | Wait 50ms                                 |
| 13   | Send `V#`                             | Send `V#`                                 |
| 14   | Receive version string                | Read version                              |
| 15   | Wait ~24ms (I#)                       | Wait 50ms                                 |
| 16   | Send `I#` (optional)                  | Send `I#`                                 |
| 17   | Upload applet                         | _(no applet - direct X/Y)_                |
| 18   | Configure flash (W commands)          | _(no W commands)_                         |
| 19   | Execute applet (X#)                   | Erase flash (`X[offset]#`)                |
| 20   | Write chunks (S + Y)                  | Write pages (S + Y)                       |
| 21   | Send `G#` to start                    | Send `G[offset]#` to start                |

---

## Phase 1: 1200 Baud Touch (Bootloader Entry)

### USB Capture Sequence

```
Time     Frame   Operation                    Details
───────────────────────────────────────────────────────────────────
19.917s  2589    SET_LINE_CODING             baud=1200 (0x000004B0)
19.917s  2593    SET_CONTROL_LINE_STATE      wValue=0x0003 (DTR=1, RTS=1)
19.918s  2595    SET_LINE_CODING             baud=1200 (again!)
19.918s  2601    SET_CONTROL_LINE_STATE      wValue=0x0002 (DTR=0, RTS=1)
         ----    (wait ~500ms)               ESP32 resets RA4M1
```

### Current Implementation (BOSSAStrategy.js lines 197-244)

```javascript
async perform1200Touch() {
  // Step 1: Close any existing connection
  await this.safeClose();                              // ✅ Good

  // Step 2: Open at 1200 baud
  await this.port.open({                               // ✅ Sends SET_LINE_CODING
    baudRate: TOUCH_BAUD,                              // 1200
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    flowControl: 'none'
  });

  // Step 3: Set DTR and RTS high
  await this.port.setSignals({ dtr: true, rts: true }); // ✅ Matches Frame 2593
  await this.delay(50);                                  // Different timing

  // Step 4: Set DTR low, RTS high (triggers reset)
  await this.port.setSignals({ dtr: false, rts: true }); // ✅ Matches Frame 2601
  await this.delay(50);

  // Step 5: Close port
  await this.port.close();

  // Step 6: Wait for bootloader
  await this.delay(600);                               // 600ms vs ~500ms
}
```

### Differences

| Aspect                          | USB Capture   | Current Code       | Impact                               |
| ------------------------------- | ------------- | ------------------ | ------------------------------------ |
| SET_LINE_CODING count           | 2 (redundant) | 1                  | Unknown - may affect ESP32 CDC event |
| DTR/RTS after first LINE_CODING | Immediate     | 50ms delay         | May affect timing                    |
| Wait after DTR toggle           | ~500ms        | 600ms + close time | Should be fine                       |

### Recommendation

The current implementation is close but may benefit from:

- Sending a second SET_LINE_CODING (by briefly closing and reopening)
- Reducing the final wait to 500ms

---

## Phase 2: BOSSA Connection (230400 baud)

### USB Capture Sequence

```
Time     Frame   Operation                    Details
───────────────────────────────────────────────────────────────────
20.437s  2671    SET_LINE_CODING             baud=230400 (0x00038400)
20.437s  2675    SET_CONTROL_LINE_STATE      wValue=0x0003 (DTR=1, RTS=1)
20.437s  2677    SET_LINE_CODING             baud=230400 (again!)
20.548s  2681    BULK OUT                    "N#" (Normal mode)
```

**Key observation**: SET_LINE_CODING is sent TWICE, and there's ~111ms between opening and first command.

### Current Implementation (BOSSAStrategy.js lines 407-475)

```javascript
async flash(port, hexData, onProgress) {
  // Open at primary baud (230400)
  await port.open({                                    // ✅ Sends SET_LINE_CODING
    baudRate: PRIMARY_BAUD,                            // 230400
    dataBits: 8,
    stopBits: 1,
    parity: 'none'
  });

  await port.setSignals({ dtr: true, rts: true });     // ✅ Matches Frame 2675
  await this.delay(100);                               // 100ms vs ~111ms

  // Send N# via bossa.hello()
  // ... (see below)
```

### Differences

| Aspect                | USB Capture | Current Code | Impact                 |
| --------------------- | ----------- | ------------ | ---------------------- |
| SET_LINE_CODING count | 2           | 1            | May affect ESP32 state |
| Wait before N#        | ~111ms      | 100ms        | Close enough           |

---

## Phase 3: BOSSA Handshake

### USB Capture Sequence

```
Time     Frame   Operation    Data
───────────────────────────────────────────────────────────────────
20.548s  2681    BULK OUT     4E 23 = "N#"
20.548s  2683    BULK IN      0A 0D = "\n\r" (ACK)
20.767s  2685    BULK OUT     56 23 = "V#"
20.767s  2687    BULK IN      "Arduino Bootloader (SAM-BA extended) 2.0..."
~later   2711    BULK OUT     49 23 = "I#"
```

**Key observation**: There's **219ms** between N# ACK and V# command!

### Current Implementation (Bossa.js lines 265-355)

```javascript
async hello(options = {}) {
  // Step 1: N# (Normal/Binary mode)
  await this.writeCommand("N#");                       // ✅ Matches Frame 2681

  // Wait for ACK
  try {
    const ackBytes = await this.readUntilTerminator({
      terminators: [0x0a, 0x0d, 0x3e],
      timeout: 1000,
      maxBytes: 16,
    });
    // ...
  } catch (ackErr) {
    console.log(`[Bossa] N# ACK not received, continuing to V#`);
  }

  // Small delay between commands
  await this.delay(50);                                // ❌ 50ms vs 219ms

  // Step 2: V# (Get Version)
  await this.writeCommand("V#");                       // ✅ Matches Frame 2685

  const versionBytes = await this.readUntilTerminator({
    // ...
  });

  // Step 3: I# (Device Info)
  try {
    await this.delay(50);                              // ❌ 50ms vs 24ms
    await this.writeCommand("I#");                     // ✅ Matches Frame 2711
    // ...
  }
}
```

### Differences

| Aspect        | USB Capture | Current Code | Impact                  |
| ------------- | ----------- | ------------ | ----------------------- |
| Delay N# → V# | 219ms       | 50ms         | **May be significant!** |
| Delay V# → I# | ~24ms       | 50ms         | Probably fine           |

### Recommendation

Increase delay between N# and V# to ~200ms to match Arduino IDE timing.

---

## Phase 4: Flash Erase

### USB Capture Sequence

The Arduino IDE uses an **applet-based** approach:

```
Frame 2747: S00000000,00000034#    - Write applet to SRAM addr 0
Frame 2747: [52 bytes applet]     - Applet binary
Frame 2753: W00000030,00000400#   - Configure flash register
Frame 2755: W00000020,00000000#   - More register config
Frame 2757: X00000000#            - Execute applet at addr 0
```

### Current Implementation (BOSSAStrategy.js lines 485-490)

```javascript
// Erase flash starting at offset
const eraseCmd = `X${offset.toString(16)}#`;
await this.bossa.writeCommand(eraseCmd);
await this.delay(2000); // 2 second wait
```

### Differences

| Aspect        | USB Capture             | Current Code        | Impact                 |
| ------------- | ----------------------- | ------------------- | ---------------------- |
| Method        | Applet + W + X          | Direct X command    | Different approach     |
| Erase Address | 0x00000000 (via applet) | 0x00004000 (direct) | Direct may work for R4 |
| Wait time     | Unknown                 | 2000ms              | May be excessive       |

### Recommendation

The direct X command approach may work, but the 2-second delay could potentially be reduced. Need to test.

---

## Phase 5: Flash Write

### USB Capture Sequence

```
Frame 2759+: S00000034,00001000#   - Write 4KB to SRAM at 0x34
             [4096 bytes binary]
             Y00000034,0#          - Set source address
             Y00000000,00001000#   - Copy to flash addr 0, size 4KB
             [repeat for next chunk]
```

**Key observation**: Chunks are 4096 bytes (0x1000), and Y command uses two stages.

### Current Implementation (BOSSAStrategy.js lines 492-531)

```javascript
// Page size = 256 bytes
const pageSize = 256;
const sramBufferA = 0x20001000;
const sramBufferB = 0x20001100;

for (let i = 0; i < data.length; i += pageSize) {
  const pageData = data.slice(i, i + pageSize);
  const flashAddr = offset + i;

  // Alternate between two SRAM buffers (double buffering)
  const sramBuffer = (i / pageSize) % 2 === 0 ? sramBufferA : sramBufferB;

  // S command: Write page to SRAM
  await this.bossa.writeBinary(sramBuffer, pageData);

  // Y command: Copy from SRAM to flash (two-stage)
  await this.bossa.writeBuffer(sramBuffer, flashAddr, pageData.length);

  await this.delay(5); // 5ms per page
}
```

### Bossa.js writeBuffer() (lines 423-441)

```javascript
async writeBuffer(srcAddr, dstAddr, size) {
  // Step 1: Set source address (Y[src],0#)
  const cmd1 = `Y${srcAddr.toString(16).padStart(8, "0")},0#`;
  await this.writeCommand(cmd1);

  await new Promise((resolve) => setTimeout(resolve, 2));  // 2ms delay

  // Step 2: Execute write to destination (Y[dst],[size]#)
  const cmd2 = `Y${dstAddr.toString(16).padStart(8, "0")},${size
    .toString(16)
    .padStart(8, "0")}#`;
  await this.writeCommand(cmd2);

  await new Promise((resolve) => setTimeout(resolve, 8));  // 8ms delay
}
```

### Differences

| Aspect         | USB Capture | Current Code | Impact                                |
| -------------- | ----------- | ------------ | ------------------------------------- |
| Chunk size     | 4096 bytes  | 256 bytes    | **Much slower** (16x more iterations) |
| SRAM Address   | 0x00000034  | 0x20001000   | Different address range               |
| Y cmd delays   | Unknown     | 2ms + 8ms    | May be unnecessary                    |
| Per-page delay | Unknown     | 5ms          | Adds up significantly                 |

### Key Observations

1. **Chunk size**: Arduino IDE uses 4KB chunks (4096 bytes). Current code uses 256-byte pages. This is **16x more S+Y operations!**

2. **SRAM addresses**: USB capture shows 0x34, our code uses 0x20001000. Both may work but different approaches.

3. **Delays add up**: For a 62900 byte firmware:
   - 256-byte pages = 246 pages × (2ms + 8ms + 5ms) = **~3.7 seconds** of delays
   - 4096-byte chunks = 16 chunks × delays = **much faster**

### Recommendation

**Increase chunk size to 4096 bytes** to match Arduino IDE and dramatically improve upload speed.

---

## Phase 6: Start Execution

### USB Capture

```
(Final) G00004000#    - Jump to flash offset 0x4000 and start execution
```

### Current Implementation (BOSSAStrategy.js lines 533-535)

```javascript
// Start execution from flash offset
const goCmd = `G${offset.toString(16)}#`;
await this.bossa.writeCommand(goCmd);
```

**Status**: ✅ **MATCH** - Both use `G[offset]#` command.

---

## Timing Analysis

### USB Capture Timing

| Phase                         | Duration   |
| ----------------------------- | ---------- |
| 1200 touch → 230400 open      | ~500ms     |
| 230400 open → N#              | ~111ms     |
| N# → V#                       | 219ms      |
| V# → I#                       | ~24ms      |
| Handshake complete → First S# | ~200ms     |
| Per 4KB chunk                 | Unknown    |
| Total upload (62KB)           | ~5 seconds |

### Current Implementation Timing

| Phase               | Duration                                   |
| ------------------- | ------------------------------------------ |
| 1200 touch → close  | ~100ms                                     |
| Close → 230400 open | 600ms                                      |
| 230400 open → N#    | 100ms                                      |
| N# → V#             | 50ms                                       |
| V# → I#             | 50ms                                       |
| Per 256-byte page   | ~15ms (S:5ms + Y1:2ms + Y2:8ms + loop:5ms) |
| Total upload (62KB) | **~3.7 seconds** just in delays            |

---

## Detailed Code Review

### BOSSAStrategy.js - Line by Line

#### Lines 1-20: Imports and Constants

```javascript
import { Bossa } from "../protocols/Bossa.js";

const TOUCH_BAUD = 1200;
const PRIMARY_BAUD = 230400; // ✅ Correct from USB capture
```

**Status**: ✅ Constants match USB capture.

#### Lines 197-244: perform1200Touch()

```javascript
async perform1200Touch() {
  // ...
  await this.port.setSignals({ dtr: true, rts: true });
  await this.delay(50);  // ⚠️ USB capture shows immediate toggle
  await this.port.setSignals({ dtr: false, rts: true });
  // ...
  await this.delay(600);  // ⚠️ 600ms vs 500ms in capture
}
```

**Issues**:

1. Only one SET_LINE_CODING (capture shows two)
2. 600ms wait vs ~500ms

#### Lines 407-475: flash() - Connection

```javascript
await port.open({ baudRate: PRIMARY_BAUD, ... });
await port.setSignals({ dtr: true, rts: true });
await this.delay(100);  // ✅ Close to 111ms
```

**Status**: ✅ Good, minor timing difference.

#### Lines 485-531: flash() - Write Loop

```javascript
const pageSize = 256; // ❌ Should be 4096 for speed
// ...
for (let i = 0; i < data.length; i += pageSize) {
  await this.bossa.writeBinary(sramBuffer, pageData);
  await this.bossa.writeBuffer(sramBuffer, flashAddr, pageData.length);
  await this.delay(5); // ❌ Unnecessary delay?
}
```

**Issues**:

1. 256-byte pages vs 4096-byte chunks (16x slower)
2. 5ms per-page delay adds ~1.2 seconds for 62KB firmware

### Bossa.js - Line by Line

#### Lines 265-355: hello()

```javascript
await this.delay(50); // ❌ Should be ~200ms to match N# → V# timing
await this.writeCommand("V#");
```

**Issue**: 50ms delay vs 219ms in USB capture.

#### Lines 423-441: writeBuffer()

```javascript
await new Promise((resolve) => setTimeout(resolve, 2)); // Y cmd1
await new Promise((resolve) => setTimeout(resolve, 8)); // Y cmd2
```

**Issue**: These delays may be excessive or unnecessary. Need testing.

---

## Recommendations Summary

### Priority 1: High Impact

| Change        | Current   | Recommended | Impact                    |
| ------------- | --------- | ----------- | ------------------------- |
| Chunk size    | 256 bytes | 4096 bytes  | **~16x fewer operations** |
| N# → V# delay | 50ms      | 200ms       | Match Arduino IDE timing  |

### Priority 2: Medium Impact

| Change           | Current   | Recommended     | Impact          |
| ---------------- | --------- | --------------- | --------------- |
| Per-chunk delay  | 5ms       | 0-2ms or remove | ~1 second saved |
| Y command delays | 2ms + 8ms | Test with lower | May save time   |

### Priority 3: Low Impact (for robustness)

| Change                 | Current | Recommended              | Impact            |
| ---------------------- | ------- | ------------------------ | ----------------- |
| Double SET_LINE_CODING | Single  | Double (open-close-open) | ESP32 reliability |
| 1200 touch wait        | 600ms   | 500ms                    | Minor time save   |

---

## Proposed Code Changes

### Change 1: Increase Chunk Size

```javascript
// BOSSAStrategy.js - Line ~492
// BEFORE:
const pageSize = 256;

// AFTER:
const chunkSize = 4096; // Match Arduino IDE
```

### Change 2: Increase N# → V# Delay

```javascript
// Bossa.js - Line ~310
// BEFORE:
await this.delay(50);

// AFTER:
await this.delay(200); // Match Arduino IDE timing
```

### Change 3: Reduce/Remove Per-Page Delay

```javascript
// BOSSAStrategy.js - Line ~528
// BEFORE:
await this.delay(5);

// AFTER:
// await this.delay(5);  // Removed - Y command has internal delays
```

### Change 4: Adjust SRAM Buffer Addresses (if needed)

```javascript
// BOSSAStrategy.js - Line ~493-494
// Current addresses work, but could try matching capture:
const sramBuffer = 0x00000034; // As seen in USB capture
```

---

## Next Steps

1. **Apply chunk size change** - Most impactful for performance
2. **Test with Wireshark** on Web Serial to see exact USB frames being sent
3. **Compare timing** between implementations
4. **Iteratively optimize** delays based on success/failure

---

## Appendix: Raw USB Capture Reference

### Key Frames from R4.pcapng

```
Frame 2589: SET_LINE_CODING    1200 baud
Frame 2593: SET_CONTROL_LINE   DTR=1, RTS=1
Frame 2595: SET_LINE_CODING    1200 baud (again)
Frame 2601: SET_CONTROL_LINE   DTR=0, RTS=1
Frame 2671: SET_LINE_CODING    230400 baud
Frame 2675: SET_CONTROL_LINE   DTR=1, RTS=1
Frame 2677: SET_LINE_CODING    230400 baud (again)
Frame 2681: BULK OUT           "N#"
Frame 2683: BULK IN            "\n\r"
Frame 2685: BULK OUT           "V#"
Frame 2687: BULK IN            "Arduino Bootloader..."
Frame 2711: BULK OUT           "I#"
Frame 2747: BULK OUT           S + applet
Frame 2753: BULK OUT           W00000030,00000400#
Frame 2755: BULK OUT           W00000020,00000000#
Frame 2757: BULK OUT           X00000000#
Frame 2759+: BULK OUT          S + Y (chunks)
```

---

_Document generated for algorithm improvement analysis_
