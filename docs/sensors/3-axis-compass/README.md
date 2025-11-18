# Grove 3-Axis Digital Compass v2.0 (BMM150)

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-3-Axis_Digitial_Compass_v2.0/  
**Library Repo:** https://github.com/Seeed-Studio/Grove_3_Axis_Compass_V2.0_BMM150  
**Connection Type:** I2C

## Overview

The Grove BMM150 is a 3-axis digital magnetometer (compass) that measures Earth's magnetic field to determine heading direction. Provides 0-360° heading with compensation for tilt. Features low power consumption (170µA), high resolution (0.3µT), and built-in temperature compensation. Ideal for navigation, robotics orientation, augmented reality, metal detection, and compass applications.

## Authoritative References

- [Grove 3-Axis Digital Compass v2.0 - Seeed Wiki](https://wiki.seeedstudio.com/Grove-3-Axis_Digitial_Compass_v2.0/)
- [Grove_3_Axis_Compass_V2.0_BMM150 Library - GitHub](https://github.com/Seeed-Studio/Grove_3_Axis_Compass_V2.0_BMM150)
- [BMM150 Datasheet - Bosch Sensortec](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmm150-ds001.pdf)

## Hardware Setup

- **Connection Type:** I2C
- **Grove Port:** Any I2C port (address 0x10-0x13, default 0x10)
- **Measurement Range:** ±1300µT (X/Y axes), ±2500µT (Z axis)
- **Resolution:** 0.3µT
- **Operating Voltage:** 3.3V - 5V
- **Current:** 170µA in normal mode, 3µA in suspend mode
- **Output Data Rate:** 2Hz to 30Hz
- **Heading Accuracy:** ±1° with calibration
- **Temperature Range:** -40°C to +85°C
- **Wiring:** Connect to Grove Base Shield I2C port using 4-pin Grove cable

![Grove BMM150](https://files.seeedstudio.com/wiki/Grove-3-Axis_Digitial_Compass_v2.0/img/Grove-3-Axis_Digital_Compass_v2.0.JPG)

## Software Prerequisites

Install the BMM150 library:

```bash
# Method 1: Arduino Library Manager
# Open Arduino IDE → Tools → Manage Libraries
# Search "BMM150" → Install "Grove 3 Axis Compass V2.0 BMM150"

# Method 2: Manual installation
cd ~/Arduino/libraries
git clone https://github.com/Seeed-Studio/Grove_3_Axis_Compass_V2.0_BMM150.git
```

**Library Dependencies:**

- Wire.h (built-in I2C library)

## Example Code

```cpp
/*
  Purpose: Read magnetic field and calculate compass heading
  Notes:
    1. Connect to I2C port
    2. Requires calibration for accurate headings
    3. Sensor flat for best results
    4. Keep away from magnetic interference (speakers, motors)
    5. Heading: 0°=North, 90°=East, 180°=South, 270°=West
  Author: Ben Jones 14/7/23
  Source: https://github.com/Seeed-Studio/Grove_3_Axis_Compass_V2.0_BMM150
*/

#include <bmm150.h>
#include <bmm150_defs.h>

BMM150 bmm = BMM150();

void setup() {
  Serial.begin(9600);

  Serial.println("BMM150 3-Axis Magnetometer");

  // Initialize sensor
  if (bmm.initialize() == BMM150_OK) {
    Serial.println("BMM150 initialized successfully");
  } else {
    Serial.println("BMM150 initialization failed!");
    Serial.println("Check I2C connection");
    while (1);
  }

  Serial.println("Format: MagX, MagY, MagZ (µT) | Heading (°)");
  Serial.println("0°=North, 90°=East, 180°=South, 270°=West");
}

void loop() {
  bmm150_mag_data magData;

  // Read magnetic field
  bmm.read_mag_data();
  magData = bmm.get_mag_data();

  float magX = magData.x;
  float magY = magData.y;
  float magZ = magData.z;

  // Calculate heading (0-360°)
  float heading = atan2(magY, magX) * 180.0 / PI;
  if (heading < 0) {
    heading += 360;
  }

  // Display
  Serial.print("Mag: X=");
  Serial.print(magX, 2);
  Serial.print("µT Y=");
  Serial.print(magY, 2);
  Serial.print("µT Z=");
  Serial.print(magZ, 2);
  Serial.print("µT | Heading: ");
  Serial.print(heading, 1);
  Serial.print("° (");
  Serial.print(getCardinalDirection(heading));
  Serial.println(")");

  delay(500);
}

String getCardinalDirection(float heading) {
  if (heading >= 337.5 || heading < 22.5) return "N";
  else if (heading >= 22.5 && heading < 67.5) return "NE";
  else if (heading >= 67.5 && heading < 112.5) return "E";
  else if (heading >= 112.5 && heading < 157.5) return "SE";
  else if (heading >= 157.5 && heading < 202.5) return "S";
  else if (heading >= 202.5 && heading < 247.5) return "SW";
  else if (heading >= 247.5 && heading < 292.5) return "W";
  else return "NW";
}
```

### Compass with Cardinal Directions

```cpp
#include <bmm150.h>
#include <bmm150_defs.h>

BMM150 bmm = BMM150();

void setup() {
  Serial.begin(9600);

  if (bmm.initialize() != BMM150_OK) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("Digital Compass");
  Serial.println("Point sensor in direction you want to measure");
}

void loop() {
  bmm.read_mag_data();
  bmm150_mag_data data = bmm.get_mag_data();

  float heading = atan2(data.y, data.x) * 180.0 / PI;
  if (heading < 0) heading += 360;

  Serial.print("Heading: ");
  Serial.print(heading, 1);
  Serial.print("° → ");

  // Display direction with ASCII arrow
  if (heading >= 337.5 || heading < 22.5) {
    Serial.println("↑ NORTH");
  } else if (heading >= 22.5 && heading < 67.5) {
    Serial.println("↗ NORTHEAST");
  } else if (heading >= 67.5 && heading < 112.5) {
    Serial.println("→ EAST");
  } else if (heading >= 112.5 && heading < 157.5) {
    Serial.println("↘ SOUTHEAST");
  } else if (heading >= 157.5 && heading < 202.5) {
    Serial.println("↓ SOUTH");
  } else if (heading >= 202.5 && heading < 247.5) {
    Serial.println("↙ SOUTHWEST");
  } else if (heading >= 247.5 && heading < 292.5) {
    Serial.println("← WEST");
  } else {
    Serial.println("↖ NORTHWEST");
  }

  delay(500);
}
```

### Metal Detector

```cpp
#include <bmm150.h>
#include <bmm150_defs.h>

BMM150 bmm = BMM150();

const int buzzerPin = 3;
const int ledPin = 4;
float baselineMag = 0;
const float metalThreshold = 50;  // µT change to detect metal

void setup() {
  Serial.begin(9600);
  pinMode(buzzerPin, OUTPUT);
  pinMode(ledPin, OUTPUT);

  if (bmm.initialize() != BMM150_OK) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("Metal Detector");
  Serial.println("Calibrating baseline (keep away from metal)...");
  delay(2000);

  // Establish baseline
  bmm.read_mag_data();
  bmm150_mag_data data = bmm.get_mag_data();
  baselineMag = sqrt(data.x*data.x + data.y*data.y + data.z*data.z);

  Serial.print("Baseline: ");
  Serial.print(baselineMag, 2);
  Serial.println(" µT");
  Serial.println("Move sensor near metal objects to detect");
}

void loop() {
  bmm.read_mag_data();
  bmm150_mag_data data = bmm.get_mag_data();

  float totalMag = sqrt(data.x*data.x + data.y*data.y + data.z*data.z);
  float deviation = abs(totalMag - baselineMag);

  Serial.print("Field: ");
  Serial.print(totalMag, 2);
  Serial.print(" µT | Deviation: ");
  Serial.print(deviation, 2);
  Serial.print(" µT | ");

  if (deviation > metalThreshold) {
    digitalWrite(ledPin, HIGH);
    int freq = map(deviation, metalThreshold, 200, 500, 2000);
    tone(buzzerPin, freq);
    Serial.println("METAL DETECTED!");
  } else {
    digitalWrite(ledPin, LOW);
    noTone(buzzerPin);
    Serial.println("Clear");
  }

  delay(100);
}
```

### Rotation Counter

```cpp
#include <bmm150.h>
#include <bmm150_defs.h>

BMM150 bmm = BMM150();

float lastHeading = 0;
int rotationCount = 0;
float totalRotation = 0;

void setup() {
  Serial.begin(9600);

  if (bmm.initialize() != BMM150_OK) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("Rotation Counter");
  Serial.println("Rotate sensor to count revolutions");

  // Get initial heading
  bmm.read_mag_data();
  bmm150_mag_data data = bmm.get_mag_data();
  lastHeading = atan2(data.y, data.x) * 180.0 / PI;
  if (lastHeading < 0) lastHeading += 360;
}

void loop() {
  bmm.read_mag_data();
  bmm150_mag_data data = bmm.get_mag_data();

  float heading = atan2(data.y, data.x) * 180.0 / PI;
  if (heading < 0) heading += 360;

  // Calculate rotation
  float deltaHeading = heading - lastHeading;

  // Handle wraparound
  if (deltaHeading > 180) deltaHeading -= 360;
  if (deltaHeading < -180) deltaHeading += 360;

  totalRotation += deltaHeading;

  // Count full rotations
  if (totalRotation >= 360) {
    rotationCount++;
    totalRotation -= 360;
    Serial.print("Full rotation detected! Count: ");
    Serial.println(rotationCount);
  } else if (totalRotation <= -360) {
    rotationCount--;
    totalRotation += 360;
    Serial.print("Reverse rotation detected! Count: ");
    Serial.println(rotationCount);
  }

  Serial.print("Heading: ");
  Serial.print(heading, 1);
  Serial.print("° | Rotations: ");
  Serial.print(rotationCount);
  Serial.print(" + ");
  Serial.print(totalRotation, 1);
  Serial.println("°");

  lastHeading = heading;
  delay(100);
}
```

**Key Points:**

- Measures Earth's magnetic field (geomagnetic field)
- 3-axis magnetometer (X, Y, Z components)
- Requires calibration for accurate headings
- Sensitive to magnetic interference (motors, speakers, metal)
- Low power: 170µA typical
- Heading accuracy: ±1° with proper calibration
- Can also detect nearby ferromagnetic metals

## Testing Procedure

1. Connect BMM150 to I2C port
2. Install Grove_3_Axis_Compass_V2.0_BMM150 library
3. Upload basic example
4. Open Serial Monitor (9600 baud)
5. **Test magnetic field detection:**
   - Observe X, Y, Z values in µT
   - Rotate sensor - values should change smoothly
6. **Test heading:**
   - Point sensor north - heading ≈0°
   - Point sensor east - heading ≈90°
   - Point sensor south - heading ≈180°
   - Point sensor west - heading ≈270°
7. **Test magnetic interference:**
   - Move sensor near speaker/motor - large field changes
   - Keep away from metal objects during normal use

## Troubleshooting

| Problem               | Solution                                                                |
| --------------------- | ----------------------------------------------------------------------- |
| Initialization failed | Check I2C wiring, verify power supply, try address 0x10-0x13            |
| Heading always wrong  | Needs calibration (see calibration procedure), check sensor orientation |
| Erratic readings      | Magnetic interference nearby (motors, speakers, metal), move away       |
| Heading jumps around  | Hard/soft iron distortion, perform 8-figure calibration                 |
| Readings don't change | Sensor damaged or frozen, power cycle, check I2C communication          |
| Heading stuck at 0°   | Library issue or sensor fault, verify example code runs                 |

## Technical Specifications

**Magnetic Field Measurement:**

- **Technology:** Hall-effect magnetometer
- **Range:** ±1300µT (X/Y axes), ±2500µT (Z axis)
- **Resolution:** 0.3µT
- **Noise:** 1µT RMS @ 30Hz
- **Sensitivity:** 0.3µT/LSB

**Heading/Compass:**

- **Range:** 0-360° (full circle)
- **Accuracy:** ±1° (with proper calibration)
- **Resolution:** 0.5° (typ)

**Performance:**

- **Output Data Rates:** 2Hz, 6Hz, 8Hz, 10Hz, 15Hz, 20Hz, 25Hz, 30Hz
- **Temperature Compensation:** Built-in
- **Self-Test:** Built-in functionality

**Communication:**

- **Interface:** I2C (up to 400kHz Fast Mode)
- **I2C Address:** 0x10 (default), 0x11, 0x12, or 0x13 (configurable)

**Electrical:**

- **Operating Voltage:** 1.62V - 3.6V (Grove module regulates 3.3V-5V input)
- **Current (Normal Mode):** 170µA @ 10Hz
- **Current (Low Power):** 20µA @ 10Hz
- **Current (Suspend):** 3µA

**Environmental:**

- **Operating Temperature:** -40°C to +85°C
- **Storage Temperature:** -40°C to +125°C

**Physical:**

- **Size:** 20mm × 20mm Grove module
- **Axes:** X, Y, Z (right-hand coordinate system)

## Common Use Cases

### Navigation Compass for Robot

```cpp
#include <bmm150.h>
#include <bmm150_defs.h>

BMM150 bmm = BMM150();

const float targetHeading = 90;  // East (90°)
const float tolerance = 10;  // ±10°

void setup() {
  Serial.begin(9600);

  if (bmm.initialize() != BMM150_OK) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("Robot Navigation Compass");
  Serial.print("Target heading: ");
  Serial.print(targetHeading);
  Serial.println("° (East)");
}

void loop() {
  bmm.read_mag_data();
  bmm150_mag_data data = bmm.get_mag_data();

  float heading = atan2(data.y, data.x) * 180.0 / PI;
  if (heading < 0) heading += 360;

  float error = targetHeading - heading;

  // Normalize error to -180 to +180
  if (error > 180) error -= 360;
  if (error < -180) error += 360;

  Serial.print("Current: ");
  Serial.print(heading, 1);
  Serial.print("° | Error: ");
  Serial.print(error, 1);
  Serial.print("° | ");

  if (abs(error) < tolerance) {
    Serial.println("ON TARGET ✓");
  } else if (error > 0) {
    Serial.println("Turn RIGHT →");
  } else {
    Serial.println("Turn LEFT ←");
  }

  delay(500);
}
```

### Absolute Position Tracker

```cpp
#include <bmm150.h>
#include <bmm150_defs.h>

BMM150 bmm = BMM150();

float posX = 0;
float posY = 0;
const float stepDistance = 0.5;  // 50cm per step (adjust for robot)

void setup() {
  Serial.begin(9600);

  if (bmm.initialize() != BMM150_OK) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  Serial.println("Position Tracker (Dead Reckoning)");
  Serial.println("Assumes starting position (0,0) facing North");
}

void loop() {
  bmm.read_mag_data();
  bmm150_mag_data data = bmm.get_mag_data();

  float heading = atan2(data.y, data.x) * 180.0 / PI;
  if (heading < 0) heading += 360;

  // Simulate movement (in real robot, detect when step taken)
  static unsigned long lastStep = 0;
  if (millis() - lastStep > 2000) {  // Step every 2 seconds
    // Update position based on heading
    float radians = heading * PI / 180.0;
    posX += stepDistance * sin(radians);
    posY += stepDistance * cos(radians);

    lastStep = millis();

    Serial.print("Position: (");
    Serial.print(posX, 2);
    Serial.print(", ");
    Serial.print(posY, 2);
    Serial.print(") | Heading: ");
    Serial.print(heading, 1);
    Serial.println("°");
  }

  delay(100);
}
```

### Orientation Lock (Gimbal)

```cpp
#include <bmm150.h>
#include <bmm150_defs.h>
#include <Servo.h>

BMM150 bmm = BMM150();
Servo gimbalServo;

const int servoPin = 3;
float targetHeading = 0;  // Lock to North

void setup() {
  Serial.begin(9600);
  gimbalServo.attach(servoPin);

  if (bmm.initialize() != BMM150_OK) {
    Serial.println("Sensor init failed!");
    while (1);
  }

  // Get initial heading as target
  bmm.read_mag_data();
  bmm150_mag_data data = bmm.get_mag_data();
  targetHeading = atan2(data.y, data.x) * 180.0 / PI;
  if (targetHeading < 0) targetHeading += 360;

  Serial.println("Gimbal Orientation Lock");
  Serial.print("Locked to heading: ");
  Serial.println(targetHeading);
}

void loop() {
  bmm.read_mag_data();
  bmm150_mag_data data = bmm.get_mag_data();

  float currentHeading = atan2(data.y, data.x) * 180.0 / PI;
  if (currentHeading < 0) currentHeading += 360;

  // Calculate correction angle
  float error = targetHeading - currentHeading;
  if (error > 180) error -= 360;
  if (error < -180) error += 360;

  // Convert to servo angle (90° = center)
  int servoAngle = 90 + error;
  servoAngle = constrain(servoAngle, 0, 180);

  gimbalServo.write(servoAngle);

  Serial.print("Current: ");
  Serial.print(currentHeading, 1);
  Serial.print("° | Correction: ");
  Serial.print(error, 1);
  Serial.print("° | Servo: ");
  Serial.println(servoAngle);

  delay(100);
}
```

## Understanding Magnetometers

**How Magnetometers Work:**

- Measure Earth's magnetic field
- Field strength: ~25-65µT (varies by location)
- Field points toward magnetic north pole
- 3 axes (X, Y, Z) measure 3D field vector

**Earth's Magnetic Field:**

- **Strength:** 25-65µT (0.25-0.65 Gauss)
- **Direction:** Points to magnetic north (not true north)
- **Inclination:** Angle from horizontal (varies by latitude)
- **Declination:** Angle between magnetic/true north (varies by location)

**Heading Calculation:**

```
heading = atan2(magY, magX) * 180 / PI
if (heading < 0) heading += 360
```

- Result: 0-360°
- 0° = North, 90° = East, 180° = South, 270° = West

**Cardinal Directions:**

- N: 337.5° - 22.5° (0°)
- NE: 22.5° - 67.5° (45°)
- E: 67.5° - 112.5° (90°)
- SE: 112.5° - 157.5° (135°)
- S: 157.5° - 202.5° (180°)
- SW: 202.5° - 247.5° (225°)
- W: 247.5° - 292.5° (270°)
- NW: 292.5° - 337.5° (315°)

## Calibration (Essential for Accuracy)

**Why Calibration is Needed:**

- **Hard Iron Distortion:** Permanent magnets nearby (motors, speakers)
- **Soft Iron Distortion:** Ferromagnetic materials (steel chassis)
- **Sensor Offset:** Manufacturing variations

**8-Figure Calibration Procedure:**

```
1. Power on sensor in clean magnetic environment
2. Rotate sensor slowly in figure-8 pattern
3. Complete 3-4 figure-8s in different planes:
   - Horizontal (XY plane)
   - Vertical (XZ plane)
   - Vertical (YZ plane)
4. Record min/max values for each axis
5. Calculate offsets:
   offset_x = (max_x + min_x) / 2
   offset_y = (max_y + min_y) / 2
   offset_z = (max_z + min_z) / 2
6. Apply offsets in code:
   calibrated_x = raw_x - offset_x
   calibrated_y = raw_y - offset_y
   calibrated_z = raw_z - offset_z
```

**Calibration Code:**

```cpp
float offsetX = 0, offsetY = 0, offsetZ = 0;

void calibrate() {
  Serial.println("Calibration - rotate in figure-8 for 30 seconds");
  delay(2000);

  float minX = 999, maxX = -999;
  float minY = 999, maxY = -999;
  float minZ = 999, maxZ = -999;

  unsigned long startTime = millis();
  while (millis() - startTime < 30000) {
    bmm.read_mag_data();
    bmm150_mag_data data = bmm.get_mag_data();

    if (data.x < minX) minX = data.x;
    if (data.x > maxX) maxX = data.x;
    if (data.y < minY) minY = data.y;
    if (data.y > maxY) maxY = data.y;
    if (data.z < minZ) minZ = data.z;
    if (data.z > maxZ) maxZ = data.z;

    delay(100);
  }

  offsetX = (maxX + minX) / 2;
  offsetY = (maxY + minY) / 2;
  offsetZ = (maxZ + minZ) / 2;

  Serial.println("Calibration complete");
  Serial.print("Offsets: X=");
  Serial.print(offsetX);
  Serial.print(" Y=");
  Serial.print(offsetY);
  Serial.print(" Z=");
  Serial.println(offsetZ);
}
```

## Magnetic Interference Sources

**Strong Interference (Avoid):**

- ❌ Speakers/headphones (permanent magnets)
- ❌ Motors (brushed DC motors especially)
- ❌ Transformers/power supplies
- ❌ Steel structures/metal tables
- ❌ Laptops/computers (internal magnets)
- ❌ Magnetic phone mounts

**Moderate Interference:**

- ⚠️ Wiring with high current
- ⚠️ Batteries (some have magnetic cases)
- ⚠️ Screws and fasteners (steel)

**Testing for Interference:**

```cpp
// Run this to identify interference sources
void scanInterference() {
  bmm.read_mag_data();
  bmm150_mag_data data = bmm.get_mag_data();
  float magnitude = sqrt(data.x*data.x + data.y*data.y + data.z*data.z);

  Serial.print("Field magnitude: ");
  Serial.print(magnitude, 2);
  Serial.print(" µT | ");

  if (magnitude < 20) {
    Serial.println("Too weak - check sensor");
  } else if (magnitude > 100) {
    Serial.println("Strong interference detected!");
  } else {
    Serial.println("Normal");
  }
}
```

## Magnetometer vs. GPS Comparison

| Feature               | Magnetometer | GPS               |
| --------------------- | ------------ | ----------------- |
| **Heading**           | Yes ⭐⭐⭐   | Yes (when moving) |
| **Absolute Position** | No           | Yes ⭐⭐⭐        |
| **Indoor Use**        | Yes ⭐⭐⭐   | No (poor signal)  |
| **Power**             | 170µA ⭐⭐⭐ | 20-50mA           |
| **Update Rate**       | 30Hz ⭐⭐⭐  | 1-10Hz            |
| **Accuracy**          | ±1° ⭐⭐⭐   | ±10° (stationary) |
| **Cost**              | Low ⭐⭐⭐   | Medium            |
| **Interference**      | Magnetic ⚠️  | Buildings/trees   |

**Use Magnetometer for:**

- Heading/orientation when stationary
- Indoor navigation
- Fast update rates
- Low power applications

**Use GPS for:**

- Absolute position tracking
- Outdoor navigation
- Long-distance travel

## Integration Examples

See [integration recipes](../../integrations/) for projects combining BMM150 with:

- OLED display (digital compass display)
- Servo (auto-pointing antenna/camera)
- GPS (complete navigation system)
- IMU (9-DOF orientation with accelerometer+gyro+magnetometer)

## Additional Resources

- [BMM150 Datasheet](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmm150-ds001.pdf)
- [Magnetometer Calibration Guide](https://www.vectornav.com/resources/inertial-navigation-articles/magnetometer-calibration)
- [Magnetic Declination Calculator](https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml)
- [Hard/Soft Iron Compensation](https://www.sensorsmag.com/components/compensating-tilt-hard-iron-and-soft-iron-effects)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Note:** Calibration essential for accurate compass headings! Avoid magnetic interference sources.
