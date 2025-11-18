# Grove Magnetic Switch

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Magnetic_Switch/  
**Connection Type:** Digital

## Overview

The Grove Magnetic Switch is a reed switch that detects the presence of a magnetic field. Consists of two parts: the sensor module and a magnet. When the magnet approaches the sensor (within ~1.5cm), the switch closes and outputs LOW. Ideal for door/window sensors, proximity detection, and security systems.

## Authoritative References

- [Grove Magnetic Switch - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Magnetic_Switch/)
- [Reed Switch Basics](https://en.wikipedia.org/wiki/Reed_switch)

## Hardware Setup

- **Connection Type:** Digital
- **Grove Port:** Any digital port (D2-D13)
- **Components:** Sensor module + separate magnet
- **Detection Range:** ~1.5cm (15mm)
- **Output:** LOW when magnet near, HIGH when magnet away
- **Operating Voltage:** 3.3V - 5V
- **Switching Voltage:** Max 100V DC
- **Switching Current:** Max 0.5A
- **Wiring:** Connect to Grove Base Shield digital port using 4-pin Grove cable

![Grove Magnetic Switch](https://files.seeedstudio.com/wiki/Grove-Magnetic_Switch/img/Magnetic_Switch.jpg)

**Package Includes:**

- 1× Grove magnetic sensor module
- 1× Small permanent magnet

## Software Prerequisites

No library required - uses standard `digitalRead()`.

## Example Code

```cpp
/*
  Purpose: Basic magnetic switch detection
  Notes:
    1. Connect to digital pin
    2. LOW = magnet detected (switch closed)
    3. HIGH = no magnet (switch open)
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Magnetic_Switch/
*/

const int magnetPin = 2;  // Connect to D2

void setup() {
  Serial.begin(9600);
  pinMode(magnetPin, INPUT);
  Serial.println("Magnetic switch initialized");
  Serial.println("Bring magnet close to sensor");
}

void loop() {
  int magnetState = digitalRead(magnetPin);

  if (magnetState == LOW) {
    Serial.println("Magnet DETECTED - Door CLOSED");
  } else {
    Serial.println("No magnet - Door OPEN");
  }

  delay(500);
}
```

### Door Alarm System

```cpp
const int magnetPin = 2;
const int buzzerPin = 3;
const int ledPin = 13;

int lastState = HIGH;
bool alarmActive = false;
unsigned long doorOpenTime = 0;
const unsigned long alarmDelay = 3000;  // 3 seconds

void setup() {
  Serial.begin(9600);
  pinMode(magnetPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
  pinMode(ledPin, OUTPUT);
  Serial.println("Door alarm system active");
}

void loop() {
  int currentState = digitalRead(magnetPin);

  // Door just opened (magnet moved away)
  if (currentState == HIGH && lastState == LOW) {
    doorOpenTime = millis();
    Serial.println("Door OPENED");
  }

  // Door just closed (magnet returned)
  if (currentState == LOW && lastState == HIGH) {
    alarmActive = false;
    digitalWrite(buzzerPin, LOW);
    digitalWrite(ledPin, LOW);
    Serial.println("Door CLOSED");
  }

  // Check if door has been open too long
  if (currentState == HIGH) {
    unsigned long openDuration = millis() - doorOpenTime;

    if (openDuration > alarmDelay && !alarmActive) {
      alarmActive = true;
      Serial.println("ALARM! Door left open!");
    }

    // Sound alarm
    if (alarmActive) {
      digitalWrite(buzzerPin, HIGH);
      digitalWrite(ledPin, HIGH);
      delay(100);
      digitalWrite(buzzerPin, LOW);
      digitalWrite(ledPin, LOW);
      delay(100);
    }
  }

  lastState = currentState;
  delay(50);
}
```

**Key Points:**

- LOW (0) = Magnet detected, switch closed, door CLOSED
- HIGH (1) = No magnet, switch open, door OPEN
- Reed switch is normally open (NO)
- Detection range: ~1.5cm (varies with magnet strength)
- No power consumed by sensor (passive component)
- Magnet polarity doesn't matter (either pole works)

## Testing Procedure

1. Connect magnetic switch sensor to digital port (e.g., D2)
2. Upload basic example
3. Open Serial Monitor (9600 baud)
4. **Expected output (magnet away):**
   - "No magnet - Door OPEN"
5. **Bring magnet close to sensor (within 1.5cm):**
   - "Magnet DETECTED - Door CLOSED"
6. **Move magnet away:**
   - Returns to "No magnet - Door OPEN"

## Troubleshooting

| Problem               | Solution                                         |
| --------------------- | ------------------------------------------------ |
| Always reads HIGH     | Magnet too far away; bring closer (<1.5cm)       |
| Always reads LOW      | Magnet stuck near sensor; remove magnet          |
| Inconsistent readings | Check connection, secure wiring, avoid vibration |
| No response           | Verify digital pin connection, check power       |
| Range too short       | Use stronger magnet or position closer           |

## Technical Specifications

- **Switch Type:** Reed switch (normally open)
- **Detection Range:** ~1.5cm (15mm)
- **Operating Voltage:** 3.3V - 5V
- **Switching Voltage:** Max 100V DC
- **Switching Current:** Max 0.5A (DC)
- **Contact Resistance:** < 200mΩ
- **Operate Time:** < 1ms
- **Release Time:** < 0.5ms
- **Mechanical Life:** > 100 million operations
- **Operating Temperature:** -40°C to +125°C

## Common Use Cases

### Door/Window Sensor

```cpp
const int magnetPin = 2;
const int ledPin = 13;

void setup() {
  Serial.begin(9600);
  pinMode(magnetPin, INPUT);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int doorState = digitalRead(magnetPin);

  if (doorState == LOW) {
    // Door closed
    digitalWrite(ledPin, LOW);
    Serial.println("Door: CLOSED");
  } else {
    // Door open
    digitalWrite(ledPin, HIGH);
    Serial.println("Door: OPEN");
  }

  delay(500);
}
```

### Entry Counter

```cpp
const int magnetPin = 2;
int entryCount = 0;
int lastState = HIGH;

void setup() {
  Serial.begin(9600);
  pinMode(magnetPin, INPUT);
  Serial.println("Entry Counter");
}

void loop() {
  int currentState = digitalRead(magnetPin);

  // Detect state change from OPEN to CLOSED (entry)
  if (currentState == LOW && lastState == HIGH) {
    entryCount++;
    Serial.print("Entries: ");
    Serial.println(entryCount);
    delay(500);  // Debounce
  }

  lastState = currentState;
  delay(50);
}
```

### Security System with LED Indicator

```cpp
const int magnetPin = 2;
const int greenLED = 3;
const int redLED = 4;
bool systemArmed = true;

void setup() {
  Serial.begin(9600);
  pinMode(magnetPin, INPUT);
  pinMode(greenLED, OUTPUT);
  pinMode(redLED, OUTPUT);

  Serial.println("Security System ARMED");
  digitalWrite(greenLED, HIGH);
}

void loop() {
  int doorState = digitalRead(magnetPin);

  if (systemArmed) {
    if (doorState == LOW) {
      // Door closed - secure
      digitalWrite(greenLED, HIGH);
      digitalWrite(redLED, LOW);
    } else {
      // Door open - ALERT
      digitalWrite(greenLED, LOW);
      digitalWrite(redLED, HIGH);
      Serial.println("ALERT: Door opened!");
    }
  }

  delay(100);
}
```

### Time Tracking (Door Open Duration)

```cpp
const int magnetPin = 2;
unsigned long doorOpenTime = 0;
bool doorIsOpen = false;

void setup() {
  Serial.begin(9600);
  pinMode(magnetPin, INPUT);
}

void loop() {
  int doorState = digitalRead(magnetPin);

  if (doorState == HIGH && !doorIsOpen) {
    // Door just opened
    doorOpenTime = millis();
    doorIsOpen = true;
    Serial.println("Door opened");
  }

  if (doorState == LOW && doorIsOpen) {
    // Door just closed
    unsigned long duration = (millis() - doorOpenTime) / 1000;
    doorIsOpen = false;

    Serial.print("Door was open for ");
    Serial.print(duration);
    Serial.println(" seconds");
  }

  delay(100);
}
```

### Multiple Doors Monitoring

```cpp
const int door1Pin = 2;
const int door2Pin = 3;
const int door3Pin = 4;

void setup() {
  Serial.begin(9600);
  pinMode(door1Pin, INPUT);
  pinMode(door2Pin, INPUT);
  pinMode(door3Pin, INPUT);
  Serial.println("Monitoring 3 doors");
}

void loop() {
  int door1 = digitalRead(door1Pin);
  int door2 = digitalRead(door2Pin);
  int door3 = digitalRead(door3Pin);

  Serial.print("Front: ");
  Serial.print(door1 == LOW ? "CLOSED" : "OPEN");
  Serial.print(" | Back: ");
  Serial.print(door2 == LOW ? "CLOSED" : "OPEN");
  Serial.print(" | Side: ");
  Serial.println(door3 == LOW ? "CLOSED" : "OPEN");

  // Alert if any door open
  if (door1 == HIGH || door2 == HIGH || door3 == HIGH) {
    Serial.println(">> WARNING: At least one door is OPEN");
  }

  delay(1000);
}
```

## Installation Tips

**For Door/Window Sensors:**

1. Mount sensor module on fixed frame (door frame/window frame)
2. Mount magnet on moving part (door/window)
3. Align magnet and sensor (mark with "MG" side facing sensor)
4. Test alignment by opening/closing and checking readings
5. Magnet should come within 1.5cm when closed

**Mounting Methods:**

- Adhesive tape (included with many versions)
- Small screws (for permanent installation)
- Hot glue (quick temporary mounting)

**Alignment:**

```
Fixed Frame              Moving Part
┌─────────────┐         ┌─────────────┐
│             │         │             │
│  [SENSOR]   │   <1.5cm  │  [MAGNET]   │
│             │         │             │
└─────────────┘         └─────────────┘
```

## Magnet Specifications

**Included Magnet:**

- Type: Neodymium (NdFeB) or Ceramic
- Size: ~10mm × 5mm (typical)
- Strength: ~1500 gauss (typical)

**Alternative Magnets:**

- Stronger magnets increase detection range
- Weaker magnets decrease range
- Polarity doesn't matter (N or S pole works)

## Reed Switch Characteristics

**Advantages:**

- ✅ No power consumption
- ✅ Simple interface (digital HIGH/LOW)
- ✅ Long lifespan (100M+ operations)
- ✅ Fast response time (<1ms)
- ✅ Works through non-magnetic materials (plastic, wood)

**Limitations:**

- ❌ Short detection range (~1.5cm)
- ❌ Requires alignment with magnet
- ❌ Can be affected by strong external magnetic fields
- ❌ Mechanical contact can wear over time

## Advanced Features

### Debouncing

```cpp
const int magnetPin = 2;
const unsigned long debounceDelay = 50;
unsigned long lastDebounceTime = 0;
int lastStableState = HIGH;

void setup() {
  Serial.begin(9600);
  pinMode(magnetPin, INPUT);
}

void loop() {
  int reading = digitalRead(magnetPin);

  if (reading != lastStableState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    // State has been stable for debounce period
    if (reading == LOW) {
      Serial.println("Magnet detected (stable)");
    } else {
      Serial.println("No magnet (stable)");
    }
    lastStableState = reading;
    delay(500);
  }
}
```

### State Change Detection Only

```cpp
const int magnetPin = 2;
int lastState = HIGH;

void setup() {
  Serial.begin(9600);
  pinMode(magnetPin, INPUT);
}

void loop() {
  int currentState = digitalRead(magnetPin);

  if (currentState != lastState) {
    if (currentState == LOW) {
      Serial.println("CLOSED");
    } else {
      Serial.println("OPENED");
    }
    lastState = currentState;
  }

  delay(50);
}
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining magnetic switch with:

- Buzzer (Challenge #7: Door alarm)
- LED (status indicator)
- OLED display (entry logging)
- Relay (automated lock control)

## Additional Resources

- [Reed Switch Theory](https://en.wikipedia.org/wiki/Reed_switch)
- [Magnetic Field Basics](https://learn.sparkfun.com/tutorials/magnetic-switch-hookup-guide)
- [Security System Design](https://www.arduino.cc/en/Tutorial/BuiltInExamples)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Hardware Type:** Reed switch (normally open)
