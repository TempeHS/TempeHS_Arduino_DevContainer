# Grove TCS34725 RGB Color Sensor

**Last Verified:** 2025-11-18  
**Reference:** https://github.com/TempeHS/TempeHS_Ardunio_Boilerplate/tree/main/TempeHS_Sensor_Catalogue/Examples/IIC_TCS34725_RGB_Color_Sensor  
**Library Repo:** https://github.com/adafruit/Adafruit_TCS34725  
**Connection Type:** I2C

## Overview

The TCS34725 RGB Color Sensor uses a high-quality TAOS TCS34725 color light-to-digital converter with IR blocking filter. Provides accurate RGB color detection with 16-bit resolution per channel. Features adjustable integration time and gain for different lighting conditions. Perfect for color sorting, product verification, color matching, ambient light sensing, and color-based robotics applications.

## Authoritative References

- [Adafruit TCS34725 Library - GitHub](https://github.com/adafruit/Adafruit_TCS34725)
- [TCS34725 Datasheet - AMS](https://ams.com/documents/20143/36005/TCS3472_DS000390_3-00.pdf)
- [TempeHS Example Code](https://github.com/TempeHS/TempeHS_Ardunio_Boilerplate/tree/main/TempeHS_Sensor_Catalogue/Examples/IIC_TCS34725_RGB_Color_Sensor)

## Hardware Setup

- **Connection Type:** I2C
- **Grove Port:** I2C port (address 0x29)
- **Sensor IC:** TCS34725 RGB color sensor with IR filter
- **Color Channels:** Red, Green, Blue, Clear (RGBC)
- **Resolution:** 16-bit per channel (0-65535)
- **IR Filter:** Integrated IR blocking filter for accurate color
- **Operating Voltage:** 3.3V - 5V
- **Current Draw:** ~200µA active, 65µA sleep
- **Integration Time:** 2.4ms to 614ms (adjustable)
- **Gain:** 1x, 4x, 16x, 60x (adjustable)
- **Light Sensor:** Photodiode array with RGB filters
- **Response:** Human eye response curve approximation
- **Wiring:** Connect to Grove Base Shield I2C port using 4-pin Grove cable

![TCS34725 Sensor](https://cdn-shop.adafruit.com/970x728/1334-02.jpg)

**Wiring Schematic:**

![TCS34725 Schematic](https://github.com/TempeHS/TempeHS_Ardunio_Boilerplate/blob/main/TempeHS_Sensor_Catalogue/Examples/IIC_TCS34725_RGB_Color_Sensor/RGB_Sensor_Schematic.jpg?raw=true)

## Software Prerequisites

Install the Adafruit TCS34725 library:

```bash
# Method 1: Arduino Library Manager
# Open Arduino IDE → Tools → Manage Libraries
# Search "Adafruit TCS34725" → Install

# Method 2: Manual installation
cd ~/Arduino/libraries
git clone https://github.com/adafruit/Adafruit_TCS34725.git
```

**Library Dependencies:**

- Wire.h (built-in I2C library)
- Adafruit_TCS34725.h

## Example Code

```cpp
/*
  Purpose: Read RGB color values from TCS34725 sensor
  Notes:
    1. Connect to I2C port
    2. I2C address: 0x29 (fixed)
    3. Returns 16-bit values for R, G, B, Clear channels
    4. Adjustable integration time and gain
    5. IR blocking filter for accurate color detection
  Author: Ben Jones 18/11/25
  Source: https://github.com/adafruit/Adafruit_TCS34725
*/

#include <Wire.h>
#include "Adafruit_TCS34725.h"

// Create sensor object with default integration time and gain
// TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X
Adafruit_TCS34725 tcs = Adafruit_TCS34725();

void setup() {
  Serial.begin(9600);
  Wire.begin();

  Serial.println("TCS34725 RGB Color Sensor");

  if (!tcs.begin()) {
    Serial.println("ERROR: TCS34725 not found!");
    while (1);
  }

  Serial.println("Sensor initialized");
  Serial.println("Place colored object near sensor");
}

void loop() {
  uint16_t r, g, b, c;

  // Read raw RGB and Clear values
  tcs.getRawData(&r, &g, &b, &c);

  // Calculate color temperature
  uint16_t colorTemp = tcs.calculateColorTemperature(r, g, b);

  // Calculate lux (brightness)
  uint16_t lux = tcs.calculateLux(r, g, b);

  // Display raw values
  Serial.print("R: "); Serial.print(r, DEC); Serial.print(" ");
  Serial.print("G: "); Serial.print(g, DEC); Serial.print(" ");
  Serial.print("B: "); Serial.print(b, DEC); Serial.print(" ");
  Serial.print("C: "); Serial.print(c, DEC); Serial.print(" | ");

  // Display calculated values
  Serial.print("Temp: "); Serial.print(colorTemp, DEC); Serial.print("K | ");
  Serial.print("Lux: "); Serial.println(lux, DEC);

  delay(500);
}
```

### Color Name Detection

```cpp
#include <Wire.h>
#include "Adafruit_TCS34725.h"

Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);

void setup() {
  Serial.begin(9600);
  Wire.begin();
  tcs.begin();

  Serial.println("Color Name Detection");
}

void loop() {
  uint16_t r, g, b, c;
  tcs.getRawData(&r, &g, &b, &c);

  // Normalize RGB values (0-255)
  uint32_t sum = r + g + b;
  float red = (float)r / sum * 255;
  float green = (float)g / sum * 255;
  float blue = (float)b / sum * 255;

  // Detect color name
  String colorName = detectColor(red, green, blue);

  Serial.print("Color: ");
  Serial.print(colorName);
  Serial.print(" | RGB: (");
  Serial.print((int)red); Serial.print(", ");
  Serial.print((int)green); Serial.print(", ");
  Serial.print((int)blue); Serial.println(")");

  delay(1000);
}

String detectColor(float r, float g, float b) {
  // Simple color detection algorithm
  if (r > 200 && g < 100 && b < 100) return "RED";
  if (g > 200 && r < 100 && b < 100) return "GREEN";
  if (b > 200 && r < 100 && g < 100) return "BLUE";
  if (r > 200 && g > 200 && b < 100) return "YELLOW";
  if (r > 200 && g < 100 && b > 200) return "MAGENTA";
  if (r < 100 && g > 200 && b > 200) return "CYAN";
  if (r > 200 && g > 200 && b > 200) return "WHITE";
  if (r < 50 && g < 50 && b < 50) return "BLACK";
  if (r > 150 && g > 100 && b < 100) return "ORANGE";

  return "UNKNOWN";
}
```

### RGB LED Color Matching

```cpp
#include <Wire.h>
#include "Adafruit_TCS34725.h"

Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_1X);

const int redPin = 3;
const int greenPin = 5;
const int bluePin = 6;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  tcs.begin();

  pinMode(redPin, OUTPUT);
  pinMode(greenPin, OUTPUT);
  pinMode(bluePin, OUTPUT);

  Serial.println("RGB LED Color Matcher");
}

void loop() {
  uint16_t r, g, b, c;
  tcs.getRawData(&r, &g, &b, &c);

  // Normalize to 0-255 for PWM
  uint32_t sum = r + g + b;
  if (sum == 0) sum = 1; // Avoid division by zero

  int redPWM = map(r, 0, sum, 0, 255);
  int greenPWM = map(g, 0, sum, 0, 255);
  int bluePWM = map(b, 0, sum, 0, 255);

  // Set RGB LED to match detected color
  analogWrite(redPin, redPWM);
  analogWrite(greenPin, greenPWM);
  analogWrite(bluePWM, bluePWM);

  Serial.print("Detected RGB: (");
  Serial.print(redPWM); Serial.print(", ");
  Serial.print(greenPWM); Serial.print(", ");
  Serial.print(bluePWM); Serial.println(")");

  delay(100);
}
```

### Color Sorting System

```cpp
#include <Wire.h>
#include "Adafruit_TCS34725.h"
#include <Servo.h>

Adafruit_TCS34725 tcs = Adafruit_TCS34725();
Servo sortServo;

const int servoPin = 9;
const int SERVO_LEFT = 45;
const int SERVO_CENTER = 90;
const int SERVO_RIGHT = 135;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  tcs.begin();
  sortServo.attach(servoPin);
  sortServo.write(SERVO_CENTER);

  Serial.println("Color Sorting System");
  Serial.println("Red → Left, Blue → Right, Other → Center");
}

void loop() {
  uint16_t r, g, b, c;
  tcs.getRawData(&r, &g, &b, &c);

  // Determine dominant color
  String color = "";
  int position = SERVO_CENTER;

  if (r > g && r > b && r > 1000) {
    color = "RED";
    position = SERVO_LEFT;
  } else if (b > r && b > g && b > 1000) {
    color = "BLUE";
    position = SERVO_RIGHT;
  } else if (c > 500) {
    color = "OTHER";
    position = SERVO_CENTER;
  }

  if (color != "") {
    Serial.print("Detected: ");
    Serial.print(color);
    Serial.print(" → Position: ");
    Serial.println(position);

    sortServo.write(position);
    delay(1000);
    sortServo.write(SERVO_CENTER);
    delay(500);
  }

  delay(100);
}
```

### Light Level Monitor

```cpp
#include <Wire.h>
#include "Adafruit_TCS34725.h"

Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_154MS, TCS34725_GAIN_1X);

void setup() {
  Serial.begin(9600);
  Wire.begin();
  tcs.begin();

  Serial.println("Ambient Light Monitor");
}

void loop() {
  uint16_t r, g, b, c;
  tcs.getRawData(&r, &g, &b, &c);

  // Calculate lux (brightness)
  uint16_t lux = tcs.calculateLux(r, g, b);

  // Determine light level
  String level;
  if (lux < 10) level = "DARK";
  else if (lux < 50) level = "DIM";
  else if (lux < 200) level = "NORMAL";
  else if (lux < 500) level = "BRIGHT";
  else level = "VERY BRIGHT";

  Serial.print("Light Level: ");
  Serial.print(level);
  Serial.print(" (");
  Serial.print(lux);
  Serial.println(" lux)");

  delay(1000);
}
```

### Product Verification (Color QC)

```cpp
#include <Wire.h>
#include "Adafruit_TCS34725.h"

Adafruit_TCS34725 tcs = Adafruit_TCS34725();

// Target color values (calibrate with known good product)
const uint16_t TARGET_R = 25000;
const uint16_t TARGET_G = 15000;
const uint16_t TARGET_B = 10000;
const uint16_t TOLERANCE = 5000;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  tcs.begin();

  pinMode(LED_BUILTIN, OUTPUT);

  Serial.println("Product Color Verification");
  Serial.print("Target RGB: (");
  Serial.print(TARGET_R); Serial.print(", ");
  Serial.print(TARGET_G); Serial.print(", ");
  Serial.print(TARGET_B); Serial.println(")");
}

void loop() {
  uint16_t r, g, b, c;
  tcs.getRawData(&r, &g, &b, &c);

  // Check if color is within tolerance
  bool rMatch = abs((int)r - (int)TARGET_R) < TOLERANCE;
  bool gMatch = abs((int)g - (int)TARGET_G) < TOLERANCE;
  bool bMatch = abs((int)b - (int)TARGET_B) < TOLERANCE;

  if (rMatch && gMatch && bMatch) {
    Serial.println("✓ PASS - Color matches specification");
    digitalWrite(LED_BUILTIN, HIGH);
  } else {
    Serial.println("✗ FAIL - Color out of tolerance");
    digitalWrite(LED_BUILTIN, LOW);

    // Show differences
    Serial.print("  R diff: "); Serial.println(abs((int)r - (int)TARGET_R));
    Serial.print("  G diff: "); Serial.println(abs((int)g - (int)TARGET_G));
    Serial.print("  B diff: "); Serial.println(abs((int)b - (int)TARGET_B));
  }

  delay(2000);
}
```

### Adjustable Sensitivity

```cpp
#include <Wire.h>
#include "Adafruit_TCS34725.h"

// Try different combinations for your lighting conditions
// Integration time options: 2.4ms, 24ms, 50ms, 101ms, 154ms, 700ms
// Gain options: 1x, 4x, 16x, 60x

Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_154MS, TCS34725_GAIN_16X);

void setup() {
  Serial.begin(9600);
  Wire.begin();
  tcs.begin();

  Serial.println("Adjustable Sensitivity Demo");

  // Can change settings after begin()
  tcs.setIntegrationTime(TCS34725_INTEGRATIONTIME_154MS);
  tcs.setGain(TCS34725_GAIN_16X);
}

void loop() {
  uint16_t r, g, b, c;
  tcs.getRawData(&r, &g, &b, &c);

  Serial.print("Clear: "); Serial.print(c);
  Serial.print(" | R: "); Serial.print(r);
  Serial.print(" | G: "); Serial.print(g);
  Serial.print(" | B: "); Serial.println(b);

  // Auto-adjust gain based on clear channel
  if (c < 100) {
    Serial.println("Too dark - increasing gain");
    tcs.setGain(TCS34725_GAIN_60X);
  } else if (c > 60000) {
    Serial.println("Too bright - decreasing gain");
    tcs.setGain(TCS34725_GAIN_1X);
  }

  delay(1000);
}
```

**Key Points:**

- I2C interface (address 0x29)
- 16-bit resolution per channel (R, G, B, Clear)
- Integrated IR blocking filter
- Adjustable integration time (2.4ms - 614ms)
- Adjustable gain (1x, 4x, 16x, 60x)
- Calculates color temperature and lux

## Testing Procedure

1. Connect TCS34725 sensor to I2C port
2. Install Adafruit_TCS34725 library
3. Upload basic color reading example
4. **Test with known colors:**
   - Place red object near sensor (5-10mm distance)
   - Should show high R value, lower G/B
   - Repeat with green, blue, white objects
5. **Test sensitivity:**
   - Adjust integration time and gain
   - Verify readings stable and consistent
6. **Test color temperature:**
   - Use incandescent, LED, daylight sources
   - Should show different color temperature values

## Troubleshooting

| Problem                  | Solution                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Sensor not found         | Check I2C wiring, verify address (0x29), run I2C scanner                               |
| All values zero          | Check sensor power, ensure not in sleep mode, verify I2C communication                 |
| Inaccurate colors        | Adjust integration time and gain, ensure proper distance (5-10mm), avoid ambient light |
| Values saturated (65535) | Decrease gain or integration time, increase distance from bright objects               |
| Noisy readings           | Increase integration time, add averaging, shield from flickering lights                |
| Color drift              | Allow warm-up time (30s), calibrate with white reference, check temperature stability  |

## Technical Specifications

**TCS34725 Sensor:**

- **Color Channels:** Red, Green, Blue, Clear (RGBC)
- **Resolution:** 16-bit per channel (0-65535)
- **Responsivity:** 120 counts per µW/cm² at 530nm
- **IR Filter:** Integrated IR blocking filter
- **Sensitivity Range:** 3,800,000:1 dynamic range

**Integration Time:**

- **Range:** 2.4ms to 614ms
- **Options:** 2.4ms, 24ms, 50ms, 101ms, 154ms, 700ms
- **Default:** 50ms
- **Effect:** Longer time = higher sensitivity

**Gain:**

- **Options:** 1x, 4x, 16x, 60x
- **Default:** 4x
- **Effect:** Higher gain = higher sensitivity

**I2C Interface:**

- **Address:** 0x29 (fixed, not changeable)
- **Clock Speed:** Up to 400kHz (Fast Mode)
- **Data Rate:** Limited by integration time

**Electrical:**

- **Operating Voltage:** 2.7V - 3.6V (sensor), 5V tolerant I2C
- **Supply Current:**
  - Active: 200µA typical
  - Sleep: 65µA typical
- **Power Consumption:** <1mW typical

**Optical:**

- **Field of View:** ~30° (depends on mounting)
- **Optimal Distance:** 5-10mm from surface
- **Light Source:** Any visible light (400-700nm)
- **Peak Sensitivity:** ~530nm (green)

**Environmental:**

- **Operating Temperature:** -40°C to 85°C
- **Storage Temperature:** -40°C to 125°C
- **Humidity:** Non-condensing

**Physical:**

- **Module Size:** 40mm × 20mm
- **Sensor Package:** 2mm × 2mm DFN
- **Weight:** ~5g
- **Mounting:** 2× M2 mounting holes

## Color Detection Algorithms

### RGB to HSV Conversion

```cpp
void rgbToHSV(float r, float g, float b, float &h, float &s, float &v) {
  float cmax = max(r, max(g, b));
  float cmin = min(r, min(g, b));
  float delta = cmax - cmin;

  // Hue calculation
  if (delta == 0) h = 0;
  else if (cmax == r) h = 60 * fmod(((g - b) / delta), 6);
  else if (cmax == g) h = 60 * (((b - r) / delta) + 2);
  else h = 60 * (((r - g) / delta) + 4);

  if (h < 0) h += 360;

  // Saturation calculation
  s = (cmax == 0) ? 0 : (delta / cmax);

  // Value calculation
  v = cmax;
}
```

### Color Temperature to RGB

The `calculateColorTemperature()` function returns correlated color temperature (CCT) in Kelvin:

- ~2000K: Candlelight (warm)
- ~2700K: Incandescent bulb
- ~5000K: Daylight
- ~6500K: Overcast sky
- ~10000K: Blue sky (cool)

## Common Use Cases

### Automated Sorting Machine

Sort products by color on a conveyor belt using servo-controlled diverters.

### Color-Based Robot Navigation

Robot follows colored lines or responds to color markers on the floor.

### Paint Matching System

Match paint colors or identify closest standard color from database.

### Lighting Color Control

Detect ambient light color and adjust RGB LED strips to match or complement.

### Quality Control

Verify product colors match specifications in manufacturing process.

## Integration Examples

See [integration recipes](../../integrations/) for projects combining TCS34725 with:

- Servo (color sorting system)
- RGB LED (color matching display)
- OLED (color name display)
- Buzzer (color-coded alerts)

## Additional Resources

- [TCS34725 Datasheet](https://ams.com/documents/20143/36005/TCS3472_DS000390_3-00.pdf)
- [Adafruit TCS34725 Guide](https://learn.adafruit.com/adafruit-color-sensors/overview)
- [Color Science Tutorial](https://en.wikipedia.org/wiki/Color_space)

---

**Source Verification Date:** 2025-11-18  
**Repository Last Checked:** 2025-11-18  
**Tip:** Place sensor 5-10mm from colored surface for best accuracy. Adjust gain and integration time for lighting conditions!
