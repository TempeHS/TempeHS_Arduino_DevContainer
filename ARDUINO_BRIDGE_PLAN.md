# Universal Arduino Bridge Plan: Web Serial & WebUSB

## 1. Executive Summary

The objective is to expand the `arduino-bridge` from a simple AVR-only tool into a **Universal Web-Based Arduino IDE** capable of flashing and monitoring a wide variety of microcontroller architectures. This includes **Arduino Uno R4, MKR (SAMD), ESP32, Raspberry Pi Pico, and Teensy**.

To ensure stability and maintainability, we will adopt a **Strategy Pattern** for the upload logic. This ensures the existing, working AVR (Uno R3) implementation remains isolated and untouched while new capabilities are added as separate modules.

## 2. Architecture: The Strategy Pattern

We will refactor `UploadManager` to delegate the actual flashing process to specific **Upload Strategies**.

### Interface: `IUploadStrategy`

Every board strategy must implement:

1.  `prepare(port)`: Handle pre-flash resets (e.g., 1200bps touch).
2.  `flash(port, data, progressCallback)`: Perform the actual firmware upload.
3.  `verify()`: (Optional) Verify flash content.

### Directory Structure

```text
src/client/
  services/
    UploadManager.js       # The Orchestrator (Selects Strategy)
    strategies/
      AVRStrategy.js       # Wraps existing STK500.js (Uno R3)
      BOSSAStrategy.js     # For SAMD (MKR) and Renesas (Uno R4)
      ESPToolStrategy.js   # For ESP32/ESP8266
      RP2040Strategy.js    # For Pi Pico (WebUSB/Serial)
      TeensyStrategy.js    # For Teensy (WebHID)
```

## 3. Board Support & Protocols

### A. AVR (Arduino Uno R3, Nano, Mega)

- **Protocol**: STK500 v1/v2.
- **Transport**: Web Serial.
- **Mechanism**: Toggle DTR to reset -> Sync -> Flash.
- **Implementation**: **EXISTING**. Will be moved to `AVRStrategy.js` without logic changes.

### B. Renesas (Uno R4 Minima/WiFi) & SAMD (MKR, Nano 33 IoT)

- **Protocol**: BOSSA (Basic Open Source SAM-BA Application).
- **Transport**: Web Serial (CDC).
- **Mechanism**:
  1.  **1200bps Touch**: Open port at 1200 baud and close it. This triggers the bootloader.
  2.  **Port Re-enumeration**: The device disconnects and reappears as a different USB device (Bootloader Mode).
  3.  **Flash**: Connect to new port -> Execute BOSSA protocol.
- **Strategy**: `BOSSAStrategy.js`.

### C. ESP32 & ESP8266

- **Protocol**: ESP-ROM-BAUD (esptool).
- **Transport**: Web Serial.
- **Mechanism**:
  1.  **Boot Mode Sequence**: Specific timing of DTR/RTS lines to enter UART bootloader.
  2.  **Flash**: SLIP-encoded commands to write to flash memory.
- **Strategy**: `ESPToolStrategy.js` (Porting logic from `esptool-js`).

### D. Raspberry Pi Pico (RP2040)

- **Protocol**: `picotool` (USB Vendor Commands) or UF2.
- **Transport**: WebUSB (preferred for `picotool`) or Web Serial (if using a serial bootloader).
- **Challenge**: Standard Pico uses Mass Storage (UF2) which web apps cannot access directly.
- **Solution**: Use WebUSB to talk to the bootloader interface if available, or guide user to drag-and-drop if web upload isn't possible.
- **Strategy**: `RP2040Strategy.js`.

### E. Teensy (3.x, 4.x)

- **Protocol**: Teensy Loader (HalfKay).
- **Transport**: WebHID (Human Interface Device).
- **Mechanism**: Teensy uses HID packets for flashing, not Serial.
- **Strategy**: `TeensyStrategy.js`.

## 4. Implementation Roadmap

### Phase 1: Refactoring & Separation of Concerns

**Goal**: Isolate the current R3 code so it's safe.

1.  Create `src/client/services/strategies/`.
2.  Move `STK500.js` logic into `AVRStrategy.js`.
3.  Update `UploadManager.js` to accept an FQBN (Fully Qualified Board Name) and instantiate `AVRStrategy` for `arduino:avr:*` boards.
4.  **Verify**: Ensure Uno R3 upload still works exactly as before.

### Phase 2: The 1200bps Touch (Uno R4 & MKR)

**Goal**: Support modern Arduino boards.

1.  Implement `BOSSAStrategy.js`.
2.  Implement the "Touch" logic:
    - Connect at 1200 baud.
    - Disconnect.
    - Wait for device to re-appear (might need UI prompt to "Select Bootloader Port").
3.  Implement basic BOSSA write commands.

### Phase 3: ESP32 Support

**Goal**: Support the popular IoT chip.

1.  Implement `ESPToolStrategy.js`.
2.  Add DTR/RTS toggling logic to `WebSerialProvider` if not already present (needed for boot entry).
3.  Implement SLIP encoding/decoding.

### Phase 4: Advanced Transports (WebUSB/WebHID)

**Goal**: Support non-serial boards.

1.  Add `WebUSBProvider` and `WebHIDProvider` to `src/client/providers/`.
2.  Implement `TeensyStrategy` using `WebHIDProvider`.

## 5. Serial Monitor & Plotter Updates

The Serial Monitor is largely protocol-agnostic, but needs:

1.  **DTR/RTS Control**: Toggle buttons in UI (needed for some boards to boot/reset).
2.  **High Baud Rates**: Support for 921600+ (ESP32 logs often run high).
3.  **Line Ending Config**: Ensure `\r\n`, `\n`, `\r` are easily selectable (ESP32 often needs `\r\n`).

## 6. UI/UX Improvements

1.  **Smart Board Selection**:
    - Instead of just a dropdown, try to match USB Vendor ID/Product ID (VID/PID) to known boards to auto-select the correct Strategy.
2.  **Multi-Stage Progress**:
    - Show "Resetting..." -> "Erasing..." -> "Flashing..." -> "Verifying...".
3.  **Bootloader Port Handling**:
    - For R4/MKR, the UI must handle the port changing mid-process. We may need a "Waiting for Bootloader..." overlay that asks the user to select the new port if auto-detection fails.

## 7. Technical Dependencies

- **AVR**: `avrgirl-arduino` (reference) or custom STK500 (current).
- **ESP32**: `esptool-js` (reference).
- **SAMD/R4**: `bossa-js` (reference) or custom implementation.
- **General**: `navigator.serial`, `navigator.usb`, `navigator.hid`.
