# Grove Time of Flight Distance Sensor (VL53L0X)

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Time_of_Flight_Distance_Sensor-VL53L0X/  
**Library Repo:** https://github.com/Seeed-Studio/Seeed_VL53L0X  
**Connection Type:** I2C

## Overview

The Grove VL53L0X is a Time-of-Flight (ToF) laser-ranging sensor providing precise distance measurements from 30mm to 2000mm (3cm to 2m). Uses 940nm invisible infrared laser and measures time for light to travel to target and back. Independent of target color or reflectivity. Accurate to ±3% over full range. Ideal for robotics obstacle avoidance, people counting, gesture detection, and liquid level sensing.

## Authoritative References

- [Grove VL53L0X - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Time_of_Flight_Distance_Sensor-VL53L0X/)
- [Seeed_VL53L0X Library - GitHub](https://github.com/Seeed-Studio/Seeed_VL53L0X)
- [VL53L0X Datasheet - STMicroelectronics](https://www.st.com/resource/en/datasheet/vl53l0x.pdf)

## Hardware Setup

- **Connection Type:** I2C
- **Grove Port:** Any I2C port (address 0x29)
- **Measurement Range:** 30mm - 2000mm (3cm - 2m)
- **Accuracy:** ±3% at 1m distance
- **Resolution:** 1mm
- **Field of View:** 25° cone
- **Operating Voltage:** 3.3V - 5V (internal regulator)
- **Current:** 19mA continuous ranging
- **Laser Type:** 940nm Class 1 invisible infrared (eye-safe)
- **Measurement Rate:** Up to 50Hz (20ms per reading)
- **Ambient Light Immunity:** High (works in bright sunlight)
- **Wiring:** Connect to Grove Base Shield I2C port using 4-pin Grove cable

![Grove VL53L0X](https://files.seeedstudio.com/wiki/Grove-Time_of_Flight_Distance_Sensor-VL53L0X/img/main.jpg)

**⚠️ LASER SAFETY:**

- Class 1 laser device (eye-safe under normal use)
- Do not stare directly into laser aperture
- Do not use optical instruments to view laser
- Infrared - invisible to human eye

## Software Prerequisites

Install the Seeed VL53L0X library:

```bash
# Method 1: Arduino Library Manager
# Open Arduino IDE → Tools → Manage Libraries
# Search "Seeed VL53L0X" → Install

# Method 2: Manual installation
cd ~/Arduino/libraries
git clone https://github.com/Seeed-Studio/Seeed_VL53L0X.git
```

**Library Dependencies:**

- Wire.h (built-in I2C library)

## Example Code

```cpp
/*
  Purpose: Measure distance using VL53L0X Time-of-Flight sensor
  Notes:
    1. Connect to I2C port
    2. Range: 30mm - 2000mm (3cm - 2m)
    3. 1mm resolution
    4. Works regardless of target color/reflectivity
    5. Eye-safe Class 1 infrared laser (940nm)
  Author: Ben Jones 14/7/23
  Source: https://github.com/Seeed-Studio/Seeed_VL53L0X
*/

#include <Wire.h>
#include "Seeed_vl53l0x.h"

Seeed_vl53l0x VL53L0X;

void setup() {
  Serial.begin(9600);
  Wire.begin();

  Serial.println("VL53L0X Time-of-Flight Distance Sensor");

  // Initialize sensor
  if (VL53L0X.begin() != 0) {
    Serial.println("VL53L0X initialization failed!");
    Serial.println("Check I2C connection");
    while (1);
  }

  Serial.println("VL53L0X initialized successfully");
  Serial.println("Range: 30-2000mm | Resolution: 1mm");
}

void loop() {
  VL53L0X_RangingMeasurementData_t RangingMeasurementData;

  // Perform distance measurement
  VL53L0X.performSingleRangingMeasurement(&RangingMeasurementData);

  // Check measurement status
  if (RangingMeasurementData.RangeStatus == 0) {
    // Valid measurement
    int distance_mm = RangingMeasurementData.RangeMilliMeter;
    float distance_cm = distance_mm / 10.0;

    Serial.print("Distance: ");
    Serial.print(distance_mm);
    Serial.print(" mm (");
    Serial.print(distance_cm);
    Serial.println(" cm)");
  } else {
    // Out of range or error
    Serial.println("Out of range or no target detected");
  }

  delay(100);  // 100ms between readings
}
```

### Proximity Alert System

```cpp
#include <Wire.h>
#include "Seeed_vl53l0x.h"

Seeed_vl53l0x VL53L0X;

const int buzzerPin = 3;
const int ledPin = 4;

// Alert thresholds (mm)
const int criticalDistance = 100;   // < 10cm
const int warningDistance = 300;    // < 30cm
const int safeDistance = 500;       // > 50cm

void setup() {
  Serial.begin(9600);
  Wire.begin();
  pinMode(buzzerPin, OUTPUT);
  pinMode(ledPin, OUTPUT);

  if (VL53L0X.begin() != 0) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("Proximity Alert System");
  Serial.println("Critical: < 10cm | Warning: < 30cm | Safe: > 50cm");
}

void loop() {
  VL53L0X_RangingMeasurementData_t measurement;
  VL53L0X.performSingleRangingMeasurement(&measurement);

  if (measurement.RangeStatus == 0) {
    int distance = measurement.RangeMilliMeter;

    Serial.print("Distance: ");
    Serial.print(distance);
    Serial.print(" mm | ");

    if (distance < criticalDistance) {
      // CRITICAL - very close
      Serial.println("CRITICAL - TOO CLOSE!");
      digitalWrite(ledPin, HIGH);
      tone(buzzerPin, 2000);  // Continuous high tone
    } else if (distance < warningDistance) {
      // WARNING - approaching
      Serial.println("WARNING - Approaching");
      digitalWrite(ledPin, HIGH);
      tone(buzzerPin, 1000, 100);  // Beep
      delay(100);
      noTone(buzzerPin);
    } else if (distance < safeDistance) {
      // CAUTION - in range
      Serial.println("CAUTION - Monitor");
      digitalWrite(ledPin, LOW);
      noTone(buzzerPin);
    } else {
      // SAFE - clear
      Serial.println("SAFE - Clear");
      digitalWrite(ledPin, LOW);
      noTone(buzzerPin);
    }
  } else {
    Serial.println("No target detected");
    digitalWrite(ledPin, LOW);
    noTone(buzzerPin);
  }

  delay(100);
}
```

### Smart Trash Can Lid Opener

```cpp
#include <Wire.h>
#include <Servo.h>
#include "Seeed_vl53l0x.h"

Seeed_vl53l0x VL53L0X;
Servo lidServo;

const int servoPin = 3;
const int detectionDistance = 200;  // 20cm - hand near
const int lidOpenAngle = 90;  // Degrees to open
const int lidClosedAngle = 0;  // Degrees when closed
const unsigned long openDuration = 3000;  // Stay open 3 seconds

bool lidOpen = false;
unsigned long openTime = 0;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  lidServo.attach(servoPin);
  lidServo.write(lidClosedAngle);  // Start closed

  if (VL53L0X.begin() != 0) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("Smart Trash Can");
  Serial.println("Wave hand within 20cm to open");
}

void loop() {
  VL53L0X_RangingMeasurementData_t measurement;
  VL53L0X.performSingleRangingMeasurement(&measurement);

  if (measurement.RangeStatus == 0) {
    int distance = measurement.RangeMilliMeter;

    // Hand detected within range
    if (distance < detectionDistance && !lidOpen) {
      Serial.println("Hand detected - Opening lid");
      lidServo.write(lidOpenAngle);
      lidOpen = true;
      openTime = millis();
    }
  }

  // Auto-close after timeout
  if (lidOpen && (millis() - openTime > openDuration)) {
    Serial.println("Timeout - Closing lid");
    lidServo.write(lidClosedAngle);
    lidOpen = false;
  }

  delay(100);
}
```

### People Counter (Doorway)

```cpp
#include <Wire.h>
#include "Seeed_vl53l0x.h"

Seeed_vl53l0x VL53L0X;

const int doorwayWidth = 800;  // 80cm typical doorway
const int detectionZone = 400;  // 40cm trigger zone
int peopleCount = 0;
bool personDetected = false;

void setup() {
  Serial.begin(9600);
  Wire.begin();

  if (VL53L0X.begin() != 0) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("People Counter");
  Serial.println("Mount sensor at doorway edge");
  Serial.println("Detection zone: < 40cm");
}

void loop() {
  VL53L0X_RangingMeasurementData_t measurement;
  VL53L0X.performSingleRangingMeasurement(&measurement);

  if (measurement.RangeStatus == 0) {
    int distance = measurement.RangeMilliMeter;

    // Person entering detection zone
    if (distance < detectionZone && !personDetected) {
      personDetected = true;
      peopleCount++;

      Serial.print("Person detected! Count: ");
      Serial.println(peopleCount);
    }

    // Person left detection zone
    if (distance > (detectionZone + 100) && personDetected) {
      personDetected = false;
      Serial.println("Person cleared zone");
    }
  }

  delay(50);
}
```

**Key Points:**

- Laser time-of-flight technology (940nm infrared)
- 1mm resolution, ±3% accuracy
- Works on any surface color/reflectivity
- Not affected by ambient light (even direct sunlight)
- 25° field of view (narrow beam)
- I2C interface, single address 0x29
- Class 1 laser (eye-safe, but don't stare into beam)

## Testing Procedure

1. Connect VL53L0X to I2C port
2. Install Seeed_VL53L0X library
3. Upload basic example
4. Open Serial Monitor (9600 baud)
5. **Test minimum range:**
   - Place object 3cm from sensor
   - Should read ~30mm
6. **Test maximum range:**
   - Place object 2m from sensor
   - Should read ~2000mm
7. **Test different surfaces:**
   - White paper, black cardboard, shiny metal
   - All should give similar readings (color-independent)
8. **Test field of view:**
   - Move object horizontally across beam
   - 25° cone = ~44cm diameter at 1m distance

## Troubleshooting

| Problem                     | Solution                                                                     |
| --------------------------- | ---------------------------------------------------------------------------- |
| Initialization failed       | Check I2C wiring, verify address 0x29, power cycle sensor                    |
| Always out of range         | Target too close (< 30mm) or too far (> 2000mm), verify target in FOV        |
| Erratic readings            | Reflective surfaces at angle, glass/transparent objects, verify solid target |
| No readings                 | Check library installation, verify I2C communication with scanner            |
| Readings drift              | Temperature change (sensor has compensation), power supply unstable          |
| Doesn't detect dark objects | Should work - ToF independent of color; check distance and FOV               |

## Technical Specifications

**Distance Measurement:**

- **Technology:** Time-of-Flight (ToF) laser ranging
- **Laser Wavelength:** 940nm (Class 1, eye-safe infrared)
- **Range:** 30mm to 2000mm (3cm to 2m)
- **Accuracy:** ±3% at 1m distance (±30mm)
- **Resolution:** 1mm
- **Repeatability:** ±5mm
- **Field of View (FOV):** 25° cone
  - At 1m: ~44cm diameter circle
  - At 0.5m: ~22cm diameter circle

**Performance:**

- **Measurement Rate:** Up to 50Hz (20ms per reading)
- **Ambient Light Immunity:** Excellent (works in bright sunlight)
- **Target Reflectivity:** Independent (works on any color/finish)

**Communication:**

- **Interface:** I2C (up to 400kHz Fast Mode)
- **I2C Address:** 0x29 (factory default, adjustable via software)

**Electrical:**

- **Operating Voltage:** 3.3V - 5V (internal 2.8V regulator)
- **Current (Continuous):** 19mA typical @ 3.3V
- **Current (Standby):** 5µA

**Environmental:**

- **Operating Temperature:** -20°C to 70°C
- **Storage Temperature:** -40°C to 85°C
- **Humidity:** 0-90% RH non-condensing

**Physical:**

- **Size:** 20mm × 20mm Grove module
- **Emitter Location:** Small aperture on top of module
- **Receiver Location:** Adjacent to emitter

**Laser Safety:**

- **Classification:** Class 1 (IEC 60825-1:2014)
- **Eye Safety:** Safe under normal use
- **Warning:** Do not use magnifying optics to view laser

## Common Use Cases

### Liquid Level Sensor

```cpp
#include <Wire.h>
#include "Seeed_vl53l0x.h"

Seeed_vl53l0x VL53L0X;

const int tankHeight = 1500;  // 150cm tank depth
const int emptyLevel = 1500;  // Reading when empty (mm)
const int fullLevel = 100;    // Reading when full (mm)

void setup() {
  Serial.begin(9600);
  Wire.begin();

  if (VL53L0X.begin() != 0) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("Liquid Level Monitor");
  Serial.println("Mount sensor at top of tank, pointing down");
}

void loop() {
  VL53L0X_RangingMeasurementData_t measurement;
  VL53L0X.performSingleRangingMeasurement(&measurement);

  if (measurement.RangeStatus == 0) {
    int distance = measurement.RangeMilliMeter;
    int liquidLevel = emptyLevel - distance;  // Height of liquid
    float percentFull = (liquidLevel / (float)tankHeight) * 100;

    Serial.print("Distance to surface: ");
    Serial.print(distance);
    Serial.print(" mm | Level: ");
    Serial.print(liquidLevel);
    Serial.print(" mm | Tank: ");
    Serial.print(percentFull, 1);
    Serial.println("% full");

    if (percentFull < 20) {
      Serial.println("⚠️ WARNING: Tank low!");
    } else if (percentFull > 95) {
      Serial.println("✓ Tank nearly full");
    }
  }

  delay(1000);
}
```

### Gesture Detection (Wave to Activate)

```cpp
#include <Wire.h>
#include "Seeed_vl53l0x.h"

Seeed_vl53l0x VL53L0X;

const int ledPin = 3;
const int waveThreshold = 200;  // 20cm - hand close
const int waveTimeout = 500;  // 500ms to complete wave

bool handNear = false;
unsigned long nearStartTime = 0;
int waveCount = 0;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  pinMode(ledPin, OUTPUT);

  if (VL53L0X.begin() != 0) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("Gesture Detection - Wave to Toggle");
}

void loop() {
  VL53L0X_RangingMeasurementData_t measurement;
  VL53L0X.performSingleRangingMeasurement(&measurement);

  if (measurement.RangeStatus == 0) {
    int distance = measurement.RangeMilliMeter;

    if (distance < waveThreshold && !handNear) {
      // Hand entered zone
      handNear = true;
      nearStartTime = millis();
    } else if (distance > waveThreshold && handNear) {
      // Hand left zone
      handNear = false;
      unsigned long duration = millis() - nearStartTime;

      if (duration < waveTimeout) {
        // Quick wave detected
        waveCount++;
        Serial.print("Wave detected! Count: ");
        Serial.println(waveCount);

        // Toggle LED
        digitalWrite(ledPin, !digitalRead(ledPin));
      }
    }
  }

  delay(50);
}
```

### Parking Sensor

```cpp
#include <Wire.h>
#include "Seeed_vl53l0x.h"

Seeed_vl53l0x VL53L0X;

const int buzzerPin = 3;
const int greenLED = 4;
const int yellowLED = 5;
const int redLED = 6;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  pinMode(buzzerPin, OUTPUT);
  pinMode(greenLED, OUTPUT);
  pinMode(yellowLED, OUTPUT);
  pinMode(redLED, OUTPUT);

  if (VL53L0X.begin() != 0) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("Parking Sensor");
  Serial.println("Green: >100cm | Yellow: 50-100cm | Red: <50cm");
}

void loop() {
  VL53L0X_RangingMeasurementData_t measurement;
  VL53L0X.performSingleRangingMeasurement(&measurement);

  if (measurement.RangeStatus == 0) {
    int distance = measurement.RangeMilliMeter;

    // Turn off all LEDs
    digitalWrite(greenLED, LOW);
    digitalWrite(yellowLED, LOW);
    digitalWrite(redLED, LOW);

    if (distance > 1000) {
      // Safe distance
      digitalWrite(greenLED, HIGH);
      noTone(buzzerPin);
      Serial.println("Safe - Clear");
    } else if (distance > 500) {
      // Caution
      digitalWrite(yellowLED, HIGH);
      tone(buzzerPin, 1000, 100);
      delay(500);  // Slow beep
      Serial.println("Caution - Approaching");
    } else if (distance > 200) {
      // Warning
      digitalWrite(redLED, HIGH);
      tone(buzzerPin, 1500, 100);
      delay(200);  // Fast beep
      Serial.println("Warning - Close");
    } else {
      // Critical
      digitalWrite(redLED, HIGH);
      tone(buzzerPin, 2000);  // Continuous
      Serial.println("CRITICAL - STOP!");
    }
  }

  delay(50);
}
```

## Understanding Time-of-Flight Technology

**How ToF Works:**

1. **Laser Pulse:** Sensor emits short 940nm IR laser pulse
2. **Travel to Target:** Light travels to target object
3. **Reflection:** Light bounces off target surface
4. **Travel Back:** Reflected light returns to sensor
5. **Time Measurement:** Sensor measures round-trip time
6. **Distance Calculation:** Distance = (Speed of Light × Time) / 2

**Speed of Light:**

- c = 299,792,458 m/s (~300,000 km/s)
- For 1m distance: ~6.7 nanoseconds round-trip
- VL53L0X measures time with picosecond precision

**Why It's Better Than Ultrasonic:**

- ✅ Not affected by temperature (ultrasonic speed varies with temp)
- ✅ Works on soft surfaces (foam, fabric, carpet)
- ✅ Narrow beam (25° vs ultrasonic's 60°+)
- ✅ Faster measurements (20ms vs 50ms+)
- ✅ Independent of target color/texture
- ❌ More expensive than ultrasonic
- ❌ Shorter range (2m vs 4m+)

## Field of View Visualization

**25° Cone Diameter at Distance:**

```
Distance | Cone Diameter
---------|---------------
  10cm   |    4.4cm
  20cm   |    8.8cm
  50cm   |   22.0cm
 100cm   |   44.0cm
 150cm   |   66.0cm
 200cm   |   88.0cm
```

**Application Implications:**

- **Small target (< 5cm):** Use within 20cm range
- **Medium target (< 20cm):** Use within 50cm range
- **Large target (> 50cm):** Full 2m range usable

## Challenging Surfaces

**Works Well On:**

- ✅ Matte surfaces (paper, cardboard, painted walls)
- ✅ Diffuse reflectors (most common materials)
- ✅ Dark colors (black, brown, dark blue)
- ✅ Light colors (white, yellow, bright surfaces)

**Challenging Surfaces:**

- ⚠️ Mirrors/polished metal (specular reflection)
- ⚠️ Glass/transparent materials (light passes through)
- ⚠️ Very smooth shiny surfaces at angle
- ⚠️ Water (surface disturbed by waves)

**Solutions for Difficult Surfaces:**

- Mount sensor perpendicular to surface
- Use diffuse reflective tape on target
- Average multiple readings
- Increase measurement time (higher accuracy mode)

## VL53L0X vs. Ultrasonic Comparison

| Feature                | VL53L0X ToF          | Ultrasonic          |
| ---------------------- | -------------------- | ------------------- |
| **Technology**         | Laser time-of-flight | Sound echo          |
| **Range**              | 3-200cm              | 2-400cm ⭐          |
| **Accuracy**           | ±3% ⭐⭐⭐           | ±1cm                |
| **Resolution**         | 1mm ⭐⭐⭐           | 1cm                 |
| **Speed**              | 20ms ⭐⭐⭐          | 50ms+               |
| **Beam Width**         | 25° ⭐⭐⭐           | 60°+                |
| **Temperature Effect** | None ⭐⭐⭐          | Yes (±2% per 10°C)  |
| **Soft Surfaces**      | Yes ⭐⭐⭐           | Poor (absorb sound) |
| **Color Effect**       | None ⭐⭐⭐          | None                |
| **Cost**               | Higher               | Lower ⭐⭐          |
| **Power**              | 19mA                 | 15mA                |

**Choose VL53L0X for:**

- Precise measurements (1mm resolution)
- Narrow beam needed (small target)
- Fast measurements (robotics, gesture)
- Temperature-independent operation
- Soft/fabric surfaces

**Choose Ultrasonic for:**

- Longer range (> 2m)
- Lower cost
- Wider beam coverage
- Outdoor use (rain/snow affects ToF less than ultrasonic)

## Integration Examples

See [integration recipes](../../integrations/) for projects combining VL53L0X with:

- Servo (auto-opening trash can, parking guidance)
- OLED display (distance gauge, level indicator)
- Buzzer (proximity alert, parking sensor)
- LED (visual distance indicator)

## Additional Resources

- [VL53L0X Datasheet](https://www.st.com/resource/en/datasheet/vl53l0x.pdf)
- [Time-of-Flight Explained](https://www.st.com/en/imaging-and-photonics-solutions/time-of-flight-sensors.html)
- [Laser Safety Standards](https://www.fda.gov/radiation-emitting-products/laser-products-and-instruments)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**⚠️ LASER SAFETY:** Class 1 laser - eye-safe but do not stare into beam!
