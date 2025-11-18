# Grove Thumb Joystick

**Last Verified:** 2025-11-18  
**Tutorial:** https://arduinogetstarted.com/tutorials/arduino-joystick  
**Connection Type:** Analog (2 channels) + Digital (button)

## Overview

The Grove Thumb Joystick provides bi-axial analog input with an integrated push button. X and Y axes output analog voltages (0-5V) based on joystick position. Center position returns mid-range values. Built-in momentary push button for selection/action input. Ideal for game controllers, robot control, menu navigation, and interactive interfaces.

## Authoritative References

- [Arduino Joystick Tutorial - ArduinoGetStarted](https://arduinogetstarted.com/tutorials/arduino-joystick)
- [Grove Joystick Module](https://wiki.seeedstudio.com/Grove-Thumb_Joystick/)

## Hardware Setup

- **Connection Type:** Analog (X, Y axes) + Digital (button)
- **Grove Port:** Requires 2 analog pins + 1 digital pin (e.g., A0, A1, D2)
- **Axes:** 2-axis (X and Y)
- **X-Axis Range:** 0-5V (analog output)
- **Y-Axis Range:** 0-5V (analog output)
- **Button:** Momentary push switch (active LOW)
- **Center Position:** ~2.5V on both axes
- **Operating Voltage:** 3.3V - 5V
- **Current Draw:** ~10mA
- **Mechanical Travel:** ±25° typical
- **Resolution:** 14-bit on Uno R4 (0-16383)
- **Wiring:**
  - X-axis → A0
  - Y-axis → A1
  - Button → D2
  - VCC/GND via Grove cable

![Grove Joystick](https://files.seeedstudio.com/wiki/Grove-Thumb_Joystick/img/Thumb_Joystick.jpg)

## Software Prerequisites

No special library required - uses standard Arduino `analogRead()` and `digitalRead()`.

```cpp
// Basic usage
int xValue = analogRead(A0);  // X-axis position
int yValue = analogRead(A1);  // Y-axis position
bool buttonPressed = (digitalRead(2) == LOW);  // Button state
```

## Example Code

```cpp
/*
  Purpose: Read joystick position and button state
  Notes:
    1. X-axis on A0, Y-axis on A1, Button on D2
    2. Uno R4: analogRead() returns 0-16383 (14-bit ADC)
    3. Center position: ~8192 (mid-range)
    4. Button is active LOW (pressed = LOW)
    5. Joystick returns to center when released
  Author: Ben Jones 18/11/25
  Source: https://arduinogetstarted.com/tutorials/arduino-joystick
*/

const int xPin = A0;
const int yPin = A1;
const int buttonPin = 2;

void setup() {
  Serial.begin(9600);
  pinMode(xPin, INPUT);
  pinMode(yPin, INPUT);
  pinMode(buttonPin, INPUT_PULLUP);

  Serial.println("Grove Thumb Joystick");
  Serial.println("X\tY\tButton");
}

void loop() {
  // Read joystick position
  int xValue = analogRead(xPin);
  int yValue = analogRead(yPin);
  bool buttonPressed = (digitalRead(buttonPin) == LOW);

  Serial.print(xValue);
  Serial.print("\t");
  Serial.print(yValue);
  Serial.print("\t");
  Serial.println(buttonPressed ? "PRESSED" : "Released");

  delay(100);
}
```

### Direction Detection

```cpp
const int xPin = A0;
const int yPin = A1;
const int buttonPin = 2;

const int centerX = 8192;  // Calibrate for your joystick
const int centerY = 8192;
const int deadzone = 2000;  // Ignore small movements

void setup() {
  Serial.begin(9600);
  pinMode(xPin, INPUT);
  pinMode(yPin, INPUT);
  pinMode(buttonPin, INPUT_PULLUP);

  Serial.println("Joystick Direction Detection");
}

void loop() {
  int xValue = analogRead(xPin);
  int yValue = analogRead(yPin);
  bool buttonPressed = (digitalRead(buttonPin) == LOW);

  // Calculate offset from center
  int xOffset = xValue - centerX;
  int yOffset = yValue - centerY;

  // Determine direction
  String direction = "CENTER";

  if (abs(xOffset) > deadzone || abs(yOffset) > deadzone) {
    if (abs(xOffset) > abs(yOffset)) {
      // Horizontal movement dominates
      direction = (xOffset > 0) ? "RIGHT" : "LEFT";
    } else {
      // Vertical movement dominates
      direction = (yOffset > 0) ? "UP" : "DOWN";
    }
  }

  Serial.print("Direction: ");
  Serial.print(direction);

  if (buttonPressed) {
    Serial.print(" + BUTTON");
  }

  Serial.println();
  delay(200);
}
```

### Game Controller

```cpp
const int xPin = A0;
const int yPin = A1;
const int buttonPin = 2;

const int centerX = 8192;
const int centerY = 8192;
const int deadzone = 1500;

void setup() {
  Serial.begin(9600);
  pinMode(xPin, INPUT);
  pinMode(yPin, INPUT);
  pinMode(buttonPin, INPUT_PULLUP);

  Serial.println("Game Controller");
  Serial.println("Use joystick to move, button to shoot");
}

void loop() {
  int xValue = analogRead(xPin);
  int yValue = analogRead(yPin);
  bool buttonPressed = (digitalRead(buttonPin) == LOW);

  // Map to game coordinates (-100 to +100)
  int xPos = map(xValue, 0, 16383, -100, 100);
  int yPos = map(yValue, 0, 16383, -100, 100);

  // Apply deadzone
  if (abs(xPos) < 10) xPos = 0;
  if (abs(yPos) < 10) yPos = 0;

  Serial.print("Position: (");
  Serial.print(xPos);
  Serial.print(", ");
  Serial.print(yPos);
  Serial.print(")");

  if (buttonPressed) {
    Serial.print(" - FIRE!");
  }

  Serial.println();
  delay(50);
}
```

### Servo Control with Joystick

```cpp
#include <Servo.h>

const int xPin = A0;
const int yPin = A1;
const int buttonPin = 2;

Servo servoX;
Servo servoY;

const int servoXPin = 3;
const int servoYPin = 5;

int currentXAngle = 90;
int currentYAngle = 90;

void setup() {
  Serial.begin(9600);
  pinMode(xPin, INPUT);
  pinMode(yPin, INPUT);
  pinMode(buttonPin, INPUT_PULLUP);

  servoX.attach(servoXPin);
  servoY.attach(servoYPin);

  servoX.write(currentXAngle);
  servoY.write(currentYAngle);

  Serial.println("Joystick Servo Control");
}

void loop() {
  int xValue = analogRead(xPin);
  int yValue = analogRead(yPin);
  bool buttonPressed = (digitalRead(buttonPin) == LOW);

  // Map joystick to servo angle (0-180)
  int targetXAngle = map(xValue, 0, 16383, 0, 180);
  int targetYAngle = map(yValue, 0, 16383, 0, 180);

  // Smooth movement
  if (currentXAngle < targetXAngle) currentXAngle++;
  if (currentXAngle > targetXAngle) currentXAngle--;
  if (currentYAngle < targetYAngle) currentYAngle++;
  if (currentYAngle > targetYAngle) currentYAngle--;

  servoX.write(currentXAngle);
  servoY.write(currentYAngle);

  Serial.print("Servo X: ");
  Serial.print(currentXAngle);
  Serial.print("° Servo Y: ");
  Serial.print(currentYAngle);
  Serial.print("°");

  if (buttonPressed) {
    // Reset to center
    currentXAngle = 90;
    currentYAngle = 90;
    servoX.write(90);
    servoY.write(90);
    Serial.print(" - RESET");
  }

  Serial.println();
  delay(20);
}
```

### Menu Navigation

```cpp
const int xPin = A0;
const int yPin = A1;
const int buttonPin = 2;

String menuItems[] = {"Option 1", "Option 2", "Option 3", "Option 4", "Option 5"};
int menuIndex = 0;
int numItems = 5;

unsigned long lastMove = 0;
int moveDelay = 300;  // ms between menu moves

void setup() {
  Serial.begin(9600);
  pinMode(xPin, INPUT);
  pinMode(yPin, INPUT);
  pinMode(buttonPin, INPUT_PULLUP);

  Serial.println("Menu Navigation");
  displayMenu();
}

void loop() {
  int yValue = analogRead(yPin);
  bool buttonPressed = (digitalRead(buttonPin) == LOW);

  unsigned long currentTime = millis();

  // Navigate menu with Y-axis
  if (currentTime - lastMove > moveDelay) {
    if (yValue < 5000) {
      // Up
      menuIndex--;
      if (menuIndex < 0) menuIndex = numItems - 1;
      displayMenu();
      lastMove = currentTime;
    } else if (yValue > 11000) {
      // Down
      menuIndex++;
      if (menuIndex >= numItems) menuIndex = 0;
      displayMenu();
      lastMove = currentTime;
    }
  }

  // Select with button
  if (buttonPressed) {
    Serial.print("✓ SELECTED: ");
    Serial.println(menuItems[menuIndex]);
    delay(500);
    while (digitalRead(buttonPin) == LOW);  // Wait for release
  }
}

void displayMenu() {
  Serial.println("\n===== MENU =====");
  for (int i = 0; i < numItems; i++) {
    if (i == menuIndex) {
      Serial.print("> ");
    } else {
      Serial.print("  ");
    }
    Serial.println(menuItems[i]);
  }
  Serial.println("================\n");
}
```

### Robot Control

```cpp
const int xPin = A0;
const int yPin = A1;
const int buttonPin = 2;

const int motorLeftFwd = 3;
const int motorLeftBack = 5;
const int motorRightFwd = 6;
const int motorRightBack = 9;

void setup() {
  Serial.begin(9600);
  pinMode(xPin, INPUT);
  pinMode(yPin, INPUT);
  pinMode(buttonPin, INPUT_PULLUP);

  pinMode(motorLeftFwd, OUTPUT);
  pinMode(motorLeftBack, OUTPUT);
  pinMode(motorRightFwd, OUTPUT);
  pinMode(motorRightBack, OUTPUT);

  Serial.println("Robot Control");
  Serial.println("Y: Forward/Backward, X: Left/Right");
}

void loop() {
  int xValue = analogRead(xPin);
  int yValue = analogRead(yPin);
  bool buttonPressed = (digitalRead(buttonPin) == LOW);

  // Map to motor speed (-255 to +255)
  int forward = map(yValue, 0, 16383, -255, 255);
  int turn = map(xValue, 0, 16383, -255, 255);

  // Apply deadzone
  if (abs(forward) < 30) forward = 0;
  if (abs(turn) < 30) turn = 0;

  // Calculate left and right motor speeds
  int leftSpeed = forward + turn;
  int rightSpeed = forward - turn;

  // Constrain to valid range
  leftSpeed = constrain(leftSpeed, -255, 255);
  rightSpeed = constrain(rightSpeed, -255, 255);

  // Set motor directions and speeds
  setMotor(motorLeftFwd, motorLeftBack, leftSpeed);
  setMotor(motorRightFwd, motorRightBack, rightSpeed);

  Serial.print("Left: ");
  Serial.print(leftSpeed);
  Serial.print(" Right: ");
  Serial.print(rightSpeed);

  if (buttonPressed) {
    Serial.print(" - EMERGENCY STOP");
    stopAllMotors();
  }

  Serial.println();
  delay(50);
}

void setMotor(int fwdPin, int backPin, int speed) {
  if (speed > 0) {
    // Forward
    analogWrite(fwdPin, speed);
    analogWrite(backPin, 0);
  } else if (speed < 0) {
    // Backward
    analogWrite(fwdPin, 0);
    analogWrite(backPin, -speed);
  } else {
    // Stop
    analogWrite(fwdPin, 0);
    analogWrite(backPin, 0);
  }
}

void stopAllMotors() {
  analogWrite(motorLeftFwd, 0);
  analogWrite(motorLeftBack, 0);
  analogWrite(motorRightFwd, 0);
  analogWrite(motorRightBack, 0);
}
```

### Joystick Calibration

```cpp
const int xPin = A0;
const int yPin = A1;
const int buttonPin = 2;

int xMin = 16383, xMax = 0, xCenter = 8192;
int yMin = 16383, yMax = 0, yCenter = 8192;

void setup() {
  Serial.begin(9600);
  pinMode(xPin, INPUT);
  pinMode(yPin, INPUT);
  pinMode(buttonPin, INPUT_PULLUP);

  Serial.println("Joystick Calibration");
  Serial.println("1. Leave joystick centered, press button");

  while (digitalRead(buttonPin) == HIGH);  // Wait for button
  delay(200);

  xCenter = analogRead(xPin);
  yCenter = analogRead(yPin);

  Serial.print("Center: X=");
  Serial.print(xCenter);
  Serial.print(" Y=");
  Serial.println(yCenter);

  Serial.println("2. Move joystick in full circle, then press button");

  while (digitalRead(buttonPin) == HIGH) {
    int x = analogRead(xPin);
    int y = analogRead(yPin);

    if (x < xMin) xMin = x;
    if (x > xMax) xMax = x;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;

    delay(10);
  }

  Serial.println("\nCalibration Complete:");
  Serial.print("X: Min=");
  Serial.print(xMin);
  Serial.print(" Center=");
  Serial.print(xCenter);
  Serial.print(" Max=");
  Serial.println(xMax);

  Serial.print("Y: Min=");
  Serial.print(yMin);
  Serial.print(" Center=");
  Serial.print(yCenter);
  Serial.print(" Max=");
  Serial.println(yMax);
}

void loop() {
  // Use calibrated values in your application
}
```

**Key Points:**

- Bi-axial analog input (X and Y axes)
- Integrated push button (active LOW)
- Center position: ~8192 (mid-range on Uno R4 14-bit ADC)
- Returns to center when released (spring-loaded)
- Apply deadzone to ignore small movements
- Calibrate center position for best results

## Testing Procedure

1. Connect joystick:
   - X-axis → A0
   - Y-axis → A1
   - Button → D2
2. Upload basic position reading example
3. **Test center position:**
   - Leave joystick centered
   - X and Y should read ~8192 (mid-range)
4. **Test X-axis:**
   - Move fully left: X → 0
   - Move fully right: X → 16383
5. **Test Y-axis:**
   - Move fully down: Y → 0
   - Move fully up: Y → 16383
6. **Test button:**
   - Press button: reads LOW
   - Release button: reads HIGH
7. **Test return-to-center:**
   - Move joystick, then release
   - Should return to ~8192 on both axes

## Troubleshooting

| Problem                  | Solution                                        |
| ------------------------ | ----------------------------------------------- |
| No readings              | Check wiring, verify pin assignments in code    |
| Off-center when released | Normal variation - use calibration routine      |
| Jittery readings         | Add deadzone in code, average multiple samples  |
| Button not working       | Check pull-up resistor, verify active LOW logic |
| One axis reversed        | Invert in code: `value = 16383 - value`         |
| Limited range            | Check 5V power supply, test with calibration    |

## Technical Specifications

**Joystick:**

- **Type:** Analog thumb joystick (spring-return to center)
- **Axes:** 2 (X and Y)
- **Travel:** ±25° typical
- **Force:** ~200g activation force
- **Life:** >1 million cycles

**Electrical:**

- **Operating Voltage:** 3.3V - 5V
- **Current Draw:** ~10mA
- **Output Type:** Analog voltage (0-5V per axis)
- **Button Type:** Momentary switch (SPST)
- **Button Logic:** Active LOW
- **ADC Resolution:** 14-bit on Uno R4 (0-16383)

**Outputs:**

- **X-Axis:** A0 (analog)
- **Y-Axis:** A1 (analog)
- **Button:** D2 (digital)
- **Center Position:** ~2.5V (~8192 on 14-bit ADC)

**Mechanical:**

- **Module Size:** 40mm × 40mm
- **Joystick Height:** ~25mm
- **Cap Diameter:** ~18mm
- **Weight:** ~15g
- **Mounting:** 4× M3 mounting holes

**Environmental:**

- **Operating Temperature:** -10°C to 60°C
- **Storage Temperature:** -20°C to 70°C

## Common Use Cases

### Cursor Control

```cpp
const int xPin = A0;
const int yPin = A1;

int cursorX = 50;
int cursorY = 50;

void setup() {
  Serial.begin(9600);
  Serial.println("Cursor Control (0-100, 0-100)");
}

void loop() {
  int xValue = analogRead(xPin);
  int yValue = analogRead(yPin);

  // Map to cursor movement (-5 to +5)
  int xMove = map(xValue, 0, 16383, -5, 5);
  int yMove = map(yValue, 0, 16383, -5, 5);

  // Apply deadzone
  if (abs(xMove) < 1) xMove = 0;
  if (abs(yMove) < 1) yMove = 0;

  // Update cursor position
  cursorX += xMove;
  cursorY += yMove;

  // Constrain to screen bounds
  cursorX = constrain(cursorX, 0, 100);
  cursorY = constrain(cursorY, 0, 100);

  Serial.print("Cursor: (");
  Serial.print(cursorX);
  Serial.print(", ");
  Serial.print(cursorY);
  Serial.println(")");

  delay(50);
}
```

### Camera Pan/Tilt

```cpp
#include <Servo.h>

const int xPin = A0;
const int yPin = A1;

Servo panServo;
Servo tiltServo;

void setup() {
  panServo.attach(3);
  tiltServo.attach(5);

  panServo.write(90);
  tiltServo.write(90);
}

void loop() {
  int xValue = analogRead(xPin);
  int yValue = analogRead(yPin);

  // Map directly to servo angles
  int panAngle = map(xValue, 0, 16383, 0, 180);
  int tiltAngle = map(yValue, 0, 16383, 0, 180);

  panServo.write(panAngle);
  tiltServo.write(tiltAngle);

  delay(15);
}
```

### Speed Control with Direction

```cpp
const int xPin = A0;
const int yPin = A1;
const int motorPin = 3;

void setup() {
  Serial.begin(9600);
  pinMode(motorPin, OUTPUT);
}

void loop() {
  int yValue = analogRead(yPin);

  // Map Y-axis to motor speed and direction
  int motorSpeed = map(yValue, 0, 16383, -255, 255);

  if (abs(motorSpeed) < 30) {
    // Deadzone - stop
    analogWrite(motorPin, 0);
    Serial.println("STOP");
  } else if (motorSpeed > 0) {
    // Forward
    analogWrite(motorPin, motorSpeed);
    Serial.print("FORWARD: ");
    Serial.println(motorSpeed);
  } else {
    // Reverse (implement with H-bridge)
    analogWrite(motorPin, -motorSpeed);
    Serial.print("REVERSE: ");
    Serial.println(-motorSpeed);
  }

  delay(50);
}
```

## Joystick Coordinate Systems

**Cartesian (X, Y):**

- Standard coordinate system
- X: left/right, Y: up/down
- Center: (0, 0) after mapping

**Polar (r, θ):**

```cpp
void cartesianToPolar(int x, int y, float &r, float &theta) {
  // Convert to centered coordinates
  float xf = x - 8192;
  float yf = y - 8192;

  // Calculate magnitude (distance from center)
  r = sqrt(xf * xf + yf * yf);

  // Calculate angle in radians
  theta = atan2(yf, xf);

  // Convert to degrees if needed
  // theta = theta * 180.0 / PI;
}
```

## Deadzone Implementation

**Circular Deadzone:**

```cpp
bool inDeadzone(int x, int y, int centerX, int centerY, int radius) {
  int dx = x - centerX;
  int dy = y - centerY;
  int distance = sqrt(dx * dx + dy * dy);
  return (distance < radius);
}
```

**Square Deadzone:**

```cpp
bool inDeadzone(int x, int y, int centerX, int centerY, int size) {
  return (abs(x - centerX) < size && abs(y - centerY) < size);
}
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining joystick with:

- Servo motors (pan/tilt camera control)
- DC motors (robot/vehicle control)
- LED strip (joystick-controlled animations)
- OLED display (menu navigation, games)

## Additional Resources

- [Joystick Basics - SparkFun](https://learn.sparkfun.com/tutorials/thumb-joystick-hookup-guide)
- [Arduino Joystick Tutorial](https://arduinogetstarted.com/tutorials/arduino-joystick)
- [Game Controller Design](https://www.gamedeveloper.com/design/game-controller-design-lessons-from-the-past)

---

**Source Verification Date:** 2025-11-18  
**Tutorial Last Checked:** 2025-11-18  
**Tip:** Calibrate center position and apply deadzone for smooth, responsive control!
