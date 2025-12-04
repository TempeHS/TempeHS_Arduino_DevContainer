# Upload Strategy Automation Plan

## Overview

This plan outlines a systematic approach to create upload strategies for additional Arduino boards by leveraging the test infrastructure we built for the R4 WiFi BOSSA protocol. The key insight is that our test scripts (`protocol-commands-only-test.html`, `protocol-timing-test.html`) provide a framework to verify JavaScript implementations against C++ reference implementations.

**Note:** Some strategies already exist (AVR/STK500 for Uno/Nano). The automation approach will:

1. **Verify existing implementations** against reference source (generate tests, run them)
2. **Generate new implementations** for boards without strategies
3. **Fix discrepancies** if tests reveal differences from reference

## Goals

1. **Automate strategy generation** from C++ reference source code
2. **Verify correctness** using command-sequence and timing tests
3. **Target popular boards only** to maximize impact with minimal effort
4. **Create reusable templates** that can be adapted for new protocols

---

## Target Boards (Priority Order)

### Tier 1: High Priority (Most Popular)

| Board                     | Protocol          | Reference Source | Status                              |
| ------------------------- | ----------------- | ---------------- | ----------------------------------- |
| Arduino Uno R4 WiFi       | BOSSA/SAM-BA      | `Samba.cpp`      | ✅ DONE                             |
| Arduino Uno R4 Minima     | BOSSA/SAM-BA      | `Samba.cpp`      | Pending                             |
| Arduino Uno (AVR)         | STK500v1          | `stk500.c`       | ✅ Implemented - needs verification |
| Arduino Nano              | STK500v1          | `stk500.c`       | ✅ Implemented - needs verification |
| Arduino Mega 2560         | STK500v2          | `stk500v2.c`     | Pending                             |
| Arduino Leonardo          | AVR109 (Caterina) | `butterfly.c`    | Pending                             |
| Arduino Nano 33 BLE Sense | BOSSA (nRF52)     | `Samba.cpp`      | Pending                             |

### Tier 2: Medium Priority (SAMD/Native USB)

| Board                 | Protocol | Reference Source | Status                  |
| --------------------- | -------- | ---------------- | ----------------------- |
| Arduino MKR WiFi 1010 | BOSSA    | `Samba.cpp`      | Pending (similar to R4) |
| Arduino Nano 33 IoT   | BOSSA    | `Samba.cpp`      | Pending (similar to R4) |
| Arduino Zero          | BOSSA    | `Samba.cpp`      | Pending (similar to R4) |

### Tier 3: Lower Priority (ESP/RP2040)

| Board              | Protocol     | Reference Source | Status                  |
| ------------------ | ------------ | ---------------- | ----------------------- |
| Arduino Nano ESP32 | esptool      | `esptool.py`     | Complex - defer         |
| Raspberry Pi Pico  | UF2 download | N/A              | ✅ DONE (download only) |

---

## Methodology

### Phase 1: Extract Protocol Specification from C++ Source

For each protocol, identify and document:

1. **Command format** - ASCII vs binary, delimiters, padding
2. **Address format** - Hex digits, endianness, offsets
3. **Timing constants** - Timeouts, delays, retries
4. **Handshake sequence** - Init commands, expected responses
5. **Data transfer** - Chunk size, flow control, ACK format
6. **Termination** - Reset command, go/jump command

#### Example: STK500v1 (for Uno/Nano)

```
Reference: avrdude/stk500.c

Key constants:
- SYNC: 0x30 (STK_GET_SYNC)
- OK: 0x10 (STK_OK)
- INSYNC: 0x14 (STK_INSYNC)
- PROG_PAGE: 0x64 (STK_PROG_PAGE)
- PAGE_SIZE: 128 bytes (ATmega328P)
- TIMEOUT: 500ms
```

### Phase 2: Create Reference Test Generator

Build a test generator script that:

1. **Reads protocol specification** from a JSON/YAML config file
2. **Generates expected command sequence** (like `getExpectedCommands()` in our tests)
3. **Generates timing expectations** (like `TimingMockPort` class)
4. **Outputs test HTML file** ready to run in browser

#### Config File Format

```yaml
# protocols/stk500v1.yaml
protocol: STK500v1
boards:
  - arduino:avr:uno
  - arduino:avr:nano

constants:
  sync: 0x30
  ok: 0x10
  insync: 0x14
  prog_page: 0x64
  page_size: 128
  timeout_ms: 500

handshake:
  - { cmd: [0x30, 0x20], expect: [0x14, 0x10], name: "GET_SYNC" }
  - {
      cmd: [0x41, 0x81, 0x20],
      expect: [0x14, 0x00, 0x10],
      name: "GET_PARAMETER",
    }

write_sequence:
  - load_address: { cmd: [0x55, LOW, HIGH, 0x20], expect: [0x14, 0x10] }
  - prog_page:
      { cmd: [0x64, SIZE_H, SIZE_L, 0x46, ...DATA, 0x20], expect: [0x14, 0x10] }

reset:
  - leave_progmode: { cmd: [0x51, 0x20], expect: [0x14, 0x10] }
```

### Phase 3: Generate Strategy Skeleton

Use the protocol config to generate JavaScript strategy code:

```javascript
// AUTO-GENERATED from protocols/stk500v1.yaml
// Verify with: tests/protocol-stk500v1-test.html

export class STK500v1Strategy {
  static SYNC = 0x30;
  static OK = 0x10;
  static INSYNC = 0x14;
  static PROG_PAGE = 0x64;
  static PAGE_SIZE = 128;
  static TIMEOUT = 500;

  async handshake(port) {
    // GET_SYNC
    await this.send(port, [0x30, 0x20]);
    await this.expectResponse(port, [0x14, 0x10], this.TIMEOUT);
    // ... generated from config
  }

  async writeChunk(port, address, data) {
    // LOAD_ADDRESS
    const low = address & 0xff;
    const high = (address >> 8) & 0xff;
    await this.send(port, [0x55, low, high, 0x20]);
    await this.expectResponse(port, [0x14, 0x10], this.TIMEOUT);

    // PROG_PAGE
    // ... generated from config
  }
}
```

### Phase 4: Verification Tests

For each generated strategy:

1. **Command sequence test** - Verify all commands match reference exactly
2. **Timing test** - Verify timeouts and delays match reference
3. **Mock upload test** - Simulate full upload with mock port
4. **Real hardware test** - Manual verification with actual board

---

## Implementation Steps

### Step 1: Create Protocol Config Directory

```
arduino-bridge/
  protocols/
    bossa-renesas.yaml      # R4 WiFi/Minima
    bossa-samd.yaml         # MKR, Nano 33 IoT, Zero
    stk500v1.yaml           # Uno, Nano, Mini
    stk500v2.yaml           # Mega 2560
    avr109.yaml             # Leonardo, Micro
```

### Step 2: Build Config Parser & Code Generator

```
scripts/
  generate-strategy.js      # Node script to generate strategy from config
  generate-test.js          # Node script to generate test from config
```

Usage:

```bash
node scripts/generate-strategy.js protocols/stk500v1.yaml > src/client/services/strategies/STK500v1Strategy.js
node scripts/generate-test.js protocols/stk500v1.yaml > tests/protocol-stk500v1-test.html
```

### Step 3: Extract Reference Implementations

| Protocol | Source Repository           | Key Files                        |
| -------- | --------------------------- | -------------------------------- |
| BOSSA    | github.com/shumatech/BOSSA  | `src/Samba.cpp`, `src/Flash.cpp` |
| STK500v1 | github.com/avrdudes/avrdude | `src/stk500.c`                   |
| STK500v2 | github.com/avrdudes/avrdude | `src/stk500v2.c`                 |
| AVR109   | github.com/avrdudes/avrdude | `src/butterfly.c`                |

### Step 4: Create Protocol Configs from C++ Source

For each protocol:

1. Read the C++ source file
2. Extract constants, command formats, timing values
3. Create YAML config
4. Generate strategy + test
5. Run test to verify

### Step 5: Iterate Until Tests Pass

```
┌─────────────────┐
│ C++ Source Code │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Protocol YAML  │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│Strategy│ │ Test  │
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         ▼
    ┌─────────┐
    │Run Test │
    └────┬────┘
         │
    ┌────┴────┐
    │         │
  PASS      FAIL
    │         │
    ▼         ▼
  Done    Fix YAML/Strategy
              │
              └──→ (loop back)
```

---

## Test Infrastructure Reuse

### Existing Tests (from R4 WiFi work)

| Test File                          | Purpose                                   | Reusable?   |
| ---------------------------------- | ----------------------------------------- | ----------- |
| `protocol-commands-only-test.html` | Verify command sequence matches reference | ✅ Template |
| `protocol-timing-test.html`        | Verify timing matches reference           | ✅ Template |
| `protocol-test.html`               | Full mock upload simulation               | ✅ Template |
| `protocol-exact-test.html`         | Byte-for-byte verification                | ✅ Template |

### Test Template Structure

Each generated test will follow the same pattern:

```javascript
// 1. Define expected commands from C++ reference
function getExpectedCommands(firmwareSize) {
  // Generated from protocol config
}

// 2. Create mock port with timing simulation
class MockPort {
  // Generated from protocol config timing values
}

// 3. Run strategy against mock
async function runTest() {
  const strategy = new GeneratedStrategy();
  const mockPort = new MockPort();
  const result = await strategy.upload(mockPort, testFirmware);
  // Compare actual vs expected
}
```

---

## Deliverables

### Per-Protocol Deliverables

1. **Protocol config file** (`protocols/[name].yaml`)
2. **Strategy implementation** (`src/client/services/strategies/[Name]Strategy.js`)
3. **Command verification test** (`tests/protocol-[name]-commands-test.html`)
4. **Timing verification test** (`tests/protocol-[name]-timing-test.html`)
5. **Documentation** (added to `arduino-bridge-instructions.md`)

### Automation Scripts

1. **`scripts/extract-protocol.js`** - Parse C++ source and generate initial YAML
2. **`scripts/generate-strategy.js`** - Generate JS strategy from YAML
3. **`scripts/generate-test.js`** - Generate test HTML from YAML
4. **`scripts/validate-all.js`** - Run all protocol tests

---

## Timeline Estimate

| Phase     | Tasks                                 | Est. Time     |
| --------- | ------------------------------------- | ------------- |
| 1         | Create protocol config format, parser | 2 hours       |
| 2         | Build strategy generator              | 3 hours       |
| 3         | Build test generator                  | 2 hours       |
| 4         | STK500v1 (Uno/Nano) - verify existing | 2 hours       |
| 5         | STK500v2 (Mega)                       | 3 hours       |
| 6         | AVR109 (Leonardo)                     | 3 hours       |
| 7         | BOSSA-SAMD (MKR/Nano33 IoT)           | 2 hours       |
| 8         | BOSSA-nRF52 (Nano 33 BLE Sense)       | 3 hours       |
| **Total** |                                       | **~20 hours** |

---

## Success Criteria

For each board:

1. ✅ Protocol config accurately reflects C++ reference
2. ✅ Command test passes (all commands match byte-for-byte)
3. ✅ Timing test passes (all timeouts within 10% of reference)
4. ✅ Mock upload test passes (simulated upload completes)
5. ✅ Real hardware test passes (actual board receives firmware)
6. ✅ Strategy integrated into UploadManager
7. ✅ Board appears in boards.json with correct VID/PID

---

## Known Challenges

### STK500v1/v2 Complexity

- Binary protocol (not ASCII like BOSSA)
- Page-based addressing vs byte addressing
- Fuse/lock bit handling (may need to skip for MVP)

### Leonardo/Micro (AVR109/Caterina)

- Bootloader timeout is very short (~750ms)
- Must detect bootloader port vs application port
- 1200 baud touch required (similar to R4)

### Nano 33 BLE Sense (nRF52840)

- Uses BOSSA but with nRF52-specific flash handling
- Double-tap reset enters bootloader (orange LED pulses)
- Different VID/PID in bootloader vs application mode
- May need Nordic DFU protocol investigation if BOSSA doesn't work

### Version Differences

- avrdude source has evolved; need to target stable version
- Different boards may have slightly different bootloader behavior

---

## References

- [BOSSA Source](https://github.com/shumatech/BOSSA)
- [avrdude Source](https://github.com/avrdudes/avrdude)
- [STK500 Protocol Spec](https://ww1.microchip.com/downloads/en/Appnotes/doc2525.pdf)
- [AVR109 Protocol Spec](https://ww1.microchip.com/downloads/en/Appnotes/doc1644.pdf)
- [Arduino Bootloader Comparison](https://docs.arduino.cc/learn/programming/bootloaders)

---

**Created:** 2025-12-04
**Author:** TempeHS Arduino Development Team
**Status:** Planning
