# Grove LCD RGB Backlight 16×2

**Last Verified:** 2025-11-18  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-LCD_RGB_Backlight/  
**Library Repo:** https://github.com/Seeed-Studio/Grove_LCD_RGB_Backlight  
**Connection Type:** I2C

## Overview

The Grove LCD RGB Backlight displays 16 characters per line across 2 lines (32 characters total) with programmable RGB backlight. Uses standard HD44780 LCD controller with I2C interface (only 2 wires). Backlight color fully customizable (16.7 million colors). Ideal for user interfaces, status displays, sensor readouts, menus, and interactive projects requiring text display.

## Authoritative References

- [Grove LCD RGB Backlight - Seeed Wiki](https://wiki.seeedstudio.com/Grove-LCD_RGB_Backlight/)
- [Grove_LCD_RGB_Backlight Library - GitHub](https://github.com/Seeed-Studio/Grove_LCD_RGB_Backlight)
- [HD44780 LCD Controller Datasheet](https://www.sparkfun.com/datasheets/LCD/HD44780.pdf)

## Hardware Setup

- **Connection Type:** I2C
- **Grove Port:** Any I2C port (LCD address 0x3E, RGB address 0x62)
- **Display:** 16×2 character LCD (32 characters total)
- **Character Size:** 5×8 dots per character
- **Backlight:** RGB LED (red, green, blue independently adjustable)
- **Operating Voltage:** 3.3V - 5V
- **Current:** ~100mA @ max brightness white backlight
- **Viewing Angle:** 30° (adjustable with contrast pot on back)
- **Response Time:** 100ms typical (HD44780)
- **Character Set:** ASCII + Japanese katakana + custom characters (8 slots)
- **Wiring:** Connect to Grove Base Shield I2C port using 4-pin Grove cable

![Grove LCD RGB](https://files.seeedstudio.com/wiki/Grove_LCD_RGB_Backlight/images/intro.jpg)

## Software Prerequisites

Install the Grove LCD RGB Backlight library:

```bash
# Method 1: Arduino Library Manager
# Open Arduino IDE → Tools → Manage Libraries
# Search "Grove LCD RGB Backlight" → Install

# Method 2: Manual installation
cd ~/Arduino/libraries
git clone https://github.com/Seeed-Studio/Grove_LCD_RGB_Backlight.git
```

**Library Dependencies:**

- Wire.h (built-in I2C library)

## Example Code

```cpp
/*
  Purpose: Display text on 16×2 LCD with RGB backlight
  Notes:
    1. Connect to I2C port
    2. 16 characters per row, 2 rows total
    3. RGB backlight: setRGB(red, green, blue) - each 0-255
    4. Cursor position: setCursor(column, row) - column 0-15, row 0-1
    5. Use \n for line breaks or manual positioning
  Author: Ben Jones 14/7/23
  Source: https://github.com/Seeed-Studio/Grove_LCD_RGB_Backlight
*/

#include <Wire.h>
#include "rgb_lcd.h"

rgb_lcd lcd;

void setup() {
  Serial.begin(9600);

  Serial.println("16×2 LCD RGB Backlight");

  // Initialize LCD (16 columns, 2 rows)
  lcd.begin(16, 2);

  // Set backlight color (R, G, B: 0-255)
  lcd.setRGB(0, 255, 0);  // Green backlight

  // Display text
  lcd.print("Hello, World!");
  lcd.setCursor(0, 1);  // Column 0, Row 1 (second line)
  lcd.print("Grove LCD RGB");

  Serial.println("Display initialized");
}

void loop() {
  // Update text every 2 seconds
  delay(2000);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Uptime: ");
  lcd.print(millis() / 1000);
  lcd.print("s");

  lcd.setCursor(0, 1);
  lcd.print("Status: OK");
}
```

### Rainbow Backlight Effect

```cpp
#include <Wire.h>
#include "rgb_lcd.h"

rgb_lcd lcd;

void setup() {
  lcd.begin(16, 2);
  lcd.print("Rainbow Effect");
  lcd.setCursor(0, 1);
  lcd.print("Cycling colors");
}

void loop() {
  // Cycle through rainbow colors
  for (int hue = 0; hue < 360; hue += 5) {
    // Convert HSV to RGB
    int r, g, b;
    hsvToRgb(hue, 255, 255, r, g, b);
    lcd.setRGB(r, g, b);
    delay(50);
  }
}

void hsvToRgb(int h, int s, int v, int &r, int &g, int &b) {
  float H = h / 60.0;
  float S = s / 255.0;
  float V = v / 255.0;

  int i = (int)H;
  float f = H - i;
  float p = V * (1 - S);
  float q = V * (1 - S * f);
  float t = V * (1 - S * (1 - f));

  switch (i % 6) {
    case 0: r = V*255; g = t*255; b = p*255; break;
    case 1: r = q*255; g = V*255; b = p*255; break;
    case 2: r = p*255; g = V*255; b = t*255; break;
    case 3: r = p*255; g = q*255; b = V*255; break;
    case 4: r = t*255; g = p*255; b = V*255; break;
    case 5: r = V*255; g = p*255; b = q*255; break;
  }
}
```

### Temperature & Humidity Display

```cpp
#include <Wire.h>
#include "rgb_lcd.h"

rgb_lcd lcd;

void setup() {
  lcd.begin(16, 2);
  lcd.setRGB(100, 200, 255);  // Light blue
}

void loop() {
  // Simulate sensor readings (replace with actual sensor)
  float temperature = random(180, 280) / 10.0;  // 18.0-28.0°C
  float humidity = random(300, 700) / 10.0;     // 30.0-70.0%

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Temp: ");
  lcd.print(temperature, 1);
  lcd.print((char)223);  // Degree symbol
  lcd.print("C");

  lcd.setCursor(0, 1);
  lcd.print("Humid: ");
  lcd.print(humidity, 1);
  lcd.print("%");

  // Color indicates temperature
  if (temperature < 20) {
    lcd.setRGB(0, 100, 255);  // Cold = Blue
  } else if (temperature < 25) {
    lcd.setRGB(0, 255, 0);    // Comfortable = Green
  } else {
    lcd.setRGB(255, 100, 0);  // Hot = Orange
  }

  delay(2000);
}
```

### Interactive Menu System

```cpp
#include <Wire.h>
#include "rgb_lcd.h"

rgb_lcd lcd;

const int buttonUp = 2;
const int buttonDown = 3;
const int buttonSelect = 4;

String menuItems[] = {"Start System", "Settings", "View Stats", "Power Off"};
int menuIndex = 0;
int menuSize = 4;

void setup() {
  pinMode(buttonUp, INPUT_PULLUP);
  pinMode(buttonDown, INPUT_PULLUP);
  pinMode(buttonSelect, INPUT_PULLUP);

  lcd.begin(16, 2);
  lcd.setRGB(0, 150, 255);
  displayMenu();
}

void loop() {
  // Navigate menu
  if (digitalRead(buttonUp) == LOW) {
    menuIndex--;
    if (menuIndex < 0) menuIndex = menuSize - 1;
    displayMenu();
    delay(200);  // Debounce
  }

  if (digitalRead(buttonDown) == LOW) {
    menuIndex++;
    if (menuIndex >= menuSize) menuIndex = 0;
    displayMenu();
    delay(200);
  }

  if (digitalRead(buttonSelect) == LOW) {
    selectMenuItem();
    delay(200);
  }
}

void displayMenu() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("> ");
  lcd.print(menuItems[menuIndex]);

  // Show next item on line 2 if exists
  if (menuIndex + 1 < menuSize) {
    lcd.setCursor(0, 1);
    lcd.print("  ");
    lcd.print(menuItems[menuIndex + 1]);
  }
}

void selectMenuItem() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Selected:");
  lcd.setCursor(0, 1);
  lcd.print(menuItems[menuIndex]);
  lcd.setRGB(0, 255, 0);  // Green = selected
  delay(1500);
  lcd.setRGB(0, 150, 255);  // Back to blue
  displayMenu();
}
```

### Scrolling Long Text

```cpp
#include <Wire.h>
#include "rgb_lcd.h"

rgb_lcd lcd;

String longText = "This is a very long message that needs to scroll across the 16×2 display. Watch it go!   ";
int scrollPosition = 0;

void setup() {
  lcd.begin(16, 2);
  lcd.setRGB(255, 150, 0);  // Orange
}

void loop() {
  lcd.clear();

  // Display 16 characters starting at scrollPosition
  lcd.setCursor(0, 0);
  lcd.print(longText.substring(scrollPosition, scrollPosition + 16));

  lcd.setCursor(0, 1);
  lcd.print(longText.substring(scrollPosition + 16, scrollPosition + 32));

  scrollPosition++;
  if (scrollPosition > longText.length() - 32) {
    scrollPosition = 0;
  }

  delay(300);  // Scroll speed
}
```

**Key Points:**

- 16 characters × 2 lines = 32 character display
- I2C interface (2 addresses: 0x3E for LCD, 0x62 for RGB)
- RGB backlight: each color 0-255 (16.7M colors)
- HD44780 compatible (standard LCD commands)
- 5×8 dot matrix per character
- 8 custom character slots available
- Built-in character set includes ASCII + Japanese

## Testing Procedure

1. Connect LCD to I2C port
2. Install Grove_LCD_RGB_Backlight library
3. Upload basic example
4. **Test display:**
   - "Hello, World!" appears on line 1
   - "Grove LCD RGB" on line 2
   - Green backlight
5. **Test backlight colors:**
   - Red: `lcd.setRGB(255, 0, 0)`
   - Green: `lcd.setRGB(0, 255, 0)`
   - Blue: `lcd.setRGB(0, 0, 255)`
   - White: `lcd.setRGB(255, 255, 255)`
6. **Test text positioning:**
   - `lcd.setCursor(0, 0)` = top-left
   - `lcd.setCursor(15, 1)` = bottom-right
7. **Adjust contrast:**
   - Rotate blue pot on back of LCD
   - Clockwise = darker, CCW = lighter

## Troubleshooting

| Problem                     | Solution                                                             |
| --------------------------- | -------------------------------------------------------------------- |
| No display                  | Check I2C wiring, verify addresses (0x3E, 0x62), adjust contrast pot |
| Backlight works but no text | Adjust contrast pot on back (turn slowly), check initialization      |
| Text garbled                | I2C communication error, check connections, try lower I2C speed      |
| Backlight wrong color       | Check RGB values in code, verify 0x62 address working                |
| Some characters missing     | Check cursor position (0-15 for column, 0-1 for row)                 |
| Display flickers            | Power supply insufficient, add decoupling capacitor                  |

## Technical Specifications

**Display:**

- **Type:** Character LCD (HD44780 compatible)
- **Size:** 16 characters × 2 rows = 32 characters
- **Character Matrix:** 5×8 dots per character
- **Character Set:** ASCII (0x20-0x7F) + Japanese katakana + custom
- **Custom Characters:** 8 user-definable (5×8 pixel patterns)
- **Display Area:** 64.5mm × 16mm
- **Character Size:** 2.95mm × 5.55mm

**Backlight:**

- **Type:** RGB LED (red, green, blue)
- **Color Range:** 16.7 million colors (8-bit per channel)
- **Brightness:** Adjustable via RGB values (0-255 each)
- **Current:** ~100mA @ max brightness (white)

**Controller:**

- **LCD Controller:** HD44780 (or compatible)
- **RGB Controller:** PCA9633 I2C LED driver
- **Display RAM:** 80 characters (40 per line, scrollable)

**Communication:**

- **Interface:** I2C (up to 400kHz Fast Mode)
- **I2C Addresses:**
  - LCD: 0x3E
  - RGB backlight: 0x62
- **Data Lines:** SDA, SCL (2-wire I2C)

**Electrical:**

- **Operating Voltage:** 3.3V - 5V (regulated to 3.3V)
- **Current (Display):** ~20mA
- **Current (Backlight):** ~100mA @ max white
- **Total Current:** ~120mA typical

**Environmental:**

- **Operating Temperature:** 0°C to 50°C
- **Storage Temperature:** -10°C to 60°C
- **Optimal Viewing Temperature:** 25°C

**Physical:**

- **Module Size:** 80mm × 40mm
- **Display Window:** 64.5mm × 16mm
- **Mounting Holes:** 4× M3 (75mm × 31mm spacing)
- **Weight:** ~50g
- **Contrast Adjustment:** Blue potentiometer on back

## Common Use Cases

### Real-Time Sensor Dashboard

```cpp
#include <Wire.h>
#include "rgb_lcd.h"

rgb_lcd lcd;

void setup() {
  lcd.begin(16, 2);
  lcd.setRGB(50, 200, 200);  // Cyan
}

void loop() {
  // Read multiple sensors (simulated)
  int lightLevel = analogRead(A0);
  int soundLevel = analogRead(A1);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Light: ");
  lcd.print(map(lightLevel, 0, 16383, 0, 100));
  lcd.print("%");

  lcd.setCursor(0, 1);
  lcd.print("Sound: ");
  lcd.print(map(soundLevel, 0, 16383, 0, 100));
  lcd.print("%");

  delay(500);
}
```

### Countdown Timer

```cpp
#include <Wire.h>
#include "rgb_lcd.h"

rgb_lcd lcd;

void setup() {
  lcd.begin(16, 2);
  lcd.setRGB(0, 200, 0);  // Green
  lcd.setCursor(0, 0);
  lcd.print("Countdown Timer");
}

void loop() {
  for (int minutes = 5; minutes >= 0; minutes--) {
    for (int seconds = 59; seconds >= 0; seconds--) {
      lcd.setCursor(0, 1);
      lcd.print("Time: ");
      if (minutes < 10) lcd.print("0");
      lcd.print(minutes);
      lcd.print(":");
      if (seconds < 10) lcd.print("0");
      lcd.print(seconds);
      lcd.print("  ");

      // Change color as time runs out
      if (minutes == 0 && seconds < 10) {
        lcd.setRGB(255, 0, 0);  // Red - urgent!
      } else if (minutes < 1) {
        lcd.setRGB(255, 100, 0);  // Orange - warning
      }

      delay(1000);
    }
  }

  // Time's up!
  for (int i = 0; i < 5; i++) {
    lcd.setRGB(255, 0, 0);
    delay(200);
    lcd.setRGB(0, 0, 0);
    delay(200);
  }
}
```

### System Status Monitor

```cpp
#include <Wire.h>
#include "rgb_lcd.h"

rgb_lcd lcd;

void setup() {
  lcd.begin(16, 2);
}

void loop() {
  // Check system status (simulated)
  bool systemOK = true;
  bool sensorError = false;
  bool lowPower = false;

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System Status:");

  lcd.setCursor(0, 1);
  if (systemOK && !sensorError && !lowPower) {
    lcd.print("All OK ");
    lcd.print((char)0xFF);  // Block character (checkmark)
    lcd.setRGB(0, 255, 0);  // Green
  } else {
    if (sensorError) {
      lcd.print("Sensor Error!");
      lcd.setRGB(255, 0, 0);  // Red
    } else if (lowPower) {
      lcd.print("Low Power!");
      lcd.setRGB(255, 100, 0);  // Orange
    }
  }

  delay(2000);
}
```

## Understanding HD44780 LCD Controller

**Character Display:**

- Pre-programmed character ROM (fonts)
- Each character occupies one position
- 5×8 dot matrix per character
- Cannot display arbitrary graphics (character-based only)

**Display RAM (DDRAM):**

- 80 bytes total (40 per line)
- Line 1: addresses 0x00-0x27 (0-39)
- Line 2: addresses 0x40-0x67 (64-103)
- Only 16 characters visible per line (scrollable)

**Custom Characters (CGRAM):**

- 8 custom characters (indices 0-7)
- Each is 5×8 pixel pattern
- Useful for special symbols, icons, bar graphs

**Creating Custom Character:**

```cpp
// Define custom character (heart)
uint8_t heart[8] = {
  0b00000,
  0b01010,
  0b11111,
  0b11111,
  0b01110,
  0b00100,
  0b00000,
  0b00000
};

void setup() {
  lcd.begin(16, 2);
  lcd.createChar(0, heart);  // Store in slot 0

  lcd.setCursor(0, 0);
  lcd.write((uint8_t)0);  // Display custom char from slot 0
}
```

## RGB Backlight Control

**Color Mixing:**

```cpp
// Primary colors
lcd.setRGB(255, 0, 0);    // Red
lcd.setRGB(0, 255, 0);    // Green
lcd.setRGB(0, 0, 255);    // Blue

// Secondary colors
lcd.setRGB(255, 255, 0);  // Yellow (Red + Green)
lcd.setRGB(0, 255, 255);  // Cyan (Green + Blue)
lcd.setRGB(255, 0, 255);  // Magenta (Red + Blue)

// White and shades
lcd.setRGB(255, 255, 255); // White (all on)
lcd.setRGB(128, 128, 128); // Gray (half brightness)
lcd.setRGB(0, 0, 0);       // Off (backlight off)
```

**Color Temperature:**

- Warm white: `lcd.setRGB(255, 200, 150)`
- Cool white: `lcd.setRGB(200, 220, 255)`
- Neutral white: `lcd.setRGB(255, 255, 255)`

**Mood Lighting:**

```cpp
// Relaxing purple
lcd.setRGB(150, 50, 200);

// Alert red
lcd.setRGB(255, 0, 0);

// Success green
lcd.setRGB(0, 255, 100);

// Warning amber
lcd.setRGB(255, 150, 0);
```

## Power Consumption

**Current Draw:**

- Display only: ~20mA
- Backlight red @ max: ~30mA
- Backlight green @ max: ~35mA
- Backlight blue @ max: ~35mA
- White @ max (all colors): ~100mA
- Total typical: ~60mA (display + moderate backlight)

**Battery Life:**

- **USB (500mA):** Unlimited
- **9V battery (500mAh):** 5-8 hours
- **4× AA (2500mAh):** 25-40 hours

**Power Saving:**

```cpp
// Dim backlight
lcd.setRGB(50, 50, 50);  // vs. 255,255,255

// Turn off backlight when idle
lcd.setRGB(0, 0, 0);

// Clear display (uses less power than full text)
lcd.clear();
```

## Library API Reference

**Initialization:**

```cpp
lcd.begin(cols, rows);  // Usually lcd.begin(16, 2)
```

**Text Display:**

```cpp
lcd.print("text");      // Print at current cursor
lcd.setCursor(col, row); // Set cursor (0-15, 0-1)
lcd.clear();            // Clear entire display
```

**Backlight:**

```cpp
lcd.setRGB(r, g, b);    // Set color (0-255 each)
```

**Cursor Control:**

```cpp
lcd.cursor();           // Show underscore cursor
lcd.noCursor();         // Hide cursor
lcd.blink();            // Blink block cursor
lcd.noBlink();          // Stop blinking
```

**Display Control:**

```cpp
lcd.display();          // Turn display on
lcd.noDisplay();        // Turn display off (backlight stays)
lcd.scrollDisplayLeft(); // Scroll text left
lcd.scrollDisplayRight(); // Scroll text right
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining LCD with:

- Temperature/humidity sensors (weather station)
- Buttons (menu systems, settings)
- Ultrasonic sensor (distance display)
- Real-time clock (time/date display)

## Additional Resources

- [HD44780 Datasheet](https://www.sparkfun.com/datasheets/LCD/HD44780.pdf)
- [LCD Character Map](https://www.sparkfun.com/datasheets/LCD/HD44780_CharacterSet.pdf)
- [PCA9633 RGB Driver Datasheet](https://www.nxp.com/docs/en/data-sheet/PCA9633.pdf)

---

**Source Verification Date:** 2025-11-18  
**Seeed Wiki Last Checked:** 2025-11-18  
**Tip:** Adjust blue contrast pot on back for optimal text visibility!
