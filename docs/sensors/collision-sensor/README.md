# Grove Collision Sensor

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Collision_Sensor/  
**Connection Type:** Digital

## Overview

The Grove Collision Sensor detects physical impact or collision using a spring-loaded mechanical switch. When impacted, the spring pin is pressed inward, closing an electrical contact. Outputs LOW when collision detected, HIGH in normal state. Features adjustable sensitivity via potentiometer. Ideal for robotics obstacle detection, impact monitoring, crash sensors, and safety systems.

## Authoritative References

- [Grove Collision Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Collision_Sensor/)
- [Product Page](https://www.seeedstudio.com/Grove-Collision-Sensor.html)

## Hardware Setup

- **Connection Type:** Digital
- **Grove Port:** Any digital port (D2-D13)
- **Detection Method:** Mechanical spring-loaded contact
- **Operating Voltage:** 3.3V - 5V
- **Output Logic:**
  - **HIGH (1):** No collision (normal state)
  - **LOW (0):** Collision detected (pin pressed)
- **Sensitivity:** Adjustable via onboard potentiometer
- **Response Time:** < 1ms (mechanical contact)
- **Debounce:** Recommended in software
- **Wiring:** Connect to Grove Base Shield digital port using 4-pin Grove cable

![Grove Collision Sensor](https://files.seeedstudio.com/wiki/Grove-Collision_Sensor/img/Collision_Sensor.jpg)

## Software Prerequisites

No library required - uses standard `digitalRead()`.

## Example Code

```cpp
/*
  Purpose: Detect collision/impact with mechanical sensor
  Notes:
    1. Connect to digital pin
    2. Output is LOW when collision detected (inverted logic)
    3. Output is HIGH in normal state (no collision)
    4. Adjust sensitivity pot for impact threshold
    5. Software debouncing recommended
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Collision_Sensor/
*/

const int collisionPin = 2;
const int buzzerPin = 3;
const int ledPin = 4;

void setup() {
  Serial.begin(9600);
  pinMode(collisionPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
  pinMode(ledPin, OUTPUT);

  Serial.println("Collision Sensor Monitor");
  Serial.println("Status: Monitoring for impacts");
}

void loop() {
  int collisionState = digitalRead(collisionPin);

  // Note: LOW = collision detected (inverted logic)
  if (collisionState == LOW) {
    digitalWrite(ledPin, HIGH);
    digitalWrite(buzzerPin, HIGH);
    Serial.println("!!! COLLISION DETECTED !!!");
    delay(100);  // Debounce
    digitalWrite(buzzerPin, LOW);
  } else {
    digitalWrite(ledPin, LOW);
    Serial.println("Normal (no collision)");
  }

  delay(200);
}
```

### Collision Counter with Debouncing

```cpp
const int collisionPin = 2;
const int ledPin = 3;
int collisionCount = 0;
unsigned long lastCollision = 0;
const unsigned long debounceDelay = 500;  // 500ms debounce

void setup() {
  Serial.begin(9600);
  pinMode(collisionPin, INPUT);
  pinMode(ledPin, OUTPUT);

  Serial.println("Collision Counter");
  Serial.println("Debounce: 500ms between counts");
}

void loop() {
  int collisionState = digitalRead(collisionPin);

  // Collision detected (LOW) and debounce time passed
  if (collisionState == LOW && (millis() - lastCollision > debounceDelay)) {
    collisionCount++;
    lastCollision = millis();

    Serial.print("Collision #");
    Serial.print(collisionCount);
    Serial.print(" detected at ");
    Serial.print(millis() / 1000);
    Serial.println(" seconds");

    // Visual feedback
    digitalWrite(ledPin, HIGH);
    delay(200);
    digitalWrite(ledPin, LOW);
  }

  delay(50);
}
```

### Robot Obstacle Detector

```cpp
const int collisionPin = 2;
const int motorStopPin = 3;  // Connected to motor controller
const int backupPin = 4;     // Backup motor control
const int buzzerPin = 5;

void setup() {
  Serial.begin(9600);
  pinMode(collisionPin, INPUT);
  pinMode(motorStopPin, OUTPUT);
  pinMode(backupPin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);

  Serial.println("Robot Collision Avoidance");
  digitalWrite(motorStopPin, LOW);  // Motors running
  digitalWrite(backupPin, LOW);
}

void loop() {
  int collision = digitalRead(collisionPin);

  if (collision == LOW) {
    // Collision detected - emergency stop!
    Serial.println("!!! COLLISION - EMERGENCY STOP !!!");

    // Stop motors immediately
    digitalWrite(motorStopPin, HIGH);

    // Sound alarm
    tone(buzzerPin, 2000, 500);
    delay(500);

    // Backup sequence
    Serial.println("Backing up...");
    digitalWrite(backupPin, HIGH);
    delay(1000);  // Backup for 1 second
    digitalWrite(backupPin, LOW);

    // Resume forward
    digitalWrite(motorStopPin, LOW);
    Serial.println("Resuming forward motion");

    delay(500);  // Debounce
  }

  delay(50);
}
```

### Impact Data Logger

```cpp
const int collisionPin = 2;
unsigned long lastImpact = 0;
int impactCount = 0;

void setup() {
  Serial.begin(9600);
  pinMode(collisionPin, INPUT);

  Serial.println("Impact Data Logger");
  Serial.println("Time(ms),Impact#,Interval(ms)");
}

void loop() {
  int collision = digitalRead(collisionPin);

  if (collision == LOW && (millis() - lastImpact > 200)) {
    impactCount++;
    unsigned long currentTime = millis();
    unsigned long interval = currentTime - lastImpact;

    Serial.print(currentTime);
    Serial.print(",");
    Serial.print(impactCount);
    Serial.print(",");
    Serial.println(interval);

    lastImpact = currentTime;
  }

  delay(10);
}
```

**Key Points:**

- **Inverted logic:** LOW = collision, HIGH = normal (opposite of typical sensors)
- Mechanical switch = instant response (< 1ms)
- Adjustable sensitivity via potentiometer on board
- Requires physical contact with spring pin
- Software debouncing prevents false multiple counts
- Spring returns to normal position after impact
- Simple and reliable - no calibration needed

## Testing Procedure

1. Connect Collision Sensor to digital port (e.g., D2)
2. Upload basic example
3. Open Serial Monitor (9600 baud)
4. **Test normal state:**
   - Sensor untouched
   - Should read "Normal (no collision)"
   - Output = HIGH
5. **Test collision detection:**
   - Press spring pin inward with finger/object
   - Should read "COLLISION DETECTED"
   - Output = LOW
   - LED lights, buzzer sounds
6. **Adjust sensitivity:**
   - Locate potentiometer on board
   - Turn clockwise: less sensitive (harder press required)
   - Turn counterclockwise: more sensitive (lighter touch triggers)
7. **Test debouncing:**
   - Rapidly tap sensor multiple times
   - Should count distinct impacts (not bounce)

## Troubleshooting

| Problem                      | Solution                                                                |
| ---------------------------- | ----------------------------------------------------------------------- |
| Always reads collision       | Wiring reversed or pin stuck in pressed position, check spring movement |
| Never reads collision        | Check wiring, verify digital pin in code, spring may be damaged         |
| Multiple counts per impact   | Add/increase debounce delay (500ms recommended)                         |
| Doesn't detect light impacts | Increase sensitivity (turn pot counterclockwise)                        |
| Triggers too easily          | Decrease sensitivity (turn pot clockwise)                               |
| Erratic readings             | Loose connection, interference - add debounce, check wiring             |

## Technical Specifications

**Detection:**

- **Technology:** Mechanical spring-loaded contact switch
- **Trigger Method:** Physical impact presses spring pin inward
- **Response Time:** < 1ms (mechanical contact closure)
- **Actuation Force:** Adjustable via potentiometer (typ. 50-200g)

**Electrical:**

- **Operating Voltage:** 3.3V - 5V DC
- **Output Type:** Digital (HIGH/LOW)
- **Output Logic:**
  - HIGH: No collision (normal/idle state)
  - LOW: Collision detected (switch closed)
- **Pull-up Resistor:** Internal (10kΩ typical)
- **Contact Rating:** Low voltage signal only (not for switching loads)

**Mechanical:**

- **Spring Travel:** ~2-3mm
- **Spring Force:** Light (adjustable)
- **Durability:** 10,000+ actuations
- **Return Mechanism:** Spring-loaded auto-return

**Adjustments:**

- **Sensitivity Pot:** Controls actuation force threshold
  - Clockwise: Less sensitive (harder impact required)
  - Counterclockwise: More sensitive (lighter touch triggers)

**Environmental:**

- **Operating Temperature:** -25°C to 70°C
- **Storage Temperature:** -40°C to 85°C

**Physical:**

- **Size:** 20mm × 20mm Grove module
- **Spring Pin:** Protruding ~3-5mm above surface
- **Mounting:** Must be positioned where impacts will occur

## Common Use Cases

### Robot Bumper Switch

```cpp
const int leftCollision = 2;
const int rightCollision = 3;
const int motorLeft = 4;
const int motorRight = 5;

void setup() {
  Serial.begin(9600);
  pinMode(leftCollision, INPUT);
  pinMode(rightCollision, INPUT);
  pinMode(motorLeft, OUTPUT);
  pinMode(motorRight, OUTPUT);

  Serial.println("Robot Bumper System");
  Serial.println("Left sensor: D2, Right sensor: D3");
}

void loop() {
  int leftHit = digitalRead(leftCollision);
  int rightHit = digitalRead(rightCollision);

  if (leftHit == LOW) {
    // Left side collision - turn right
    Serial.println("Left collision - turning right");
    digitalWrite(motorLeft, HIGH);   // Left motor forward
    digitalWrite(motorRight, LOW);   // Right motor stop/reverse
    delay(500);
  } else if (rightHit == LOW) {
    // Right side collision - turn left
    Serial.println("Right collision - turning left");
    digitalWrite(motorLeft, LOW);    // Left motor stop/reverse
    digitalWrite(motorRight, HIGH);  // Right motor forward
    delay(500);
  } else {
    // No collision - move forward
    digitalWrite(motorLeft, HIGH);
    digitalWrite(motorRight, HIGH);
  }

  delay(50);
}
```

### Package Drop Detector

```cpp
const int collisionPin = 2;
const int alertLED = 3;
int packageCount = 0;

void setup() {
  Serial.begin(9600);
  pinMode(collisionPin, INPUT);
  pinMode(alertLED, OUTPUT);

  Serial.println("Package Drop Detector");
  Serial.println("Place sensor under drop zone");
}

void loop() {
  static unsigned long lastDrop = 0;
  int collision = digitalRead(collisionPin);

  if (collision == LOW && (millis() - lastDrop > 2000)) {
    // Package detected (2-second debounce for heavy packages)
    packageCount++;
    lastDrop = millis();

    Serial.print("Package #");
    Serial.print(packageCount);
    Serial.print(" received at ");
    Serial.print(millis() / 1000);
    Serial.println(" seconds");

    // Alert blink
    for (int i = 0; i < 5; i++) {
      digitalWrite(alertLED, HIGH);
      delay(100);
      digitalWrite(alertLED, LOW);
      delay(100);
    }
  }

  delay(100);
}
```

### Tamper Detection for Enclosure

```cpp
const int collisionPin = 2;
const int alarmPin = 3;
bool armed = true;
bool tampered = false;

void setup() {
  Serial.begin(9600);
  pinMode(collisionPin, INPUT);
  pinMode(alarmPin, OUTPUT);

  Serial.println("Tamper Detection System");
  Serial.println("Monitoring enclosure...");
}

void loop() {
  int collision = digitalRead(collisionPin);

  if (armed && collision == LOW && !tampered) {
    // Tamper detected!
    tampered = true;
    Serial.println("!!! TAMPER ALERT !!!");
    Serial.println("Enclosure has been disturbed!");

    // Continuous alarm
    digitalWrite(alarmPin, HIGH);

    // Log event
    Serial.print("Tamper at time: ");
    Serial.print(millis() / 1000);
    Serial.println(" seconds");
  }

  // Check for reset command
  if (Serial.available() && Serial.read() == 'R') {
    tampered = false;
    digitalWrite(alarmPin, LOW);
    Serial.println("System RESET - monitoring resumed");
  }

  delay(100);
}
```

## Understanding Collision Sensor Operation

**Mechanical Switch Design:**

```
    [External housing]
          |
    [Spring pin] ←─ Protrudes outward
          |
    [Contact point] ←─ Normally separated
          |
    [Fixed contact]
```

**Normal State (No Collision):**

- Spring holds pin outward
- Contacts separated
- Circuit OPEN
- Output: HIGH (pulled up by resistor)

**Collision State (Impact):**

- Pin pushed inward
- Contacts touch
- Circuit CLOSED
- Output: LOW (pulled to ground)

**After Impact:**

- Spring returns pin to extended position
- Contacts separate
- Returns to HIGH output

## Sensitivity Adjustment Guide

**Potentiometer Effect:**

- Controls how hard pin must be pressed to close contact
- Does NOT affect detection range (must physically contact)

**Adjustment Procedure:**

```
1. Start with pot at middle position
2. Test with typical impact force
3. If too sensitive (triggers accidentally):
   - Turn pot CLOCKWISE
   - Requires harder press
4. If not sensitive enough (misses impacts):
   - Turn pot COUNTERCLOCKWISE
   - Lighter touch triggers
5. Test thoroughly after each adjustment
```

**Application-Specific Settings:**

- **Robot bumper:** High sensitivity (detect gentle touch)
- **Drop detector:** Medium sensitivity (package weight)
- **Tamper alarm:** High sensitivity (detect any disturbance)
- **Heavy machinery:** Low sensitivity (significant impact only)

## Debouncing Strategies

**Why Debouncing is Needed:**

- Mechanical contacts can "bounce" on impact
- Single physical press may read as multiple presses
- Electrical noise during contact closure

**Software Debouncing:**

```cpp
// Method 1: Time-based debounce
const unsigned long debounceTime = 500;  // 500ms
unsigned long lastTrigger = 0;

if (collision == LOW && (millis() - lastTrigger > debounceTime)) {
  // Valid collision
  lastTrigger = millis();
  // Handle collision...
}

// Method 2: State change detection
int lastState = HIGH;
if (collision == LOW && lastState == HIGH) {
  // Transition from HIGH to LOW = new collision
  lastState = LOW;
  // Handle collision...
} else if (collision == HIGH) {
  lastState = HIGH;
}
```

## Multiple Sensor Arrays

**Directional Collision Detection:**

```cpp
// 4-sensor bumper array (front, back, left, right)
const int frontCollision = 2;
const int backCollision = 3;
const int leftCollision = 4;
const int rightCollision = 5;

void loop() {
  if (digitalRead(frontCollision) == LOW) {
    Serial.println("Front impact - backup");
  }
  if (digitalRead(backCollision) == LOW) {
    Serial.println("Back impact - move forward");
  }
  if (digitalRead(leftCollision) == LOW) {
    Serial.println("Left impact - turn right");
  }
  if (digitalRead(rightCollision) == LOW) {
    Serial.println("Right impact - turn left");
  }
}
```

## Collision vs. Other Impact Sensors

| Sensor Type                | Detection            | Response     | Accuracy        | Cost       |
| -------------------------- | -------------------- | ------------ | --------------- | ---------- |
| **Collision (mechanical)** | Contact only         | < 1ms ⭐⭐⭐ | Binary ⭐       | Low ⭐⭐⭐ |
| **Accelerometer**          | Acceleration spike   | ~10ms        | G-force ⭐⭐⭐  | Medium     |
| **Ultrasonic**             | Distance < threshold | ~50ms        | Distance ⭐⭐⭐ | Low        |
| **Pressure mat**           | Weight applied       | ~10ms        | Pressure ⭐⭐   | High       |
| **Vibration**              | Vibration amplitude  | ~1ms         | Analog ⭐⭐     | Low        |

**Choose Collision Sensor for:**

- Simple contact detection
- Fast response critical
- Low-cost solution
- Binary detection sufficient (hit/no hit)

**Choose Accelerometer for:**

- Measuring impact force
- Detecting direction of impact
- Non-contact detection (falling, shaking)

## Integration Examples

See [integration recipes](../../integrations/) for projects combining Collision Sensor with:

- Motors/servos (robot obstacle avoidance)
- Buzzer/LED (impact alarm)
- OLED display (collision counter)
- Relay (safety cutoff switch)

## Additional Resources

- [Mechanical Switch Basics](https://www.electronics-tutorials.ws/io/io_2.html)
- [Robot Bumper Design Guide](https://www.instructables.com/Robot-Bumper-Sensors/)
- [Contact Debouncing Techniques](https://www.arduino.cc/en/Tutorial/BuiltInExamples/Debounce)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Note:** Remember inverted logic - LOW = collision detected, HIGH = normal state!
