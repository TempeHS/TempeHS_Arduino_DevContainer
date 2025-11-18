# Grove 6-Axis Accelerometer & Gyroscope (LSM6DS3)

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-6-Axis_AccelerometerAndGyroscope/  
**Library Repo:** https://github.com/Seeed-Studio/Seeed_Arduino_LSM6DS3  
**Connection Type:** I2C

## Overview

The Grove LSM6DS3 combines a 3-axis accelerometer and 3-axis gyroscope in a single module for comprehensive motion tracking. Measures linear acceleration (±2/±4/±8/±16g) and angular velocity (±125/±245/±500/±1000/±2000 dps). Features built-in temperature sensor, FIFO buffer, and interrupt engines. Ideal for drone stabilization, robotics orientation, gaming controllers, fitness tracking, and inertial measurement units (IMU).

## Authoritative References

- [Grove 6-Axis Accelerometer & Gyroscope - Seeed Wiki](https://wiki.seeedstudio.com/Grove-6-Axis_AccelerometerAndGyroscope/)
- [Seeed_Arduino_LSM6DS3 Library - GitHub](https://github.com/Seeed-Studio/Seeed_Arduino_LSM6DS3)
- [LSM6DS3 Datasheet - STMicroelectronics](https://www.st.com/resource/en/datasheet/lsm6ds3.pdf)

## Hardware Setup

- **Connection Type:** I2C
- **Grove Port:** Any I2C port (address 0x6A or 0x6B)
- **Accelerometer Range:** ±2g, ±4g, ±8g, ±16g (selectable)
- **Gyroscope Range:** ±125, ±245, ±500, ±1000, ±2000 dps (selectable)
- **Operating Voltage:** 3.3V - 5V
- **Current:** 0.9mA (accelerometer + gyroscope @ high performance)
- **Output Data Rates:** 12.5Hz to 6.66kHz
- **Temperature Sensor:** Built-in (-40°C to +85°C)
- **FIFO Buffer:** 4KB (up to 682 data samples)
- **Wiring:** Connect to Grove Base Shield I2C port using 4-pin Grove cable

![Grove LSM6DS3](https://files.seeedstudio.com/wiki/Grove-6-Axis_AccelerometerAndGyroscope/img/main.jpg)

## Software Prerequisites

Install the Seeed LSM6DS3 library:

```bash
# Method 1: Arduino Library Manager
# Open Arduino IDE → Tools → Manage Libraries
# Search "Seeed Arduino LSM6DS3" → Install

# Method 2: Manual installation
cd ~/Arduino/libraries
git clone https://github.com/Seeed-Studio/Seeed_Arduino_LSM6DS3.git
```

**Library Dependencies:**

- Wire.h (built-in I2C library)

## Example Code

```cpp
/*
  Purpose: Read 6-axis motion data (accelerometer + gyroscope)
  Notes:
    1. Connect to I2C port
    2. Accelerometer measures linear acceleration (g)
    3. Gyroscope measures angular velocity (degrees/second)
    4. Combined data enables orientation tracking
    5. Temperature sensor built-in
  Author: Ben Jones 14/7/23
  Source: https://github.com/Seeed-Studio/Seeed_Arduino_LSM6DS3
*/

#include <Wire.h>
#include "LSM6DS3.h"

LSM6DS3 imu(I2C_MODE, 0x6A);  // I2C address 0x6A

void setup() {
  Serial.begin(9600);
  Wire.begin();

  Serial.println("LSM6DS3 6-Axis IMU");

  // Initialize sensor
  if (imu.begin() != 0) {
    Serial.println("LSM6DS3 initialization failed!");
    while (1);
  }

  Serial.println("LSM6DS3 initialized successfully");
  Serial.println("Format: AccelX, AccelY, AccelZ (g) | GyroX, GyroY, GyroZ (dps) | Temp (°C)");
}

void loop() {
  // Read accelerometer (g)
  float accelX = imu.readFloatAccelX();
  float accelY = imu.readFloatAccelY();
  float accelZ = imu.readFloatAccelZ();

  // Read gyroscope (degrees/second)
  float gyroX = imu.readFloatGyroX();
  float gyroY = imu.readFloatGyroY();
  float gyroZ = imu.readFloatGyroZ();

  // Read temperature (°C)
  float temp = imu.readTempC();

  // Display all data
  Serial.print("Accel: X=");
  Serial.print(accelX, 2);
  Serial.print("g Y=");
  Serial.print(accelY, 2);
  Serial.print("g Z=");
  Serial.print(accelZ, 2);
  Serial.print("g | Gyro: X=");
  Serial.print(gyroX, 2);
  Serial.print("° Y=");
  Serial.print(gyroY, 2);
  Serial.print("° Z=");
  Serial.print(gyroZ, 2);
  Serial.print("° | Temp: ");
  Serial.print(temp, 1);
  Serial.println("°C");

  delay(500);
}
```

### Tilt Angle Calculator

```cpp
#include <Wire.h>
#include "LSM6DS3.h"

LSM6DS3 imu(I2C_MODE, 0x6A);

void setup() {
  Serial.begin(9600);
  Wire.begin();

  if (imu.begin() != 0) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("Tilt Angle Monitor");
}

void loop() {
  float accelX = imu.readFloatAccelX();
  float accelY = imu.readFloatAccelY();
  float accelZ = imu.readFloatAccelZ();

  // Calculate tilt angles using accelerometer
  float roll = atan2(accelY, accelZ) * 180.0 / PI;
  float pitch = atan2(-accelX, sqrt(accelY*accelY + accelZ*accelZ)) * 180.0 / PI;

  Serial.print("Roll: ");
  Serial.print(roll, 1);
  Serial.print("° | Pitch: ");
  Serial.print(pitch, 1);
  Serial.println("°");

  // Orientation classification
  if (abs(roll) < 10 && abs(pitch) < 10) {
    Serial.println("Position: LEVEL");
  } else if (roll > 45) {
    Serial.println("Position: TILTED RIGHT");
  } else if (roll < -45) {
    Serial.println("Position: TILTED LEFT");
  } else if (pitch > 45) {
    Serial.println("Position: TILTED FORWARD");
  } else if (pitch < -45) {
    Serial.println("Position: TILTED BACKWARD");
  } else {
    Serial.println("Position: SLIGHTLY TILTED");
  }

  delay(500);
}
```

### Motion Detector with Threshold

```cpp
#include <Wire.h>
#include "LSM6DS3.h"

LSM6DS3 imu(I2C_MODE, 0x6A);

const float motionThreshold = 1.5;  // g (acceleration threshold)
const float rotationThreshold = 50;  // dps (rotation threshold)
const int ledPin = 3;
const int buzzerPin = 4;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  pinMode(ledPin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);

  if (imu.begin() != 0) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("Motion & Rotation Detector");
  Serial.println("Threshold: 1.5g acceleration, 50 dps rotation");
}

void loop() {
  float accelX = imu.readFloatAccelX();
  float accelY = imu.readFloatAccelY();
  float accelZ = imu.readFloatAccelZ();

  float gyroX = imu.readFloatGyroX();
  float gyroY = imu.readFloatGyroY();
  float gyroZ = imu.readFloatGyroZ();

  // Calculate total acceleration magnitude
  float totalAccel = sqrt(accelX*accelX + accelY*accelY + accelZ*accelZ);
  float totalGyro = sqrt(gyroX*gyroX + gyroY*gyroY + gyroZ*gyroZ);

  // Detect significant motion
  bool motionDetected = (abs(totalAccel - 1.0) > (motionThreshold - 1.0));  // 1g is gravity
  bool rotationDetected = (totalGyro > rotationThreshold);

  if (motionDetected || rotationDetected) {
    digitalWrite(ledPin, HIGH);
    tone(buzzerPin, 1000, 100);

    Serial.print("!!! MOTION DETECTED | Accel: ");
    Serial.print(totalAccel, 2);
    Serial.print("g | Rotation: ");
    Serial.print(totalGyro, 1);
    Serial.println(" dps");
  } else {
    digitalWrite(ledPin, LOW);
    Serial.println("Stationary");
  }

  delay(200);
}
```

### Drone Stabilization Data Logger

```cpp
#include <Wire.h>
#include "LSM6DS3.h"

LSM6DS3 imu(I2C_MODE, 0x6A);

void setup() {
  Serial.begin(9600);
  Wire.begin();

  if (imu.begin() != 0) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("IMU Data Logger for Drone/Robot");
  Serial.println("Time(ms),AccelX,AccelY,AccelZ,GyroX,GyroY,GyroZ,Roll,Pitch");
}

void loop() {
  float ax = imu.readFloatAccelX();
  float ay = imu.readFloatAccelY();
  float az = imu.readFloatAccelZ();
  float gx = imu.readFloatGyroX();
  float gy = imu.readFloatGyroY();
  float gz = imu.readFloatGyroZ();

  // Calculate orientation
  float roll = atan2(ay, az) * 180.0 / PI;
  float pitch = atan2(-ax, sqrt(ay*ay + az*az)) * 180.0 / PI;

  // CSV format for data logging
  Serial.print(millis());
  Serial.print(",");
  Serial.print(ax, 4);
  Serial.print(",");
  Serial.print(ay, 4);
  Serial.print(",");
  Serial.print(az, 4);
  Serial.print(",");
  Serial.print(gx, 2);
  Serial.print(",");
  Serial.print(gy, 2);
  Serial.print(",");
  Serial.print(gz, 2);
  Serial.print(",");
  Serial.print(roll, 2);
  Serial.print(",");
  Serial.println(pitch, 2);

  delay(100);  // 10Hz logging
}
```

**Key Points:**

- 6 degrees of freedom (DOF): 3-axis accel + 3-axis gyro
- Accelerometer detects linear motion and tilt
- Gyroscope detects rotation rate
- Combined data enables full orientation tracking
- Temperature compensation built-in
- Configurable ranges and data rates
- Low power: 0.9mA typical

## Testing Procedure

1. Connect LSM6DS3 to I2C port
2. Install Seeed_Arduino_LSM6DS3 library
3. Upload basic example
4. Open Serial Monitor (9600 baud)
5. **Test accelerometer:**
   - Sensor flat: Z≈1g, X≈0g, Y≈0g (gravity)
   - Tilt sensor: observe axis values change
   - Shake sensor: large spikes in acceleration
6. **Test gyroscope:**
   - Sensor stationary: all gyro values ≈0 dps
   - Rotate around X-axis: GyroX shows rotation rate
   - Rotate around Y-axis: GyroY shows rotation rate
   - Rotate around Z-axis: GyroZ shows rotation rate
7. **Test temperature:**
   - Should read room temperature (±2°C accuracy)

## Troubleshooting

| Problem                 | Solution                                                     |
| ----------------------- | ------------------------------------------------------------ |
| Initialization failed   | Check I2C wiring, verify address (0x6A or 0x6B), power cycle |
| Accelerometer always 0g | Sensor damaged or library issue, check I2C communication     |
| Gyroscope drifts        | Normal behavior, implement drift compensation/calibration    |
| Readings noisy          | Add low-pass filter, reduce data rate, check power supply    |
| Temperature incorrect   | ±2°C accuracy typical, calibrate if needed                   |
| High power consumption  | Reduce data rate, use low-power mode                         |

## Technical Specifications

**Accelerometer:**

- **Ranges:** ±2g, ±4g, ±8g, ±16g (software selectable)
- **Sensitivity:**
  - ±2g: 0.061 mg/LSB
  - ±4g: 0.122 mg/LSB
  - ±8g: 0.244 mg/LSB
  - ±16g: 0.488 mg/LSB
- **Noise:** 90 µg/√Hz
- **Resolution:** 16-bit

**Gyroscope:**

- **Ranges:** ±125, ±245, ±500, ±1000, ±2000 dps (software selectable)
- **Sensitivity:**
  - ±125 dps: 4.375 mdps/LSB
  - ±245 dps: 8.75 mdps/LSB
  - ±500 dps: 17.50 mdps/LSB
  - ±1000 dps: 35 mdps/LSB
  - ±2000 dps: 70 mdps/LSB
- **Noise:** 4 mdps/√Hz @ 2000 dps
- **Resolution:** 16-bit
- **Zero-Rate Level:** ±10 dps (drift)

**Temperature Sensor:**

- **Range:** -40°C to +85°C
- **Accuracy:** ±2°C (typ)
- **Resolution:** 16-bit

**Performance:**

- **Output Data Rates:** 12.5Hz, 26Hz, 52Hz, 104Hz, 208Hz, 416Hz, 833Hz, 1.66kHz, 3.33kHz, 6.66kHz
- **FIFO Buffer:** 4KB (stores up to 682 samples)
- **Interrupt Engines:** 2× programmable (for motion detection, tap, tilt, etc.)

**Communication:**

- **Interface:** I2C (up to 400kHz Fast Mode) or SPI (up to 10MHz)
- **I2C Address:** 0x6A (default) or 0x6B (alternate, via SDO pin)

**Electrical:**

- **Operating Voltage:** 1.71V - 3.6V (Grove module regulates 3.3V-5V input)
- **Current (Normal Mode):** 0.9mA (accel + gyro @ high performance)
- **Current (Low Power):** 15µA (accel only @ 12.5Hz)
- **Current (Power Down):** 5µA

**Environmental:**

- **Operating Temperature:** -40°C to +85°C
- **Storage Temperature:** -40°C to +125°C

**Physical:**

- **Size:** 20mm × 20mm Grove module
- **Axes:** X, Y, Z (right-hand coordinate system)

## Common Use Cases

### Pedometer (Step Counter)

```cpp
#include <Wire.h>
#include "LSM6DS3.h"

LSM6DS3 imu(I2C_MODE, 0x6A);

int stepCount = 0;
float lastAccelMag = 1.0;
const float stepThreshold = 1.2;  // g
bool stepDetected = false;

void setup() {
  Serial.begin(9600);
  Wire.begin();

  if (imu.begin() != 0) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("Pedometer - Step Counter");
}

void loop() {
  float ax = imu.readFloatAccelX();
  float ay = imu.readFloatAccelY();
  float az = imu.readFloatAccelZ();

  float accelMag = sqrt(ax*ax + ay*ay + az*az);

  // Detect step (peak in acceleration)
  if (accelMag > stepThreshold && !stepDetected) {
    stepDetected = true;
    stepCount++;
    Serial.print("Step detected! Count: ");
    Serial.println(stepCount);
  }

  // Reset after acceleration drops
  if (accelMag < 1.1 && stepDetected) {
    stepDetected = false;
  }

  lastAccelMag = accelMag;
  delay(50);
}
```

### Fall Detection System

```cpp
#include <Wire.h>
#include "LSM6DS3.h"

LSM6DS3 imu(I2C_MODE, 0x6A);

const float fallThreshold = 0.5;  // g (free fall detection)
const int alarmPin = 3;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  pinMode(alarmPin, OUTPUT);

  if (imu.begin() != 0) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("Fall Detection System");
}

void loop() {
  float ax = imu.readFloatAccelX();
  float ay = imu.readFloatAccelY();
  float az = imu.readFloatAccelZ();

  float totalAccel = sqrt(ax*ax + ay*ay + az*az);

  // Free fall detection (acceleration near 0g)
  if (totalAccel < fallThreshold) {
    Serial.println("!!! FALL DETECTED !!!");
    digitalWrite(alarmPin, HIGH);
    delay(5000);  // Alarm for 5 seconds
    digitalWrite(alarmPin, LOW);
  }

  delay(100);
}
```

### Orientation-Aware Display

```cpp
#include <Wire.h>
#include "LSM6DS3.h"

LSM6DS3 imu(I2C_MODE, 0x6A);

enum Orientation {
  PORTRAIT,
  PORTRAIT_INVERTED,
  LANDSCAPE_LEFT,
  LANDSCAPE_RIGHT,
  FACE_UP,
  FACE_DOWN
};

void setup() {
  Serial.begin(9600);
  Wire.begin();

  if (imu.begin() != 0) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("Orientation Detector");
}

void loop() {
  float ax = imu.readFloatAccelX();
  float ay = imu.readFloatAccelY();
  float az = imu.readFloatAccelZ();

  Orientation orient;

  // Determine orientation based on gravity vector
  if (az > 0.8) {
    orient = FACE_UP;
  } else if (az < -0.8) {
    orient = FACE_DOWN;
  } else if (ax > 0.8) {
    orient = LANDSCAPE_LEFT;
  } else if (ax < -0.8) {
    orient = LANDSCAPE_RIGHT;
  } else if (ay > 0.8) {
    orient = PORTRAIT;
  } else {
    orient = PORTRAIT_INVERTED;
  }

  // Display orientation
  switch (orient) {
    case PORTRAIT:
      Serial.println("Orientation: PORTRAIT");
      break;
    case PORTRAIT_INVERTED:
      Serial.println("Orientation: PORTRAIT INVERTED");
      break;
    case LANDSCAPE_LEFT:
      Serial.println("Orientation: LANDSCAPE LEFT");
      break;
    case LANDSCAPE_RIGHT:
      Serial.println("Orientation: LANDSCAPE RIGHT");
      break;
    case FACE_UP:
      Serial.println("Orientation: FACE UP");
      break;
    case FACE_DOWN:
      Serial.println("Orientation: FACE DOWN");
      break;
  }

  delay(500);
}
```

## Understanding 6-DOF IMU

**What is an IMU?**

- Inertial Measurement Unit
- Measures orientation, velocity, and gravitational forces
- Combines accelerometer + gyroscope (6-DOF)
- Full IMU adds magnetometer (9-DOF) for absolute heading

**Accelerometer Measures:**

- Linear acceleration (m/s² or g)
- Tilt angle (using gravity vector)
- Vibration
- Impact/shock

**Gyroscope Measures:**

- Angular velocity (rotation rate, degrees/second)
- Rotation around X, Y, Z axes
- Does NOT measure absolute angle (only rate of change)

**Complementary Data:**

- Accel good for: Static tilt, long-term orientation
- Gyro good for: Dynamic rotation, short-term changes
- Combined: Best of both (sensor fusion algorithms)

## Gyroscope Drift Compensation

**Why Gyroscopes Drift:**

- Zero-rate offset (reads non-zero when stationary)
- Temperature changes affect offset
- Mechanical imperfections
- Can accumulate to large angle errors over time

**Calibration Procedure:**

```cpp
// Run once at startup, sensor must be stationary
float gyroX_offset = 0;
float gyroY_offset = 0;
float gyroZ_offset = 0;

void calibrateGyro() {
  Serial.println("Calibrating gyroscope...");
  Serial.println("Keep sensor completely still");
  delay(2000);

  const int samples = 100;
  for (int i = 0; i < samples; i++) {
    gyroX_offset += imu.readFloatGyroX();
    gyroY_offset += imu.readFloatGyroY();
    gyroZ_offset += imu.readFloatGyroZ();
    delay(10);
  }

  gyroX_offset /= samples;
  gyroY_offset /= samples;
  gyroZ_offset /= samples;

  Serial.println("Calibration complete");
}

// Use in loop:
float gyroX = imu.readFloatGyroX() - gyroX_offset;
float gyroY = imu.readFloatGyroY() - gyroY_offset;
float gyroZ = imu.readFloatGyroZ() - gyroZ_offset;
```

## Complementary Filter for Orientation

**Sensor Fusion - Combining Accel + Gyro:**

```cpp
float angleX = 0;  // Current angle estimate
float angleY = 0;

const float alpha = 0.98;  // Filter coefficient (0.9-0.99)
const float dt = 0.01;  // Time step (10ms)

void loop() {
  float ax = imu.readFloatAccelX();
  float ay = imu.readFloatAccelY();
  float az = imu.readFloatAccelZ();
  float gx = imu.readFloatGyroX();
  float gy = imu.readFloatGyroY();

  // Accel-based angle (slow but stable)
  float accelAngleX = atan2(ay, az) * 180.0 / PI;
  float accelAngleY = atan2(-ax, sqrt(ay*ay + az*az)) * 180.0 / PI;

  // Gyro integration (fast but drifts)
  angleX += gx * dt;
  angleY += gy * dt;

  // Complementary filter (best of both)
  angleX = alpha * angleX + (1 - alpha) * accelAngleX;
  angleY = alpha * angleY + (1 - alpha) * accelAngleY;

  Serial.print("Roll: ");
  Serial.print(angleX, 1);
  Serial.print("° | Pitch: ");
  Serial.print(angleY, 1);
  Serial.println("°");

  delay(10);
}
```

## LSM6DS3 vs. LIS3DHTR Comparison

| Feature           | LSM6DS3 (6-DOF)       | LIS3DHTR (3-DOF)           |
| ----------------- | --------------------- | -------------------------- |
| **Accelerometer** | Yes ⭐⭐⭐            | Yes ⭐⭐⭐                 |
| **Gyroscope**     | Yes ⭐⭐⭐            | No                         |
| **Orientation**   | Full 3D ⭐⭐⭐        | Tilt only                  |
| **Rotation Rate** | Yes ⭐⭐⭐            | No                         |
| **Power**         | 0.9mA                 | 11µA ⭐⭐⭐                |
| **Price**         | Higher                | Lower ⭐⭐                 |
| **Applications**  | Drones, robotics, IMU | Simple tilt, tap detection |

**Choose LSM6DS3 for:**

- Full 3D orientation tracking
- Rotation rate measurement
- Drone/robot stabilization
- Gaming controllers
- Advanced motion analysis

**Choose LIS3DHTR for:**

- Simple tilt detection
- Low power applications
- Tap detection
- Cost-sensitive projects

## Integration Examples

See [integration recipes](../../integrations/) for projects combining LSM6DS3 with:

- Servo motors (gimbal stabilization)
- OLED display (orientation dashboard)
- Motor drivers (balance robot, drone)
- LED matrix (motion-reactive display)

## Additional Resources

- [LSM6DS3 Datasheet](https://www.st.com/resource/en/datasheet/lsm6ds3.pdf)
- [IMU Fundamentals](https://www.sparkfun.com/pages/accel_gyro_guide)
- [Sensor Fusion Algorithms](https://www.mdpi.com/1424-8220/15/8/19302)
- [Complementary Filter Explained](https://www.pieter-jan.com/node/11)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Library Last Updated:** Check GitHub for latest version
