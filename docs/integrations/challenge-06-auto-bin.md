# Challenge #6: Automatic Trash Can with Gesture Control

**Classroom Challenge:** Touchless automation with gesture detection  
**Difficulty:** Intermediate  
**Concepts:** I2C communication, gesture recognition, servo control, state machines

## Overview

Create a touchless automatic trash can that opens when you wave your hand above it, then closes after a delay. The system uses a gesture sensor to detect hand movements and a servo motor to lift the lid. This simulates real-world touchless interfaces like automatic doors, hands-free dispensers, and contactless controls.

**Learning Outcomes:**

- Recognize gestures using PAJ7620 sensor
- Control servo position for mechanical actuation
- Implement timed automatic closing
- Create responsive user interfaces
- Understand proximity vs gesture detection

## Required Components

- [Gesture Sensor (PAJ7620)](../sensors/gesture/) – Quantity: 1
- [Servo Motor](../sensors/servo/) – Quantity: 1
- Arduino Uno R4 WiFi
- Grove Base Shield
- Grove cables (1x I2C, 1x Digital PWM)
- Optional: [LED](../sensors/led/) for status indication

## Wiring Diagram

**Connections:**

- Gesture Sensor → I2C Port
- Servo Motor → Digital Port D6 (PWM-capable)
- Optional: LED → Digital Port D5 (status indicator)

```
[Arduino Uno R4 WiFi]
       |
[Grove Base Shield]
       |
       +--- I2C -----> [Gesture Sensor PAJ7620]
       |
       +--- D6 -----> [Servo Motor]
       |
       +--- D5 -----> [LED] (optional)
```

**Physical Setup:**

- Mount gesture sensor on top of trash can (facing up)
- Position servo to lift lid when rotated
- Lid should be closed at servo angle ~0°, open at ~90°

## Step-by-Step Build

### 1. Hardware Setup

1. Mount Grove Base Shield on Arduino Uno R4 WiFi
2. Connect Gesture Sensor to I2C port
3. Connect Servo Motor to digital port D6 (PWM pin)
4. (Optional) Connect LED to digital port D5
5. Connect Arduino to computer via USB-C cable

### 2. Library Installation

```bash
arduino-cli lib install "Seeed Grove Gesture PAJ7620"
arduino-cli lib install "Servo"
```

Or via Arduino IDE:

- Sketch → Include Library → Manage Libraries
- Search and install: "Seeed Grove Gesture PAJ7620" or "RevEng_PAJ7620" and "Servo"

### 3. Code Implementation

```cpp
/*
  Challenge #6: Automatic Trash Can with Gesture Control

  Description: Touchless trash can that opens when hand waved above it.
  Uses gesture sensor to detect hand presence and servo to open lid.

  Hardware:
  - PAJ7620 Gesture Sensor on I2C (0x73)
  - Servo Motor on D6
  - (Optional) LED on D5 for status

  References:
  - Gesture Sensor: https://wiki.seeedstudio.com/Grove-Gesture_v1.0/
  - Servo: https://wiki.seeedstudio.com/Grove-Servo/
  - Library: https://github.com/Seeed-Studio/Seeed_Arduino_Gesture
*/

#include <Wire.h>
#include "paj7620.h"
#include <Servo.h>

// Pin definitions
const int servoPin = 6;
const int ledPin = 5;  // Optional status LED

// Servo object
Servo lidServo;

// Lid positions
const int closedAngle = 0;    // Lid closed
const int openAngle = 90;     // Lid open
const int partialAngle = 45;  // Partially open (energy saving)

// State management
enum LidState {
  CLOSED,
  OPENING,
  OPEN,
  CLOSING
};
LidState currentState = CLOSED;

// Timing
unsigned long lidOpenTime = 0;
const unsigned long openDuration = 5000;  // Keep open for 5 seconds
const unsigned long warningTime = 1000;   // Warning 1 second before closing

void setup() {
  Serial.begin(9600);
  Wire.begin();

  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);

  // Initialize gesture sensor
  uint8_t error = paj7620Init();
  if (error) {
    Serial.print("ERROR: Gesture sensor initialization failed, code: ");
    Serial.println(error);
    while (1);
  }

  // Configure gesture detection
  // Enable forward, backward, clockwise, counterclockwise, wave
  paj7620SelectBank(BANK0);
  paj7620WriteReg(0x43, 0x0F);  // Enable multiple gestures

  // Initialize servo
  lidServo.attach(servoPin);
  lidServo.write(closedAngle);

  Serial.println("Automatic Trash Can System");
  Serial.println("Wave hand to open lid");
  Serial.println("---");

  // Startup indication
  blinkLED(3);
}

void loop() {
  uint8_t data = 0;
  uint8_t error = paj7620ReadReg(0x43, 1, &data);

  if (!error) {
    handleGesture(data);
  }

  handleLidState();

  delay(100);
}

void handleGesture(uint8_t gesture) {
  if (gesture == 0) return;  // No gesture detected

  // Detect wave, forward, or backward gesture as "open" trigger
  if (gesture & GES_FORWARD_FLAG ||
      gesture & GES_BACKWARD_FLAG ||
      gesture & GES_WAVE_FLAG) {

    Serial.print("Gesture detected: ");
    if (gesture & GES_FORWARD_FLAG) Serial.println("Forward");
    else if (gesture & GES_BACKWARD_FLAG) Serial.println("Backward");
    else if (gesture & GES_WAVE_FLAG) Serial.println("Wave");

    if (currentState == CLOSED || currentState == CLOSING) {
      openLid();
    } else if (currentState == OPEN) {
      // Reset timer to keep lid open longer
      lidOpenTime = millis();
      Serial.println("Timer reset - keeping lid open");
    }
  }

  // Optional: Close immediately with specific gesture
  if (gesture & GES_CLOCKWISE_FLAG) {
    Serial.println("Gesture: Clockwise - closing lid");
    closeLid();
  }
}

void handleLidState() {
  switch (currentState) {
    case CLOSED:
      // Waiting for gesture
      digitalWrite(ledPin, LOW);
      break;

    case OPENING:
      // Moving to open position
      digitalWrite(ledPin, HIGH);
      if (lidServo.read() >= openAngle - 5) {
        currentState = OPEN;
        lidOpenTime = millis();
        Serial.println("Lid fully open");
      }
      break;

    case OPEN:
      // Keep open, check for timeout
      digitalWrite(ledPin, HIGH);

      unsigned long timeOpen = millis() - lidOpenTime;

      if (timeOpen >= openDuration - warningTime && timeOpen < openDuration) {
        // Warning blink before closing
        static unsigned long lastBlink = 0;
        if (millis() - lastBlink > 200) {
          lastBlink = millis();
          digitalWrite(ledPin, !digitalRead(ledPin));
        }
      }

      if (timeOpen >= openDuration) {
        closeLid();
      }
      break;

    case CLOSING:
      // Moving to closed position
      if (lidServo.read() <= closedAngle + 5) {
        currentState = CLOSED;
        Serial.println("Lid closed");
      }
      break;
  }
}

void openLid() {
  if (currentState == OPEN) return;  // Already open

  Serial.println("Opening lid...");
  currentState = OPENING;

  // Smooth opening motion
  int currentAngle = lidServo.read();
  for (int angle = currentAngle; angle <= openAngle; angle += 2) {
    lidServo.write(angle);
    delay(15);  // Smooth motion
  }

  currentState = OPEN;
  lidOpenTime = millis();
}

void closeLid() {
  if (currentState == CLOSED) return;  // Already closed

  Serial.println("Closing lid...");
  currentState = CLOSING;

  // Smooth closing motion
  int currentAngle = lidServo.read();
  for (int angle = currentAngle; angle >= closedAngle; angle -= 2) {
    lidServo.write(angle);
    delay(15);  // Smooth motion
  }

  currentState = CLOSED;
}

void blinkLED(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(ledPin, HIGH);
    delay(200);
    digitalWrite(ledPin, LOW);
    delay(200);
  }
}
```

**Key Code Sections:**

**Gesture Detection:**

```cpp
paj7620ReadReg(0x43, 1, &data);
if (data & GES_FORWARD_FLAG || data & GES_WAVE_FLAG) {
    // Trigger action
}
```

PAJ7620 recognizes 9 different gestures via I2C.

**Smooth Servo Movement:**

```cpp
for (int angle = currentAngle; angle <= openAngle; angle += 2) {
    lidServo.write(angle);
    delay(15);
}
```

Gradual movement prevents jerky motion and reduces stress on mechanism.

**State Machine:**

```cpp
enum LidState { CLOSED, OPENING, OPEN, CLOSING };
```

Clear state tracking prevents conflicting commands.

### 4. Testing

1. Upload the code to your Arduino
2. Open Serial Monitor (9600 baud)
3. **Expected behavior:**
   - LED blinks 3 times on startup (initialization complete)
   - Wave hand 5-15cm above gesture sensor
   - Servo smoothly rotates to open position
   - LED stays solid ON while open
   - LED blinks as warning before closing
   - Lid closes automatically after 5 seconds
   - Waving again while open resets timer
   - System shows gesture type in Serial Monitor

### 5. Calibration

**Adjust lid angles for your mechanism:**

```cpp
const int closedAngle = 0;   // Adjust if lid not fully closed
const int openAngle = 90;    // Adjust if lid not fully open
```

**Adjust timing:**

```cpp
const unsigned long openDuration = 5000;  // Keep open longer/shorter
const unsigned long warningTime = 1000;   // Earlier/later warning
```

**Adjust gesture sensitivity:**
The PAJ7620 has built-in sensitivity, but you can adjust detection distance by height:

- Optimal distance: 5-15cm above sensor
- Mount sensor flush with trash can top for best results

## Common Issues

| Problem                        | Cause                     | Solution                                        |
| ------------------------------ | ------------------------- | ----------------------------------------------- |
| Gesture not detected           | Sensor too far/close      | Position hand 5-15cm above sensor               |
| "Sensor initialization failed" | I2C connection issue      | Check I2C connections, verify address 0x73      |
| Servo jitters or doesn't move  | Power supply insufficient | Use external 5V power supply for servo          |
| Opens randomly                 | Nearby movement detected  | Mount sensor with clear upward view             |
| Lid doesn't close fully        | Wrong angle setting       | Adjust closedAngle value                        |
| Closes too quickly/slowly      | Wrong timing              | Adjust openDuration value                       |
| Can't re-open while closing    | State machine issue       | Code already handles this - check gesture range |

## Extensions & Modifications

### Beginner Extensions

1. **Manual button override:** Add button to open without gesture
2. **Multiple open durations:** Short vs long open based on gesture type
3. **Sound feedback:** Buzzer beeps when opening/closing
4. **Different LED patterns:** Color-coded status (RGB LED)

### Intermediate Extensions

1. **Proximity detection:** Use ultrasonic sensor to detect trash approach
2. **Occupancy detection:** Only enable when person nearby (PIR sensor)
3. **Lid angle adjustment:** Use potentiometer to set custom open angle
4. **Usage counter:** Track how many times opened (display on OLED)
5. **Full detection:** Ultrasonic inside measures trash level

### Advanced Extensions

1. **Dual servo system:** Separate lid hinge for smoother motion
2. **Smart scheduling:** Different behavior during different times
3. **WiFi notifications:** Alert when trash full or needs attention
4. **Voice commands:** Combine with voice recognition module
5. **Multi-zone detection:** Different responses to different gestures
6. **Solar power:** Battery + solar panel for cord-free operation

## Example: With Trash Level Detection

```cpp
#include "Ultrasonic.h"

const int ultrasonicPin = 5;
Ultrasonic ultrasonic(ultrasonicPin);

const int trashCanHeight = 40;  // cm, adjust to your bin
const int fullThreshold = 10;   // Alert when within 10cm of top

void loop() {
  // ... gesture detection ...

  // Check trash level periodically
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck > 5000) {
    lastCheck = millis();
    checkTrashLevel();
  }
}

void checkTrashLevel() {
  long distance = ultrasonic.MeasureInCentimeters();
  int trashLevel = trashCanHeight - distance;

  Serial.print("Trash level: ");
  Serial.print(trashLevel);
  Serial.print(" cm (");
  Serial.print(map(trashLevel, 0, trashCanHeight, 0, 100));
  Serial.println("%)");

  if (distance < fullThreshold) {
    Serial.println("*** TRASH CAN FULL ***");
    // Blink LED rapidly or sound buzzer
    for (int i = 0; i < 5; i++) {
      digitalWrite(ledPin, HIGH);
      delay(100);
      digitalWrite(ledPin, LOW);
      delay(100);
    }
  }
}
```

## Example: With Multiple Gestures for Different Functions

```cpp
void handleGesture(uint8_t gesture) {
  if (gesture == 0) return;

  if (gesture & GES_FORWARD_FLAG) {
    // Forward: Normal open
    Serial.println("Gesture: Forward - Normal open");
    openDuration = 5000;
    openLid();
  }
  else if (gesture & GES_BACKWARD_FLAG) {
    // Backward: Extended open (for large items)
    Serial.println("Gesture: Backward - Extended open");
    openDuration = 15000;  // 15 seconds
    openLid();
  }
  else if (gesture & GES_WAVE_FLAG) {
    // Wave: Quick open (2 seconds)
    Serial.println("Gesture: Wave - Quick open");
    openDuration = 2000;
    openLid();
  }
  else if (gesture & GES_CLOCKWISE_FLAG) {
    // Clockwise: Close immediately
    Serial.println("Gesture: Clockwise - Close now");
    closeLid();
  }
  else if (gesture & GES_COUNTERCLOCKWISE_FLAG) {
    // Counterclockwise: Cancel auto-close (stay open)
    Serial.println("Gesture: Counterclockwise - Lock open");
    openDuration = 0;  // Infinite open (must close manually)
  }
}
```

## Example: With OLED Status Display

```cpp
#include <U8g2lib.h>

U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

void setup() {
  // ... previous setup ...
  u8g2.begin();
  u8g2.enableUTF8Print();
}

void displayStatus() {
  u8g2.clearBuffer();

  u8g2.setFont(u8g2_font_ncenB08_tr);
  u8g2.drawStr(20, 10, "SMART BIN");
  u8g2.drawLine(0, 12, 128, 12);

  u8g2.setFont(u8g2_font_7x13_tr);
  u8g2.drawStr(5, 30, "Status:");

  switch(currentState) {
    case CLOSED:
      u8g2.drawStr(60, 30, "READY");
      break;
    case OPENING:
      u8g2.drawStr(60, 30, "OPENING");
      break;
    case OPEN:
      u8g2.drawStr(60, 30, "OPEN");
      char timeStr[10];
      sprintf(timeStr, "%ds", (openDuration - (millis() - lidOpenTime)) / 1000);
      u8g2.drawStr(5, 50, "Closing in:");
      u8g2.drawStr(90, 50, timeStr);
      break;
    case CLOSING:
      u8g2.drawStr(60, 30, "CLOSING");
      break;
  }

  u8g2.sendBuffer();
}
```

## Real-World Applications

- **Touchless trash cans:** Hygienic waste disposal
- **Automatic doors:** Hands-free entry systems
- **Dispensers:** Soap, sanitizer, paper towel dispensers
- **Smart recycling bins:** Different compartments for different gestures
- **Medical facilities:** Contamination-free waste disposal
- **Food service:** Hands-free operation in kitchens
- **Public restrooms:** Touchless hygiene systems

## Gesture Sensor Capabilities

The PAJ7620 can detect 9 gestures:

1. **Up** - Hand moves upward
2. **Down** - Hand moves downward
3. **Left** - Hand moves left
4. **Right** - Hand moves right
5. **Forward** - Hand moves toward sensor
6. **Backward** - Hand moves away from sensor
7. **Clockwise** - Circular motion clockwise
8. **Counterclockwise** - Circular motion counterclockwise
9. **Wave** - Hand waves side to side

**Detection Range:** 5-15cm optimal, up to 25cm maximum

## Educational Value

This project teaches:

- **Human-computer interaction:** Touchless interfaces
- **I2C communication:** Digital sensor protocols
- **State machines:** Managing complex sequential behavior
- **Timing logic:** Auto-close with warning periods
- **Mechanical integration:** Servo actuation of physical systems
- **User experience:** Creating responsive, intuitive controls

## References

- [Gesture Sensor Guide](../sensors/gesture/)
- [Servo Motor Guide](../sensors/servo/)
- [PAJ7620 Datasheet](https://datasheetspdf.com/pdf-file/1309990/PixArt/PAJ7620U2/1)
- [Seeed Grove Gesture Library](https://github.com/Seeed-Studio/Seeed_Arduino_Gesture)
- [Arduino Servo Library](https://www.arduino.cc/reference/en/libraries/servo/)

---

**Last Updated:** 2025-11-19  
**Tested On:** Arduino Uno R4 WiFi  
**Estimated Time:** 45-60 minutes
