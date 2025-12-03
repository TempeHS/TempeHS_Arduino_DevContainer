# Arduino UNO R4 WiFi USB Upload Protocol Analysis

> **Captured from**: Arduino IDE 2.x upload to UNO R4 WiFi  
> **Date**: December 3, 2025  
> **Source file**: `R4.pcapng`

## Executive Summary

The Wireshark capture reveals the **exact sequence** used by Arduino IDE to upload to the UNO R4 WiFi. The key discovery is:

1. **1200 baud touch** triggers bootloader entry
2. **230400 baud** is used for BOSSA communication (not 115200 or 921600!)
3. **SET LINE CODING** USB CDC control transfers are critical
4. **SET CONTROL LINE STATE** (DTR/RTS) must be set correctly

## Critical Discovery: Baud Rate is 230400

From the capture, the sequence is:

| Time (s) | Operation                | Value                                                      |
| -------- | ------------------------ | ---------------------------------------------------------- |
| 19.917   | SET LINE CODING          | **1200 baud** (0x000004B0)                                 |
| 19.917   | SET CONTROL LINE STATE   | DTR+RTS = 0x03                                             |
| 19.918   | SET LINE CODING          | **1200 baud** again                                        |
| 19.918   | SET CONTROL LINE STATE   | DTR+RTS = 0x02                                             |
| ~0.5s    | (Wait for reset)         |                                                            |
| 20.437   | SET LINE CODING          | **230400 baud** (0x00038400)                               |
| 20.437   | SET CONTROL LINE STATE   | DTR+RTS = 0x03                                             |
| 20.437   | SET LINE CODING          | **230400 baud** again                                      |
| 20.548   | BOSSA: `N#`              | Normal mode command                                        |
| 20.548   | Response: `\n\r`         | ACK                                                        |
| 20.767   | BOSSA: `V#`              | Get version                                                |
| 20.767   | Response: version string | "Arduino Bootloader (SAM-BA extended) 2.0 [Arduino:IKXYZ]" |

## Detailed Protocol Sequence

### Phase 1: 1200 Baud Touch (Bootloader Entry)

```
Frame 2589: SET LINE CODING
  Payload: b0 04 00 00 00 00 08
  Decoded: baud=1200, stop=1, parity=none, bits=8

Frame 2593: SET CONTROL LINE STATE
  wValue: 0x0003 (DTR=1, RTS=1)

Frame 2595: SET LINE CODING
  Payload: b0 04 00 00 00 00 08
  Decoded: baud=1200 (same)

Frame 2601: SET CONTROL LINE STATE
  wValue: 0x0002 (DTR=0, RTS=1)
```

The 1200 baud touch with DTR low triggers the ESP32-S3 bridge to reset the RA4M1 into bootloader mode.

### Phase 2: BOSSA Connection at 230400 baud

```
Frame 2671: SET LINE CODING
  Payload: 00 84 03 00 00 00 08
  Decoded: baud=230400, stop=1, parity=none, bits=8

Frame 2675: SET CONTROL LINE STATE
  wValue: 0x0003 (DTR=1, RTS=1)

Frame 2677: SET LINE CODING
  Payload: 00 84 03 00 00 00 08
  Decoded: baud=230400 (same again)
```

### Phase 3: BOSSA Handshake

```
Frame 2681: BULK OUT (endpoint 3)
  Data: 4E 23 = "N#" (Normal/Binary mode)

Frame 2683: BULK IN (endpoint 4)
  Data: 0A 0D = "\n\r" (ACK)

Frame 2685: BULK OUT
  Data: 56 23 = "V#" (Get Version)

Frame 2687: BULK IN
  Data: "Arduino Bootloader (SAM-BA extended) 2.0 [Arduino:IKXYZ]\n\r"
```

### Phase 4: Device Info Query

```
Frame 2711: BULK OUT
  Data: 49 23 = "I#" (Device Info - chip ID)
```

### Phase 5: Flash Writing

The flash sequence uses SAM-BA extended protocol:

```
1. S00000000,00000034# - Set address 0x00000000, write 0x34 bytes (applet/stub)
2. [52 bytes of binary data - flash applet]
3. W00000030,00000400# - Write register at 0x30, value 0x400 (configure flash)
4. W00000020,00000000# - Write register at 0x20, value 0x00
5. X00000000# - Execute applet at address 0
6. S00000034,00001000# - Set address 0x34, write 0x1000 bytes (4KB chunk)
7. [4096 bytes of firmware]
8. Y00000034,0# - Verify checksum at 0x34
9. Y00000000,00001000# - Verify checksum of 4KB
10. [Repeat for remaining firmware chunks]
```

## USB CDC Control Transfer Details

### SET LINE CODING (Request 0x20)

```
bmRequestType: 0x21 (Host-to-device, Class, Interface)
bRequest: 0x20 (SET_LINE_CODING)
wValue: 0x0000
wIndex: 0x0001 (interface 1)
wLength: 7

Payload structure (7 bytes, little-endian):
  dwDTERate: 4 bytes - baud rate
  bCharFormat: 1 byte - 0=1stop, 1=1.5stop, 2=2stop
  bParityType: 1 byte - 0=none, 1=odd, 2=even
  bDataBits: 1 byte - 5,6,7,8,16
```

### SET CONTROL LINE STATE (Request 0x22)

```
bmRequestType: 0x21 (Host-to-device, Class, Interface)
bRequest: 0x22 (SET_CONTROL_LINE_STATE)
wValue: D0=DTR, D1=RTS (bitmap)
wIndex: 0x0001 (interface 1)
wLength: 0
```

## Web Serial API Implementation Notes

### The Problem

Web Serial's `port.open({ baudRate: X })` should send SET_LINE_CODING, but:

1. It may not send it every time if baud rate hasn't changed
2. The timing may be different from native serial libraries
3. The ESP32-S3 bridge depends on seeing these control transfers

### The Solution

Based on the capture, we need to:

1. **Close and reopen** the port at each baud rate to ensure SET_LINE_CODING is sent
2. **Use exact sequence**: 1200 → close → wait 500ms → 230400
3. **Set signals explicitly**: DTR=true, RTS=true after opening at 230400
4. **Send N# immediately** after opening (within ~100ms)

## Implementation Checklist

- [x] Identify correct baud rate for BOSSA: **230400**
- [ ] Update BOSSAStrategy.js to use 230400 as primary baud rate
- [ ] Ensure proper SET_LINE_CODING by closing/reopening port
- [ ] Match exact 1200 baud touch sequence with DTR toggling
- [ ] Test with actual UNO R4 WiFi hardware

## Comparison: Current vs Required

| Aspect           | Current Implementation | Required (from capture) |
| ---------------- | ---------------------- | ----------------------- |
| BOSSA baud       | 115200/921600          | **230400**              |
| 1200 touch DTR   | false                  | false then true         |
| Wait after touch | 2000ms                 | ~500ms                  |
| Line coding      | Unclear if sent        | Must close/reopen       |
| Signal timing    | Various attempts       | DTR=1,RTS=1 at 230400   |

## Raw Baud Rate Payloads

```
1200 baud:   b0 04 00 00 00 00 08  (0x000004B0 = 1200)
230400 baud: 00 84 03 00 00 00 08  (0x00038400 = 230400)
```

## References

- R4.pcapng - Full USB capture file
- bossa-handshake-findings.md - Previous investigation notes
- arduino/uno-r4-wifi-usb-bridge - ESP32-S3 bridge firmware source
