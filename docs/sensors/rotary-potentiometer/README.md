# Grove Rotary Angle Sensor (Potentiometer)

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Rotary_Angle_Sensor/  
**Connection Type:** Analog

## Overview

The Grove Rotary Angle Sensor produces analog output between 0 and Vcc (5V). The angular range is 300 degrees with a linear change in value. Perfect for user input controls, angle measurement, and volume/brightness adjustments.

## Authoritative References

- [Grove Rotary Angle Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Rotary_Angle_Sensor/)
- No external library required (uses standard Arduino analogRead)

## Hardware Setup

- **Connection Type:** Analog
- **Grove Port:** Any Analog port (A0-A3)
- **Power Requirements:** 3.3V / 5V
- **Output Range:** 0 - 1023 (10-bit ADC), 0 - 16383 (14-bit on Uno R4)
- **Angular Range:** 300 degrees (not full 360°)
- **Wiring:** Connect to Grove Base Shield analog port using 4-pin Grove cable

![Grove Rotary Angle Sensor](https://files.seeedstudio.com/wiki/Grove-Rotary_Angle_Sensor/img/rotary_angle_sensor.jpg)

## Software Prerequisites

No external libraries required. Uses built-in Arduino functions:

- `analogRead(pin)`
- `map()` for value conversion

## Example Code

### Basic Reading

```cpp
/*
  Purpose: Basic example of the Seeed Rotary Potentiometer input sensor
  Author: Ben Jones 13/7/23
  Source: https://wiki.seeedstudio.com/Grove-Rotary_Angle_Sensor/
*/

static unsigned int potPIN = A0;

void setup() {
  Serial.begin(9600);
  pinMode(potPIN, INPUT);
}

void loop() {
  Serial.println(analogRead(potPIN));
  delay(100);
}
```

### Advanced: Angle Calculation and LED Control

```cpp
/*
  Calculate actual angle in degrees and control LED brightness
*/

#define ROTARY_ANGLE_SENSOR A0
#define LED 3  // PWM pin for LED
#define ADC_REF 5 // Reference voltage 5V
#define GROVE_VCC 5 // Grove VCC is 5V
#define FULL_ANGLE 300 // Full rotation is 300 degrees

void setup() {
  Serial.begin(9600);
  pinMode(ROTARY_ANGLE_SENSOR, INPUT);
  pinMode(LED, OUTPUT);
}

void loop() {
  int sensor_value = analogRead(ROTARY_ANGLE_SENSOR);

  // Convert to voltage
  float voltage = (float)sensor_value * ADC_REF / 1023;

  // Convert voltage to degrees
  float degrees = (voltage * FULL_ANGLE) / GROVE_VCC;

  Serial.print("Angle: ");
  Serial.print(degrees);
  Serial.println("°");

  // Map angle to LED brightness
  int brightness = map(degrees, 0, FULL_ANGLE, 0, 255);
  analogWrite(LED, brightness);

  delay(100);
}
```

**Key Points:**

- Returns 0 when fully counter-clockwise
- Returns ~1023 (or 16383 on Uno R4) when fully clockwise
- 300° rotation range (not full circle)
- Linear response throughout range
- Voltage calculation: `(analogRead_value × 5V) / 1023`
- Angle calculation: `(voltage × 300°) / 5V`

## Testing Procedure

1. Connect potentiometer to analog port A0
2. Upload basic example sketch
3. Open Serial Monitor (9600 baud)
4. **Expected output:**
   - Values near 0 when rotated fully counter-clockwise
   - Values increasing as you rotate clockwise
   - Maximum ~1023 (or 16383) at full clockwise position
5. Rotate slowly through full range to verify linear response

## Common Applications

### Volume Control

```cpp
const int potPin = A0;
const int buzzerPin = 3;

void loop() {
  int reading = analogRead(potPin);
  int frequency = map(reading, 0, 1023, 100, 2000);
  tone(buzzerPin, frequency);
  delay(10);
}
```

### Servo Position Control

```cpp
#include <Servo.h>

Servo myServo;
const int potPin = A0;

void setup() {
  myServo.attach(9);
}

void loop() {
  int reading = analogRead(potPin);
  int angle = map(reading, 0, 1023, 0, 180);
  myServo.write(angle);
  delay(15);
}
```

### Speed Control

```cpp
const int potPin = A0;
const int motorPin = 5;

void loop() {
  int reading = analogRead(potPin);
  int speed = map(reading, 0, 1023, 0, 255);
  analogWrite(motorPin, speed);
  delay(10);
}
```

## Troubleshooting

| Problem                      | Solution                                         |
| ---------------------------- | ------------------------------------------------ |
| Always reads 0               | Check Grove cable, verify analog port connection |
| Always reads max             | Check if rotated to limit, verify VCC connection |
| Noisy readings               | Add small delay, use averaging (see below)       |
| Non-linear response          | Normal sensor should be linear; check for damage |
| Values don't reach 0 or 1023 | Normal; may have small offset at extremes        |

## Reading Smoothing

For stable readings without noise:

```cpp
const int numReadings = 10;
int readings[numReadings];
int readIndex = 0;
int total = 0;
int average = 0;

const int potPin = A0;

void setup() {
  Serial.begin(9600);
  // Initialize all readings to 0
  for (int i = 0; i < numReadings; i++) {
    readings[i] = 0;
  }
}

void loop() {
  // Subtract last reading
  total = total - readings[readIndex];
  // Read new value
  readings[readIndex] = analogRead(potPin);
  // Add to total
  total = total + readings[readIndex];
  // Advance index
  readIndex = (readIndex + 1) % numReadings;

  // Calculate average
  average = total / numReadings;

  Serial.println(average);
  delay(10);
}
```

## Technical Specifications

- **Operating Voltage:** 3.3V - 5V
- **Output Signal:** Analog voltage (0-VCC)
- **Angular Range:** 300° ±5°
- **Rotational Life:** >15,000 cycles
- **Dimensions:** 20mm x 20mm
- **Weight:** 3g

## Integration Examples

See [integration recipes](../../integrations/) for projects using rotary potentiometer with:

- LED (brightness control)
- Servo motor (position control)
- Buzzer (tone/frequency control)
- OLED display (menu navigation, value selection)

## Additional Resources

- [Arduino analogRead() Reference](https://www.arduino.cc/reference/en/language/functions/analog-io/analogread/)
- [Arduino map() Function](https://www.arduino.cc/reference/en/language/functions/math/map/)
- [Potentiometer Basics](https://en.wikipedia.org/wiki/Potentiometer)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17
