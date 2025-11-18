# Grove LED Bar v2.0 (MY9221)

## Overview

The Grove LED Bar v2.0 is a 10-segment LED array module driven by the MY9221 LED driver chip. It provides a visual gradient display perfect for showing levels, progress bars, sound visualizations, and battery status. The module uses a simple 2-wire interface (CLK + DI) and supports both individual LED control and automatic dimming for smooth animations.

**Last Verified:** 2025-11-17

## Authoritative References

- **Seeed Wiki:** https://wiki.seeedstudio.com/Grove-LED_Bar/
- **GitHub Library:** https://github.com/Seeed-Studio/Grove_LED_Bar
- **MY9221 Datasheet:** http://www.my-semi.com/file/MY9221_BF_0.91.pdf
- **Grove Base Kit:** Expansion module compatible with all Grove systems

## Hardware Setup

### Pin Configuration

| Grove Port | Pin Function | Arduino Uno R4 |
| ---------- | ------------ | -------------- |
| Yellow     | DI (Data In) | D8 (default)   |
| White      | DCKI (Clock) | D9 (default)   |
| Red        | VCC          | 5V             |
| Black      | GND          | GND            |

**Connection Type:** Digital (2-wire serial protocol)  
**Default Pins:** D8 (DI), D9 (DCKI) - any digital pins work  
**Daisy Chaining:** Connect DO/DCKO of first bar to DI/DCKI of second bar

### Physical Specifications

- **Display Type:** 10-segment linear LED array
- **LED Color:** Green (standard), Red/Yellow/Blue available
- **LED Size:** 5mm × 2mm rectangular LEDs
- **Bar Length:** 25mm active LED area
- **Brightness Levels:** 16 levels per LED (4-bit PWM)
- **Operating Voltage:** 3.3V - 5V
- **Module Dimensions:** 40mm × 20mm × 12mm
- **Mounting Holes:** M3 compatible

## Software Prerequisites

### Required Libraries

Install via Arduino Library Manager or CLI:

```bash
# Official Seeed LED Bar library
arduino-cli lib install "Grove LED Bar"
```

Alternative installation:

```bash

```
