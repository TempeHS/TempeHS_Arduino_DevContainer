# Grove Line Finder v1.1

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Line_Finder/  
**Connection Type:** Digital

## Overview

The Grove Line Finder v1.1 is an infrared (IR) reflectance sensor that detects the presence of dark lines (black tape) against light surfaces. Ideal for line-following robots and position detection. Outputs digital HIGH when white/light surface detected, LOW when black/dark detected.

## Authoritative References

- [Grove Line Finder - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Line_Finder/)
- [IR Reflectance Sensors Guide](https://www.arduino.cc/en/Tutorial/BuiltInExamples)

## Hardware Setup

- **Connection Type:** Digital
- **Grove Port:** Any digital port (D2-D7 recommended)
- **Power Requirements:** 3.3V or 5V
- **Detection Distance:** 1-3mm optimal
- **Output:** Digital (HIGH = white, LOW = black)
- **Wiring:** Connect to Grove Base Shield digital port using 4-pin Grove cable

![Grove Line Finder](https://files.seeedstudio.com/wiki/Grove-Line_Finder/img/line_finder_v1.1.jpg)

## Software Prerequisites

No library required - uses standard `digitalRead()`.

## Example Code

```cpp
/*
  Purpose: Basic example of line detection
  Notes:
    1. Connect to digital pin
    2. HIGH = white/light surface
    3. LOW = black/dark line
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Line_Finder/
*/

const int lineSensorPin = 2;  // Connect to D2

void setup() {
  Serial.begin(9600);
  pinMode(lineSensorPin, INPUT);
  Serial.println("Line Finder initialized");
}

void loop() {
  int sensorValue = digitalRead(lineSensorPin);

  if (sensorValue == LOW) {
    Serial.println("Black line detected!");
  } else {
    Serial.println("White surface");
  }

  delay(200);
}
```

### Line Following Robot (Basic Logic)

```cpp
const int lineSensorPin = 2;
const int leftMotorPin = 3;
const int rightMotorPin = 4;

void setup() {
  Serial.begin(9600);
  pinMode(lineSensorPin, INPUT);
  pinMode(leftMotorPin, OUTPUT);
  pinMode(rightMotorPin, OUTPUT);
}

void loop() {
  int lineDetected = digitalRead(lineSensorPin);

  if (lineDetected == LOW) {
    // On black line - go straight
    digitalWrite(leftMotorPin, HIGH);
    digitalWrite(rightMotorPin, HIGH);
    Serial.println("Going straight");
  } else {
    // Off line - stop/turn
    digitalWrite(leftMotorPin, LOW);
    digitalWrite(rightMotorPin, LOW);
    Serial.println("Line lost - stopping");
  }

  delay(50);
}
```

**Key Points:**

- LOW (0) = Black/dark line detected
- HIGH (1) = White/light surface detected
- Optimal distance: 1-3mm from surface
- Adjust potentiometer on sensor for sensitivity
- Works best with high contrast (black tape on white surface)

## Testing Procedure

1. Connect line finder to digital port (e.g., D2)
2. Upload basic example
3. Open Serial Monitor (9600 baud)
4. **Test with black electrical tape on white paper:**
   - Hold sensor ~2mm above white paper → "White surface"
   - Move over black tape → "Black line detected!"
5. Adjust sensitivity potentiometer if needed (small screw on sensor)

## Troubleshooting

| Problem                 | Solution                                                       |
| ----------------------- | -------------------------------------------------------------- |
| Always reads HIGH       | Too far from surface; lower sensor to 1-3mm                    |
| Always reads LOW        | Too close or sensitivity too high; raise sensor slightly       |
| Inconsistent readings   | Adjust potentiometer for better contrast detection             |
| No response             | Check digital pin connection and wiring                        |
| Works on one color only | Adjust sensitivity potentiometer (clockwise/counter-clockwise) |

## Technical Specifications

- **Sensor Type:** ITR20001/T IR reflective sensor
- **Operating Voltage:** 3.3V - 5V
- **Output Type:** Digital (TTL)
- **Detection Distance:** 1-3mm optimal
- **Response Time:** < 10μs
- **Detection Width:** ~10mm
- **Adjustable Sensitivity:** Yes (onboard potentiometer)
- **Indicator LED:** Shows detection status

## Common Use Cases

### Line Position Indicator with LED

```cpp
const int lineSensorPin = 2;
const int ledPin = 13;  // Built-in LED

void setup() {
  pinMode(lineSensorPin, INPUT);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int lineDetected = digitalRead(lineSensorPin);

  if (lineDetected == LOW) {
    digitalWrite(ledPin, HIGH);  // LED on when over black line
  } else {
    digitalWrite(ledPin, LOW);   // LED off when over white
  }

  delay(50);
}
```

### Counter (Counting Crossings)

```cpp
const int lineSensorPin = 2;
int lineCount = 0;
int lastState = HIGH;

void setup() {
  Serial.begin(9600);
  pinMode(lineSensorPin, INPUT);
  Serial.println("Line counter ready");
}

void loop() {
  int currentState = digitalRead(lineSensorPin);

  // Detect transition from white to black (crossing line)
  if (lastState == HIGH && currentState == LOW) {
    lineCount++;
    Serial.print("Lines crossed: ");
    Serial.println(lineCount);
    delay(200);  // Debounce
  }

  lastState = currentState;
  delay(50);
}
```

### Position Sensor (Track Detection)

```cpp
const int lineSensorPin = 2;
const int buzzerPin = 3;

void setup() {
  Serial.begin(9600);
  pinMode(lineSensorPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
  Serial.println("Position sensor active");
}

void loop() {
  int lineDetected = digitalRead(lineSensorPin);

  if (lineDetected == LOW) {
    // Robot reached marked position
    Serial.println("Position marker detected!");

    // Sound buzzer
    digitalWrite(buzzerPin, HIGH);
    delay(100);
    digitalWrite(buzzerPin, LOW);

    delay(1000);  // Wait before next detection
  }

  delay(50);
}
```

### Dual Sensor Line Following

For more accurate line following, use 2 sensors:

```cpp
const int leftSensorPin = 2;
const int rightSensorPin = 3;
const int leftMotorPin = 5;
const int rightMotorPin = 6;

void setup() {
  Serial.begin(9600);
  pinMode(leftSensorPin, INPUT);
  pinMode(rightSensorPin, INPUT);
  pinMode(leftMotorPin, OUTPUT);
  pinMode(rightMotorPin, OUTPUT);
}

void loop() {
  int leftSensor = digitalRead(leftSensorPin);
  int rightSensor = digitalRead(rightSensorPin);

  if (leftSensor == LOW && rightSensor == LOW) {
    // Both on line - go straight
    digitalWrite(leftMotorPin, HIGH);
    digitalWrite(rightMotorPin, HIGH);
    Serial.println("Straight");

  } else if (leftSensor == HIGH && rightSensor == LOW) {
    // Right on line, left off - turn left
    digitalWrite(leftMotorPin, LOW);
    digitalWrite(rightMotorPin, HIGH);
    Serial.println("Turn left");

  } else if (leftSensor == LOW && rightSensor == HIGH) {
    // Left on line, right off - turn right
    digitalWrite(leftMotorPin, HIGH);
    digitalWrite(rightMotorPin, LOW);
    Serial.println("Turn right");

  } else {
    // Both off line - stop
    digitalWrite(leftMotorPin, LOW);
    digitalWrite(rightMotorPin, LOW);
    Serial.println("Line lost");
  }

  delay(50);
}
```

## Sensitivity Adjustment

The onboard potentiometer adjusts detection sensitivity:

1. Use small screwdriver
2. **Clockwise:** More sensitive (detects lighter shades)
3. **Counter-clockwise:** Less sensitive (requires darker lines)
4. Test with your specific black tape and surface
5. Optimal setting: Just reliably detects your black line

## Surface Requirements

**Best results:**

- High contrast (black electrical tape on white paper)
- Matte surfaces (not glossy/reflective)
- Flat, smooth surfaces
- Distance: 1-3mm consistently

**Avoid:**

- Glossy surfaces (causes false readings)
- Transparent tape (IR passes through)
- Rough/textured surfaces (inconsistent distance)
- Ambient IR interference (direct sunlight)

## Integration Examples

See [integration recipes](../../integrations/) for projects combining line finder with:

- Motors (line-following robot)
- Servo (steering control)
- OLED display (position tracking)
- Buzzer (position alarm)

## Additional Resources

- [Line Following Robot Tutorial](https://www.arduino.cc/en/Tutorial/BuiltInExamples)
- [ITR20001/T Datasheet](https://www.everlight.com/file/ProductFile/ITR20001-F43.pdf)
- [Building Line Followers](https://en.wikipedia.org/wiki/Line_following_robot)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Hardware Version:** v1.1
