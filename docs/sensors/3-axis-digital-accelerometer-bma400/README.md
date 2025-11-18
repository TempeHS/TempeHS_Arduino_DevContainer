# Grove 3-Axis Digital Accelerometer (BMA400)

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-3-Axis-Digital-Accelerometer-BMA400/  
**Library Repo:** https://github.com/Seeed-Studio/Grove_BMA400  
**Connection Type:** I2C

## Overview

The Grove BMA400 is an ultra-low-power 3-axis digital accelerometer with step counter, activity recognition, and tap detection. Features intelligent power management with auto-wake functionality. Ideal for wearables, fitness trackers, and battery-powered applications. Includes motion detection, orientation sensing, and low-power modes for extended battery life.

## Authoritative References

- [Grove BMA400 - Seeed Wiki](https://wiki.seeedstudio.com/Grove-3-Axis-Digital-Accelerometer-BMA400/)
- [Grove_BMA400 Library - GitHub](https://github.com/Seeed-Studio/Grove_BMA400)
- [BMA400 Datasheet - Bosch Sensortec](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bma400-ds000.pdf)

## Hardware Setup

- **Connection Type:** I2C
- **Grove Port:** Any I2C port (default address 0x14)
- **Measurement Range:** ±2g, ±4g, ±8g, ±16g (selectable)
- **Resolution:** 12-bit
- **Operating Voltage:** 3.3V - 5V
- **Current Consumption:**
  - Normal mode: 14µA @ 100Hz
  - Low power mode: 3µA @ 25Hz
  - Sleep mode: 0.8µA
- **Step Counter:** Built-in pedometer algorithm
- **Activity Recognition:** Walking, running, standing still
- **Wiring:** Connect to Grove Base Shield I2C port using 4-pin Grove cable

![Grove BMA400](https://files.seeedstudio.com/wiki/Grove-3-Axis-Digital-Accelerometer-BMA400/img/main.jpg)

## Software Prerequisites

Install the Grove BMA400 library:

```bash
# Method 1: Arduino Library Manager
# Open Arduino IDE → Tools → Manage Libraries
# Search "Grove BMA400" → Install

# Method 2: Manual installation
cd ~/Arduino/libraries
git clone https://github.com/Seeed-Studio/Grove_BMA400.git
```

**Library Dependencies:**

- Wire.h (built-in I2C library)

## Example Code

```cpp
/*
  Purpose: Read acceleration and step count from BMA400
  Notes:
    1. Connect to I2C port
    2. Walk around to generate steps
    3. Shake to see acceleration changes
    4. Ultra-low power consumption
  Author: Ben Jones 14/7/23
  Source: https://github.com/Seeed-Studio/Grove_BMA400
*/

#include <Wire.h>
#include "BMA400.h"

BMA400 bma400;

void setup() {
  Serial.begin(9600);
  Wire.begin();

  Serial.println("BMA400 Accelerometer + Step Counter");

  // Initialize sensor
  if (bma400.begin() != BMA400_OK) {
    Serial.println("BMA400 initialization failed!");
    while (1);
  }

  Serial.println("BMA400 initialized successfully");

  // Configure for step counting
  bma400.setAccelRange(BMA400_RANGE_2G);  // ±2g range
  bma400.setOutputDataRate(BMA400_ODR_100HZ);  // 100Hz sampling
  bma400.enableStepCounter(true);  // Enable step counter

  Serial.println("Step counter enabled - start walking!");
  Serial.println("Format: X, Y, Z (g) | Steps");
}

void loop() {
  // Read acceleration (in g)
  float accelX = bma400.getAccelX();
  float accelY = bma400.getAccelY();
  float accelZ = bma400.getAccelZ();

  // Read step count
  uint32_t steps = bma400.getStepCount();

  // Display
  Serial.print("X: ");
  Serial.print(accelX, 3);
  Serial.print("g | Y: ");
  Serial.print(accelY, 3);
  Serial.print("g | Z: ");
  Serial.print(accelZ, 3);
  Serial.print("g | Steps: ");
  Serial.println(steps);

  delay(1000);
}
```

### Activity Recognition

```cpp
#include <Wire.h>
#include "BMA400.h"

BMA400 bma400;

void setup() {
  Serial.begin(9600);
  Wire.begin();

  if (bma400.begin() != BMA400_OK) {
    Serial.println("BMA400 init failed!");
    while (1);
  }

  // Configure for activity recognition
  bma400.setAccelRange(BMA400_RANGE_4G);
  bma400.setOutputDataRate(BMA400_ODR_100HZ);
  bma400.enableActivityRecognition(true);

  Serial.println("Activity Recognition Ready");
}

void loop() {
  uint32_t steps = bma400.getStepCount();
  uint8_t activity = bma400.getActivityType();

  Serial.print("Steps: ");
  Serial.print(steps);
  Serial.print(" | Activity: ");

  switch (activity) {
    case 0:
      Serial.println("Still");
      break;
    case 1:
      Serial.println("Walking");
      break;
    case 2:
      Serial.println("Running");
      break;
    default:
      Serial.println("Unknown");
  }

  delay(2000);
}
```

### Fitness Tracker

```cpp
#include <Wire.h>
#include "BMA400.h"

BMA400 bma400;

// Fitness parameters
const float stepLength = 0.7;  // meters per step (adjust for individual)
float distanceKm = 0;
unsigned long startTime;
uint32_t previousSteps = 0;

void setup() {
  Serial.begin(9600);
  Wire.begin();

  if (bma400.begin() != BMA400_OK) {
    Serial.println("BMA400 init failed!");
    while (1);
  }

  bma400.setAccelRange(BMA400_RANGE_2G);
  bma400.setOutputDataRate(BMA400_ODR_100HZ);
  bma400.enableStepCounter(true);
  bma400.resetStepCounter();  // Start from zero

  startTime = millis();

  Serial.println("===== FITNESS TRACKER =====");
  Serial.println("Start walking!");
  Serial.println("Format: Steps | Distance | Calories | Pace");
}

void loop() {
  uint32_t currentSteps = bma400.getStepCount();

  // Calculate metrics
  distanceKm = (currentSteps * stepLength) / 1000.0;
  float calories = currentSteps * 0.04;  // ~0.04 cal/step (varies by person)
  unsigned long elapsedMinutes = (millis() - startTime) / 60000;
  float paceMinPerKm = (elapsedMinutes > 0) ? elapsedMinutes / distanceKm : 0;

  // Display
  Serial.print("Steps: ");
  Serial.print(currentSteps);
  Serial.print(" | Distance: ");
  Serial.print(distanceKm, 2);
  Serial.print(" km | Calories: ");
  Serial.print(calories, 0);
  Serial.print(" | Pace: ");

  if (paceMinPerKm > 0 && paceMinPerKm < 999) {
    Serial.print(paceMinPerKm, 1);
    Serial.println(" min/km");
  } else {
    Serial.println("--");
  }

  // Check for new steps
  if (currentSteps > previousSteps) {
    Serial.println(">> Step detected!");
    previousSteps = currentSteps;
  }

  delay(5000);  // Update every 5 seconds
}
```

**Key Points:**

- Ultra-low power: 3µA @ 25Hz (months on coin cell)
- Built-in step counter with activity recognition
- Auto-wake on motion (intelligent power management)
- Tap detection (single/double tap)
- Configurable sensitivity and ranges
- Interrupt-driven operation for maximum efficiency

## Testing Procedure

1. Connect BMA400 to I2C port
2. Install Grove_BMA400 library
3. Upload basic example
4. Open Serial Monitor (9600 baud)
5. **Test acceleration:**
   - Sensor flat: X≈0g, Y≈0g, Z≈1g (gravity)
   - Tilt sensor: values change
   - Shake sensor: large values
6. **Test step counter:**
   - Walk 10 steps
   - Check step count increases
   - Activity shows "Walking"
7. **Test orientation:**
   - Rotate sensor to different faces
   - Observe which axis reads ~1g

## Troubleshooting

| Problem                        | Solution                                             |
| ------------------------------ | ---------------------------------------------------- |
| Initialization failed          | Check I2C wiring, verify address (0x14 or 0x15)      |
| Step count doesn't increase    | Walk with natural gait, sensor must move vertically  |
| Steps counted while stationary | Lower sensitivity, ensure stable mounting            |
| Activity always "Still"        | Increase motion, check sampling rate (100Hz minimum) |
| High current draw              | Enable auto-low-power mode, reduce sampling rate     |
| Acceleration always 0g         | Check library installation, verify I2C communication |

## Technical Specifications

**Acceleration Measurement:**

- **Ranges:** ±2g, ±4g, ±8g, ±16g (software selectable)
- **Resolution:** 12-bit (4096 steps)
- **Sensitivity:**
  - ±2g: 1mg/LSB
  - ±4g: 2mg/LSB
  - ±8g: 4mg/LSB
  - ±16g: 8mg/LSB
- **Axes:** 3-axis (X, Y, Z)
- **Noise:** 150µg/√Hz (typ)

**Step Counter:**

- **Range:** 0 to 1,048,575 steps (20-bit counter)
- **Accuracy:** ±5% typical
- **Minimum Speed:** ~1 step/sec
- **Maximum Speed:** ~5 steps/sec

**Power Consumption:**

- **Normal Mode (100Hz):** 14µA
- **Low Power (25Hz):** 3µA
- **Sleep Mode:** 0.8µA
- **Auto-Wake:** Wakes on motion, sleeps when still

**Output Data Rates:**

- 12.5Hz, 25Hz, 50Hz, 100Hz, 200Hz, 400Hz, 800Hz

**Communication:**

- **Interface:** I2C (up to 1MHz fast mode)
- **I2C Address:** 0x14 (default) or 0x15 (alternate)

**Activity Recognition:**

- Still (stationary)
- Walking (slow motion)
- Running (fast motion)

**Features:**

- Single/double tap detection
- Orientation detection (6 positions)
- Generic interrupt engines (2x)
- Auto-low-power mode
- Auto-wake on motion

**Environmental:**

- **Operating Temperature:** -40°C to +85°C
- **Storage Temperature:** -55°C to +125°C

## Common Use Cases

### Pedometer (Step Counter)

```cpp
#include <Wire.h>
#include "BMA400.h"

BMA400 bma400;
uint32_t dailyGoal = 10000;  // 10,000 steps/day

void setup() {
  Serial.begin(9600);
  Wire.begin();

  bma400.begin();
  bma400.setAccelRange(BMA400_RANGE_2G);
  bma400.setOutputDataRate(BMA400_ODR_100HZ);
  bma400.enableStepCounter(true);
  bma400.resetStepCounter();

  Serial.println("Daily Pedometer");
  Serial.print("Goal: ");
  Serial.print(dailyGoal);
  Serial.println(" steps");
}

void loop() {
  uint32_t steps = bma400.getStepCount();
  float progress = (steps / (float)dailyGoal) * 100;

  Serial.print("Steps: ");
  Serial.print(steps);
  Serial.print(" / ");
  Serial.print(dailyGoal);
  Serial.print(" (");
  Serial.print(progress, 1);
  Serial.println("%)");

  if (steps >= dailyGoal) {
    Serial.println("🎉 GOAL ACHIEVED!");
  }

  delay(10000);  // Update every 10 seconds
}
```

### Tap Detection

```cpp
#include <Wire.h>
#include "BMA400.h"

BMA400 bma400;
const int ledPin = 3;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  pinMode(ledPin, OUTPUT);

  bma400.begin();
  bma400.setAccelRange(BMA400_RANGE_4G);
  bma400.setOutputDataRate(BMA400_ODR_200HZ);

  // Enable tap detection
  bma400.enableTapDetection(true);
  bma400.setTapSensitivity(5);  // 1-7 (7=most sensitive)

  Serial.println("Tap Detection Ready");
  Serial.println("Single tap = LED on");
  Serial.println("Double tap = LED off");
}

void loop() {
  uint8_t tapStatus = bma400.getTapStatus();

  if (tapStatus == 1) {
    // Single tap
    digitalWrite(ledPin, HIGH);
    Serial.println("Single tap detected - LED ON");
  } else if (tapStatus == 2) {
    // Double tap
    digitalWrite(ledPin, LOW);
    Serial.println("Double tap detected - LED OFF");
  }

  delay(100);
}
```

### Orientation Detector

```cpp
#include <Wire.h>
#include "BMA400.h"

BMA400 bma400;

void setup() {
  Serial.begin(9600);
  Wire.begin();

  bma400.begin();
  bma400.setAccelRange(BMA400_RANGE_2G);
  bma400.setOutputDataRate(BMA400_ODR_100HZ);

  Serial.println("Orientation Detector");
}

void loop() {
  float x = bma400.getAccelX();
  float y = bma400.getAccelY();
  float z = bma400.getAccelZ();

  // Determine orientation
  if (z > 0.8) {
    Serial.println("Position: Face up");
  } else if (z < -0.8) {
    Serial.println("Position: Face down");
  } else if (x > 0.8) {
    Serial.println("Position: Right side");
  } else if (x < -0.8) {
    Serial.println("Position: Left side");
  } else if (y > 0.8) {
    Serial.println("Position: Top up");
  } else if (y < -0.8) {
    Serial.println("Position: Bottom up");
  } else {
    Serial.println("Position: Tilted");
  }

  delay(1000);
}
```

## Understanding Step Detection

**How Step Counting Works:**

1. Accelerometer measures vertical movement patterns
2. Algorithm detects periodic peaks characteristic of walking
3. Filters out non-walking motions (arm movements, etc.)
4. Counts validated steps

**Optimal Mounting:**

- **Wrist:** Secure band, sensor facing up
- **Waist:** Belt clip, sensor vertical
- **Pocket:** Not recommended (inconsistent motion)
- **Ankle:** Good for running detection

**Factors Affecting Accuracy:**

- Walking speed (optimal: 2-6 km/h)
- Surface type (flat vs. stairs vs. treadmill)
- Mounting location (wrist less accurate than waist)
- Sensor orientation (must move vertically)
- Individual gait characteristics

**Calibration:**

- Walk known distance (e.g., 100 meters)
- Count actual steps manually
- Adjust `stepLength` in code to match
- Typical step length: 0.6-0.8 meters

## Power Management

**Low Power Modes:**

```cpp
// Ultra-low power mode (for coin cell battery)
bma400.setOutputDataRate(BMA400_ODR_25HZ);  // 25Hz sampling
bma400.enableAutoLowPower(true);  // Auto-sleep when still
// Current: ~3µA average (months on CR2032)

// Balanced mode (for rechargeable battery)
bma400.setOutputDataRate(BMA400_ODR_100HZ);  // 100Hz sampling
bma400.enableAutoLowPower(true);  // Auto-sleep when still
// Current: ~14µA average (weeks on LiPo)

// High performance mode (mains powered)
bma400.setOutputDataRate(BMA400_ODR_200HZ);  // 200Hz sampling
bma400.enableAutoLowPower(false);  // Always on
// Current: ~50µA average
```

**Battery Life Estimates:**

- **CR2032 (220mAh):**
  - 25Hz mode: ~8 months
  - 100Hz mode: ~2 months
- **LiPo 100mAh:**
  - 25Hz mode: ~3 months
  - 100Hz mode: ~2 weeks

## Activity Recognition Details

**Activity Types:**

| Activity    | Characteristics              | Typical Acceleration    |
| ----------- | ---------------------------- | ----------------------- |
| **Still**   | No periodic motion           | <0.1g variation         |
| **Walking** | Regular vertical oscillation | 0.2-0.5g peaks @ 1-2 Hz |
| **Running** | Larger vertical motion       | 0.5-1.5g peaks @ 2-5 Hz |

**Algorithm Parameters:**

- Sampling rate: 100Hz minimum
- Analysis window: 2-4 seconds
- Motion threshold: Adjustable sensitivity
- Debounce time: 1 second minimum in state

## BMA400 vs. LIS3DHTR Comparison

| Feature                  | BMA400            | LIS3DHTR       |
| ------------------------ | ----------------- | -------------- |
| **Power (100Hz)**        | 14µA ⭐           | 11µA ⭐        |
| **Power (25Hz)**         | 3µA ⭐⭐⭐        | Not available  |
| **Step Counter**         | Built-in ⭐⭐⭐   | No             |
| **Activity Recognition** | Yes ⭐⭐⭐        | No             |
| **Tap Detection**        | Yes ⭐⭐          | Yes ⭐⭐       |
| **Range**                | ±2/4/8/16g        | ±2/4/8/16g     |
| **Resolution**           | 12-bit            | 10/12-bit      |
| **Auto-Wake**            | Yes ⭐⭐⭐        | No             |
| **Use Case**             | Fitness/wearables | General motion |

**Choose BMA400 for:**

- Step counting / pedometer
- Battery-powered fitness trackers
- Activity recognition
- Ultra-low power operation

**Choose LIS3DHTR for:**

- General motion detection
- Higher resolution acceleration
- Tilt/orientation sensing
- Lower cost

## Interrupt-Driven Operation

```cpp
#include <Wire.h>
#include "BMA400.h"

BMA400 bma400;
const int interruptPin = 2;  // Must be D2 or D3 on Uno R4
volatile bool stepDetected = false;
uint32_t totalSteps = 0;

void stepInterruptHandler() {
  stepDetected = true;
}

void setup() {
  Serial.begin(9600);
  Wire.begin();
  pinMode(interruptPin, INPUT_PULLUP);

  bma400.begin();
  bma400.setAccelRange(BMA400_RANGE_2G);
  bma400.setOutputDataRate(BMA400_ODR_100HZ);
  bma400.enableStepCounter(true);

  // Configure interrupt for step detection
  bma400.setStepCounterInterrupt(true);
  bma400.mapInterruptToPin(BMA400_INT_STEP, BMA400_INT1_PIN);

  // Attach interrupt
  attachInterrupt(digitalPinToInterrupt(interruptPin),
                   stepInterruptHandler, RISING);

  Serial.println("Interrupt-driven step counter ready");
}

void loop() {
  if (stepDetected) {
    stepDetected = false;
    totalSteps = bma400.getStepCount();

    Serial.print("Step detected! Total: ");
    Serial.println(totalSteps);
  }

  // CPU can sleep here to save power
  // Low power library recommended for production
}
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining BMA400 with:

- OLED display (fitness dashboard with steps, distance, calories)
- Buzzer (daily goal achievement alert)
- LED (step count indicator)
- WiFi (step data upload to cloud)

## Additional Resources

- [BMA400 Datasheet - Bosch Sensortec](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bma400-ds000.pdf)
- [Step Counter Algorithm Explanation](https://www.bosch-sensortec.com/media/boschsensortec/downloads/application_notes_1/bst-bma400-an000.pdf)
- [Pedometer Accuracy Study](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5491975/)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Library Last Updated:** Check GitHub for latest version
