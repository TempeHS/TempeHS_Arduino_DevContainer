# Grove 4-Digit Display (TM1637)

## Overview

The Grove 4-Digit Display is a 7-segment numeric display module featuring 12 pins of red LED segments and 4 colon-point LEDs, driven by the TM1637 chip. The display uses a simple 2-wire (CLK + DIO) communication protocol, making it easy to show numbers, time, temperature, and custom patterns with adjustable brightness.

**Last Verified:** 2025-11-17

## Authoritative References

- **Seeed Wiki:** https://wiki.seeedstudio.com/Grove-4-Digit_Display/
- **GitHub Library:** https://github.com/Seeed-Studio/Grove_4Digital_Display
- **TM1637 Datasheet:** https://www.mcielectronics.cl/website_MCI/static/documents/Datasheet_TM1637.pdf
- **Grove Base Kit:** Part of Seeed Grove Beginner Kit expansion modules

## Hardware Setup

### Pin Configuration

| Grove Port | Pin Function | Arduino Uno R4 |
| ---------- | ------------ | -------------- |
| Yellow     | CLK (Clock)  | D2 (default)   |
| White      | DIO (Data)   | D3 (default)   |
| Red        | VCC          | 5V             |
| Black      | GND          | GND            |

**Connection Type:** Digital (2-wire custom protocol)  
**Default Pins:** D2 (CLK), D3 (DIO) - can be reassigned to any digital pin

### Physical Specifications

- **Display Type:** 0.36" 7-segment LED, common anode
- **Display Color:** Red (bright)
- **Digits:** 4 numeric digits + colon separator
- **Segments per Digit:** 8 (7-segment + decimal point)
- **Brightness Levels:** 8 adjustable levels (0-7)
- **Viewing Angle:** 120°
- **Operating Voltage:** 3.3V - 5V
- **Operating Current:** 80mA @ 5V (all segments on, max brightness)
- **Module Dimensions:** 42mm × 24mm

## Software Prerequisites

### Required Libraries

Install via Arduino Library Manager or CLI:

```bash
# Official Seeed TM1637 library
arduino-cli lib install "Grove 4-Digit Display"
```

Alternative compatible libraries:

```bash
# More feature-rich TM1637 library
arduino-cli lib install "TM1637Display"
```

### Library Compatibility

- **Seeed Grove_4Digital_Display:** Official library, simple API
- **TM1637Display by Avishay Orpaz:** More features, animation support
- **TM1637TinyDisplay:** Lightweight, 900 bytes smaller

## Basic Example Code

### 1. Simple Number Display

Display counting numbers with brightness control:

```cpp
/**
 * Grove 4-Digit Display - Basic Number Counter
 *
 * Hardware Connections:
 * - CLK → D2 (Yellow wire)
 * - DIO → D3 (White wire)
 * - VCC → 5V (Red wire)
 * - GND → GND (Black wire)
 */

#include "TM1637.h"

// Pin definitions
#define CLK_PIN 2
#define DIO_PIN 3

TM1637 display(CLK_PIN, DIO_PIN);

void setup() {
  display.init();
  display.set(BRIGHT_TYPICAL);  // Set brightness (0-7)
}

void loop() {
  // Count from 0000 to 9999
  for (int i = 0; i <= 9999; i++) {
    displayNumber(i);
    delay(100);
  }
}

void displayNumber(int number) {
  // Extract individual digits
  int digit1 = (number / 1000) % 10;
  int digit2 = (number / 100) % 10;
  int digit3 = (number / 10) % 10;
  int digit4 = number % 10;

  // Display digits at positions 0-3
  display.display(0, digit1);
  display.display(1, digit2);
  display.display(2, digit3);
  display.display(3, digit4);
}
```

### 2. Digital Clock Display

Show time with blinking colon separator:

```cpp
/**
 * Grove 4-Digit Display - Digital Clock
 * Shows HH:MM format with blinking colon
 */

#include "TM1637.h"

#define CLK_PIN 2
#define DIO_PIN 3

TM1637 display(CLK_PIN, DIO_PIN);

// Time variables
int hours = 12;
int minutes = 0;
int seconds = 0;
bool colonOn = true;

void setup() {
  display.init();
  display.set(5);  // Medium brightness

  // Optional: Initialize with real time from RTC module
  // or get time from user via Serial
}

void loop() {
  updateTime();
  displayTime();
  delay(1000);  // Update every second
}

void updateTime() {
  seconds++;

  if (seconds >= 60) {
    seconds = 0;
    minutes++;
  }

  if (minutes >= 60) {
    minutes = 0;
    hours++;
  }

  if (hours >= 24) {
    hours = 0;
  }

  // Toggle colon every second
  colonOn = !colonOn;
}

void displayTime() {
  int digit1 = hours / 10;
  int digit2 = hours % 10;
  int digit3 = minutes / 10;
  int digit4 = minutes % 10;

  display.display(0, digit1);
  display.display(1, digit2);
  display.display(2, digit3);
  display.display(3, digit4);

  // Show/hide colon (position between digit 1 and 2)
  display.point(colonOn ? POINT_ON : POINT_OFF);
}
```

### 3. Temperature Display

Show temperature readings with degree symbol:

```cpp
/**
 * Grove 4-Digit Display - Temperature Display
 * Shows temperature in format: 23.5°C or 74.3°F
 * Connect DHT20 to I2C for actual readings
 */

#include "TM1637.h"

#define CLK_PIN 2
#define DIO_PIN 3

TM1637 display(CLK_PIN, DIO_PIN);

// Custom segment patterns
const uint8_t DEGREE_SYMBOL = 0x63;  // Circle for degree °
const uint8_t C_LETTER = 0x39;       // Letter C

void setup() {
  display.init();
  display.set(BRIGHT_TYPICAL);
}

void loop() {
  // Example: Read from temperature sensor
  // float temp = readTemperatureSensor();
  float temp = 23.5;  // Simulated reading

  displayTemperature(temp);
  delay(2000);
}

void displayTemperature(float temperature) {
  // Convert to integer with one decimal place
  int tempInt = (int)(temperature * 10);  // 23.5 → 235

  int digit1 = (tempInt / 100) % 10;      // 2
  int digit2 = (tempInt / 10) % 10;       // 3
  int digit3 = tempInt % 10;              // 5

  // Display: "23.5"
  display.display(0, digit1);
  display.display(1, digit2);
  display.display(2, digit3);

  // Show degree symbol or 'C' in last position
  display.display(3, C_LETTER);  // or DEGREE_SYMBOL

  // Turn on decimal point after digit 1 (position 1)
  display.point(POINT_ON);
}
```

### 4. Countdown Timer

Create a countdown timer with alarm:

```cpp
/**
 * Grove 4-Digit Display - Countdown Timer
 * Shows MM:SS countdown with buzzer alarm
 * Connect buzzer to D5
 */

#include "TM1637.h"

#define CLK_PIN 2
#define DIO_PIN 3
#define BUZZER_PIN 5

TM1637 display(CLK_PIN, DIO_PIN);

int totalSeconds = 180;  // 3 minutes = 180 seconds
bool timerRunning = true;

void setup() {
  display.init();
  display.set(7);  // Max brightness
  pinMode(BUZZER_PIN, OUTPUT);
}

void loop() {
  if (timerRunning && totalSeconds > 0) {
    displayCountdown(totalSeconds);
    delay(1000);
    totalSeconds--;
  } else if (totalSeconds == 0) {
    // Timer finished - sound alarm
    soundAlarm();
    totalSeconds = -1;  // Prevent repeat
    timerRunning = false;
  } else {
    // Display "0000" and wait for reset
    displayCountdown(0);
    delay(1000);
  }
}

void displayCountdown(int seconds) {
  int minutes = seconds / 60;
  int secs = seconds % 60;

  int digit1 = minutes / 10;
  int digit2 = minutes % 10;
  int digit3 = secs / 10;
  int digit4 = secs % 10;

  display.display(0, digit1);
  display.display(1, digit2);
  display.display(2, digit3);
  display.display(3, digit4);

  // Show colon separator
  display.point(POINT_ON);
}

void soundAlarm() {
  // Flash display and beep 5 times
  for (int i = 0; i < 5; i++) {
    display.set(0);  // Brightness off
    digitalWrite(BUZZER_PIN, HIGH);
    delay(200);

    display.set(7);  // Brightness on
    digitalWrite(BUZZER_PIN, LOW);
    delay(200);
  }
}
```

### 5. Scrolling Text Effect

Display scrolling messages:

```cpp
/**
 * Grove 4-Digit Display - Scrolling Text
 * Shows scrolling messages using custom segment patterns
 */

#include "TM1637.h"

#define CLK_PIN 2
#define DIO_PIN 3

TM1637 display(CLK_PIN, DIO_PIN);

// Custom character patterns (7-segment encoding)
const uint8_t CHAR_H = 0x76;  // |-|
const uint8_t CHAR_E = 0x79;  // |_
const uint8_t CHAR_L = 0x38;  // |_
const uint8_t CHAR_P = 0x73;  // |-
const uint8_t CHAR_SPACE = 0x00;

void setup() {
  display.init();
  display.set(5);
}

void loop() {
  scrollMessage("HELP", 4, 300);
  delay(1000);
}

void scrollMessage(const char* message, int length, int scrollDelay) {
  uint8_t segments[length];

  // Convert message to segment patterns
  for (int i = 0; i < length; i++) {
    segments[i] = charToSegment(message[i]);
  }

  // Scroll through message
  for (int pos = 0; pos <= length; pos++) {
    for (int digit = 0; digit < 4; digit++) {
      int charIndex = pos + digit - 3;
      if (charIndex >= 0 && charIndex < length) {
        display.display(digit, segments[charIndex]);
      } else {
        display.display(digit, CHAR_SPACE);
      }
    }
    delay(scrollDelay);
  }
}

uint8_t charToSegment(char c) {
  switch (c) {
    case 'H': return CHAR_H;
    case 'E': return CHAR_E;
    case 'L': return CHAR_L;
    case 'P': return CHAR_P;
    case ' ': return CHAR_SPACE;
    default: return 0x00;
  }
}
```

## Testing Procedure

### Step 1: Basic Connection Test

1. Connect display to Arduino (CLK→D2, DIO→D3)
2. Upload simple number display code
3. **Expected Result:** Display shows counting numbers 0000-9999
4. Verify all 4 digits illuminate correctly

### Step 2: Brightness Control Test

```cpp
// Test all 8 brightness levels
for (int brightness = 0; brightness <= 7; brightness++) {
  display.set(brightness);
  displayNumber(8888);  // All segments on
  delay(500);
}
```

**Expected:** Display brightness changes from dim (0) to bright (7)

### Step 3: Colon Display Test

```cpp
// Test colon separator
display.point(POINT_ON);
delay(1000);
display.point(POINT_OFF);
delay(1000);
```

**Expected:** Colon between digits 2 and 3 turns on/off

### Step 4: Individual Segment Test

```cpp
// Display "8888" to test all segments
for (int pos = 0; pos < 4; pos++) {
  display.display(pos, 8);
}
```

**Expected:** All 28 LED segments illuminate (7 segments × 4 digits)

## Troubleshooting

| Problem                     | Possible Cause         | Solution                                       |
| --------------------------- | ---------------------- | ---------------------------------------------- |
| Display completely dark     | Power issue            | Check VCC/GND connections, verify 5V power     |
| No response from display    | Wrong pins             | Verify CLK→D2, DIO→D3 in code and wiring       |
| Random characters           | Loose connection       | Check Grove cable seating, re-plug firmly      |
| Some segments not lit       | Defective LED          | Test with "8888" display; may need replacement |
| Dim display                 | Low brightness setting | Increase brightness: `display.set(7)`          |
| Flickering display          | EMI interference       | Keep wires short, add 0.1µF capacitor near VCC |
| Display shows wrong numbers | Logic error            | Check digit calculation: `(num / 10) % 10`     |
| Colon not working           | Library version        | Some libraries use different colon functions   |
| Code won't compile          | Missing library        | Install "Grove 4-Digit Display" library        |
| Display freezes             | Timing issue           | Add short delays between display updates       |

### Debug Commands

```cpp
// Serial debugging
Serial.begin(9600);
Serial.print("Displaying: ");
Serial.println(number);

// Test individual digit positions
for (int pos = 0; pos < 4; pos++) {
  display.display(pos, pos);  // Show 0,1,2,3
  delay(500);
}
```

## Technical Specifications

### Electrical Characteristics

- **Operating Voltage:** 3.3V - 5.5V DC
- **Logic Level:** 5V compatible (Uno R4 Wifi safe)
- **Current Consumption:**
  - Idle: 2mA
  - All segments max brightness: 80mA
  - Typical usage: 20-40mA
- **Max Current per Segment:** 10mA

### Display Specifications

- **Display Type:** Common anode 7-segment LED
- **Digit Height:** 0.36 inches (9.14mm)
- **Segment Width:** 0.5mm
- **Color:** Red (620-625nm)
- **Luminous Intensity:** 20-40mcd per segment
- **Forward Voltage:** 2.0V typical (per LED)
- **Viewing Angle:** 120° horizontal/vertical

### TM1637 Driver Specifications

- **Communication Protocol:** 2-wire serial (CLK + DIO)
- **Data Rate:** Up to 250kHz
- **Brightness Levels:** 8 levels (1/16 to 14/16 duty cycle)
- **Key Scanning:** 8×2 matrix (not used in display mode)
- **Operating Temperature:** -40°C to +85°C
- **Package:** SOP28

### 7-Segment Encoding

Each digit uses 8 bits to control segments:

```
Bit:  7  6  5  4  3  2  1  0
Seg:  DP A  B  C  D  E  F  G

  ---A---
 |       |
 F       B
 |       |
  ---G---
 |       |
 E       C
 |       |
  ---D---  DP
```

Example patterns:

- `0` = `0x3F` (segments A,B,C,D,E,F)
- `1` = `0x06` (segments B,C)
- `8` = `0x7F` (all segments)
- `A` = `0x77` (segments A,B,C,E,F,G)

## Common Use Cases

### 1. Smart Home Dashboard

Display room temperature, humidity, or time on a fixed display panel.

```cpp
// Rotate through different readings every 5 seconds
displayTemperature(23.5);
delay(5000);
displayHumidity(65);
delay(5000);
displayTime(12, 45);
```

### 2. Kitchen Timer

Create cooking countdown timer with audible alarm.

```cpp
// Set timer for 10 minutes
int cookingTime = 600;  // seconds
countdownTimer(cookingTime);
```

### 3. Scoreboard

Display game scores for table tennis, darts, or arcade games.

```cpp
// Player 1: 15 points, Player 2: 12 points
display.display(0, 1);
display.display(1, 5);
display.display(2, 1);
display.display(3, 2);
```

### 4. RPM Meter

Show motor or fan RPM readings.

```cpp
// Display RPM: 2450
int rpm = readMotorRPM();
displayNumber(rpm);
```

### 5. Voltage/Current Monitor

Display power supply readings from INA219 sensor.

```cpp
// Show voltage: 12.45V
float voltage = readVoltage();
displayVoltage(voltage);
```

### 6. Lap Timer

Sports stopwatch showing minutes and seconds.

```cpp
// Show lap time: 01:23 (1 minute 23 seconds)
displayTime(elapsedMinutes, elapsedSeconds);
```

## Integration Examples

### With DHT20 Temperature Sensor

```cpp
#include "TM1637.h"
#include "DHT20.h"

TM1637 display(2, 3);
DHT20 dht20;

void loop() {
  float temp = dht20.getTemperature();
  displayTemperature(temp);
  delay(2000);
}
```

### With Rotary Encoder

```cpp
// Use rotary encoder to adjust displayed number
#include "TM1637.h"

TM1637 display(2, 3);
int value = 0;

void loop() {
  value += readEncoder();  // Returns -1, 0, or +1
  value = constrain(value, 0, 9999);
  displayNumber(value);
}
```

### With Real-Time Clock (DS1307)

```cpp
#include "TM1637.h"
#include "RTClib.h"

TM1637 display(2, 3);
RTC_DS1307 rtc;

void loop() {
  DateTime now = rtc.now();
  displayTime(now.hour(), now.minute());
  delay(1000);
}
```

## Performance Considerations

### Refresh Rate

- TM1637 internally refreshes at ~1kHz (no visible flicker)
- Code update rate: 10-50Hz typical (100ms - 20ms delays)
- Avoid updates faster than 100Hz (wastes CPU cycles)

### Power Consumption

- **Standby:** 2mA (all segments off)
- **Displaying "1":** 4mA (2 segments × 2mA)
- **Displaying "8888":** 80mA (all segments max brightness)
- **Typical clock display:** 25-40mA
- Use brightness level 3-5 for battery applications

### Memory Usage

- Grove library: ~1.5KB program memory
- TM1637Display library: ~2KB program memory
- RAM usage: ~50 bytes
- Perfect for memory-constrained projects

## Comparison: 4-Digit Display vs Alternatives

| Feature           | TM1637 4-Digit | OLED 0.96"    | LCD 16×2      |
| ----------------- | -------------- | ------------- | ------------- |
| **Resolution**    | 4 digits       | 128×64 px     | 16×2 chars    |
| **Content**       | Numbers only   | Graphics/text | Text only     |
| **Brightness**    | Very high      | Medium        | Low (backlit) |
| **Visibility**    | 5m+            | 2m            | 1m            |
| **Power**         | 20-80mA        | 15-25mA       | 50-150mA      |
| **Pins Used**     | 2 (CLK+DIO)    | 2 (I2C)       | 2 (I2C)       |
| **Viewing Angle** | 120°           | 160°          | 45°           |
| **Cost**          | $3-5           | $5-8          | $4-6          |
| **Best For**      | Clocks, meters | Dashboards    | Menus         |

### When to Use 4-Digit Display

- ✅ Need large, visible numbers from distance
- ✅ Outdoor/bright environment visibility
- ✅ Simple numeric data (time, temperature, score)
- ✅ Low complexity projects
- ✅ Battery-powered when using low brightness

### When to Use OLED Instead

- ✅ Need graphs, icons, or complex text
- ✅ Multiple lines of information
- ✅ Menu systems or user interfaces
- ✅ Debugging output with text

## Additional Resources

### Library Documentation

- **Grove Library:** https://github.com/Seeed-Studio/Grove_4Digital_Display/blob/master/TM1637.h
- **TM1637Display Library:** https://github.com/avishorp/TM1637
- **Arduino Reference:** https://www.arduino.cc/reference/en/libraries/tm1637/

### Example Projects

- **Digital Clock:** https://wiki.seeedstudio.com/Grove-4-Digit_Display/#play-with-arduino
- **Temperature Display:** Seeed wiki examples section
- **Game Timer:** Community forum projects

### Related Products

- **Grove - Red LED Matrix 8×8:** For custom patterns
- **Grove - OLED Display 0.96":** For text/graphics
- **Grove - LCD RGB Backlight:** For longer text displays
- **DS1307 RTC Module:** Add real-time clock capability

### Technical Documents

- **TM1637 Command Set:** Section 6.2 in datasheet
- **LED Drive Current:** Section 7.2 in datasheet
- **7-Segment Font Tables:** Appendix A in Seeed wiki

---

_This guide is part of the TempeHS Arduino DevContainer Knowledge Base. For issues or improvements, see [CONTRIBUTING.md](../../CONTRIBUTING.md)._
