# Grove 0.96" OLED Display (128×64)

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-OLED-Display-0.96-SSD1315/  
**Library Repo:** https://github.com/olikraus/u8g2  
**Connection Type:** I2C

## Overview

The Grove 0.96" OLED Display features a 128×64 pixel monochrome (white) screen. Uses I2C interface for easy connection. Great for displaying text, graphics, sensor readings, and simple animations. Low power consumption and high contrast.

## Authoritative References

- [Grove OLED Display 0.96" - Seeed Wiki](https://wiki.seeedstudio.com/Grove-OLED-Display-0.96-SSD1315/)
- [U8g2 Library Documentation](https://github.com/olikraus/u8g2)
- [U8g2 Reference Manual](https://github.com/olikraus/u8g2/wiki/u8g2reference)

## Hardware Setup

- **Connection Type:** I2C
- **Grove Port:** I2C port on Base Shield
- **Display Controller:** SSD1315 (SSD1306 compatible)
- **Resolution:** 128×64 pixels
- **Display Area:** 0.96" diagonal
- **Color:** Monochrome white
- **Power Requirements:** 3.3V - 5V
- **I2C Address:** 0x3C (default, 0x3D alternate)
- **Wiring:** Connect to Grove Base Shield I2C port using 4-pin Grove cable

![Grove OLED Display](https://files.seeedstudio.com/wiki/Grove_OLED_Display_0.96/images/main.jpg)

## Software Prerequisites

### Required Libraries

```bash
arduino-cli lib install "U8g2"
```

Or via Arduino IDE: Sketch → Include Library → Manage Libraries → Search "U8g2"

## Example Code

```cpp
/*
  Purpose: Basic OLED display text example
  Notes:
    1. Connect to I2C port
    2. U8g2 library required
    3. Display resolution: 128x64 pixels
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-OLED-Display-0.96-SSD1315/
  Library: https://github.com/olikraus/u8g2
*/

#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>

// Initialize display (SSD1306 compatible)
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE);

void setup(void) {
  u8g2.begin();
  Serial.begin(9600);
  Serial.println("OLED Display initialized");
}

void loop(void) {
  u8g2.clearBuffer();                   // Clear internal memory

  u8g2.setFont(u8g2_font_ncenB08_tr);   // Choose font
  u8g2.drawStr(0, 15, "Hello World!");  // Write at (x=0, y=15)

  u8g2.setFont(u8g2_font_ncenB14_tr);   // Larger font
  u8g2.drawStr(0, 40, "Arduino");

  u8g2.sendBuffer();                    // Transfer to display

  delay(2000);
}
```

### Display Sensor Readings

```cpp
#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>

U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

const int sensorPin = A0;

void setup(void) {
  u8g2.begin();
  pinMode(sensorPin, INPUT);
}

void loop(void) {
  int sensorValue = analogRead(sensorPin);
  float voltage = sensorValue * (5.0 / 16383.0);  // Uno R4 14-bit ADC

  u8g2.clearBuffer();

  u8g2.setFont(u8g2_font_ncenB08_tr);
  u8g2.drawStr(0, 10, "Sensor Reading:");

  u8g2.setFont(u8g2_font_ncenB14_tr);

  // Display value
  char valueStr[16];
  sprintf(valueStr, "Value: %d", sensorValue);
  u8g2.drawStr(0, 30, valueStr);

  // Display voltage
  char voltageStr[16];
  dtostrf(voltage, 4, 2, voltageStr);  // Convert float to string
  u8g2.drawStr(0, 50, "V: ");
  u8g2.drawStr(25, 50, voltageStr);

  u8g2.sendBuffer();

  delay(500);
}
```

**Key Points:**

- `clearBuffer()` - Clear internal memory before drawing
- `drawStr(x, y, text)` - Draw text at position (x, y)
- `setFont()` - Select font (many included in U8g2)
- `sendBuffer()` - Transfer buffer to display
- Y-coordinate is baseline of text, not top
- Coordinate (0,0) is top-left corner
- Use `sprintf()` or `dtostrf()` to convert numbers to strings

## Testing Procedure

1. Connect OLED display to I2C port
2. Install U8g2 library
3. Upload basic example
4. **Expected output:**
   - "Hello World!" appears on screen in small font
   - "Arduino" appears below in larger font
5. Screen refreshes every 2 seconds

## Troubleshooting

| Problem           | Solution                                                   |
| ----------------- | ---------------------------------------------------------- |
| Blank screen      | Check I2C connections, verify power, try alternate address |
| Garbled display   | Wrong controller type; try U8G2_SSD1315 instead of SSD1306 |
| Text cut off      | Y-coordinate too low; text baseline must be on screen      |
| Compilation error | Install U8g2 library, include Wire.h                       |
| Screen flickers   | Use `clearBuffer()` once at start of each frame            |

## Technical Specifications

- **Display Technology:** OLED (Organic LED)
- **Controller Chip:** SSD1315 (SSD1306 compatible)
- **Resolution:** 128×64 pixels
- **Display Size:** 0.96" diagonal
- **Active Area:** 21.74mm × 10.86mm
- **Pixel Pitch:** 0.17mm × 0.17mm
- **Color:** Monochrome white
- **Interface:** I2C
- **I2C Address:** 0x3C (default), 0x3D (alternate)
- **Operating Voltage:** 3.3V - 5V
- **Viewing Angle:** >160°
- **Contrast Ratio:** > 2000:1

## Common Use Cases

### Multi-Line Text Display

```cpp
void loop() {
  u8g2.clearBuffer();

  u8g2.setFont(u8g2_font_ncenB08_tr);
  u8g2.drawStr(0, 10, "Line 1");
  u8g2.drawStr(0, 25, "Line 2");
  u8g2.drawStr(0, 40, "Line 3");
  u8g2.drawStr(0, 55, "Line 4");

  u8g2.sendBuffer();
  delay(2000);
}
```

### Temperature Display with DHT20

```cpp
#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>
#include <DHT20.h>

U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);
DHT20 dht20;

void setup() {
  u8g2.begin();
  Wire.begin();
  dht20.begin();
}

void loop() {
  float temp = dht20.getTemperature();
  float humid = dht20.getHumidity() * 100;

  u8g2.clearBuffer();

  u8g2.setFont(u8g2_font_ncenB10_tr);
  u8g2.drawStr(0, 15, "Environment");

  char tempStr[20];
  sprintf(tempStr, "Temp: %.1f C", temp);
  u8g2.drawStr(0, 35, tempStr);

  char humidStr[20];
  sprintf(humidStr, "Humid: %.0f%%", humid);
  u8g2.drawStr(0, 55, humidStr);

  u8g2.sendBuffer();
  delay(2000);
}
```

### Simple Animation (Bouncing Ball)

```cpp
int x = 0;
int y = 32;
int xSpeed = 2;
int ySpeed = 2;

void loop() {
  u8g2.clearBuffer();

  // Draw ball (filled circle)
  u8g2.drawDisc(x, y, 5);

  // Update position
  x += xSpeed;
  y += ySpeed;

  // Bounce off edges
  if (x <= 5 || x >= 123) xSpeed = -xSpeed;
  if (y <= 5 || y >= 59) ySpeed = -ySpeed;

  u8g2.sendBuffer();
  delay(50);
}
```

### Progress Bar

```cpp
void displayProgress(int percent) {
  u8g2.clearBuffer();

  u8g2.setFont(u8g2_font_ncenB08_tr);
  u8g2.drawStr(35, 20, "Loading...");

  // Progress bar outline
  u8g2.drawFrame(10, 30, 108, 15);

  // Progress fill
  int fillWidth = map(percent, 0, 100, 0, 106);
  u8g2.drawBox(11, 31, fillWidth, 13);

  // Percentage text
  char percentStr[8];
  sprintf(percentStr, "%d%%", percent);
  u8g2.drawStr(55, 55, percentStr);

  u8g2.sendBuffer();
}

void loop() {
  for (int i = 0; i <= 100; i += 5) {
    displayProgress(i);
    delay(200);
  }
  delay(1000);
}
```

### Menu System (3 Items)

```cpp
int selectedItem = 0;

void displayMenu() {
  u8g2.clearBuffer();

  u8g2.setFont(u8g2_font_ncenB08_tr);

  // Menu items
  u8g2.drawStr(10, 15, "Option 1");
  u8g2.drawStr(10, 35, "Option 2");
  u8g2.drawStr(10, 55, "Option 3");

  // Selection indicator (arrow)
  int arrowY = 15 + (selectedItem * 20);
  u8g2.drawStr(0, arrowY, ">");

  u8g2.sendBuffer();
}

void loop() {
  displayMenu();

  // Cycle through menu items
  selectedItem = (selectedItem + 1) % 3;
  delay(1000);
}
```

## Drawing Functions Reference

### Text

```cpp
u8g2.drawStr(x, y, "text");          // Draw string
u8g2.setFont(font_name);             // Set font
```

### Shapes

```cpp
u8g2.drawPixel(x, y);                // Single pixel
u8g2.drawLine(x1, y1, x2, y2);       // Line
u8g2.drawFrame(x, y, w, h);          // Rectangle outline
u8g2.drawBox(x, y, w, h);            // Filled rectangle
u8g2.drawCircle(x, y, r);            // Circle outline
u8g2.drawDisc(x, y, r);              // Filled circle
```

### Buffer Management

```cpp
u8g2.clearBuffer();                  // Clear internal memory
u8g2.sendBuffer();                   // Send to display
```

## Popular Fonts

```cpp
u8g2_font_ncenB08_tr    // Small, 8px
u8g2_font_ncenB10_tr    // Medium, 10px
u8g2_font_ncenB14_tr    // Large, 14px
u8g2_font_ncenB18_tr    // Extra large, 18px
u8g2_font_ncenB24_tr    // Huge, 24px

// Monospace fonts
u8g2_font_6x10_tr       // 6x10 fixed width
u8g2_font_7x14_tr       // 7x14 fixed width

// Symbol fonts
u8g2_font_unifont_t_symbols  // Icons and symbols
```

See [U8g2 font list](https://github.com/olikraus/u8g2/wiki/fntlistall) for complete catalog.

## Display Orientation

```cpp
// Rotate display during initialization
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);  // No rotation
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R1, U8X8_PIN_NONE);  // 90° clockwise
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R2, U8X8_PIN_NONE);  // 180°
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R3, U8X8_PIN_NONE);  // 270° clockwise
```

## Power Management

```cpp
u8g2.setPowerSave(0);  // Display on
u8g2.setPowerSave(1);  // Display off (saves power)
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining OLED display with:

- Temperature/humidity sensor (weather station)
- Ultrasonic ranger (distance meter)
- Accelerometer (tilt display)
- Button (menu navigation)
- Multiple sensors (dashboard)

## Additional Resources

- [U8g2 Wiki](https://github.com/olikraus/u8g2/wiki)
- [U8g2 Font List](https://github.com/olikraus/u8g2/wiki/fntlistall)
- [U8g2 Setup Guide](https://github.com/olikraus/u8g2/wiki/setup_tutorial)
- [SSD1306 Datasheet](https://cdn-shop.adafruit.com/datasheets/SSD1306.pdf)
- [Graphics Programming Tutorial](https://github.com/olikraus/u8g2/wiki/u8g2reference)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Library Version:** U8g2 (check [releases](https://github.com/olikraus/u8g2/releases))
