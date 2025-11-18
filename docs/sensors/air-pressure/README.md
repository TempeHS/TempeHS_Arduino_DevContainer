# Grove Air Pressure Sensor (BMP280)

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Barometer_Sensor/  
**Library Repo:** https://github.com/Seeed-Studio/Grove_BMP280  
**Connection Type:** I2C

## Overview

The Grove Air Pressure Sensor (BMP280) measures barometric pressure and temperature using I2C communication. Can calculate altitude from pressure readings. Ideal for weather stations, altitude tracking, and environmental monitoring.

## Authoritative References

- [Grove Barometer Sensor (BMP280) - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Barometer_Sensor/)
- [Grove_BMP280 Library](https://github.com/Seeed-Studio/Grove_BMP280)

## Hardware Setup

- **Connection Type:** I2C
- **Grove Port:** I2C port on Base Shield
- **Power Requirements:** 1.8V - 3.6V (module handles voltage regulation)
- **I2C Address:** 0x77 (default) or 0x76
- **Pressure Range:** 300 - 1100 hPa
- **Wiring:** Connect to Grove Base Shield I2C port using 4-pin Grove cable

![Grove BMP280](https://files.seeedstudio.com/wiki/Grove-Barometer_Sensor-BMP280/img/BMP280.jpg)

## Software Prerequisites

### Required Libraries

```bash
arduino-cli lib install "Grove - Barometer Sensor BMP280"
```

Or via Arduino IDE: Sketch → Include Library → Manage Libraries → Search "Grove BMP280"

## Example Code

```cpp
/*
  Purpose: Basic example of reading Air Pressure Sensor
  Notes:
    1. Connect to I2C - 0x77 default or 0x76
    2. Operating temperature: -40 to 85°C
    3. Pressure range: 300 - 1100 hPa with ±1.0 hPa accuracy
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Barometer_Sensor/
  Library: https://github.com/Seeed-Studio/Grove_BMP280
*/

#include "Seeed_BMP280.h"
#include <Wire.h>

BMP280 bmp280;

void setup() {
  Serial.begin(9600);

  if (!bmp280.init()) {
    Serial.println("Device initialization failed!");
    while(1);
  }

  Serial.println("BMP280 Air Pressure Sensor");
}

void loop() {
  float temperature = bmp280.getTemperature();
  float pressure = bmp280.getPressure();
  float altitude = bmp280.calcAltitude(pressure);

  Serial.print("Temp: ");
  Serial.print(temperature);
  Serial.println(" °C");

  Serial.print("Pressure: ");
  Serial.print(pressure);
  Serial.println(" Pa");

  Serial.print("Altitude: ");
  Serial.print(altitude);
  Serial.println(" m");

  Serial.println();
  delay(1000);
}
```

### Pressure in Different Units

```cpp
#include "Seeed_BMP280.h"
#include <Wire.h>

BMP280 bmp280;

void setup() {
  Serial.begin(9600);
  if (!bmp280.init()) {
    Serial.println("Device error!");
    while(1);
  }
}

void loop() {
  float pressurePa = bmp280.getPressure();
  float pressureHPa = pressurePa / 100.0;        // Hectopascals
  float pressurekPa = pressurePa / 1000.0;       // Kilopascals
  float pressureMMHg = pressurePa * 0.00750062;  // mmHg
  float pressureInHg = pressurePa * 0.00029530;  // inHg

  Serial.print("Pressure: ");
  Serial.print(pressurePa);
  Serial.print(" Pa = ");
  Serial.print(pressureHPa);
  Serial.print(" hPa = ");
  Serial.print(pressurekPa);
  Serial.print(" kPa = ");
  Serial.print(pressureMMHg);
  Serial.print(" mmHg = ");
  Serial.print(pressureInHg);
  Serial.println(" inHg");

  delay(2000);
}
```

**Key Points:**

- `getPressure()` returns pressure in Pascals (Pa)
- 1 hPa = 100 Pa (hectopascal = millibar)
- Normal atmospheric pressure: ~1013 hPa (101300 Pa) at sea level
- `getTemperature()` returns temperature in Celsius
- `calcAltitude(pressure)` estimates altitude based on pressure
- Can detect weather changes (rising/falling pressure)

## Testing Procedure

1. Connect sensor to I2C port on Grove Base Shield
2. Upload example sketch
3. Open Serial Monitor (9600 baud)
4. **Expected output:**
   - Temperature: room temperature (~20-25°C)
   - Pressure: ~98000-104000 Pa (varies by altitude and weather)
   - Altitude: approximate elevation above sea level
5. Take sensor to different floor levels to see altitude change

## Troubleshooting

| Problem                        | Solution                                                 |
| ------------------------------ | -------------------------------------------------------- |
| "Device initialization failed" | Check I2C connection, verify power supply                |
| Pressure seems wrong           | Normal range 98000-104000 Pa; varies by location/weather |
| Altitude incorrect             | Needs calibration to local sea level pressure            |
| Temperature reading off        | Sensor can be affected by nearby heat sources            |
| No I2C communication           | Check SDA/SCL connections, try address 0x76              |

## Technical Specifications

- **Pressure Range:** 300 - 1100 hPa
- **Pressure Accuracy:** ±1.0 hPa
- **Temperature Range:** -40°C to +85°C
- **Temperature Accuracy:** ±1.0°C
- **Interface:** I2C (address 0x77 or 0x76)
- **Operating Voltage:** 1.8V - 3.6V (module regulated)
- **Power Consumption:** < 1mA

## Common Use Cases

### Weather Station

```cpp
void loop() {
  float pressure = bmp280.getPressure() / 100.0;  // Convert to hPa

  Serial.print("Barometric Pressure: ");
  Serial.print(pressure);
  Serial.print(" hPa - ");

  if (pressure < 1005) {
    Serial.println("Low (Stormy weather likely)");
  } else if (pressure < 1013) {
    Serial.println("Normal (Fair weather)");
  } else {
    Serial.println("High (Clear, dry weather)");
  }

  delay(5000);
}
```

### Pressure Trend Tracker

```cpp
float previousPressure = 0;
unsigned long lastCheck = 0;
const unsigned long interval = 600000;  // 10 minutes

void loop() {
  unsigned long currentTime = millis();

  if (currentTime - lastCheck >= interval) {
    float currentPressure = bmp280.getPressure() / 100.0;

    if (previousPressure > 0) {
      float change = currentPressure - previousPressure;

      Serial.print("Pressure change: ");
      Serial.print(change);
      Serial.println(" hPa/10min");

      if (change < -1.5) {
        Serial.println("Rapid drop - Storm approaching!");
      } else if (change > 1.5) {
        Serial.println("Rapid rise - Weather improving!");
      }
    }

    previousPressure = currentPressure;
    lastCheck = currentTime;
  }

  delay(1000);
}
```

### Altitude Estimator

```cpp
// Set this to your local sea level pressure
const float seaLevelPressure = 1013.25;  // hPa

void loop() {
  float pressure = bmp280.getPressure() / 100.0;  // hPa

  // Calculate altitude using barometric formula
  float altitude = 44330.0 * (1.0 - pow(pressure / seaLevelPressure, 0.1903));

  Serial.print("Altitude: ");
  Serial.print(altitude);
  Serial.println(" meters");

  delay(1000);
}
```

### Thunderstorm Warning

```cpp
float lastPressure = 0;
const float pressureDropThreshold = 3.0;  // hPa

void loop() {
  float currentPressure = bmp280.getPressure() / 100.0;

  if (lastPressure > 0) {
    float drop = lastPressure - currentPressure;

    if (drop > pressureDropThreshold) {
      Serial.println("⚠️  THUNDERSTORM WARNING!");
      Serial.print("Pressure dropped ");
      Serial.print(drop);
      Serial.println(" hPa rapidly");
      // Trigger alarm, buzzer, LED, etc.
    }
  }

  lastPressure = currentPressure;
  delay(60000);  // Check every minute
}
```

## Pressure Units Reference

| Unit              | Conversion    | Typical Sea Level |
| ----------------- | ------------- | ----------------- |
| Pascal (Pa)       | Base unit     | ~101300 Pa        |
| Hectopascal (hPa) | Pa / 100      | ~1013 hPa         |
| Millibar (mbar)   | Same as hPa   | ~1013 mbar        |
| Kilopascal (kPa)  | Pa / 1000     | ~101.3 kPa        |
| mmHg              | Pa × 0.0075   | ~760 mmHg         |
| inHg              | Pa × 0.000295 | ~29.92 inHg       |

## Integration Examples

See [integration recipes](../../integrations/) for projects combining Air Pressure with:

- Temperature & Humidity sensor (complete weather station) - **Challenge #2**
- OLED display (pressure graph)
- Buzzer (storm warning) - **Challenge #3**
- LED (pressure trend indicator)

## Additional Resources

- [BMP280 Datasheet](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmp280-ds001.pdf)
- [Barometric Pressure Explained](https://en.wikipedia.org/wiki/Atmospheric_pressure)
- [Weather Forecasting with Pressure](https://en.wikipedia.org/wiki/Barometer#Forecasting)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Library Version:** Check [releases](https://github.com/Seeed-Studio/Grove_BMP280/releases)
