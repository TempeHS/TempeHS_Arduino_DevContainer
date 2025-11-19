# Challenge #2: Weather Station Display

**Classroom Challenge:** Environmental monitoring with multi-sensor display  
**Difficulty:** Intermediate  
**Concepts:** I2C communication, sensor data fusion, display graphics, data formatting

## Overview

Create a compact weather station that measures temperature, humidity, and air pressure, displaying all readings on an OLED screen. This simulates real-world weather monitoring stations, smart home environmental sensors, and IoT dashboard applications.

**Learning Outcomes:**

- Work with multiple I2C sensors simultaneously
- Format and display sensor data on OLED
- Understand atmospheric pressure and altitude relationships
- Create organized data visualizations
- Handle different data types and units

## Required Components

- [Temperature & Humidity Sensor (DHT20)](../sensors/temperature-humidity/) – Quantity: 1
- [Air Pressure Sensor (BMP280)](../sensors/air-pressure/) – Quantity: 1
- [OLED Display 0.96"](../sensors/oled-display/) – Quantity: 1
- Arduino Uno R4 WiFi
- Grove Base Shield
- Grove cables (3x 4-pin, all I2C)

## Wiring Diagram

**Connections:**

- Temperature/Humidity Sensor → I2C Port
- Air Pressure Sensor → I2C Port (shared bus)
- OLED Display → I2C Port (shared bus)

```
[Arduino Uno R4 WiFi]
       |
[Grove Base Shield]
       |
       +--- I2C -----> [Temperature/Humidity DHT20]
       |                      |
       +----------------------+---> [Air Pressure BMP280]
       |                      |
       +----------------------+---> [OLED Display 0.96"]
```

**Note:** All three devices share the same I2C bus. Each has a unique I2C address:

- DHT20: 0x38
- BMP280: 0x76 or 0x77
- OLED: 0x3C or 0x3D

## Step-by-Step Build

### 1. Hardware Setup

1. Mount Grove Base Shield on Arduino Uno R4 WiFi
2. Connect Temperature/Humidity sensor to I2C port
3. Connect Air Pressure sensor to I2C port (use I2C hub if needed)
4. Connect OLED Display to I2C port
5. Connect Arduino to computer via USB-C cable

### 2. Library Installation

```bash
arduino-cli lib install "Grove Temperature and Humidity Sensor"
arduino-cli lib install "Grove - Barometer Sensor BMP280"
arduino-cli lib install "U8g2"
```

Or via Arduino IDE:

- Sketch → Include Library → Manage Libraries
- Search and install: "Grove Temperature and Humidity Sensor", "Grove - Barometer Sensor BMP280", and "U8g2"

### 3. Code Implementation

```cpp
/*
  Challenge #2: Weather Station Display

  Description: Multi-sensor weather station displaying temperature, humidity,
  and atmospheric pressure on OLED screen.

  Hardware:
  - DHT20 Temperature/Humidity on I2C (0x38)
  - BMP280 Air Pressure on I2C (0x76)
  - OLED Display on I2C (0x3C)

  References:
  - DHT20: https://wiki.seeedstudio.com/Grove-Temperature-Humidity-Sensor-DH20/
  - BMP280: https://wiki.seeedstudio.com/Grove-Barometer_Sensor-BMP280/
  - OLED: https://wiki.seeedstudio.com/Grove-OLED-Display-0.96-SSD1315/
*/

#include "DHT.h"
#include "Seeed_BMP280.h"
#include <Wire.h>
#include <U8g2lib.h>

// Sensor objects
DHT dht;
BMP280 bmp280;
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

// Update interval
const unsigned long updateInterval = 2000;  // Update every 2 seconds
unsigned long lastUpdate = 0;

void setup() {
  Serial.begin(9600);
  Wire.begin();

  // Initialize DHT20
  dht.begin();

  // Initialize BMP280
  if (!bmp280.init()) {
    Serial.println("ERROR: BMP280 initialization failed!");
    while (1);
  }

  // Initialize OLED
  u8g2.begin();
  u8g2.enableUTF8Print();

  // Display startup message
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_ncenB10_tr);
  u8g2.drawStr(10, 30, "Weather");
  u8g2.drawStr(15, 50, "Station");
  u8g2.sendBuffer();
  delay(2000);

  Serial.println("Weather Station Initialized");
  Serial.println("---");
}

void loop() {
  if (millis() - lastUpdate >= updateInterval) {
    lastUpdate = millis();

    // Read sensors
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    float pressure = bmp280.getPressure() / 100.0;  // Convert Pa to hPa
    float altitude = bmp280.calcAltitude(pressure * 100);  // Estimate altitude

    // Check for read errors
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("ERROR: Failed to read DHT20");
      return;
    }

    // Display on OLED
    displayWeatherData(temperature, humidity, pressure, altitude);

    // Display on Serial Monitor
    printWeatherData(temperature, humidity, pressure, altitude);
  }
}

void displayWeatherData(float temp, float humidity, float pressure, float altitude) {
  u8g2.clearBuffer();

  // Title
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(30, 8, "WEATHER STATION");
  u8g2.drawLine(0, 10, 128, 10);

  // Temperature
  u8g2.setFont(u8g2_font_7x13_tr);
  u8g2.drawStr(5, 25, "Temp:");
  char tempStr[10];
  dtostrf(temp, 5, 1, tempStr);
  u8g2.drawStr(50, 25, tempStr);
  u8g2.drawStr(95, 25, "\xb0""C");  // Degree symbol

  // Humidity
  u8g2.drawStr(5, 40, "Hum:");
  char humStr[10];
  dtostrf(humidity, 5, 1, humStr);
  u8g2.drawStr(50, 40, humStr);
  u8g2.drawStr(95, 40, "%");

  // Pressure
  u8g2.drawStr(5, 55, "Pres:");
  char presStr[10];
  dtostrf(pressure, 6, 1, presStr);
  u8g2.drawStr(45, 55, presStr);
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(100, 55, "hPa");

  u8g2.sendBuffer();
}

void printWeatherData(float temp, float humidity, float pressure, float altitude) {
  Serial.println("=== Weather Data ===");
  Serial.print("Temperature: ");
  Serial.print(temp);
  Serial.println(" °C");

  Serial.print("Humidity:    ");
  Serial.print(humidity);
  Serial.println(" %");

  Serial.print("Pressure:    ");
  Serial.print(pressure);
  Serial.println(" hPa");

  Serial.print("Altitude:    ");
  Serial.print(altitude);
  Serial.println(" m");

  Serial.println("---");
}
```

**Key Code Sections:**

**I2C Sensor Initialization:**

```cpp
dht.begin();
bmp280.init();
u8g2.begin();
```

All three devices share I2C bus but have unique addresses.

**Reading Multiple Sensors:**

```cpp
float temperature = dht.readTemperature();
float humidity = dht.readHumidity();
float pressure = bmp280.getPressure() / 100.0;  // Pa to hPa
```

**Formatted OLED Display:**

```cpp
u8g2.clearBuffer();        // Clear display buffer
u8g2.setFont(...);         // Set font
u8g2.drawStr(x, y, text);  // Draw text at position
u8g2.sendBuffer();         // Update display
```

### 4. Testing

1. Upload the code to your Arduino
2. Open Serial Monitor (9600 baud)
3. **Expected behavior:**
   - OLED shows "Weather Station" splash screen for 2 seconds
   - Display updates every 2 seconds with:
     - Temperature in °C
     - Humidity in %
     - Pressure in hPa (hectopascals/millibars)
   - Serial Monitor shows same data plus altitude estimate
   - Breathe on sensors to see temperature/humidity change

### 5. Calibration

**Pressure Calibration:**
Check local weather report for accurate pressure reading, then adjust:

```cpp
float pressureOffset = -2.5;  // Adjust based on local station
float pressure = (bmp280.getPressure() / 100.0) + pressureOffset;
```

**Altitude Calculation:**
For accurate altitude, set sea-level pressure:

```cpp
float seaLevelPressure = 1013.25;  // Standard sea level pressure
float altitude = bmp280.calcAltitude(pressure * 100, seaLevelPressure * 100);
```

## Common Issues

| Problem                        | Cause                      | Solution                                   |
| ------------------------------ | -------------------------- | ------------------------------------------ |
| "BMP280 initialization failed" | Sensor not detected on I2C | Check connections, run I2C scanner         |
| NaN values from DHT20          | Sensor not responding      | Check I2C address (should be 0x38)         |
| OLED shows nothing             | Wrong I2C address          | Try U8G2_SSD1306_128X64_NONAME_F_SW_I2C    |
| Garbled display                | Font rendering issue       | Use u8g2.enableUTF8Print() in setup        |
| Pressure reading incorrect     | Needs calibration          | Compare with local weather station         |
| All sensors fail               | I2C bus issue              | Check SDA/SCL connections, verify 5V power |

## Extensions & Modifications

### Beginner Extensions

1. **Add icons:** Weather symbols (sun, cloud, rain) based on conditions
2. **Min/Max tracking:** Display daily temperature extremes
3. **Comfort index:** Calculate and display "feels like" temperature
4. **Trend arrows:** Show if temperature/pressure rising or falling

### Intermediate Extensions

1. **Historical graphing:** Plot temperature over last hour
2. **Weather prediction:** Use pressure trends to forecast conditions
3. **Dew point calculation:** Calculate dew point from temp/humidity
4. **Data logging:** Save readings to SD card every minute
5. **Multiple pages:** Button to cycle through detailed views

### Advanced Extensions

1. **WiFi data upload:** Send readings to cloud service (ThingSpeak, Blynk)
2. **Web dashboard:** Create local web server to view data remotely
3. **Alarm conditions:** Buzzer alerts for extreme temperatures
4. **RTC integration:** Add timestamps to all readings
5. **Multiple locations:** Compare indoor vs outdoor sensors

## Example: With Weather Forecast

```cpp
// Add these variables at top
float previousPressure = 0;
int pressureTrend = 0;  // -1 falling, 0 stable, +1 rising

void loop() {
  if (millis() - lastUpdate >= updateInterval) {
    // ... read sensors ...

    // Calculate pressure trend
    if (previousPressure > 0) {
      float change = pressure - previousPressure;
      if (change > 0.5) pressureTrend = 1;      // Rising (improving)
      else if (change < -0.5) pressureTrend = -1;  // Falling (worsening)
      else pressureTrend = 0;                   // Stable
    }
    previousPressure = pressure;

    // Display with forecast
    displayWeatherWithForecast(temperature, humidity, pressure, pressureTrend);
  }
}

void displayWeatherWithForecast(float temp, float humidity, float pressure, int trend) {
  u8g2.clearBuffer();

  // Weather data (same as before)
  // ...

  // Forecast on bottom line
  u8g2.setFont(u8g2_font_6x10_tr);
  if (trend == 1) {
    u8g2.drawStr(5, 64, "Improving");
    u8g2.drawStr(80, 64, "\x1e");  // Up arrow
  } else if (trend == -1) {
    u8g2.drawStr(5, 64, "Worsening");
    u8g2.drawStr(80, 64, "\x1f");  // Down arrow
  } else {
    u8g2.drawStr(5, 64, "Stable");
    u8g2.drawStr(80, 64, "-");
  }

  u8g2.sendBuffer();
}
```

## Example: With Temperature Graph

```cpp
#define GRAPH_POINTS 40
float tempHistory[GRAPH_POINTS];
int graphIndex = 0;

void loop() {
  // ... read sensors ...

  // Store in history
  tempHistory[graphIndex] = temperature;
  graphIndex = (graphIndex + 1) % GRAPH_POINTS;

  // Display graph every 10 readings
  static int readCount = 0;
  if (++readCount >= 10) {
    readCount = 0;
    displayGraph();
  }
}

void displayGraph() {
  u8g2.clearBuffer();

  // Title
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(10, 8, "Temperature Graph");

  // Find min/max for scaling
  float minTemp = 100, maxTemp = -100;
  for (int i = 0; i < GRAPH_POINTS; i++) {
    if (tempHistory[i] < minTemp) minTemp = tempHistory[i];
    if (tempHistory[i] > maxTemp) maxTemp = tempHistory[i];
  }

  // Draw graph
  int graphHeight = 45;
  int graphY = 55;
  for (int i = 0; i < GRAPH_POINTS - 1; i++) {
    int x1 = i * 3;
    int y1 = graphY - map(tempHistory[i] * 10, minTemp * 10, maxTemp * 10, 0, graphHeight);
    int x2 = (i + 1) * 3;
    int y2 = graphY - map(tempHistory[i + 1] * 10, minTemp * 10, maxTemp * 10, 0, graphHeight);
    u8g2.drawLine(x1, y1, x2, y2);
  }

  // Draw axis
  u8g2.drawLine(0, graphY, 120, graphY);

  u8g2.sendBuffer();
}
```

## Real-World Applications

- **Home weather stations:** Personal environmental monitoring
- **Greenhouse automation:** Monitor growing conditions
- **HVAC optimization:** Track indoor climate quality
- **Weather forecasting:** Barometric pressure trend analysis
- **Agriculture:** Monitor conditions for crop management
- **Smart buildings:** Environmental data for climate control
- **Aviation:** Weather briefings and flight planning

## Educational Value

This project teaches:

- **Multi-sensor integration:** Working with multiple I2C devices
- **Data visualization:** Creating meaningful displays from raw data
- **Atmospheric science:** Understanding weather parameters and relationships
- **Units conversion:** Pa to hPa, temperature scales
- **Display management:** Efficient screen updates and layouts

## References

- [Temperature/Humidity Sensor Guide](../sensors/temperature-humidity/)
- [Air Pressure Sensor Guide](../sensors/air-pressure/)
- [OLED Display Guide](../sensors/oled-display/)
- [U8g2 Reference Manual](https://github.com/olikraus/u8g2/wiki)
- [Understanding Barometric Pressure](https://www.weather.gov/source/zhu/ZHU_Training_Page/definitions/pressure/pressure.htm)

---

**Last Updated:** 2025-11-19  
**Tested On:** Arduino Uno R4 WiFi  
**Estimated Time:** 45-60 minutes
