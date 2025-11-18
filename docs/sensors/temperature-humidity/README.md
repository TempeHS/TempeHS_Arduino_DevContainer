# Grove Temperature & Humidity Sensor (DHT20)

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Temperature-Humidity-Sensor-DH20/  
**Library Repo:** https://github.com/Seeed-Studio/Grove_Temperature_And_Humidity_Sensor  
**Connection Type:** I2C

## Overview

The Grove Temperature & Humidity Sensor (DHT20) accurately measures ambient temperature and relative humidity using I2C communication. Ideal for weather stations, environmental monitoring, and climate control projects.

## Authoritative References

- [Grove Temperature & Humidity Sensor (DHT20) - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Temperature-Humidity-Sensor-DH20/)
- [Grove_Temperature_And_Humidity_Sensor Library](https://github.com/Seeed-Studio/Grove_Temperature_And_Humidity_Sensor)

## Hardware Setup

- **Connection Type:** I2C
- **Grove Port:** I2C port on Base Shield
- **Power Requirements:** 3.3V - 5V
- **I2C Address:** 0x38 (default)
- **Temperature Range:** -40°C to +80°C
- **Humidity Range:** 0% to 100% RH
- **Wiring:** Connect to Grove Base Shield I2C port using 4-pin Grove cable

![Grove DHT20](https://files.seeedstudio.com/wiki/Grove-Temperature-Humidity-Sensor/Tem-humidity-sensor-new.jpg)

## Software Prerequisites

### Required Libraries

```bash
arduino-cli lib install "DHT sensor library"
```

Or via Arduino IDE: Sketch → Include Library → Manage Libraries → Search "DHT sensor library"

## Example Code

```cpp
/*
  Purpose: Basic example of reading Temperature & Humidity Sensor
  Notes:
    1. Connect to I2C - default address 0x38
    2. Reading takes about 250ms
    3. Sensor readings may be up to 2 seconds old
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Temperature-Humidity-Sensor-DH20/
  Library: https://github.com/Seeed-Studio/Grove_Temperature_And_Humidity_Sensor
*/

#include "Wire.h"
#include "DHT.h"

#define DHTTYPE DHT20   // DHT 20
DHT dht(DHTTYPE);

void setup() {
  Serial.begin(9600);
  Wire.begin();
  dht.begin();
  Serial.println("DHT20 Temperature & Humidity Sensor");
}

void loop() {
  float temperature = dht.readTemperature();  // Celsius
  float humidity = dht.readHumidity();        // Percent

  // Check if readings are valid
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }

  Serial.print("Humidity: ");
  Serial.print(humidity);
  Serial.print(" %\t");
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" °C");

  delay(2000);  // Wait 2 seconds between readings
}
```

### With Fahrenheit Conversion

```cpp
#include "Wire.h"
#include "DHT.h"

#define DHTTYPE DHT20
DHT dht(DHTTYPE);

void setup() {
  Serial.begin(9600);
  Wire.begin();
  dht.begin();
}

void loop() {
  float tempC = dht.readTemperature();       // Celsius
  float tempF = dht.readTemperature(true);   // Fahrenheit
  float humidity = dht.readHumidity();

  if (isnan(tempC) || isnan(humidity)) {
    Serial.println("Sensor read error!");
    return;
  }

  // Calculate heat index in Celsius and Fahrenheit
  float heatIndexC = dht.computeHeatIndex(tempC, humidity, false);
  float heatIndexF = dht.computeHeatIndex(tempF, humidity, true);

  Serial.print("Temp: ");
  Serial.print(tempC);
  Serial.print("°C / ");
  Serial.print(tempF);
  Serial.println("°F");

  Serial.print("Humidity: ");
  Serial.print(humidity);
  Serial.println("%");

  Serial.print("Heat Index: ");
  Serial.print(heatIndexC);
  Serial.print("°C / ");
  Serial.print(heatIndexF);
  Serial.println("°F");
  Serial.println();

  delay(2000);
}
```

**Key Points:**

- Uses I2C communication (no digital pin needed)
- `readTemperature()` returns Celsius by default
- `readTemperature(true)` returns Fahrenheit
- `readHumidity()` returns relative humidity percentage
- Always check for NaN (not-a-number) to detect read errors
- Minimum 2-second delay between readings recommended

## Testing Procedure

1. Connect sensor to I2C port on Grove Base Shield
2. Upload example sketch
3. Open Serial Monitor (9600 baud)
4. **Expected output:**
   - Temperature reading (room temperature ~20-25°C)
   - Humidity reading (typical indoor 30-60%)
   - Updates every 2 seconds
5. Breathe on sensor to see humidity increase
6. Hold sensor to see temperature increase

## Troubleshooting

| Problem                  | Solution                                                  |
| ------------------------ | --------------------------------------------------------- |
| "Failed to read" error   | Check I2C connection, verify Wire.begin() called          |
| Always returns NaN       | Sensor may need initialization time; add delay in setup() |
| Readings seem off        | Sensor needs 2-hour stabilization period when new         |
| Temperature too high/low | Ensure proper ventilation, not near heat sources          |
| Humidity 0% or 100%      | Sensor error; check connections and power                 |

## Technical Specifications

- **Temperature Range:** -40°C to +80°C
- **Temperature Accuracy:** ±0.5°C
- **Humidity Range:** 0% to 100% RH
- **Humidity Accuracy:** ±3% RH (at 25°C)
- **Response Time:** < 5 seconds
- **Interface:** I2C (address 0x38)
- **Operating Voltage:** 2.2V - 5.5V
- **Power Consumption:** < 1mA

## Common Use Cases

### Temperature Alert System

```cpp
const float tempThreshold = 30.0;  // Alert at 30°C

void loop() {
  float temp = dht.readTemperature();

  if (!isnan(temp)) {
    if (temp > tempThreshold) {
      Serial.println("HIGH TEMPERATURE WARNING!");
      // Trigger alarm/LED/etc
    }
  }
  delay(2000);
}
```

### Comfort Level Indicator

```cpp
void loop() {
  float temp = dht.readTemperature();
  float humid = dht.readHumidity();

  if (!isnan(temp) && !isnan(humid)) {
    Serial.print("Comfort Level: ");

    if (temp >= 20 && temp <= 26 && humid >= 30 && humid <= 60) {
      Serial.println("COMFORTABLE");
    } else if (temp < 18 || temp > 28) {
      Serial.println("UNCOMFORTABLE (Temperature)");
    } else if (humid < 25 || humid > 70) {
      Serial.println("UNCOMFORTABLE (Humidity)");
    } else {
      Serial.println("MODERATE");
    }
  }
  delay(2000);
}
```

### Data Logging

```cpp
unsigned long startTime;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  dht.begin();
  startTime = millis();
  Serial.println("Timestamp,Temperature(C),Humidity(%)");
}

void loop() {
  float temp = dht.readTemperature();
  float humid = dht.readHumidity();

  if (!isnan(temp) && !isnan(humid)) {
    Serial.print((millis() - startTime) / 1000);  // Seconds
    Serial.print(",");
    Serial.print(temp);
    Serial.print(",");
    Serial.println(humid);
  }
  delay(10000);  // Log every 10 seconds
}
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining Temperature & Humidity with:

- OLED display (weather station) - **Challenge #2**
- Air pressure sensor (thunderstorm warning) - **Challenge #3**
- Buzzer (temperature alarm)
- LED (humidity indicator)

## Additional Resources

- [DHT Sensor Library Documentation](https://github.com/Seeed-Studio/Grove_Temperature_And_Humidity_Sensor)
- [Heat Index Calculator](https://en.wikipedia.org/wiki/Heat_index)
- [Relative Humidity](https://en.wikipedia.org/wiki/Relative_humidity)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Library Version:** Check [releases](https://github.com/Seeed-Studio/Grove_Temperature_And_Humidity_Sensor/releases)
