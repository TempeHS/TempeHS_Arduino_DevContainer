# Grove 3-Axis Digital Accelerometer (LIS3DHTR)

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-3-Axis-Digital-Accelerometer-LIS3DHTR/  
**Library Repo:** https://github.com/Seeed-Studio/Seeed_Arduino_LIS3DHTR  
**Connection Type:** I2C

## Overview

The Grove 3-Axis Digital Accelerometer (LIS3DHTR) measures acceleration on three axes (X, Y, Z). Can detect tilt, orientation, motion, shock, and vibration. Includes built-in temperature sensor.

## Authoritative References

- [Grove 3-Axis Digital Accelerometer - Seeed Wiki](https://wiki.seeedstudio.com/Grove-3-Axis-Digital-Accelerometer-LIS3DHTR/)
- [Seeed_Arduino_LIS3DHTR Library](https://github.com/Seeed-Studio/Seeed_Arduino_LIS3DHTR)

## Hardware Setup

- **Connection Type:** I2C
- **Grove Port:** I2C port on Base Shield
- **Power Requirements:** 1.71V - 3.6V (module regulated)
- **I2C Address:** 0x19 (default), can be 0x18 when SDO connected to GND
- **Measurement Ranges:** ±2g, ±4g, ±8g, ±16g (selectable)
- **Wiring:** Connect to Grove Base Shield I2C port using 4-pin Grove cable

![Grove LIS3DHTR](https://files.seeedstudio.com/wiki/Grove-3-Axis_Digital_Accelerometer-2g-to-16g-LIS3DHTR/img/Main.jpg)

## Software Prerequisites

### Required Libraries

```bash
arduino-cli lib install "Grove - 3-Axis Digital Accelerometer(±16g)"
```

Or via Arduino IDE: Sketch → Include Library → Manage Libraries → Search "LIS3DHTR"

## Example Code

```cpp
/*
  Purpose: Basic example of reading 3-Axis Accelerometer
  Notes:
    1. Connect to I2C - Default 0x19
    2. Measurement ranges: ±2g, ±4g, ±8g, ±16g
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-3-Axis-Digital-Accelerometer-LIS3DHTR/
  Library: https://github.com/Seeed-Studio/Seeed_Arduino_LIS3DHTR
*/

#include "LIS3DHTR.h"
#include <Wire.h>

LIS3DHTR<TwoWire> LIS;  // I2C mode

void setup() {
  Serial.begin(9600);
  while (!Serial) {};

  LIS.begin(Wire, 0x19);  // I2C address

  if (!LIS) {
    Serial.println("LIS3DHTR didn't connect.");
    while (1);
  }

  LIS.setOutputDataRate(LIS3DHTR_DATARATE_50HZ);  // 50Hz sampling
  LIS.setFullScaleRange(LIS3DHTR_RANGE_2G);       // ±2g range

  Serial.println("LIS3DHTR Accelerometer initialized");
}

void loop() {
  if (!LIS) {
    Serial.println("Sensor not connected!");
    return;
  }

  // Read 3 axes
  float x = LIS.getAccelerationX();
  float y = LIS.getAccelerationY();
  float z = LIS.getAccelerationZ();

  Serial.print("x: ");
  Serial.print(x);
  Serial.print(" g\t");
  Serial.print("y: ");
  Serial.print(y);
  Serial.print(" g\t");
  Serial.print("z: ");
  Serial.print(z);
  Serial.println(" g");

  delay(500);
}
```

### With Temperature Reading

```cpp
#include "LIS3DHTR.h"
#include <Wire.h>

LIS3DHTR<TwoWire> LIS;

void setup() {
  Serial.begin(9600);
  LIS.begin(Wire, 0x19);
  LIS.openTemp();  // Enable temperature sensor
  LIS.setOutputDataRate(LIS3DHTR_DATARATE_50HZ);
  LIS.setFullScaleRange(LIS3DHTR_RANGE_2G);
}

void loop() {
  float x = LIS.getAccelerationX();
  float y = LIS.getAccelerationY();
  float z = LIS.getAccelerationZ();
  float temp = LIS.getTemperature();

  Serial.print("Acceleration - X: ");
  Serial.print(x);
  Serial.print(" Y: ");
  Serial.print(y);
  Serial.print(" Z: ");
  Serial.print(z);
  Serial.print(" | Temp: ");
  Serial.print(temp);
  Serial.println("°C");

  delay(1000);
}
```

**Key Points:**

- Returns acceleration in g (1g = 9.8 m/s²)
- X, Y, Z axes relative to sensor orientation
- When flat: Z ≈ 1g (gravity), X ≈ 0g, Y ≈ 0g
- Can select measurement range (±2g, ±4g, ±8g, ±16g)
- Higher range = less sensitive but can measure larger accelerations
- 1g = Earth's gravity acceleration

## Testing Procedure

1. Connect accelerometer to I2C port
2. Upload basic example
3. Open Serial Monitor (9600 baud)
4. **Expected output (sensor flat on table):**
   - X ≈ 0g
   - Y ≈ 0g
   - Z ≈ 1g (or -1g depending on orientation)
5. Tilt sensor - values change
6. Shake sensor - see rapid value changes

## Troubleshooting

| Problem                    | Solution                                        |
| -------------------------- | ----------------------------------------------- |
| "didn't connect" error     | Check I2C connection, verify address (try 0x18) |
| All values return 0        | Check if begin() successful, verify power       |
| Values don't change        | Sensor may be damaged; check connections        |
| Noisy readings             | Normal for sensitive sensor; use averaging      |
| Wrong orientation readings | Check sensor mounting and axis labels           |

## Technical Specifications

- **Measurement Ranges:** ±2g, ±4g, ±8g, ±16g (software selectable)
- **Resolution:** 8/10/12-bit depending on mode
- **Output Data Rates:** 1Hz to 5.3kHz
- **Interface:** I2C (address 0x19 or 0x18)
- **Operating Voltage:** 1.71V - 3.6V
- **Power Consumption:** < 1mA
- **Built-in Features:** Temperature sensor, FIFO, interrupts

## Common Use Cases

### Tilt Detection

```cpp
void loop() {
  float x = LIS.getAccelerationX();
  float y = LIS.getAccelerationY();
  float z = LIS.getAccelerationZ();

  // Calculate tilt angle from vertical (Z-axis)
  float tiltAngle = atan2(sqrt(x*x + y*y), z) * 180.0 / PI;

  Serial.print("Tilt angle: ");
  Serial.print(tiltAngle);
  Serial.println(" degrees");

  if (tiltAngle < 10) {
    Serial.println("Level");
  } else if (tiltAngle < 45) {
    Serial.println("Slightly tilted");
  } else {
    Serial.println("Heavily tilted");
  }

  delay(500);
}
```

### Shake/Motion Detector

```cpp
float shakeThreshold = 1.5;  // g

void loop() {
  float x = LIS.getAccelerationX();
  float y = LIS.getAccelerationY();
  float z = LIS.getAccelerationZ();

  // Calculate total acceleration magnitude
  float magnitude = sqrt(x*x + y*y + z*z);

  // Subtract gravity (1g) to get motion component
  float motion = abs(magnitude - 1.0);

  if (motion > shakeThreshold) {
    Serial.println("SHAKE DETECTED!");
    // Trigger action
  }

  delay(100);
}
```

### Orientation Detection

```cpp
void loop() {
  float x = LIS.getAccelerationX();
  float y = LIS.getAccelerationY();
  float z = LIS.getAccelerationZ();

  Serial.print("Orientation: ");

  if (z > 0.8) {
    Serial.println("Face up");
  } else if (z < -0.8) {
    Serial.println("Face down");
  } else if (x > 0.8) {
    Serial.println("Tilted right");
  } else if (x < -0.8) {
    Serial.println("Tilted left");
  } else if (y > 0.8) {
    Serial.println("Tilted forward");
  } else if (y < -0.8) {
    Serial.println("Tilted backward");
  } else {
    Serial.println("Angled");
  }

  delay(1000);
}
```

### Step Counter (Simple)

```cpp
float lastZ = 0;
int stepCount = 0;
float stepThreshold = 0.3;
unsigned long lastStepTime = 0;
const unsigned long stepDebounce = 300;  // ms

void loop() {
  float z = LIS.getAccelerationZ();
  float zChange = abs(z - lastZ);

  if (zChange > stepThreshold && (millis() - lastStepTime > stepDebounce)) {
    stepCount++;
    Serial.print("Steps: ");
    Serial.println(stepCount);
    lastStepTime = millis();
  }

  lastZ = z;
  delay(50);
}
```

## Measurement Range Selection

```cpp
// Choose range based on application
LIS.setFullScaleRange(LIS3DHTR_RANGE_2G);   // High sensitivity, ±2g
LIS.setFullScaleRange(LIS3DHTR_RANGE_4G);   // Medium sensitivity, ±4g
LIS.setFullScaleRange(LIS3DHTR_RANGE_8G);   // Low sensitivity, ±8g
LIS.setFullScaleRange(LIS3DHTR_RANGE_16G);  // Very low sensitivity, ±16g
```

**Choosing Range:**

- ±2g: Slow tilting, orientation detection
- ±4g: Walking, gentle motion
- ±8g: Running, sports activities
- ±16g: High-impact events, crashes

## Output Data Rate Options

```cpp
LIS.setOutputDataRate(LIS3DHTR_DATARATE_1HZ);     // Very slow sampling
LIS.setOutputDataRate(LIS3DHTR_DATARATE_10HZ);    // Slow
LIS.setOutputDataRate(LIS3DHTR_DATARATE_25HZ);    // Medium-slow
LIS.setOutputDataRate(LIS3DHTR_DATARATE_50HZ);    // Medium (recommended)
LIS.setOutputDataRate(LIS3DHTR_DATARATE_100HZ);   // Fast
LIS.setOutputDataRate(LIS3DHTR_DATARATE_200HZ);   // Very fast
LIS.setOutputDataRate(LIS3DHTR_DATARATE_1_6KHZ);  // Ultra-fast
LIS.setOutputDataRate(LIS3DHTR_DATARATE_5KHZ);    // Maximum
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining accelerometer with:

- OLED display (orientation/tilt display)
- LED (motion indicator)
- Buzzer (shake alarm)
- Servo (motion-controlled robot arm)

## Additional Resources

- [LIS3DHTR Datasheet](https://www.st.com/resource/en/datasheet/lis3dh.pdf)
- [Accelerometer Basics](https://en.wikipedia.org/wiki/Accelerometer)
- [Library Documentation](https://github.com/Seeed-Studio/Seeed_Arduino_LIS3DHTR)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Library Version:** Check [releases](https://github.com/Seeed-Studio/Seeed_Arduino_LIS3DHTR/releases)
