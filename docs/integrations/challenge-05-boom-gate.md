# Challenge #5: Boom Gate That Opens as Car Approaches

**Classroom Challenge:** Automatic gate control with distance sensing  
**Difficulty:** Beginner-Intermediate  
**Concepts:** Distance measurement, servo control, conditional logic, state management

## Overview

Create an automatic boom gate that opens when a vehicle (or object) approaches within a certain distance, then closes after the object passes. This simulates real-world applications like parking garage gates, toll booths, and automated entry systems.

**Learning Outcomes:**

- Measure distance with ultrasonic sensor
- Control servo motor position
- Implement state machine logic
- Add delays for realistic timing
- Handle edge cases (object stops in range)

## Required Components

- [Ultrasonic Ranger](../sensors/ultrasonic-ranger/) – Quantity: 1
- [Servo Motor](../sensors/servo/) – Quantity: 1
- Arduino Uno R4 WiFi
- Grove Base Shield
- Grove cables (2x 4-pin)
- Optional: [Button](../sensors/button/) for manual control

## Wiring Diagram

**Connections:**

- Ultrasonic Ranger → Digital Port D5
- Servo Motor → Digital Port D6 (PWM-capable)

```
[Arduino Uno R4 WiFi]
       |
[Grove Base Shield]
       |
       +--- D5 -----> [Ultrasonic Ranger]
       |
       +--- D6 -----> [Servo Motor]
       |
       +--- D3 -----> [Button] (optional)
```

**Physical Setup:**

- Mount servo vertically to represent gate arm
- Position ultrasonic sensor to face approaching direction
- Gate arm should be horizontal when closed (90°), vertical when open (0°)

## Step-by-Step Build

### 1. Hardware Setup

1. Mount Grove Base Shield on Arduino Uno R4 WiFi
2. Connect Ultrasonic Ranger to digital port D5
3. Connect Servo Motor to digital port D6
4. (Optional) Connect Button to digital port D3
5. Connect Arduino to computer via USB-C cable

### 2. Library Installation

```bash
arduino-cli lib install "Grove - Ultrasonic Ranger"
arduino-cli lib install "Servo"
```

Or via Arduino IDE:

- Sketch → Include Library → Manage Libraries
- Search and install: "Seeed Ultrasonic Ranger" and "Servo"

### 3. Code Implementation

```cpp
/*
  Challenge #5: Boom Gate That Opens as Car Approaches

  Description: Automatic boom gate using ultrasonic distance sensor.
  Opens when object approaches within threshold distance, closes after delay.

  Hardware:
  - Ultrasonic Ranger on D5
  - Servo Motor on D6
  - (Optional) Button on D3 for manual open

  References:
  - Ultrasonic: https://wiki.seeedstudio.com/Grove-Ultrasonic_Ranger/
  - Servo: https://wiki.seeedstudio.com/Grove-Servo/
  - Library: https://github.com/Seeed-Studio/Seeed_Arduino_UltrasonicRanger
*/

#include "Ultrasonic.h"
#include <Servo.h>

// Pin definitions
const int ultrasonicPin = 5;
const int servoPin = 6;
const int buttonPin = 3;  // Optional manual control

// Sensor and actuator objects
Ultrasonic ultrasonic(ultrasonicPin);
Servo gateServo;

// Gate parameters
const int closedAngle = 90;    // Horizontal (gate closed)
const int openAngle = 0;       // Vertical (gate open)
const int triggerDistance = 50; // Open gate when object within 50cm
const int clearDistance = 60;   // Consider object passed when > 60cm away

// State management
bool gateOpen = false;
unsigned long gateOpenTime = 0;
const unsigned long autoCloseDelay = 3000;  // Close after 3 seconds

void setup() {
  Serial.begin(9600);
  gateServo.attach(servoPin);
  pinMode(buttonPin, INPUT);  // Optional

  // Initialize gate to closed position
  gateServo.write(closedAngle);
  Serial.println("Boom Gate System Initialized");
  Serial.println("Trigger Distance: " + String(triggerDistance) + " cm");
  Serial.println("---");
}

void loop() {
  // Measure distance
  long distance = ultrasonic.MeasureInCentimeters();

  // Optional: Manual open with button
  if (digitalRead(buttonPin) == HIGH) {
    openGate();
    gateOpenTime = millis();  // Reset timer
  }

  // State machine logic
  if (!gateOpen) {
    // Gate is closed - check if vehicle approaching
    if (distance > 0 && distance < triggerDistance) {
      Serial.println("Vehicle detected! Opening gate...");
      openGate();
      gateOpenTime = millis();
    }
  } else {
    // Gate is open
    if (distance > clearDistance || distance == 0) {
      // Vehicle has passed or out of range
      if (millis() - gateOpenTime > autoCloseDelay) {
        Serial.println("Closing gate...");
        closeGate();
      }
    } else {
      // Vehicle still in range - reset timer
      gateOpenTime = millis();
    }
  }

  // Debug output
  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.print(" cm | Gate: ");
  Serial.println(gateOpen ? "OPEN" : "CLOSED");

  delay(250);  // Check every 250ms
}

void openGate() {
  gateServo.write(openAngle);
  gateOpen = true;
}

void closeGate() {
  gateServo.write(closedAngle);
  gateOpen = false;
}
```

**Key Code Sections:**

**Distance Measurement:**

```cpp
long distance = ultrasonic.MeasureInCentimeters();
```

Returns distance in centimeters (0-400cm range).

**Servo Control:**

```cpp
gateServo.write(angle);  // 0° = open, 90° = closed
```

Position servo arm to represent gate state.

**State Machine:**
The code uses boolean `gateOpen` to track state and timer to auto-close.

### 4. Testing

1. Upload the code to your Arduino
2. Open Serial Monitor (9600 baud)
3. **Expected behavior:**
   - Gate starts in closed position (servo at 90°)
   - Move hand/object within 50cm of ultrasonic sensor
   - Gate opens (servo moves to 0°)
   - Remove object beyond 60cm
   - Gate closes automatically after 3 seconds
   - Serial Monitor shows distance and gate state

### 5. Calibration

Adjust these parameters for your setup:

```cpp
const int triggerDistance = 50;   // Adjust trigger distance
const int clearDistance = 60;     // Adjust clear distance
const unsigned long autoCloseDelay = 3000;  // Adjust close delay (ms)
const int closedAngle = 90;       // Adjust if gate arm isn't horizontal
const int openAngle = 0;          // Adjust if gate arm isn't vertical
```

## Common Issues

| Problem              | Cause                      | Solution                                       |
| -------------------- | -------------------------- | ---------------------------------------------- |
| Gate doesn't open    | Ultrasonic not detecting   | Check connections, verify distance < threshold |
| Servo jitters        | Power supply insufficient  | Use external 5V power for servo if needed      |
| Gate opens randomly  | False ultrasonic readings  | Increase triggerDistance or add averaging      |
| Gate doesn't close   | Object still in range      | Increase clearDistance value                   |
| Servo doesn't move   | Wrong pin or library issue | Verify servo library installed, check pin 6    |
| Gate closes too fast | autoCloseDelay too short   | Increase delay value (try 5000ms)              |

## Extensions & Modifications

### Beginner Extensions

1. **Add LED indicators:** Green when open, red when closed
2. **Buzzer warning:** Beep before closing
3. **Different speeds:** Slow servo movement for smooth motion

### Intermediate Extensions

1. **Two-way detection:** Sensors on both sides of gate
2. **Vehicle counter:** Count cars passing through
3. **LCD display:** Show vehicle count and gate status
4. **Safety sensor:** Prevent closing if object underneath

### Advanced Extensions

1. **Multiple gates:** Coordinate entry and exit gates
2. **RFID access control:** Open only for authorized vehicles
3. **Data logging:** Record usage patterns and times
4. **Web interface:** Remote monitoring and control via WiFi

## Example: With Buzzer Warning

```cpp
#include "Ultrasonic.h"
#include <Servo.h>

const int ultrasonicPin = 5;
const int servoPin = 6;
const int buzzerPin = 4;  // Add buzzer

Ultrasonic ultrasonic(ultrasonicPin);
Servo gateServo;

// ... (previous variables)

void setup() {
  Serial.begin(9600);
  gateServo.attach(servoPin);
  pinMode(buzzerPin, OUTPUT);
  gateServo.write(closedAngle);
}

void loop() {
  long distance = ultrasonic.MeasureInCentimeters();

  if (!gateOpen) {
    if (distance > 0 && distance < triggerDistance) {
      openGate();
      gateOpenTime = millis();
    }
  } else {
    if (distance > clearDistance || distance == 0) {
      if (millis() - gateOpenTime > autoCloseDelay - 1000) {
        // Warning beep 1 second before closing
        tone(buzzerPin, 1000, 200);  // 1kHz for 200ms
      }
      if (millis() - gateOpenTime > autoCloseDelay) {
        closeGate();
      }
    } else {
      gateOpenTime = millis();
    }
  }

  delay(250);
}

void openGate() {
  gateServo.write(openAngle);
  gateOpen = true;
  tone(buzzerPin, 2000, 100);  // Short beep when opening
}

void closeGate() {
  tone(buzzerPin, 1000, 100);  // Short beep when closing
  gateServo.write(closedAngle);
  gateOpen = false;
}
```

## Example: Smooth Servo Movement

```cpp
void smoothMove(int targetAngle) {
  int currentAngle = gateServo.read();
  int step = (targetAngle > currentAngle) ? 1 : -1;

  while (currentAngle != targetAngle) {
    currentAngle += step;
    gateServo.write(currentAngle);
    delay(15);  // 15ms per degree for smooth motion
  }
}

void openGate() {
  smoothMove(openAngle);
  gateOpen = true;
}

void closeGate() {
  smoothMove(closedAngle);
  gateOpen = false;
}
```

## Real-World Applications

- **Parking garages:** Automated entry/exit control
- **Toll booths:** Vehicle detection and gate control
- **Warehouse loading docks:** Automatic door opening
- **Security checkpoints:** Access control systems
- **Drive-through facilities:** Customer detection

## Safety Considerations

In real-world applications, boom gates include:

- Pressure sensors to detect objects underneath
- Emergency stop buttons
- Infrared safety beams
- Battery backup for power failures
- Manual override mechanisms

## References

- [Ultrasonic Ranger Guide](../sensors/ultrasonic-ranger/)
- [Servo Motor Guide](../sensors/servo/)
- [Arduino Servo Library](https://www.arduino.cc/reference/en/libraries/servo/)
- [Seeed Ultrasonic Library](https://github.com/Seeed-Studio/Seeed_Arduino_UltrasonicRanger)

---

**Last Updated:** 2025-11-17  
**Tested On:** Arduino Uno R4 WiFi  
**Estimated Time:** 30-45 minutes
