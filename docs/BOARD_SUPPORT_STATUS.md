# Arduino Bridge - Board Support Status

> **Last Updated**: December 3, 2025  
> **Purpose**: Track Web Serial upload support for popular Arduino boards in GitHub Codespaces

## Overview

The Arduino Bridge enables compiling and uploading Arduino sketches from GitHub Codespaces to physical hardware via Web Serial API. Different boards use different upload protocols, requiring specific strategies.

---

## Popular Boards Guide

### Arduino Uno (and R4 variants)

The **Arduino Uno** is the foundational board, highly recommended for beginners due to its simplicity, extensive documentation, and large community support. The classic Uno R3 uses the ATmega328P microcontroller and provides a robust platform for learning C++ in an embedded context.

The newer **Uno R4** offers enhanced features:

- **R4 Minima**: Renesas RA4M1 (ARM Cortex-M4), more memory, faster clock
- **R4 WiFi**: Same processor plus built-in Wi-Fi (ESP32-S3), 12x8 LED matrix, and DAC

| Variant       | MCU                      | Status           | Notes                              |
| ------------- | ------------------------ | ---------------- | ---------------------------------- |
| Uno R3        | ATmega328P               | ✅ Working       | Best supported, AVR protocol       |
| Uno WiFi Rev2 | ATmega4809               | ❌ Not Supported | mEDBG debugger, JTAG2UPDI protocol |
| Uno R4 Minima | Renesas RA4M1            | ⚠️ In Progress   | BOSSA protocol issue               |
| Uno R4 WiFi   | Renesas RA4M1 + ESP32-S3 | ⚠️ In Progress   | BOSSA protocol issue               |

### ESP32 and ESP8266 Boards

**ESP32** and **ESP8266** boards (NodeMCU, D1 Mini, etc.) are popular for IoT projects due to their integrated Wi-Fi and Bluetooth capabilities. They offer more processing power than traditional Arduino boards and are widely used with the Arduino IDE.

| Board              | MCU      | Status                | Notes                                       |
| ------------------ | -------- | --------------------- | ------------------------------------------- |
| ESP32 DevKit       | ESP32    | 🔧 Partial            | Compile works, esptool upload needs testing |
| Arduino Nano ESP32 | ESP32-S3 | 🔧 Partial            | Same as above                               |
| NodeMCU ESP8266    | ESP8266  | ❌ Core not installed | Requires `esp8266:esp8266` core             |
| WeMos D1 Mini      | ESP8266  | ❌ Core not installed | Requires `esp8266:esp8266` core             |

### Raspberry Pi Pico

The **Raspberry Pi Pico** uses the RP2040 microcontroller with dual ARM Cortex-M0+ cores and Programmable I/O (PIO) subsystem. Its low cost (~$4) makes it highly accessible. While often used with MicroPython, it fully supports C/C++ development in the Arduino IDE.

| Board                       | MCU               | Status           | Notes                                          |
| --------------------------- | ----------------- | ---------------- | ---------------------------------------------- |
| Raspberry Pi Pico           | RP2040            | ✅ Download Mode | Compile & download .uf2, drag to RPI-RP2 drive |
| Raspberry Pi Pico W         | RP2040 + CYW43439 | ✅ Download Mode | Same workflow, adds Wi-Fi/Bluetooth            |
| Arduino Nano RP2040 Connect | RP2040            | ✅ Download Mode | Double-tap reset to enter bootloader           |

### Teensy Boards (4.x Series)

**Teensy** boards, particularly the 4.x series with ARM Cortex-M7 processors (600MHz!), are favored for projects requiring high performance such as audio processing, USB MIDI, or advanced control algorithms. They offer significant processing power upgrades over the Uno.

| Board      | MCU                    | Status           | Notes                 |
| ---------- | ---------------------- | ---------------- | --------------------- |
| Teensy 4.1 | ARM Cortex-M7 @ 600MHz | ✅ Download Mode | Use Teensy Loader app |
| Teensy 4.0 | ARM Cortex-M7 @ 600MHz | ✅ Download Mode | Use Teensy Loader app |
| Teensy 3.6 | ARM Cortex-M4 @ 180MHz | ✅ Download Mode | Use Teensy Loader app |
| Teensy 3.5 | ARM Cortex-M4 @ 120MHz | ✅ Download Mode | Use Teensy Loader app |
| Teensy 3.2 | ARM Cortex-M4 @ 72MHz  | ✅ Download Mode | Use Teensy Loader app |
| Teensy LC  | ARM Cortex-M0+ @ 48MHz | ✅ Download Mode | Use Teensy Loader app |
| Teensy 2.0 | ATmega32U4             | ✅ Download Mode | Use Teensy Loader app |

### STM32 Nucleo Boards

**STM32** microcontrollers are widely used in industrial applications. Nucleo boards provide access to the STM32 ecosystem for robust and scalable embedded development. However, they typically use **DFU** (USB bootloader) or **ST-Link** (debug probe) for programming rather than simple serial upload.

| Board               | Status           | Notes                                          |
| ------------------- | ---------------- | ---------------------------------------------- |
| STM32 Nucleo series | ❌ Not Supported | Requires DFU mode or ST-Link programmer        |
| STM32 Blue Pill     | ❌ Not Supported | Serial bootloader possible but not implemented |

**Recommendation**: For STM32 development, use STM32CubeIDE or PlatformIO with an ST-Link programmer locally.

---

## Upload Methods

| Method            | Protocol     | Web Serial Support | Notes                                       |
| ----------------- | ------------ | ------------------ | ------------------------------------------- |
| **AVR (avrdude)** | STK500v1/v2  | ✅ Full            | Classic Arduino boards                      |
| **BOSSA**         | SAM-BA       | ⚠️ In Progress     | ARM-based boards (SAMD, Renesas)            |
| **ESPTool**       | SLIP         | 🔧 Partial         | ESP32 boards                                |
| **UF2 Download**  | Mass Storage | ✅ Full (Download) | RP2040, Teensy - compile only, manual flash |

---

## Board Support Matrix

### ✅ Fully Working

| Board                      | FQBN                   | Upload Strategy | Status     | Tested | Notes                                     |
| -------------------------- | ---------------------- | --------------- | ---------- | ------ | ----------------------------------------- |
| **Arduino Uno R3**         | `arduino:avr:uno`      | AVRStrategy     | ✅ Working | ✅     | STK500v1 protocol, official board         |
| **Arduino Uno R3 (CH340)** | `arduino:avr:uno`      | AVRStrategy     | ✅ Working | ✅     | Generic clone with CH340 USB chip         |
| **Seeeduino V4.2**         | `arduino:avr:uno`      | AVRStrategy     | ✅ Working | ✅     | CP2102N UART-to-USB, Uno-compatible       |
| **Arduino Nano**           | `arduino:avr:nano`     | AVRStrategy     | ✅ Working | ✅     | Official board, select bootloader variant |
| **Arduino Mega 2560**      | `arduino:avr:mega`     | AVRStrategy     | ✅ Working |        | STK500v2 protocol                         |
| **Arduino Leonardo**       | `arduino:avr:leonardo` | AVRStrategy     | ✅ Working |        | Native USB, auto-reset via 1200bps touch  |
| **Arduino Micro**          | `arduino:avr:micro`    | AVRStrategy     | ✅ Working |        | Same as Leonardo                          |

### ⚠️ In Progress / Partial Support

| Board                     | FQBN                               | Upload Strategy | Status         | Issue                                                                                                                                   |
| ------------------------- | ---------------------------------- | --------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Arduino Uno R4 WiFi**   | `arduino:renesas_uno:unor4wifi`    | BOSSAStrategy   | ⚠️ In Progress | BOSSA handshake fails - Web Serial may not send CDC LINE_CODING events properly. Aggressive baud cycling implemented but needs testing. |
| **Arduino Uno R4 Minima** | `arduino:renesas_uno:minima`       | BOSSAStrategy   | ⚠️ In Progress | Same BOSSA issue as R4 WiFi                                                                                                             |
| **Arduino MKR WiFi 1010** | `arduino:samd:mkrwifi1010`         | BOSSAStrategy   | ⚠️ In Progress | BOSSA protocol, same LINE_CODING issue                                                                                                  |
| **Arduino Nano 33 IoT**   | `arduino:samd:nano_33_iot`         | BOSSAStrategy   | ⚠️ In Progress | BOSSA protocol                                                                                                                          |
| **Arduino Zero**          | `arduino:samd:arduino_zero_native` | BOSSAStrategy   | ⚠️ In Progress | BOSSA protocol                                                                                                                          |
| **Arduino Nano 33 BLE**   | `arduino:mbed_nano:nano33ble`      | BOSSAStrategy   | ⚠️ In Progress | BOSSA protocol                                                                                                                          |

### 📥 Download Mode (Compile & Manual Flash)

These boards don't support direct Web Serial upload. The bridge compiles code and provides a downloadable firmware file for manual flashing.

| Board                   | FQBN                                  | Output Format | Status     | Flash Instructions                                     |
| ----------------------- | ------------------------------------- | ------------- | ---------- | ------------------------------------------------------ |
| **Raspberry Pi Pico**   | `arduino:mbed_rp2040:pico`            | `.uf2`        | ✅ Working | Hold BOOTSEL, plug USB, drag `.uf2` to `RPI-RP2` drive |
| **Raspberry Pi Pico W** | `rp2040:rp2040:rpipicow`              | `.uf2`        | ✅ Working | Same as Pico (needs additional core)                   |
| **Arduino Nano RP2040** | `arduino:mbed_nano:nanorp2040connect` | `.uf2`        | ✅ Working | Double-tap reset, drag to drive                        |
| **Teensy 4.1**          | `teensy:avr:teensy41`                 | `.hex`        | ✅ Working | Use Teensy Loader application                          |
| **Teensy 4.0**          | `teensy:avr:teensy40`                 | `.hex`        | ✅ Working | Use Teensy Loader application                          |
| **Teensy 3.x**          | `teensy:avr:teensy3x`                 | `.hex`        | ✅ Working | Use Teensy Loader application                          |
| **Teensy 2.0**          | `teensy:avr:teensy2`                  | `.hex`        | ✅ Working | Use Teensy Loader application                          |

### 🔧 Needs Additional Core

These boards require installing additional Arduino cores.

| Board                          | FQBN                     | Core Needed       | Installation                           |
| ------------------------------ | ------------------------ | ----------------- | -------------------------------------- |
| **ESP8266 (NodeMCU, D1 Mini)** | `esp8266:esp8266:*`      | `esp8266:esp8266` | Add board URL, then install core       |
| **Arduino Due**                | `arduino:sam:*`          | `arduino:sam`     | `arduino-cli core install arduino:sam` |
| **Raspberry Pi Pico W**        | `rp2040:rp2040:rpipicow` | `rp2040:rp2040`   | Add Earle Philhower board URL          |

### ❌ Not Supported

| Board                   | Reason                              | Alternative                 |
| ----------------------- | ----------------------------------- | --------------------------- |
| **Arduino Uno WiFi R2** | mEDBG debugger, JTAG2UPDI protocol  | Use Arduino IDE locally     |
| **STM32 Nucleo**        | Requires DFU or ST-Link, not serial | Use STM32CubeIDE locally    |
| **STM32 Blue Pill**     | Serial bootloader not implemented   | Use PlatformIO with ST-Link |
| **BBC micro:bit**       | 32-bit ARM toolchain incompatible   | Use MakeCode or local tools |
| **nRF52 boards**        | SoftDevice flashing not supported   | Use nRF Connect SDK locally |

---

## Installed Cores

```
ID                  Version          Name
arduino:avr         1.8.6            Arduino AVR Boards
arduino:esp32       2.0.18-arduino.5 Arduino ESP32 Boards
arduino:mbed_nano   4.4.1            Arduino Mbed OS Nano Boards
arduino:mbed_rp2040 4.4.1            Arduino Mbed OS RP2040 Boards
arduino:renesas_uno 1.5.1            Arduino UNO R4 Boards
arduino:samd        1.8.14           Arduino SAMD Boards
teensy:avr          1.59.0           Teensy Boards
```

---

## Upload Strategy Details

### AVRStrategy (avrdude protocol)

- **Boards**: Arduino Uno, Nano, Mega, Leonardo, Micro
- **Protocol**: STK500v1 (Uno/Nano) or STK500v2 (Mega)
- **Status**: ✅ Fully implemented
- **How it works**: Standard avrdude serial protocol over Web Serial

### BOSSAStrategy (SAM-BA protocol)

- **Boards**: SAMD21/51, Renesas RA4M1 (R4), Mbed Nano
- **Protocol**: SAM-BA bootloader (BOSSA compatible)
- **Status**: ⚠️ In Progress
- **Issue**: Web Serial API may not properly send CDC LINE_CODING control transfers needed for BOSSA auto-baud detection
- **Workarounds implemented**:
  1. Aggressive baud rate cycling (115200 → 1200 → 115200)
  2. Port close/reopen sequences
  3. DTR/RTS signal toggling
  4. Auto-baud preamble characters

### ESPToolStrategy (SLIP protocol)

- **Boards**: ESP32, ESP32-S2/S3/C3
- **Protocol**: esptool SLIP serial protocol
- **Status**: 🔧 Compilation works, upload needs testing
- **Requirements**: pyserial installed

### RP2040Strategy / TeensyStrategy

- **Boards**: Raspberry Pi Pico, Teensy
- **Protocol**: UF2 mass storage / Teensy Loader
- **Status**: ✅ Download mode working
- **How it works**: Compile generates firmware file, user downloads and flashes manually

---

## Serial Monitor Support

| Upload Mode           | Serial Monitor | Notes                        |
| --------------------- | -------------- | ---------------------------- |
| AVR (direct upload)   | ✅ Works       | Auto-reconnects after upload |
| BOSSA (direct upload) | ✅ Works       | When upload succeeds         |
| Download mode         | ✅ Works       | Connect after manual flash   |

All boards support Serial Monitor after the sketch is running, regardless of upload method.

---

## Known Issues

### 1. BOSSA Handshake Failure (R4 WiFi, SAMD boards)

**Symptom**: Board enters bootloader (LED pulses), but BOSSA "N#" handshake times out.

**Root Cause**: Web Serial API doesn't send USB CDC `SET_LINE_CODING` control transfers when `port.open({baudRate})` is called. BOSSA auto-baud detection relies on seeing specific byte patterns at the new baud rate.

**Current Workaround**: Aggressive baud cycling with port close/reopen. Partial success reported.

**Potential Fix**: Browser/Chromium patch to send LINE_CODING on baud change, or firmware update on ESP32-S3 bridge chip.

### 2. ESP32 Upload

**Status**: Compilation works (pyserial installed). Web Serial upload of esptool protocol not yet tested.

### 3. Teensy Direct Upload

**Limitation**: Teensy uses proprietary HalfKay bootloader. No open-source Web Serial implementation available. Download mode is the supported workflow.

---

## Adding New Boards

### To add support for a new board:

1. **Install the core**:

   ```bash
   arduino-cli core install <core:name>
   ```

2. **Add to `boards.json`** (for VID/PID matching and upload mode):

   ```json
   {
     "name": "Board Name",
     "fqbn": "core:arch:board",
     "vid": ["0x1234"],
     "pid": ["0x5678"],
     "uploadMode": "serial", // or "uf2-download"
     "uploadInstructions": "Flash instructions for download mode"
   }
   ```

3. **Add strategy mapping** in `UploadManager.js` if needed:

   ```javascript
   this.strategies = {
     "core:arch": new SomeStrategy(),
   };
   ```

4. **Rebuild**:
   ```bash
   cd arduino-bridge && npm run build
   ```

---

## Quick Reference

### Recommended Boards by Use Case

| Use Case                 | Recommended Board | Status         | Why                                              |
| ------------------------ | ----------------- | -------------- | ------------------------------------------------ |
| **Beginners / Learning** | Arduino Uno R3    | ✅ Working     | Best documentation, most tutorials, full support |
| **Breadboard Projects**  | Arduino Nano      | ✅ Working     | Compact, breadboard-friendly                     |
| **More I/O Pins**        | Arduino Mega 2560 | ✅ Working     | 54 digital pins, 16 analog                       |
| **IoT / Wi-Fi Projects** | ESP32             | 🔧 Partial     | Built-in Wi-Fi/BT, compile works                 |
| **Budget Projects**      | Raspberry Pi Pico | ✅ Download    | ~$4, great value, manual flash                   |
| **High Performance**     | Teensy 4.1        | ✅ Download    | 600MHz, audio/USB projects                       |
| **Modern Arduino**       | Uno R4 WiFi       | ⚠️ In Progress | Wait for BOSSA fix or use local IDE              |
| **Industrial/Pro**       | STM32 Nucleo      | ❌             | Use local STM32CubeIDE                           |

### Board Selection Flowchart

```
Need Wi-Fi/Bluetooth?
├─ Yes → ESP32 (🔧) or wait for R4 WiFi fix (⚠️)
└─ No
   ├─ Need high performance? → Teensy 4.x (✅ download)
   ├─ Need many pins? → Arduino Mega (✅)
   ├─ Budget constrained? → Pi Pico (✅ download)
   └─ Learning/Teaching? → Arduino Uno R3 (✅) ← RECOMMENDED
```

### Status Legend

| Symbol           | Meaning                                           |
| ---------------- | ------------------------------------------------- |
| ✅ Working       | Full compile & upload via Web Serial              |
| ✅ Download      | Compile works, download firmware for manual flash |
| ⚠️ In Progress   | Compile works, upload has known issues            |
| 🔧 Partial       | Compile works, upload untested                    |
| ❌ Not Supported | Cannot use with this bridge                       |

---

## Version History

| Date       | Change                                               |
| ---------- | ---------------------------------------------------- |
| 2025-12-03 | Added Teensy support, documented all boards          |
| 2025-12-03 | Added Pi Pico UF2 download workflow                  |
| 2025-12-03 | Enhanced BOSSA strategy with aggressive baud cycling |
| 2025-12-02 | Initial AVR support working                          |
