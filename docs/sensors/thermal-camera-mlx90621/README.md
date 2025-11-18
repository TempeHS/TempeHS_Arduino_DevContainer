# Grove Thermal Imaging Camera (MLX90621)

**Last Verified:** 2025-11-18  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Thermal_Imaging_Camera-IR_Array_MLX90621_16x4/  
**Library Repo:** https://github.com/Seeed-Studio/Seeed_Thermal_Camera_MLX9064x  
**Connection Type:** I2C

## Overview

The Grove Thermal Imaging Camera uses the MLX90621 infrared array sensor to create thermal images with a 16×4 pixel resolution. Measures temperature from -20°C to 300°C with ±1°C accuracy across a 60° field of view. No contact required - perfect for temperature mapping, person detection, fire detection, HVAC monitoring, and thermal leakage analysis. Refresh rate up to 32Hz for real-time thermal imaging.

## Authoritative References

- [Grove Thermal Imaging Camera - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Thermal_Imaging_Camera-IR_Array_MLX90621_16x4/)
- [Seeed MLX9064x Library - GitHub](https://github.com/Seeed-Studio/Seeed_Thermal_Camera_MLX9064x)
- [MLX90621 Datasheet - Melexis](https://www.melexis.com/en/documents/documentation/datasheets/datasheet-mlx90621)

## Hardware Setup

- **Connection Type:** I2C
- **Grove Port:** Any I2C port (address 0x60)
- **Sensor IC:** MLX90621 16×4 IR thermopile array
- **Resolution:** 16 columns × 4 rows = 64 pixels
- **Temperature Range:** -20°C to 300°C
- **Accuracy:** ±1°C (typical)
- **Field of View:** 60° (horizontal) × 16° (vertical)
- **Refresh Rate:** 0.5Hz to 32Hz (configurable)
- **Operating Voltage:** 3.3V - 5V
- **Current Draw:** ~18mA active
- **Response Time:** <1 second
- **Distance:** 0.5m to 5m typical detection range
- **EEPROM:** Factory calibration data stored on-chip
- **Wiring:** Connect to Grove Base Shield I2C port using 4-pin Grove cable

![Grove Thermal Camera](https://files.seeedstudio.com/wiki/Grove-Thermal_Imaging_Camera-IR_Array_MLX90621_16x4/img/main.jpg)

## Software Prerequisites

Install the Seeed Thermal Camera library:

```bash
# Method 1: Arduino Library Manager
# Open Arduino IDE → Tools → Manage Libraries
# Search "Seeed Thermal Camera" → Install

# Method 2: Manual installation
cd ~/Arduino/libraries
git clone https://github.com/Seeed-Studio/Seeed_Thermal_Camera_MLX9064x.git
```

**Library Dependencies:**

- Wire.h (built-in I2C library)
- Seeed_MLX9064x.h

## Example Code

```cpp
/*
  Purpose: Read thermal imaging data from MLX90621 16×4 IR array
  Notes:
    1. Connect to I2C port
    2. 16×4 = 64 temperature pixels
    3. Temperature range: -20°C to 300°C
    4. 60° horizontal FOV, 16° vertical FOV
    5. Update rate configurable (0.5Hz to 32Hz)
  Author: Ben Jones 18/11/25
  Source: https://github.com/Seeed-Studio/Seeed_Thermal_Camera_MLX9064x
*/

#include <Wire.h>
#include "Seeed_MLX9064x.h"

#define SENSOR_ADDR 0x60

MLX90621 sensor(SENSOR_ADDR);

void setup() {
  Serial.begin(115200);
  Wire.begin();

  Serial.println("MLX90621 Thermal Camera");

  if (!sensor.begin()) {
    Serial.println("ERROR: Sensor not found!");
    while (1);
  }

  sensor.setRefreshRate(MLX90621_REFRESHRATE_8HZ);
  Serial.println("Sensor initialized - 8Hz refresh");
}

void loop() {
  if (sensor.readData()) {
    float minTemp = 999;
    float maxTemp = -999;

    // Find min/max temperatures
    for (int i = 0; i < 64; i++) {
      float temp = sensor.getTemperature(i);
      if (temp < minTemp) minTemp = temp;
      if (temp > maxTemp) maxTemp = temp;
    }

    // Print thermal image
    Serial.println("\n--- Thermal Image ---");
    for (int row = 0; row < 4; row++) {
      for (int col = 0; col < 16; col++) {
        int pixel = row * 16 + col;
        float temp = sensor.getTemperature(pixel);

        // Map temperature to ASCII characters
        char symbol = getThermalSymbol(temp, minTemp, maxTemp);
        Serial.print(symbol);
        Serial.print(" ");
      }
      Serial.println();
    }

    Serial.print("Range: ");
    Serial.print(minTemp, 1);
    Serial.print("°C to ");
    Serial.print(maxTemp, 1);
    Serial.println("°C");
  }

  delay(125);  // 8Hz update rate
}

char getThermalSymbol(float temp, float minTemp, float maxTemp) {
  // Map temperature to ASCII thermal gradient
  float range = maxTemp - minTemp;
  if (range < 1) return '■';  // Uniform temperature

  float normalized = (temp - minTemp) / range;

  if (normalized < 0.2) return ' ';       // Coldest (blue)
  else if (normalized < 0.4) return '.';  // Cool (cyan)
  else if (normalized < 0.6) return 'o';  // Warm (green)
  else if (normalized < 0.8) return 'O';  // Hot (yellow)
  else return '■';                        // Hottest (red)
}
```

### Heat Map with Color Codes

```cpp
#include <Wire.h>
#include "Seeed_MLX9064x.h"

MLX90621 sensor(0x60);

void setup() {
  Serial.begin(115200);
  Wire.begin();
  sensor.begin();
  sensor.setRefreshRate(MLX90621_REFRESHRATE_8HZ);

  Serial.println("Thermal Heat Map (Color Coded)");
}

void loop() {
  if (sensor.readData()) {
    float minTemp = 999, maxTemp = -999;

    // Find temperature range
    for (int i = 0; i < 64; i++) {
      float temp = sensor.getTemperature(i);
      if (temp < minTemp) minTemp = temp;
      if (temp > maxTemp) maxTemp = temp;
    }

    // Print color-coded heat map
    Serial.println("\n╔════════════════════════════════╗");
    for (int row = 0; row < 4; row++) {
      Serial.print("║");
      for (int col = 0; col < 16; col++) {
        int pixel = row * 16 + col;
        float temp = sensor.getTemperature(pixel);
        printColoredTemp(temp, minTemp, maxTemp);
      }
      Serial.println("║");
    }
    Serial.println("╚════════════════════════════════╝");

    // Temperature scale
    Serial.print("Scale: ");
    Serial.print(minTemp, 1);
    Serial.print("°C [█████▓▓▓▓▓░░░░░] ");
    Serial.print(maxTemp, 1);
    Serial.println("°C");
  }

  delay(125);
}

void printColoredTemp(float temp, float minTemp, float maxTemp) {
  float range = maxTemp - minTemp;
  if (range < 1) {
    Serial.print("█");
    return;
  }

  float norm = (temp - minTemp) / range;

  // Color codes for terminal (ANSI)
  if (norm < 0.2) Serial.print("\033[34m█\033[0m");      // Blue (cold)
  else if (norm < 0.4) Serial.print("\033[36m█\033[0m"); // Cyan
  else if (norm < 0.6) Serial.print("\033[32m█\033[0m"); // Green
  else if (norm < 0.8) Serial.print("\033[33m█\033[0m"); // Yellow
  else Serial.print("\033[31m█\033[0m");                 // Red (hot)
}
```

### Person Detection

```cpp
#include <Wire.h>
#include "Seeed_MLX9064x.h"

MLX90621 sensor(0x60);

const float AMBIENT_TEMP = 22.0;  // Room temperature (°C)
const float PERSON_THRESHOLD = 5.0;  // Detect 5°C above ambient
const int MIN_PIXELS = 3;  // Minimum pixels for valid detection

void setup() {
  Serial.begin(115200);
  Wire.begin();
  sensor.begin();
  sensor.setRefreshRate(MLX90621_REFRESHRATE_16HZ);

  Serial.println("Person Detection System");
}

void loop() {
  if (sensor.readData()) {
    int hotPixels = 0;
    float maxTemp = -999;
    int hotPixelRow = 0, hotPixelCol = 0;

    // Scan for warm objects (body temperature)
    for (int row = 0; row < 4; row++) {
      for (int col = 0; col < 16; col++) {
        int pixel = row * 16 + col;
        float temp = sensor.getTemperature(pixel);

        // Count pixels above threshold
        if (temp > AMBIENT_TEMP + PERSON_THRESHOLD) {
          hotPixels++;
          if (temp > maxTemp) {
            maxTemp = temp;
            hotPixelRow = row;
            hotPixelCol = col;
          }
        }
      }
    }

    // Determine detection
    if (hotPixels >= MIN_PIXELS) {
      Serial.print("✓ PERSON DETECTED - ");
      Serial.print(hotPixels);
      Serial.print(" hot pixels, max ");
      Serial.print(maxTemp, 1);
      Serial.print("°C at (");
      Serial.print(hotPixelCol);
      Serial.print(", ");
      Serial.print(hotPixelRow);
      Serial.println(")");

      // Approximate position
      float horizontalPos = (hotPixelCol / 16.0) * 100;
      Serial.print("Position: ");
      if (horizontalPos < 33) Serial.println("LEFT");
      else if (horizontalPos < 66) Serial.println("CENTER");
      else Serial.println("RIGHT");
    } else {
      Serial.println("No person detected");
    }
  }

  delay(62);  // ~16Hz
}
```

### Fire/Hotspot Detection

```cpp
#include <Wire.h>
#include "Seeed_MLX9064x.h"

MLX90621 sensor(0x60);

const float FIRE_THRESHOLD = 60.0;  // Detect temperatures above 60°C
const float CRITICAL_THRESHOLD = 100.0;  // Critical alert threshold

void setup() {
  Serial.begin(115200);
  Wire.begin();
  sensor.begin();
  sensor.setRefreshRate(MLX90621_REFRESHRATE_16HZ);

  pinMode(LED_BUILTIN, OUTPUT);
  Serial.println("Fire/Hotspot Detection");
}

void loop() {
  if (sensor.readData()) {
    float maxTemp = -999;
    int hotspotX = 0, hotspotY = 0;
    int dangerPixels = 0;

    // Scan for dangerous temperatures
    for (int row = 0; row < 4; row++) {
      for (int col = 0; col < 16; col++) {
        int pixel = row * 16 + col;
        float temp = sensor.getTemperature(pixel);

        if (temp > FIRE_THRESHOLD) dangerPixels++;

        if (temp > maxTemp) {
          maxTemp = temp;
          hotspotX = col;
          hotspotY = row;
        }
      }
    }

    // Alert logic
    if (maxTemp > CRITICAL_THRESHOLD) {
      Serial.print("⚠ CRITICAL ALERT! ");
      Serial.print(maxTemp, 1);
      Serial.print("°C at (");
      Serial.print(hotspotX);
      Serial.print(", ");
      Serial.print(hotspotY);
      Serial.print(") - ");
      Serial.print(dangerPixels);
      Serial.println(" danger pixels");
      digitalWrite(LED_BUILTIN, HIGH);
    } else if (maxTemp > FIRE_THRESHOLD) {
      Serial.print("⚠ WARNING: Hotspot ");
      Serial.print(maxTemp, 1);
      Serial.println("°C");
      digitalWrite(LED_BUILTIN, HIGH);
    } else {
      Serial.print("OK - Max: ");
      Serial.print(maxTemp, 1);
      Serial.println("°C");
      digitalWrite(LED_BUILTIN, LOW);
    }
  }

  delay(62);
}
```

### Temperature Zone Monitoring

```cpp
#include <Wire.h>
#include "Seeed_MLX9064x.h"

MLX90621 sensor(0x60);

struct Zone {
  String name;
  int startCol, endCol;
  int startRow, endRow;
};

// Define monitoring zones
Zone zones[] = {
  {"Left", 0, 5, 0, 3},
  {"Center", 6, 10, 0, 3},
  {"Right", 11, 15, 0, 3}
};

void setup() {
  Serial.begin(115200);
  Wire.begin();
  sensor.begin();
  sensor.setRefreshRate(MLX90621_REFRESHRATE_8HZ);

  Serial.println("Temperature Zone Monitoring");
}

void loop() {
  if (sensor.readData()) {
    Serial.println("\n=== Zone Temperatures ===");

    for (int z = 0; z < 3; z++) {
      float zoneSum = 0;
      int pixelCount = 0;
      float zoneMax = -999;

      // Calculate zone statistics
      for (int row = zones[z].startRow; row <= zones[z].endRow; row++) {
        for (int col = zones[z].startCol; col <= zones[z].endCol; col++) {
          int pixel = row * 16 + col;
          float temp = sensor.getTemperature(pixel);
          zoneSum += temp;
          pixelCount++;
          if (temp > zoneMax) zoneMax = temp;
        }
      }

      float zoneAvg = zoneSum / pixelCount;

      // Print zone report
      Serial.print(zones[z].name);
      Serial.print(": Avg=");
      Serial.print(zoneAvg, 1);
      Serial.print("°C, Max=");
      Serial.print(zoneMax, 1);
      Serial.println("°C");
    }
  }

  delay(125);
}
```

### Data Logging with Timestamp

```cpp
#include <Wire.h>
#include "Seeed_MLX9064x.h"

MLX90621 sensor(0x60);

unsigned long startTime;

void setup() {
  Serial.begin(115200);
  Wire.begin();
  sensor.begin();
  sensor.setRefreshRate(MLX90621_REFRESHRATE_4HZ);

  startTime = millis();

  // CSV header
  Serial.println("Time(s),MinTemp,AvgTemp,MaxTemp,Pixel0,Pixel15,Pixel63");
}

void loop() {
  if (sensor.readData()) {
    float minTemp = 999, maxTemp = -999, sumTemp = 0;

    for (int i = 0; i < 64; i++) {
      float temp = sensor.getTemperature(i);
      sumTemp += temp;
      if (temp < minTemp) minTemp = temp;
      if (temp > maxTemp) maxTemp = temp;
    }

    float avgTemp = sumTemp / 64;
    float elapsedTime = (millis() - startTime) / 1000.0;

    // CSV output
    Serial.print(elapsedTime, 2);
    Serial.print(",");
    Serial.print(minTemp, 2);
    Serial.print(",");
    Serial.print(avgTemp, 2);
    Serial.print(",");
    Serial.print(maxTemp, 2);
    Serial.print(",");
    Serial.print(sensor.getTemperature(0), 2);
    Serial.print(",");
    Serial.print(sensor.getTemperature(15), 2);
    Serial.print(",");
    Serial.println(sensor.getTemperature(63), 2);
  }

  delay(250);  // 4Hz
}
```

### Motion Detection via Temperature Change

```cpp
#include <Wire.h>
#include "Seeed_MLX9064x.h"

MLX90621 sensor(0x60);

float previousFrame[64];
const float MOTION_THRESHOLD = 1.0;  // 1°C change = motion

void setup() {
  Serial.begin(115200);
  Wire.begin();
  sensor.begin();
  sensor.setRefreshRate(MLX90621_REFRESHRATE_16HZ);

  // Initialize previous frame
  if (sensor.readData()) {
    for (int i = 0; i < 64; i++) {
      previousFrame[i] = sensor.getTemperature(i);
    }
  }

  Serial.println("Motion Detection (Temperature Change)");
}

void loop() {
  if (sensor.readData()) {
    int changedPixels = 0;
    int motionRow = 0, motionCol = 0;
    float maxChange = 0;

    // Compare with previous frame
    for (int i = 0; i < 64; i++) {
      float currentTemp = sensor.getTemperature(i);
      float change = abs(currentTemp - previousFrame[i]);

      if (change > MOTION_THRESHOLD) {
        changedPixels++;
        if (change > maxChange) {
          maxChange = change;
          motionRow = i / 16;
          motionCol = i % 16;
        }
      }

      previousFrame[i] = currentTemp;
    }

    // Detect motion
    if (changedPixels > 3) {
      Serial.print("MOTION DETECTED - ");
      Serial.print(changedPixels);
      Serial.print(" pixels changed, max Δ");
      Serial.print(maxChange, 1);
      Serial.print("°C at (");
      Serial.print(motionCol);
      Serial.print(", ");
      Serial.print(motionRow);
      Serial.println(")");
    } else {
      Serial.println("No motion");
    }
  }

  delay(62);  // ~16Hz
}
```

**Key Points:**

- 16×4 IR thermopile array (64 pixels)
- Non-contact temperature measurement
- -20°C to 300°C range
- 60° horizontal FOV
- I2C interface (address 0x60)
- Factory calibrated (EEPROM)
- 0.5Hz to 32Hz refresh rate

## Testing Procedure

1. Connect thermal camera to I2C port
2. Install Seeed_Thermal_Camera library
3. Upload basic thermal imaging example
4. **Warm-up period:** Wait 30 seconds for sensor stabilization
5. **Test field of view:**
   - Point at your hand (~30cm distance)
   - Should show 16×4 temperature grid
   - Hand should appear as warm pixels (32-35°C)
6. **Test hot object:**
   - Point at cup of hot water
   - Should detect elevated temperature
7. **Verify range:**
   - Test ambient (~20-25°C)
   - Test body temp (~32-37°C)
   - Test hot object (>50°C)

## Troubleshooting

| Problem                  | Solution                                                             |
| ------------------------ | -------------------------------------------------------------------- |
| Sensor not found         | Check I2C wiring, verify address (0x60), run I2C scanner             |
| Inaccurate readings      | Allow 30s warm-up, check calibration, avoid direct sunlight          |
| All pixels same temp     | Check sensor not blocked, verify refresh rate set, restart sensor    |
| Noisy data               | Lower refresh rate, increase averaging, check power supply stability |
| Low temperature readings | Check EEPROM calibration loaded, verify sensor.begin() successful    |
| Sensor overheating       | Add cooling, reduce refresh rate, check current draw                 |

## Technical Specifications

**MLX90621 IR Array:**

- **Resolution:** 16 columns × 4 rows = 64 pixels
- **Pixel Pitch:** 3.75° (horizontal) × 4° (vertical)
- **Field of View:** 60° × 16°
- **Temperature Range:**
  - Object: -20°C to 300°C
  - Ambient: -40°C to 85°C
- **Accuracy:** ±1°C (typical), ±1.5°C (max)
- **Resolution:** 0.02°C
- **Refresh Rate:** 0.5Hz, 1Hz, 2Hz, 4Hz, 8Hz, 16Hz, 32Hz
- **NETD:** 0.2K @ 10Hz (noise equivalent temperature difference)

**I2C Interface:**

- **Address:** 0x60 (fixed)
- **Clock Speed:** Up to 400kHz (Fast Mode)
- **Data Format:** 16-bit temperature values
- **EEPROM:** 256 bytes factory calibration data

**Electrical:**

- **Operating Voltage:** 3.3V (sensor), 5V tolerant I2C
- **Current Draw:**
  - Active: 18mA typical
  - Standby: <1mA
- **Power-Up Time:** <1 second
- **Warm-Up Time:** 30 seconds recommended for accuracy

**Optical:**

- **Thermopile Array:** 64 independent IR sensors
- **Wavelength:** 7μm - 14μm (far infrared)
- **Response Time:** <1 second
- **Detection Distance:** 0.5m to 5m typical
- **Emissivity:** Factory calibrated for ε=1.0 (black body)

**Environmental:**

- **Operating Temperature:** -40°C to 85°C
- **Storage Temperature:** -40°C to 100°C
- **Humidity:** 0-95% RH non-condensing

**Physical:**

- **Module Size:** 40mm × 20mm
- **Weight:** ~6g
- **Mounting:** 2× M2 mounting holes
- **Lens:** Infrared-transparent window

## Common Use Cases

### HVAC Temperature Monitoring

Monitor room temperature distribution for HVAC optimization. Detect hot/cold spots in buildings.

### Person Counting

Count people entering/exiting doorways based on body heat signatures. Privacy-friendly alternative to cameras.

### Fire Detection

Early fire detection in industrial environments. Monitor equipment for overheating.

### Energy Audit

Detect heat leaks in buildings, windows, doors. Find insulation problems.

### Security System

Detect warm bodies for intrusion detection. Works in complete darkness.

## Advanced Features

### Adjusting Refresh Rate

```cpp
// Available refresh rates
sensor.setRefreshRate(MLX90621_REFRESHRATE_512HZ);  // 0.5Hz
sensor.setRefreshRate(MLX90621_REFRESHRATE_1HZ);
sensor.setRefreshRate(MLX90621_REFRESHRATE_2HZ);
sensor.setRefreshRate(MLX90621_REFRESHRATE_4HZ);
sensor.setRefreshRate(MLX90621_REFRESHRATE_8HZ);   // Good balance
sensor.setRefreshRate(MLX90621_REFRESHRATE_16HZ);  // Fast
sensor.setRefreshRate(MLX90621_REFRESHRATE_32HZ);  // Maximum
```

**Higher refresh rates:**

- Pros: Real-time tracking, motion detection
- Cons: Higher power consumption, more noisy

**Lower refresh rates:**

- Pros: Lower power, less noise, more stable
- Cons: Miss fast events

### Emissivity Compensation

Different materials have different emissivity (ε):

- Black body (matte black): ε ≈ 1.0 (factory calibration)
- Human skin: ε ≈ 0.98
- Aluminum (polished): ε ≈ 0.04
- Wood: ε ≈ 0.90

For shiny surfaces, apply correction:

```cpp
float measuredTemp = sensor.getTemperature(pixel);
float emissivity = 0.95;  // Adjust based on material
float correctedTemp = measuredTemp / pow(emissivity, 0.25);
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining thermal camera with:

- OLED display (thermal image visualization)
- Relay (automatic fan control based on temperature)
- Buzzer (overheat alarm, fire detection)
- LED bar (temperature indicator)

## Additional Resources

- [MLX90621 Datasheet](https://www.melexis.com/en/documents/documentation/datasheets/datasheet-mlx90621)
- [Thermal Imaging Tutorial](https://www.melexis.com/en/documents/tutorials/thermal-imaging-explained)
- [IR Thermometry Guide](https://www.flir.com/discover/professional-tools/what-is-infrared-thermography/)

---

**Source Verification Date:** 2025-11-18  
**Seeed Wiki Last Checked:** 2025-11-18  
**Tip:** Allow 30 seconds warm-up for accurate readings. Works in complete darkness!
