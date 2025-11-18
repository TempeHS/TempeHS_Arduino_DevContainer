# Grove Servo Motor

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Servo/  
**Library:** Built-in Arduino Servo library  
**Connection Type:** PWM (Digital)

## Overview

The Grove Servo Motor is a standard 180° positional rotation servo. Can rotate from 0° to 180° with precise position control. Ideal for robotics, gates, steering mechanisms, and automated movement projects. Uses PWM signal for position control.

## Authoritative References

- [Grove Servo - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Servo/)
- [Arduino Servo Library](https://www.arduino.cc/reference/en/libraries/servo/)
- [Servo Motor Basics](https://www.arduino.cc/en/Reference/Servo)

## Hardware Setup

- **Connection Type:** PWM/Digital
- **Grove Port:** Any digital port (D3, D5, D6, D9, D10, D11 for PWM)
- **Rotation Range:** 0° - 180°
- **Operating Voltage:** 4.8V - 6V (powered from Grove shield)
- **Torque:** ~1.5 kg·cm at 4.8V
- **Speed:** 0.12 sec/60° at 4.8V
- **Connector:** 3-wire Grove cable (signal, VCC, GND)
- **Wiring:** Connect to Grove Base Shield digital port (PWM capable) using 3-pin Grove cable

![Grove Servo](https://files.seeedstudio.com/wiki/Grove-Servo/img/Grove—Servo_product_1.jpg)

**Important:** Servo requires more current than microcontroller pins can provide. Grove Base Shield powers servo from external supply or USB (usually sufficient for single servo).

## Software Prerequisites

### Built-in Library

The Servo library is included with Arduino IDE - no installation needed.

```cpp
#include <Servo.h>
```

## Example Code

```cpp
/*
  Purpose: Basic servo position control
  Notes:
    1. Connect to PWM-capable digital pin
    2. Servo rotates from 0° to 180°
    3. write() sets position in degrees
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Servo/
  Library: Built-in Arduino Servo
*/

#include <Servo.h>

Servo myservo;           // Create servo object
const int servoPin = 5;  // Connect to D5 (PWM)

void setup() {
  myservo.attach(servoPin);  // Attach servo to pin
  Serial.begin(9600);
  Serial.println("Servo initialized");
}

void loop() {
  // Move to 0 degrees
  myservo.write(0);
  Serial.println("Position: 0°");
  delay(1000);

  // Move to 90 degrees (center)
  myservo.write(90);
  Serial.println("Position: 90°");
  delay(1000);

  // Move to 180 degrees
  myservo.write(180);
  Serial.println("Position: 180°");
  delay(1000);
}
```

### Smooth Sweep Motion

```cpp
#include <Servo.h>

Servo myservo;
const int servoPin = 5;

void setup() {
  myservo.attach(servoPin);
}

void loop() {
  // Sweep from 0 to 180 degrees
  for (int pos = 0; pos <= 180; pos++) {
    myservo.write(pos);
    delay(15);  // Wait 15ms between steps
  }

  // Sweep back from 180 to 0 degrees
  for (int pos = 180; pos >= 0; pos--) {
    myservo.write(pos);
    delay(15);
  }
}
```

**Key Points:**

- `attach(pin)` - Initialize servo on specified pin
- `write(angle)` - Set position (0-180 degrees)
- `read()` - Get current position
- `detach()` - Disable servo (stops PWM signal)
- Most servos: 0° = fully counter-clockwise, 180° = fully clockwise
- Typical PWM: 1ms pulse = 0°, 2ms pulse = 180°

## Testing Procedure

1. Connect servo to digital port with PWM (D5 recommended)
2. Ensure Grove Base Shield has adequate power
3. Upload basic example
4. Open Serial Monitor (9600 baud)
5. **Expected behavior:**
   - Servo moves to 0° → waits 1 sec
   - Moves to 90° (center) → waits 1 sec
   - Moves to 180° → waits 1 sec
   - Repeats continuously
6. You should hear slight servo motor sound during movement

## Troubleshooting

| Problem                | Solution                                                     |
| ---------------------- | ------------------------------------------------------------ |
| Servo doesn't move     | Check power connection, verify PWM pin, check attach()       |
| Servo jitters/twitches | Insufficient power supply; use external 5V power             |
| Only moves partially   | Check angle range (0-180°), verify servo not damaged         |
| Hot servo motor        | Overloaded or stalled; reduce load, check mechanical binding |
| Position inaccurate    | Cheap servos have ±5° tolerance; use quality servo           |

## Technical Specifications

- **Type:** Standard analog servo
- **Rotation Range:** 180° (typical 0° - 180°)
- **Operating Voltage:** 4.8V - 6V
- **Stall Torque:** ~1.5 kg·cm at 4.8V, ~1.8 kg·cm at 6V
- **Operating Speed:** 0.12 sec/60° at 4.8V
- **Dead Band:** 5μs
- **Control Signal:** PWM (50Hz, 1-2ms pulse width)
- **Current Draw:** ~100mA idle, ~600mA stall
- **Gear Type:** Plastic gears
- **Weight:** ~9g

## Common Use Cases

### Sensor-Controlled Servo (Potentiometer)

```cpp
#include <Servo.h>

Servo myservo;
const int servoPin = 5;
const int potPin = A0;

void setup() {
  myservo.attach(servoPin);
  pinMode(potPin, INPUT);
}

void loop() {
  // Read potentiometer (0-16383 on Uno R4)
  int potValue = analogRead(potPin);

  // Map to servo angle (0-180)
  int angle = map(potValue, 0, 16383, 0, 180);

  myservo.write(angle);
  delay(15);
}
```

### Button-Controlled Positions

```cpp
#include <Servo.h>

Servo myservo;
const int servoPin = 5;
const int buttonPin = 2;
int currentPos = 0;  // 0 = closed, 1 = open

void setup() {
  myservo.attach(servoPin);
  pinMode(buttonPin, INPUT);
  myservo.write(0);  // Start closed
}

void loop() {
  int buttonState = digitalRead(buttonPin);

  if (buttonState == HIGH) {
    if (currentPos == 0) {
      // Open position
      myservo.write(90);
      currentPos = 1;
    } else {
      // Closed position
      myservo.write(0);
      currentPos = 0;
    }

    delay(500);  // Debounce
  }
}
```

### Distance-Triggered Gate (Ultrasonic + Servo)

```cpp
#include <Servo.h>
#include "Ultrasonic.h"

Servo gateServo;
const int servoPin = 5;
const int ultrasonicPin = 4;
Ultrasonic ultrasonic(ultrasonicPin);

const int openAngle = 90;   // Gate open
const int closeAngle = 0;   // Gate closed
const int triggerDistance = 20;  // cm

void setup() {
  gateServo.attach(servoPin);
  gateServo.write(closeAngle);  // Start closed
  Serial.begin(9600);
}

void loop() {
  long distance = ultrasonic.MeasureInCentimeters();

  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  if (distance < triggerDistance) {
    // Object detected - open gate
    gateServo.write(openAngle);
    Serial.println("Gate OPEN");
    delay(3000);  // Keep open 3 seconds
  } else {
    // No object - close gate
    gateServo.write(closeAngle);
    Serial.println("Gate CLOSED");
  }

  delay(100);
}
```

### Servo Sweep with Speed Control

```cpp
#include <Servo.h>

Servo myservo;
const int servoPin = 5;
int delayTime = 15;  // Adjust for speed (lower = faster)

void setup() {
  myservo.attach(servoPin);
  Serial.begin(9600);
}

void sweepSlow() {
  Serial.println("Slow sweep");
  for (int pos = 0; pos <= 180; pos++) {
    myservo.write(pos);
    delay(30);  // Slow
  }
  for (int pos = 180; pos >= 0; pos--) {
    myservo.write(pos);
    delay(30);
  }
}

void sweepFast() {
  Serial.println("Fast sweep");
  for (int pos = 0; pos <= 180; pos++) {
    myservo.write(pos);
    delay(5);  // Fast
  }
  for (int pos = 180; pos >= 0; pos--) {
    myservo.write(pos);
    delay(5);
  }
}

void loop() {
  sweepSlow();
  delay(1000);
  sweepFast();
  delay(1000);
}
```

### Precise Positioning with Feedback

```cpp
#include <Servo.h>

Servo myservo;
const int servoPin = 5;

void moveToPosition(int targetAngle, int stepDelay = 15) {
  int currentAngle = myservo.read();

  if (targetAngle > currentAngle) {
    // Move clockwise
    for (int pos = currentAngle; pos <= targetAngle; pos++) {
      myservo.write(pos);
      delay(stepDelay);
    }
  } else {
    // Move counter-clockwise
    for (int pos = currentAngle; pos >= targetAngle; pos--) {
      myservo.write(pos);
      delay(stepDelay);
    }
  }
}

void setup() {
  myservo.attach(servoPin);
  Serial.begin(9600);
}

void loop() {
  Serial.println("Moving to 45°");
  moveToPosition(45);
  delay(1000);

  Serial.println("Moving to 135°");
  moveToPosition(135);
  delay(1000);

  Serial.println("Moving to 90°");
  moveToPosition(90);
  delay(1000);
}
```

## Multiple Servos

Arduino can control multiple servos, but each uses one timer resource:

```cpp
#include <Servo.h>

Servo servo1;
Servo servo2;
Servo servo3;

void setup() {
  servo1.attach(5);
  servo2.attach(6);
  servo3.attach(9);
}

void loop() {
  // Move all servos simultaneously
  servo1.write(0);
  servo2.write(90);
  servo3.write(180);
  delay(1000);

  servo1.write(180);
  servo2.write(90);
  servo3.write(0);
  delay(1000);
}
```

**Limits:**

- Arduino Uno R4: Up to 12 servos on digital pins
- Each servo draws ~100-600mA; use external power for 3+ servos

## Power Considerations

**Important:** Servos can draw significant current:

- Idle: ~100mA
- Moving: ~200-400mA
- Stall: ~600mA

**Power Solutions:**

1. **Single servo:** USB power usually sufficient (500mA)
2. **Multiple servos:** Use external 5V power supply (2A+ recommended)
3. **High-torque loads:** Dedicated servo power supply

**External Power Setup:**

- Connect external 5V supply to Grove Base Shield power jack
- Ensure common ground between Arduino and power supply
- Use 2A+ supply for multiple servos

## Calibration

Some servos may not align perfectly at 90°:

```cpp
// Fine-tune center position
int centerOffset = 5;  // Adjust -10 to +10
myservo.write(90 + centerOffset);
```

## Continuous Rotation Servos

Note: Grove Servo is **positional** (180°), not continuous rotation. For continuous rotation:

- Look for "continuous rotation servo" or "360° servo"
- Use `write(90)` = stop, `write(0)` = full speed CCW, `write(180)` = full speed CW

## Integration Examples

See [integration recipes](../../integrations/) for projects combining servo with:

- Ultrasonic sensor (Challenge #5: Boom Gate)
- Button (mechanical control)
- Potentiometer (direct position control)
- Light sensor (auto-blinds)

## Additional Resources

- [Arduino Servo Library Reference](https://www.arduino.cc/reference/en/libraries/servo/)
- [Servo Motor Tutorial](https://www.arduino.cc/en/Tutorial/BuiltInExamples/Sweep)
- [How Servos Work](https://en.wikipedia.org/wiki/Servomotor)
- [Powering Servos Guide](https://learn.adafruit.com/adafruit-arduino-lesson-14-servo-motors)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Library:** Built-in Arduino Servo library
