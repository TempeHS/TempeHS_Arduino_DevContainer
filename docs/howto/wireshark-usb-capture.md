# Wireshark USB Capture for Arduino IDE Analysis

This guide explains how to capture USB traffic between Arduino IDE and the R4 WiFi to understand what's different from Web Serial.

## Goal

Capture the **USB CDC control transfers** (especially `SET_LINE_CODING`) that Arduino IDE sends when uploading to R4 WiFi. This will help us understand why Web Serial's baud rate changes don't trigger the ESP32-S3 bridge properly.

---

## Prerequisites

- **Windows PC** with Arduino IDE installed
- **Wireshark** (https://www.wireshark.org/download.html)
- **USBPcap** (included in Wireshark installer - make sure to check the box!)
- **Arduino UNO R4 WiFi** connected via USB

---

## Step 1: Install Wireshark with USBPcap

1. Download Wireshark from https://www.wireshark.org/download.html
2. Run the installer
3. **IMPORTANT**: When prompted about additional components, check the box for **USBPcap**
4. Complete installation and restart if prompted

### Verify USBPcap Installation

1. Open Wireshark
2. In the capture interface list, you should see **USBPcap1**, **USBPcap2**, etc.
3. If you don't see USBPcap interfaces:
   - Close Wireshark
   - Download USBPcap separately from https://desowin.org/usbpcap/
   - Install it
   - Reopen Wireshark

---

## Step 2: Identify the Correct USB Bus

1. Open **Device Manager** (Win+X → Device Manager)
2. Expand **Ports (COM & LPT)**
3. Find your Arduino R4 WiFi (e.g., "USB Serial Device (COM5)")
4. Right-click → Properties → Details tab
5. Select **Location paths** from dropdown
6. Note the USB bus number (e.g., `USBROOT(0)-HUB(1)-PORT(3)` means USB bus 0)

Alternatively, in Wireshark:

1. Start capturing on all USBPcap interfaces
2. Plug in your Arduino
3. Look for device enumeration traffic
4. Note which USBPcap interface shows the Arduino traffic

---

## Step 3: Start USB Capture

1. Open Wireshark
2. Double-click the **USBPcap** interface for your Arduino's USB bus
3. Capture will start immediately

### Optional: Set Capture Filter (reduces data volume)

Before starting capture, you can set a capture filter:

```
usb.device_address == X
```

Where X is your Arduino's USB device address (found in Device Manager → Details → Address).

---

## Step 4: Perform Arduino IDE Upload

With Wireshark capturing:

1. Open **Arduino IDE**
2. Open a simple sketch (e.g., Blink)
3. Select **Tools → Board → Arduino UNO R4 WiFi**
4. Select **Tools → Port → COMX** (your R4's port)
5. Click **Upload** (→ button)
6. Wait for upload to complete (or fail)
7. **Stop** Wireshark capture (red square button)

---

## Step 5: Filter the Capture

In Wireshark's display filter bar, enter:

### Filter 1: All CDC Class Traffic

```
usb.bInterfaceClass == 0x0a
```

### Filter 2: USB Control Transfers Only

```
usb.transfer_type == 0x02
```

### Filter 3: SET_LINE_CODING Requests (Most Important!)

```
usb.setup.bRequest == 0x20
```

### Filter 4: Combined - CDC Control Transfers

```
usb.transfer_type == 0x02 && usb.bInterfaceClass == 0x0a
```

### Filter 5: All Traffic to Arduino VID

```
usb.idVendor == 0x2341
```

---

## Step 6: Analyze SET_LINE_CODING Packets

Look for packets with:

- **bRequest: 0x20** (SET_LINE_CODING)
- **bRequest: 0x21** (GET_LINE_CODING)
- **bRequest: 0x22** (SET_CONTROL_LINE_STATE - DTR/RTS)

### SET_LINE_CODING Packet Structure

When you find a SET_LINE_CODING packet, expand it to see:

```
USB CDC Line Coding
    dwDTERate: 1200        ← Baud rate (this triggers bootloader!)
    bCharFormat: 0         ← Stop bits
    bParityType: 0         ← Parity
    bDataBits: 8           ← Data bits
```

**Key things to look for:**

1. **1200 baud SET_LINE_CODING** - This should trigger bootloader mode
2. **Subsequent SET_LINE_CODING** - What baud rate does IDE use after reset?
3. **SET_CONTROL_LINE_STATE** - DTR/RTS signals (bRequest 0x22)
4. **Timing** - How long between 1200 touch and next communication?

---

## Step 7: Export Important Packets

1. Select the interesting packets
2. File → Export Specified Packets
3. Save as `.pcapng` for later analysis

Or copy packet details:

1. Right-click packet
2. Copy → All Visible Items

---

## What to Look For

### Expected Upload Sequence

1. **SET_LINE_CODING (1200 baud)** - Trigger bootloader
2. **SET_CONTROL_LINE_STATE (DTR=0)** - Drop DTR
3. _Pause ~1-2 seconds_ - Wait for reset
4. **SET_LINE_CODING (921600 or 115200)** - Communication baud
5. **SET_CONTROL_LINE_STATE (DTR=1, RTS=1)** - Enable signals
6. **Bulk OUT transfers** - BOSSA commands (N#, V#, etc.)

### Compare with Web Serial

After capturing Arduino IDE's sequence, we can compare:

| Step        | Arduino IDE                 | Web Serial (suspected)                                     |
| ----------- | --------------------------- | ---------------------------------------------------------- |
| 1200 touch  | SET_LINE_CODING USB control | port.open({baudRate: 1200}) - may not send USB control!    |
| Baud change | SET_LINE_CODING USB control | Changing baudRate on open port - may not send USB control! |
| DTR/RTS     | SET_CONTROL_LINE_STATE      | port.setSignals() - should work                            |

---

## Quick Wireshark Commands

### Keyboard Shortcuts

- `Ctrl+E` - Start/Stop capture
- `Ctrl+F` - Find packet
- `Ctrl+G` - Go to packet number

### Useful Filters

```
# All USB control transfers
usb.transfer_type == 0x02

# CDC class only
usb.bInterfaceClass == 0x0a

# SET_LINE_CODING only
usb.setup.bRequest == 0x20

# SET_CONTROL_LINE_STATE (DTR/RTS)
usb.setup.bRequest == 0x22

# Arduino vendor ID
usb.idVendor == 0x2341

# Specific device address
usb.device_address == 5

# Bulk transfers (actual data)
usb.transfer_type == 0x03
```

---

## Troubleshooting

### "No USBPcap interfaces visible"

- Run Wireshark as Administrator
- Reinstall USBPcap
- Restart computer after USBPcap installation

### "Capture shows no data"

- Wrong USBPcap interface selected
- Try capturing on all interfaces first
- Verify Arduino is connected and recognized

### "Too much data, can't find Arduino traffic"

- Use display filter: `usb.idVendor == 0x2341`
- Or filter by device address
- Unplug other USB devices temporarily

### "Can't see packet details"

- Click on packet in list
- Expand "USB URB" section in middle pane
- For CDC data, expand "USB CDC" section

---

## Sample Analysis Report Template

After capturing, document:

```
## Arduino IDE USB Capture Analysis

### Device Info
- Board: Arduino UNO R4 WiFi
- VID/PID: 0x2341/0x1002
- COM Port: COM5
- USB Address: 5

### Capture Timeline

| Time (s) | Direction | Type | Details |
|----------|-----------|------|---------|
| 0.000 | OUT | SET_LINE_CODING | 1200 baud |
| 0.001 | OUT | SET_CONTROL_LINE_STATE | DTR=0 RTS=0 |
| 0.100 | OUT | (port closed) | |
| 1.500 | OUT | SET_LINE_CODING | 921600 baud |
| 1.501 | OUT | SET_CONTROL_LINE_STATE | DTR=1 RTS=1 |
| 1.600 | OUT | Bulk | 80 80 80 (auto-baud) |
| 1.650 | OUT | Bulk | 4E 23 (N#) |
| 1.700 | IN | Bulk | 0A (response) |

### Key Findings
1. IDE uses 921600 baud for BOSSA communication
2. DTR dropped during 1200 touch
3. 1.5 second delay between reset and communication
4. Auto-baud sync sent before N# command
```

---

## Next Steps

After capturing:

1. Share the findings (or .pcapng file) for analysis
2. Compare timing and control transfer sequence with Web Serial behavior
3. Modify BOSSAStrategy.js to match IDE's exact sequence

---

_Last updated: December 3, 2025_
