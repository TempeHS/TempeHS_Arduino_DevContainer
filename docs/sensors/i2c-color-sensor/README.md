# Grove I2C Color Sensor

**Last Verified:** 2025-11-18  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-I2C_Color_Sensor/  
**Library Repo:** https://github.com/Seeed-Studio/Grove_I2C_Color_Sensor  
**Connection Type:** I2C

## Overview

The Grove I2C Color Sensor detects RGB color values using a TCS3414CS sensor with 16-bit resolution per channel. Measures red, green, blue, and clear (intensity) light. Features IR blocking filter for accurate color detection. Ideal for color sorting, color matching, product verification, light quality analysis, and interactive color-based projects.

## Authoritative References

- [Grove I2C Color Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-I2C_Color_Sensor/)
- [Grove_I2C_Color_Sensor Library - GitHub](https://github.com/Seeed-Studio/Grove_I2C_Color_Sensor)
- [TCS3414CS Datasheet - AMS](https://ams.com/documents/20143/36005/TCS3414CS_DS000177_2-00.pdf)

## Hardware Setup

- **Connection Type:** I2C
- **Grove Port:** Any I2C port (address 0x39)
- **Sensor IC:** TCS3414CS color light-to-digital converter
- **Color Channels:** Red, Green, Blue, Clear (RGBC)
- **Resolution:** 16-bit per channel (0-65535)
- **IR Filter:** Integrated IR blocking filter
- **Operating Voltage:** 3.3V - 5V
- **Current Draw:** ~2mA active, <3µA power-down
- **Response Time:** Programmable integration time (12ms - 400ms)
- **Optimal Distance:** 5-15mm from target
- **Illumination:** White LED for consistent reading (optional)
- **Wiring:** Connect to Grove Base Shield I2C port using 4-pin Grove cable

![Grove I2C Color Sensor](https://files.seeedstudio.com/wiki/Grove-I2C_Color_Sensor/img/Grove-I2C-Color-Sensor.jpg)

## Software Prerequisites

Install the Grove I2C Color Sensor library:

```bash
# Method 1: Arduino Library Manager
# Open Arduino IDE → Tools → Manage Libraries
# Search "Grove I2C Color Sensor" → Install

# Method 2: Manual installation
cd ~/Arduino/libraries
git clone https://github.com/Seeed-Studio/Grove_I2C_Color_Sensor.git
```

**Library Dependencies:**

- Wire.h (built-in I2C library)

## Example Code

```cpp
/*
  Purpose: Read RGB color values from I2C color sensor
  Notes:
    1. Connect to I2C port
    2. Returns R, G, B, Clear values (16-bit: 0-65535)
    3. Clear = total light intensity (all wavelengths)
    4. Works best 5-15mm from colored surface
    5. Consistent lighting recommended
  Author: Ben Jones 18/11/25
  Source: https://github.com/Seeed-Studio/Grove_I2C_Color_Sensor
*/

#include <Wire.h>
#include "GroveColorSensor.h"

GroveColorSensor colorSensor;

void setup() {
  Serial.begin(9600);
  Wire.begin();

  Serial.println("Grove I2C Color Sensor");

  if (!colorSensor.init()) {
    Serial.println("ERROR: Sensor not found!");
    while (1);
  }

  Serial.println("Sensor initialized");
  Serial.println("R\tG\tB\tClear");
}

void loop() {
  int red, green, blue, clear;

  // Read color values
  colorSensor.readRGB(&red, &green, &blue);
  clear = colorSensor.readClear();

  Serial.print(red);
  Serial.print("\t");
  Serial.print(green);
  Serial.print("\t");
  Serial.print(blue);
  Serial.print("\t");
  Serial.println(clear);

  delay(500);
}
```

### Color Name Detection

```cpp
#include <Wire.h>
#include "GroveColorSensor.h"

GroveColorSensor colorSensor;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  colorSensor.init();
  Serial.println("Color Name Detector");
}

void loop() {
  int r, g, b, c;

  colorSensor.readRGB(&r, &g, &b);
  c = colorSensor.readClear();

  // Detect dominant color
  String colorName = detectColor(r, g, b, c);

  Serial.print("RGB: (");
  Serial.print(r);
  Serial.print(", ");
  Serial.print(g);
  Serial.print(", ");
  Serial.print(b);
  Serial.print(") - Color: ");
  Serial.println(colorName);

  delay(1000);
}

String detectColor(int r, int g, int b, int clear) {
  // Normalize to percentages
  float total = r + g + b;
  if (total == 0) return "BLACK/DARK";

  float rPct = (r / total) * 100;
  float gPct = (g / total) * 100;
  float bPct = (b / total) * 100;

  // Very low intensity = black
  if (clear < 1000) return "BLACK/DARK";

  // Very high intensity with balanced RGB = white
  if (clear > 30000 && abs(rPct - 33.3) < 10) return "WHITE";

  // Determine dominant color
  if (rPct > 40 && gPct < 30 && bPct < 30) return "RED";
  if (gPct > 40 && rPct < 30 && bPct < 30) return "GREEN";
  if (bPct > 40 && rPct < 30 && gPct < 30) return "BLUE";

  // Secondary colors
  if (rPct > 35 && gPct > 35 && bPct < 25) return "YELLOW";
  if (rPct > 35 && bPct > 35 && gPct < 25) return "MAGENTA";
  if (gPct > 35 && bPct > 35 && rPct < 25) return "CYAN";

  // Shades
  if (rPct > 35 && gPct > 25 && bPct < 20) return "ORANGE";
  if (bPct > 30 && rPct < 25 && gPct < 25) return "BLUE/PURPLE";

  return "MIXED/UNKNOWN";
}
```

### Color Sorting System

```cpp
#include <Wire.h>
#include "GroveColorSensor.h"

GroveColorSensor colorSensor;

const int servoPin = 3;
const int buttonPin = 2;

enum ColorBin {
  BIN_RED,
  BIN_GREEN,
  BIN_BLUE,
  BIN_OTHER
};

void setup() {
  Serial.begin(9600);
  Wire.begin();
  colorSensor.init();
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(servoPin, OUTPUT);

  Serial.println("Color Sorting System");
  Serial.println("Place object and press button");
}

void loop() {
  if (digitalRead(buttonPin) == LOW) {
    delay(100);  // Debounce

    // Read color
    int r, g, b, c;
    colorSensor.readRGB(&r, &g, &b);
    c = colorSensor.readClear();

    // Determine bin
    ColorBin bin = classifyColor(r, g, b, c);

    Serial.print("Color detected: ");
    switch (bin) {
      case BIN_RED:
        Serial.println("RED -> Bin 1");
        moveServo(30);  // Servo angle for red bin
        break;
      case BIN_GREEN:
        Serial.println("GREEN -> Bin 2");
        moveServo(90);
        break;
      case BIN_BLUE:
        Serial.println("BLUE -> Bin 3");
        moveServo(150);
        break;
      case BIN_OTHER:
        Serial.println("OTHER -> Reject bin");
        moveServo(180);
        break;
    }

    delay(2000);  // Wait for sorting
    moveServo(0);  // Return to neutral

    while (digitalRead(buttonPin) == LOW);  // Wait for release
  }
}

ColorBin classifyColor(int r, int g, int b, int clear) {
  if (clear < 1000) return BIN_OTHER;

  if (r > g && r > b && r > 8000) return BIN_RED;
  if (g > r && g > b && g > 8000) return BIN_GREEN;
  if (b > r && b > g && b > 8000) return BIN_BLUE;

  return BIN_OTHER;
}

void moveServo(int angle) {
  // Simple servo control (use Servo library for production)
  int pulseWidth = map(angle, 0, 180, 500, 2500);
  for (int i = 0; i < 50; i++) {
    digitalWrite(servoPin, HIGH);
    delayMicroseconds(pulseWidth);
    digitalWrite(servoPin, LOW);
    delay(20 - (pulseWidth / 1000));
  }
}
```

### RGB LED Color Matching

```cpp
#include <Wire.h>
#include "GroveColorSensor.h"

GroveColorSensor colorSensor;

const int redPin = 3;
const int greenPin = 5;
const int bluePin = 6;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  colorSensor.init();

  pinMode(redPin, OUTPUT);
  pinMode(greenPin, OUTPUT);
  pinMode(bluePin, OUTPUT);

  Serial.println("Color Matching - RGB LED");
}

void loop() {
  int r, g, b;

  // Read color from sensor
  colorSensor.readRGB(&r, &g, &b);

  // Map to PWM range (0-255)
  int rPWM = map(r, 0, 65535, 0, 255);
  int gPWM = map(g, 0, 65535, 0, 255);
  int bPWM = map(b, 0, 65535, 0, 255);

  // Set RGB LED to match detected color
  analogWrite(redPin, rPWM);
  analogWrite(greenPin, gPWM);
  analogWrite(bluePin, bPWM);

  Serial.print("RGB: (");
  Serial.print(rPWM);
  Serial.print(", ");
  Serial.print(gPWM);
  Serial.print(", ");
  Serial.print(bPWM);
  Serial.println(")");

  delay(200);
}
```

### Color Temperature Meter

```cpp
#include <Wire.h>
#include "GroveColorSensor.h"

GroveColorSensor colorSensor;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  colorSensor.init();
  Serial.println("Light Color Temperature Meter");
}

void loop() {
  int r, g, b, c;

  colorSensor.readRGB(&r, &g, &b);
  c = colorSensor.readClear();

  // Calculate color temperature (simplified)
  float colorTemp = calculateColorTemp(r, g, b);

  Serial.print("R:");
  Serial.print(r);
  Serial.print(" G:");
  Serial.print(g);
  Serial.print(" B:");
  Serial.print(b);
  Serial.print(" -> Color Temp: ");
  Serial.print(colorTemp, 0);
  Serial.print("K (");

  if (colorTemp < 3000) {
    Serial.println("Warm/Incandescent)");
  } else if (colorTemp < 4500) {
    Serial.println("Neutral/Fluorescent)");
  } else if (colorTemp < 6500) {
    Serial.println("Cool/Daylight)");
  } else {
    Serial.println("Very Cool/Overcast)");
  }

  delay(1000);
}

float calculateColorTemp(int r, int g, int b) {
  // Simplified color temperature estimation
  // Based on ratio of red to blue
  if (b == 0) b = 1;  // Avoid divide by zero

  float ratio = (float)r / (float)b;

  // Rough mapping (not scientifically accurate!)
  // High R/B ratio = warm (low K), Low R/B = cool (high K)
  if (ratio > 1.5) return 2700;  // Warm white
  if (ratio > 1.2) return 3500;  // Neutral
  if (ratio > 0.9) return 5000;  // Cool white
  return 6500;  // Daylight
}
```

### Product Verification by Color

```cpp
#include <Wire.h>
#include "GroveColorSensor.h"

GroveColorSensor colorSensor;

// Reference color (calibrate with known good product)
int refRed = 15000;
int refGreen = 8000;
int refBlue = 5000;
int tolerance = 3000;  // Acceptable deviation

void setup() {
  Serial.begin(9600);
  Wire.begin();
  colorSensor.init();
  Serial.println("Product Color Verification");
  Serial.println("Place product and press button");

  pinMode(2, INPUT_PULLUP);
}

void loop() {
  if (digitalRead(2) == LOW) {
    delay(200);

    int r, g, b;
    colorSensor.readRGB(&r, &g, &b);

    // Check if within tolerance
    bool passRed = abs(r - refRed) < tolerance;
    bool passGreen = abs(g - refGreen) < tolerance;
    bool passBlue = abs(b - refBlue) < tolerance;

    bool passOverall = passRed && passGreen && passBlue;

    Serial.print("Measured RGB: (");
    Serial.print(r);
    Serial.print(", ");
    Serial.print(g);
    Serial.print(", ");
    Serial.print(b);
    Serial.print(") - ");

    if (passOverall) {
      Serial.println("✓ PASS");
    } else {
      Serial.print("✗ FAIL - ");
      if (!passRed) Serial.print("Red ");
      if (!passGreen) Serial.print("Green ");
      if (!passBlue) Serial.print("Blue ");
      Serial.println("out of spec");
    }

    delay(1000);
    while (digitalRead(2) == LOW);
  }
}
```

**Key Points:**

- 16-bit resolution per channel (0-65535)
- Four channels: Red, Green, Blue, Clear
- IR blocking filter for accurate color detection
- I2C address: 0x39
- Best distance: 5-15mm from target
- Consistent lighting improves accuracy

## Testing Procedure

1. Connect color sensor to I2C port
2. Install Grove_I2C_Color_Sensor library
3. Upload basic RGB reading example
4. **Test with primary colors:**
   - Red object: High R, low G/B
   - Green object: High G, low R/B
   - Blue object: High B, low R/G
   - White object: High R/G/B/Clear
   - Black object: Low all values
5. **Test distance:**
   - Optimal: 5-15mm from target
   - Too far: all readings low
   - Too close: may saturate (65535)
6. **Test lighting:**
   - Consistent lighting = consistent readings
   - Shadows affect readings

## Troubleshooting

| Problem                    | Solution                                                        |
| -------------------------- | --------------------------------------------------------------- |
| Sensor not found           | Check I2C wiring, verify address 0x39, run I2C scanner          |
| All readings zero          | Check power supply, verify sensor initialization                |
| Readings saturated (65535) | Move sensor farther from target, reduce lighting                |
| Inconsistent readings      | Improve lighting consistency, shield from ambient light changes |
| Wrong colors detected      | Calibrate for your lighting, adjust thresholds in code          |
| Slow response              | Normal - integration time 12-400ms, adjust if needed            |

## Technical Specifications

**TCS3414CS Sensor:**

- **Channels:** Red, Green, Blue, Clear (RGBC)
- **Resolution:** 16-bit per channel (0-65535)
- **Photodiodes:** 4 (one per channel)
- **IR Filter:** Integrated (reduces IR interference)
- **Sensitivity:** Optimized for 400-700nm (visible light)

**I2C Interface:**

- **Address:** 0x39 (fixed)
- **Clock Speed:** Up to 400kHz (Fast Mode)
- **Data Rate:** ~10-80 Hz (depends on integration time)

**Electrical:**

- **Operating Voltage:** 2.7V - 5.5V (3.3V/5V compatible)
- **Current Draw:**
  - Active: ~2mA
  - Power-down: <3µA
- **Logic Levels:** 3.3V/5V compatible

**Optical:**

- **Optimal Distance:** 5-15mm from target
- **Field of View:** ~30° (approximate)
- **Integration Time:** Programmable (12ms - 400ms)
- **Dynamic Range:** 100:1 typical

**Environmental:**

- **Operating Temperature:** -40°C to 85°C
- **Storage Temperature:** -40°C to 125°C

**Physical:**

- **Module Size:** 20mm × 20mm
- **Sensor Size:** 3.0mm × 2.5mm
- **Weight:** ~3g
- **Mounting:** 2× M2 mounting holes

## Common Use Cases

### Rubik's Cube Solver

```cpp
#include <Wire.h>
#include "GroveColorSensor.h"

GroveColorSensor colorSensor;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  colorSensor.init();
  Serial.println("Rubik's Cube Color Scanner");
}

void loop() {
  if (Serial.available()) {
    Serial.read();  // Any key to scan

    int r, g, b;
    colorSensor.readRGB(&r, &g, &b);

    char face = identifyFace(r, g, b);
    Serial.print("Face: ");
    Serial.println(face);
  }
}

char identifyFace(int r, int g, int b) {
  // Simplified - calibrate for your cube
  if (r > 20000 && g < 15000 && b < 15000) return 'R';  // Red
  if (g > 20000 && r < 15000 && b < 15000) return 'G';  // Green
  if (b > 20000 && r < 15000 && g < 15000) return 'B';  // Blue
  if (r > 20000 && g > 20000 && b < 15000) return 'Y';  // Yellow
  if (r > 20000 && g > 15000 && b > 20000) return 'W';  // White
  if (r > 15000 && g < 12000 && b > 15000) return 'O';  // Orange
  return '?';
}
```

### Paint Color Identifier

```cpp
// Help identify paint colors for matching
#include <Wire.h>
#include "GroveColorSensor.h"

GroveColorSensor colorSensor;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  colorSensor.init();
  Serial.println("Paint Color Identifier");
}

void loop() {
  int r, g, b, c;
  colorSensor.readRGB(&r, &g, &b);
  c = colorSensor.readClear();

  // Convert to 8-bit RGB for standard color codes
  int r8 = map(r, 0, 65535, 0, 255);
  int g8 = map(g, 0, 65535, 0, 255);
  int b8 = map(b, 0, 65535, 0, 255);

  Serial.print("RGB: ");
  Serial.print(r8);
  Serial.print(", ");
  Serial.print(g8);
  Serial.print(", ");
  Serial.print(b8);
  Serial.print(" | Hex: #");

  if (r8 < 16) Serial.print("0");
  Serial.print(r8, HEX);
  if (g8 < 16) Serial.print("0");
  Serial.print(g8, HEX);
  if (b8 < 16) Serial.print("0");
  Serial.println(b8, HEX);

  delay(1000);
}
```

## Color Space Conversions

**RGB to HSV:**

```cpp
void rgbToHSV(int r, int g, int b, float &h, float &s, float &v) {
  float rf = r / 65535.0;
  float gf = g / 65535.0;
  float bf = b / 65535.0;

  float maxC = max(max(rf, gf), bf);
  float minC = min(min(rf, gf), bf);
  float delta = maxC - minC;

  // Hue
  if (delta == 0) h = 0;
  else if (maxC == rf) h = 60 * fmod((gf - bf) / delta, 6);
  else if (maxC == gf) h = 60 * ((bf - rf) / delta + 2);
  else h = 60 * ((rf - gf) / delta + 4);

  if (h < 0) h += 360;

  // Saturation
  s = (maxC == 0) ? 0 : (delta / maxC);

  // Value
  v = maxC;
}
```

## Calibration for Consistent Lighting

```cpp
// Calibrate with white reference
int whiteR, whiteG, whiteB, whiteC;

void calibrateWhite() {
  Serial.println("Place WHITE reference...");
  delay(3000);

  colorSensor.readRGB(&whiteR, &whiteG, &whiteB);
  whiteC = colorSensor.readClear();

  Serial.println("Calibration complete!");
}

void readCalibratedColor(int &r, int &g, int &b) {
  int rawR, rawG, rawB;
  colorSensor.readRGB(&rawR, &rawG, &rawB);

  // Normalize against white reference
  r = (rawR * 65535) / whiteR;
  g = (rawG * 65535) / whiteG;
  b = (rawB * 65535) / whiteB;

  // Clamp to valid range
  r = constrain(r, 0, 65535);
  g = constrain(g, 0, 65535);
  b = constrain(b, 0, 65535);
}
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining I2C color sensor with:

- RGB LED (color matching/copying)
- Servo (color-based sorting)
- OLED display (color visualization)
- Buzzer (color-coded audio feedback)

## Additional Resources

- [TCS3414CS Datasheet](https://ams.com/documents/20143/36005/TCS3414CS_DS000177_2-00.pdf)
- [Color Theory Basics](https://www.interaction-design.org/literature/topics/color-theory)
- [RGB vs HSV Color Spaces](https://programmingdesignsystems.com/color/color-models-and-color-spaces/)

---

**Source Verification Date:** 2025-11-18  
**Seeed Wiki Last Checked:** 2025-11-18  
**Tip:** Position sensor 5-15mm from target with consistent lighting for best results!
