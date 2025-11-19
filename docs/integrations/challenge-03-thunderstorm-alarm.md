# Challenge #3: Thunderstorm Alarm System

**Classroom Challenge:** Weather-based alerting with multi-sensor detection  
**Difficulty:** Intermediate  
**Concepts:** Environmental monitoring, threshold detection, alert generation, state machines

## Overview

Create a thunderstorm detection and warning system that monitors atmospheric pressure and temperature/humidity changes. When conditions indicate an approaching storm (rapid pressure drop), the system triggers visual (LED) and audio (buzzer) alarms. This simulates real-world weather warning systems and emergency alert applications.

**Learning Outcomes:**

- Detect atmospheric pressure changes over time
- Implement threshold-based alerting
- Create multi-modal alerts (sound + light)
- Understand weather pattern recognition
- Use rate-of-change calculations for prediction

## Required Components

- [Temperature & Humidity Sensor (DHT20)](../sensors/temperature-humidity/) – Quantity: 1
- [Air Pressure Sensor (BMP280)](../sensors/air-pressure/) – Quantity: 1
- [LED (Red LED module)](../sensors/led/) – Quantity: 1
- [Buzzer](../sensors/buzzer/) – Quantity: 1
- Arduino Uno R4 WiFi
- Grove Base Shield
- Grove cables (2x I2C, 2x Digital)

## Wiring Diagram

**Connections:**

- Temperature/Humidity Sensor → I2C Port
- Air Pressure Sensor → I2C Port (shared bus)
- LED Module → Digital Port D5
- Buzzer → Digital Port D6

```
[Arduino Uno R4 WiFi]
       |
[Grove Base Shield]
       |
       +--- I2C -----> [Temperature/Humidity DHT20]
       |                      |
       +----------------------+---> [Air Pressure BMP280]
       |
       +--- D5 -----> [LED Module]
       |
       +--- D6 -----> [Buzzer]
```

**Note:** I2C sensors share the same bus, while output devices use separate digital pins.

## Step-by-Step Build

### 1. Hardware Setup

1. Mount Grove Base Shield on Arduino Uno R4 WiFi
2. Connect Temperature/Humidity sensor to I2C port
3. Connect Air Pressure sensor to I2C port
4. Connect LED module to digital port D5
5. Connect Buzzer to digital port D6
6. Connect Arduino to computer via USB-C cable

### 2. Library Installation

```bash
arduino-cli lib install "Grove Temperature and Humidity Sensor"
arduino-cli lib install "Grove - Barometer Sensor BMP280"
```

Or via Arduino IDE:

- Sketch → Include Library → Manage Libraries
- Search and install: "Grove Temperature and Humidity Sensor" and "Grove - Barometer Sensor BMP280"

### 3. Code Implementation

```cpp
/*
  Challenge #3: Thunderstorm Alarm System

  Description: Monitors atmospheric pressure and temperature to detect
  approaching thunderstorms. Triggers LED and buzzer alarms when rapid
  pressure drop is detected.

  Hardware:
  - DHT20 Temperature/Humidity on I2C (0x38)
  - BMP280 Air Pressure on I2C (0x76)
  - LED on D5
  - Buzzer on D6

  References:
  - DHT20: https://wiki.seeedstudio.com/Grove-Temperature-Humidity-Sensor-DH20/
  - BMP280: https://wiki.seeedstudio.com/Grove-Barometer_Sensor-BMP280/
  - LED: https://wiki.seeedstudio.com/Grove-Red_LED/
  - Buzzer: https://wiki.seeedstudio.com/Grove-Buzzer/
*/

#include "DHT.h"
#include "Seeed_BMP280.h"
#include <Wire.h>

// Pin definitions
const int ledPin = 5;
const int buzzerPin = 6;

// Sensor objects
DHT dht;
BMP280 bmp280;

// Pressure tracking for storm detection
const int historySize = 10;  // Track last 10 readings
float pressureHistory[historySize];
int historyIndex = 0;
bool historyFull = false;

// Storm detection thresholds
const float rapidDropThreshold = 3.0;     // 3 hPa drop = warning
const float severeDropThreshold = 5.0;    // 5 hPa drop = severe warning
const float tempChangeThreshold = 3.0;    // 3°C drop = additional indicator

// Alert states
enum AlertLevel {
  NORMAL,
  WARNING,
  SEVERE
};
AlertLevel currentAlert = NORMAL;

// Timing
const unsigned long readInterval = 30000;  // Read every 30 seconds
unsigned long lastRead = 0;
unsigned long alertStartTime = 0;
const unsigned long alertDuration = 10000;  // Alert for 10 seconds

void setup() {
  Serial.begin(9600);
  Wire.begin();

  pinMode(ledPin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);

  // Initialize sensors
  dht.begin();
  if (!bmp280.init()) {
    Serial.println("ERROR: BMP280 initialization failed!");
    while (1);
  }

  // Initialize pressure history
  for (int i = 0; i < historySize; i++) {
    pressureHistory[i] = 0;
  }

  // Initial reading
  pressureHistory[0] = bmp280.getPressure() / 100.0;

  Serial.println("Thunderstorm Alarm System Initialized");
  Serial.println("Monitoring atmospheric conditions...");
  Serial.println("---");

  // Startup beep
  tone(buzzerPin, 1000, 200);
  delay(300);
}

void loop() {
  // Read sensors at regular intervals
  if (millis() - lastRead >= readInterval) {
    lastRead = millis();
    checkWeatherConditions();
  }

  // Handle active alerts
  if (currentAlert != NORMAL) {
    if (millis() - alertStartTime < alertDuration) {
      handleAlert(currentAlert);
    } else {
      // Alert timeout - return to normal monitoring
      currentAlert = NORMAL;
      digitalWrite(ledPin, LOW);
      noTone(buzzerPin);
      Serial.println("Alert cleared - returning to normal monitoring");
    }
  }

  delay(100);
}

void checkWeatherConditions() {
  // Read current conditions
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  float currentPressure = bmp280.getPressure() / 100.0;  // Convert to hPa

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("ERROR: Failed to read DHT20");
    return;
  }

  // Store current pressure in history
  historyIndex = (historyIndex + 1) % historySize;
  pressureHistory[historyIndex] = currentPressure;
  if (historyIndex == historySize - 1) historyFull = true;

  // Display current conditions
  Serial.println("=== Current Conditions ===");
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" °C");
  Serial.print("Humidity:    ");
  Serial.print(humidity);
  Serial.println(" %");
  Serial.print("Pressure:    ");
  Serial.print(currentPressure);
  Serial.println(" hPa");

  // Calculate pressure change if we have enough history
  if (historyFull) {
    float oldestPressure = pressureHistory[(historyIndex + 1) % historySize];
    float pressureChange = currentPressure - oldestPressure;
    float timeSpanMinutes = (historySize * readInterval) / 60000.0;

    Serial.print("Pressure change: ");
    Serial.print(pressureChange);
    Serial.print(" hPa over ");
    Serial.print(timeSpanMinutes);
    Serial.println(" minutes");

    // Check for storm conditions (pressure DROP is negative)
    if (pressureChange <= -severeDropThreshold) {
      triggerAlert(SEVERE);
      Serial.println("*** SEVERE STORM WARNING ***");
      Serial.println("Rapid pressure drop detected!");
    } else if (pressureChange <= -rapidDropThreshold) {
      triggerAlert(WARNING);
      Serial.println("** Storm Warning **");
      Serial.println("Pressure dropping - storm may be approaching");
    } else {
      Serial.println("Conditions: Normal");
    }
  } else {
    Serial.println("Building pressure history...");
  }

  Serial.println("---");
}

void triggerAlert(AlertLevel level) {
  currentAlert = level;
  alertStartTime = millis();
}

void handleAlert(AlertLevel level) {
  if (level == WARNING) {
    // Warning: Slow blinking LED + intermittent beeps
    static unsigned long lastBlink = 0;
    static bool ledState = false;

    if (millis() - lastBlink >= 500) {
      lastBlink = millis();
      ledState = !ledState;
      digitalWrite(ledPin, ledState ? HIGH : LOW);

      if (ledState) {
        tone(buzzerPin, 1000, 100);  // Short beep
      }
    }
  } else if (level == SEVERE) {
    // Severe: Fast blinking LED + continuous alarm
    static unsigned long lastBlink = 0;
    static bool ledState = false;

    if (millis() - lastBlink >= 200) {
      lastBlink = millis();
      ledState = !ledState;
      digitalWrite(ledPin, ledState ? HIGH : LOW);

      if (ledState) {
        tone(buzzerPin, 1500, 150);  // Higher pitch
      } else {
        tone(buzzerPin, 1000, 150);  // Lower pitch (siren effect)
      }
    }
  }
}
```

**Key Code Sections:**

**Pressure History Tracking:**

```cpp
float pressureHistory[historySize];
pressureHistory[historyIndex] = currentPressure;
```

Circular buffer stores last 10 readings to calculate trends.

**Rate of Change Calculation:**

```cpp
float pressureChange = currentPressure - oldestPressure;
```

Negative values indicate pressure drop (storm approaching).

**Multi-Level Alerts:**

```cpp
enum AlertLevel { NORMAL, WARNING, SEVERE };
```

Different alert patterns for different severity levels.

### 4. Testing

1. Upload the code to your Arduino
2. Open Serial Monitor (9600 baud)
3. **Expected behavior:**
   - System reads conditions every 30 seconds
   - Serial Monitor shows temperature, humidity, pressure
   - "Building pressure history..." for first 5 minutes
   - After history built, shows pressure change calculations
   - To test alerts artificially:
     - Modify thresholds to smaller values temporarily
     - Or manually trigger alerts in code

**Simulating Storm Conditions:**
To test without waiting for real weather changes:

```cpp
// Add this temporary test code in setup() after initialization:
void testAlerts() {
  Serial.println("Testing WARNING alert...");
  triggerAlert(WARNING);
  delay(12000);

  Serial.println("Testing SEVERE alert...");
  triggerAlert(SEVERE);
  delay(12000);

  currentAlert = NORMAL;
  digitalWrite(ledPin, LOW);
  noTone(buzzerPin);
}
```

### 5. Calibration

**Adjust sensitivity for your location:**

```cpp
const float rapidDropThreshold = 3.0;   // Decrease for more sensitivity
const float severeDropThreshold = 5.0;  // Adjust based on local weather patterns
```

**Adjust timing:**

```cpp
const unsigned long readInterval = 30000;  // More frequent = faster detection
const int historySize = 10;  // Larger = smoother but slower response
```

## Common Issues

| Problem                    | Cause                    | Solution                                                  |
| -------------------------- | ------------------------ | --------------------------------------------------------- |
| Alerts never trigger       | Thresholds too high      | Lower threshold values or increase historySize            |
| False alarms               | Thresholds too sensitive | Increase threshold values, ensure stable sensor placement |
| Pressure readings unstable | Sensor in airflow        | Place sensor away from fans, windows, AC vents            |
| Buzzer too quiet           | Insufficient current     | Check connections, verify 5V power                        |
| "Building history" forever | Not enough time elapsed  | Wait (historySize × readInterval) milliseconds            |
| DHT20 read errors          | I2C communication issue  | Check connections, verify I2C address 0x38                |

## Extensions & Modifications

### Beginner Extensions

1. **Add OLED display:** Show current conditions and alert status
2. **Color-coded LEDs:** Green (normal), yellow (warning), red (severe)
3. **Adjustable sensitivity:** Use potentiometer to set thresholds
4. **Data logging:** Record all readings to Serial for analysis

### Intermediate Extensions

1. **Historical graphing:** Plot pressure trends on OLED
2. **Temperature correlation:** Factor in rapid temp drops
3. **Humidity alerts:** Detect sudden humidity increases
4. **Button to silence:** Acknowledge alarm but continue monitoring
5. **Multiple time scales:** Check 5-min, 15-min, and 30-min trends

### Advanced Extensions

1. **Machine learning:** Train model on local weather patterns
2. **WiFi weather integration:** Compare to online weather APIs
3. **Lightning detection:** Add electromagnetic field sensor
4. **Predictive modeling:** Estimate time until storm arrival
5. **Data persistence:** Save trends across power cycles with EEPROM
6. **SMS/email alerts:** Send notifications via WiFi

## Example: With OLED Display

```cpp
#include <U8g2lib.h>

U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

void setup() {
  // ... previous setup ...
  u8g2.begin();
  u8g2.enableUTF8Print();
}

void displayStatus(float temp, float pressure, float change, AlertLevel alert) {
  u8g2.clearBuffer();

  // Title based on alert level
  u8g2.setFont(u8g2_font_ncenB08_tr);
  if (alert == SEVERE) {
    u8g2.drawStr(10, 10, "*** SEVERE ***");
  } else if (alert == WARNING) {
    u8g2.drawStr(15, 10, "** WARNING **");
  } else {
    u8g2.drawStr(25, 10, "MONITORING");
  }

  // Current conditions
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(5, 25, "Temp:");
  char tempStr[10];
  dtostrf(temp, 5, 1, tempStr);
  u8g2.drawStr(50, 25, tempStr);
  u8g2.drawStr(90, 25, "C");

  u8g2.drawStr(5, 38, "Press:");
  char presStr[10];
  dtostrf(pressure, 6, 1, presStr);
  u8g2.drawStr(50, 38, presStr);
  u8g2.drawStr(95, 38, "hPa");

  u8g2.drawStr(5, 51, "Change:");
  char changeStr[10];
  dtostrf(change, 5, 1, changeStr);
  u8g2.drawStr(50, 51, changeStr);
  u8g2.drawStr(95, 51, "hPa");

  // Alert indicator at bottom
  if (alert != NORMAL) {
    u8g2.drawBox(0, 55, 128, 9);  // Black bar
    u8g2.setColorIndex(0);  // White text on black
    u8g2.drawStr(20, 63, "STORM DETECTED");
    u8g2.setColorIndex(1);  // Reset to black text
  }

  u8g2.sendBuffer();
}
```

## Example: With Temperature Factor

```cpp
float previousTemperature = 0;

void checkWeatherConditions() {
  // ... read sensors ...

  // Check temperature drop (additional storm indicator)
  if (previousTemperature > 0) {
    float tempChange = temperature - previousTemperature;

    if (tempChange <= -tempChangeThreshold && pressureChange <= -rapidDropThreshold) {
      // Combined indicators = higher confidence
      Serial.println("Multiple storm indicators detected!");
      triggerAlert(SEVERE);
    }
  }

  previousTemperature = temperature;

  // ... rest of function ...
}
```

## Real-World Applications

- **Weather warning systems:** Emergency alert services
- **Marine navigation:** Storm avoidance for boats
- **Outdoor event management:** Concert/sports cancellation decisions
- **Agriculture:** Protect crops from severe weather
- **Construction sites:** Worker safety alerts
- **Aviation:** Flight planning and safety
- **Smart homes:** Automatic window/awning closing

## Storm Detection Science

**How It Works:**

- **Rapid pressure drop:** Approaching low-pressure system
- **Temperature drop:** Cold front associated with storms
- **Humidity increase:** Moisture preceding precipitation
- **Rate matters:** Speed of change indicates storm severity

**Typical Pressure Changes:**

- Normal variations: 1-2 hPa per hour
- Approaching storm: 3-5 hPa per hour
- Severe storm: 5-10+ hPa per hour

**Limitations:**

- Cannot detect lightning directly (requires different sensors)
- Time lag between detection and storm arrival (10-60 minutes typical)
- False positives from weather fronts, elevation changes, building pressure

## Educational Value

This project teaches:

- **Time-series analysis:** Tracking data over time
- **Rate-of-change calculations:** Derivatives in practical context
- **Threshold-based decisions:** If-then logic for automation
- **Multi-modal alerts:** Combining visual and audio feedback
- **Meteorology basics:** Understanding atmospheric pressure and weather

## References

- [Temperature/Humidity Sensor Guide](../sensors/temperature-humidity/)
- [Air Pressure Sensor Guide](../sensors/air-pressure/)
- [LED Guide](../sensors/led/)
- [Buzzer Guide](../sensors/buzzer/)
- [Understanding Low Pressure Systems](https://www.weather.gov/jetstream/pressure)
- [Barometric Pressure and Weather](https://www.weather.gov/source/zhu/ZHU_Training_Page/definitions/pressure/pressure.htm)

---

**Last Updated:** 2025-11-19  
**Tested On:** Arduino Uno R4 WiFi  
**Estimated Time:** 45-60 minutes
