# Grove Vibration Sensor (SW-420)

**Last Verified:** 2025-11-18  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Vibration_Sensor_SW-420/  
**Connection Type:** Digital

## Overview

The Grove SW-420 is a high-sensitivity vibration sensor that detects mechanical vibration and shock. Uses a spring-loaded conductive element that triggers when vibration exceeds threshold. Outputs LOW when vibration detected, HIGH in normal state. Features adjustable sensitivity via onboard potentiometer. Ideal for earthquake/tamper detection, theft alarms, knock detection, washing machine monitors, and seismic sensing applications.

## Authoritative References

- [Grove Vibration Sensor SW-420 - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Vibration_Sensor_SW-420/)
- [SW-420 Datasheet](https://datasheet.lcsc.com/lcsc/2012081504_Shanghai-Nanyang-Sensing-Technology-SW-420_C202575.pdf)

## Hardware Setup

- **Connection Type:** Digital
- **Grove Port:** Any digital port (D2-D13)
- **Detection Method:** Conductive spring contact (mechanical)
- **Operating Voltage:** 3.3V - 5V
- **Output Logic:**
  - **HIGH (1):** No vibration (normal state)
  - **LOW (0):** Vibration detected
- **Sensitivity:** Adjustable via onboard potentiometer
- **Response Time:** < 10ms
- **Current:** < 15mA
- **Wiring:** Connect to Grove Base Shield digital port using 4-pin Grove cable

![Grove SW-420](https://files.seeedstudio.com/wiki/Grove-Vibration_Sensor_SW-420/img/main.jpg)

## Software Prerequisites

No library required - uses standard `digitalRead()`.

## Example Code

```cpp
/*
  Purpose: Detect vibration/shock using SW-420 sensor
  Notes:
    1. Connect to digital pin
    2. Output is LOW when vibration detected (inverted logic)
    3. Output is HIGH in normal state (no vibration)
    4. Adjust sensitivity pot for vibration threshold
    5. Non-directional (detects vibration in any direction)
  Author: Ben Jones 18/11/25
  Source: https://wiki.seeedstudio.com/Grove-Vibration_Sensor_SW-420/
*/

const int vibrationPin = 2;
const int buzzerPin = 3;
const int ledPin = 4;

void setup() {
  Serial.begin(9600);
  pinMode(vibrationPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
  pinMode(ledPin, OUTPUT);

  Serial.println("SW-420 Vibration Sensor");
  Serial.println("Status: Monitoring for vibrations");
}

void loop() {
  int vibrationState = digitalRead(vibrationPin);

  // Note: LOW = vibration detected (inverted logic)
  if (vibrationState == LOW) {
    digitalWrite(ledPin, HIGH);
    tone(buzzerPin, 1000, 100);
    Serial.println("!!! VIBRATION DETECTED !!!");
    delay(100);  // Debounce
  } else {
    digitalWrite(ledPin, LOW);
    Serial.println("No vibration");
  }

  delay(200);
}
```

### Earthquake Early Warning

```cpp
const int vibrationPin = 2;
const int alarmPin = 3;
int vibrationCount = 0;
unsigned long lastVibration = 0;
const unsigned long countWindow = 2000;  // 2-second window
const int earthquakeThreshold = 5;  // 5 vibrations in 2 seconds

void setup() {
  Serial.begin(9600);
  pinMode(vibrationPin, INPUT);
  pinMode(alarmPin, OUTPUT);

  Serial.println("Earthquake Early Warning System");
  Serial.println("Threshold: 5 vibrations in 2 seconds");
}

void loop() {
  int vibration = digitalRead(vibrationPin);

  if (vibration == LOW && (millis() - lastVibration > 100)) {
    vibrationCount++;
    lastVibration = millis();

    Serial.print("Vibration #");
    Serial.print(vibrationCount);
    Serial.print(" in last 2 seconds");

    if (vibrationCount >= earthquakeThreshold) {
      Serial.println(" - !!! EARTHQUAKE DETECTED !!!");
      digitalWrite(alarmPin, HIGH);
      delay(5000);  // Alarm for 5 seconds
      digitalWrite(alarmPin, LOW);
      vibrationCount = 0;  // Reset
    } else {
      Serial.println();
    }
  }

  // Reset count after window expires
  if (millis() - lastVibration > countWindow) {
    vibrationCount = 0;
  }

  delay(50);
}
```

### Tamper Detection for Safe/ATM

```cpp
const int vibrationPin = 2;
const int sirenPin = 3;
const int statusLED = 4;
bool armed = true;
bool tamperDetected = false;
int tamperCount = 0;

void setup() {
  Serial.begin(9600);
  pinMode(vibrationPin, INPUT);
  pinMode(sirenPin, OUTPUT);
  pinMode(statusLED, OUTPUT);
  digitalWrite(statusLED, HIGH);  // Armed indicator

  Serial.println("Tamper Detection System");
  Serial.println("System ARMED - monitoring for tampering");
  Serial.println("Send 'R' to reset, 'D' to disarm");
}

void loop() {
  // Check for commands
  if (Serial.available()) {
    char cmd = Serial.read();
    if (cmd == 'R' || cmd == 'r') {
      tamperDetected = false;
      tamperCount = 0;
      digitalWrite(sirenPin, LOW);
      Serial.println("System RESET");
    } else if (cmd == 'D' || cmd == 'd') {
      armed = false;
      tamperDetected = false;
      digitalWrite(statusLED, LOW);
      digitalWrite(sirenPin, LOW);
      Serial.println("System DISARMED");
    } else if (cmd == 'A' || cmd == 'a') {
      armed = true;
      digitalWrite(statusLED, HIGH);
      Serial.println("System ARMED");
    }
  }

  // Monitor for tampering if armed
  if (armed) {
    int vibration = digitalRead(vibrationPin);

    if (vibration == LOW && !tamperDetected) {
      tamperCount++;

      Serial.print("Tamper attempt detected! Count: ");
      Serial.println(tamperCount);

      if (tamperCount >= 3) {
        tamperDetected = true;
        Serial.println("!!! TAMPER ALARM ACTIVATED !!!");
        digitalWrite(sirenPin, HIGH);
      }

      delay(500);  // Debounce
    }
  }

  delay(100);
}
```

### Washing Machine Monitor

```cpp
const int vibrationPin = 2;
unsigned long cycleStartTime = 0;
unsigned long lastVibration = 0;
const unsigned long idleTimeout = 60000;  // 1 minute no vibration = cycle done
bool cycleActive = false;

void setup() {
  Serial.begin(9600);
  pinMode(vibrationPin, INPUT);

  Serial.println("Washing Machine Cycle Monitor");
}

void loop() {
  int vibration = digitalRead(vibrationPin);

  if (vibration == LOW) {
    lastVibration = millis();

    if (!cycleActive) {
      cycleActive = true;
      cycleStartTime = millis();
      Serial.println("Wash cycle STARTED");
    }
  }

  // Check if cycle finished (no vibration for 1 minute)
  if (cycleActive && (millis() - lastVibration > idleTimeout)) {
    cycleActive = false;
    unsigned long cycleDuration = (millis() - cycleStartTime) / 60000;  // Minutes

    Serial.println("========================================");
    Serial.println("Wash cycle COMPLETED!");
    Serial.print("Duration: ");
    Serial.print(cycleDuration);
    Serial.println(" minutes");
    Serial.println("========================================");

    delay(5000);  // Prevent repeated messages
  }

  delay(500);
}
```

### Knock Pattern Detector

```cpp
const int vibrationPin = 2;
const int unlockPin = 3;

const int secretPattern[] = {200, 100, 200, 100, 500};  // Knock pattern (ms between knocks)
const int patternLength = 5;
unsigned long knockTimes[10];
int knockCount = 0;
unsigned long lastKnock = 0;
const unsigned long knockTimeout = 3000;  // 3 seconds to complete pattern

void setup() {
  Serial.begin(9600);
  pinMode(vibrationPin, INPUT);
  pinMode(unlockPin, OUTPUT);

  Serial.println("Knock Pattern Detector");
  Serial.println("Secret pattern: Knock-pause-Knock-pause-Long pause");
}

void loop() {
  int vibration = digitalRead(vibrationPin);

  // Detect knock
  if (vibration == LOW && (millis() - lastKnock > 50)) {
    knockTimes[knockCount] = millis();
    knockCount++;
    lastKnock = millis();

    Serial.print("Knock #");
    Serial.println(knockCount);

    delay(100);  // Debounce
  }

  // Check if pattern timeout or enough knocks
  if ((millis() - lastKnock > knockTimeout && knockCount > 0) || knockCount >= patternLength) {
    if (checkPattern()) {
      Serial.println("✓ CORRECT PATTERN - UNLOCKED!");
      digitalWrite(unlockPin, HIGH);
      delay(5000);  // Unlock for 5 seconds
      digitalWrite(unlockPin, LOW);
    } else {
      Serial.println("✗ INCORRECT PATTERN");
    }

    knockCount = 0;  // Reset
  }

  delay(10);
}

bool checkPattern() {
  if (knockCount != patternLength) return false;

  // Calculate intervals between knocks
  for (int i = 1; i < knockCount; i++) {
    int interval = knockTimes[i] - knockTimes[i-1];
    int expectedInterval = secretPattern[i-1];

    // Allow ±50ms tolerance
    if (abs(interval - expectedInterval) > 50) {
      return false;
    }
  }

  return true;
}
```

**Key Points:**

- **Inverted logic:** LOW = vibration, HIGH = normal (same as collision sensor)
- Non-directional - detects vibration from any angle
- Adjustable sensitivity via potentiometer
- Mechanical sensor (spring contact)
- Fast response < 10ms
- Can detect: impacts, shaking, knocking, earthquakes
- Software debouncing recommended

## Testing Procedure

1. Connect SW-420 to digital port (e.g., D2)
2. Upload basic example
3. Open Serial Monitor (9600 baud)
4. **Test vibration detection:**
   - Tap table near sensor
   - Should read "VIBRATION DETECTED"
   - LED lights, buzzer sounds
5. **Test sensitivity:**
   - Locate potentiometer on board
   - Turn clockwise: less sensitive (harder vibration required)
   - Turn counterclockwise: more sensitive (lighter taps trigger)
6. **Test different vibrations:**
   - Gentle tap: may or may not trigger (depends on sensitivity)
   - Hard knock: should always trigger
   - Shake sensor: should trigger repeatedly
7. **Test directional independence:**
   - Vibrate from different directions
   - Should trigger regardless of direction

## Troubleshooting

| Problem                         | Solution                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------- |
| Always reads vibration          | Sensor too sensitive, turn pot clockwise, check for continuous vibration source |
| Never reads vibration           | Check wiring, increase sensitivity (pot CCW), verify power supply               |
| Triggers on slight movements    | Too sensitive for application, reduce sensitivity (pot CW)                      |
| Doesn't trigger on vibrations   | Increase sensitivity (pot CCW), verify sensor is firmly mounted                 |
| Erratic readings                | Loose wiring, add debounce delay, check power supply stability                  |
| Multiple triggers per vibration | Normal for sustained vibration, add debounce or count logic                     |

## Technical Specifications

**Detection:**

- **Technology:** Mechanical spring contact (conductive element)
- **Sensitivity:** Adjustable via potentiometer
- **Response Time:** < 10ms
- **Detection Type:** Non-directional (omnidirectional)
- **Vibration Frequency:** DC to 1kHz+

**Electrical:**

- **Operating Voltage:** 3.3V - 5V DC
- **Current Consumption:** < 15mA
- **Output Type:** Digital (HIGH/LOW)
- **Output Logic:**
  - HIGH: No vibration (normal/idle state)
  - LOW: Vibration detected
- **Pull-up Resistor:** Internal (typical 10kΩ)

**Mechanical:**

- **Sensing Element:** Conductive spring
- **Mounting:** Should be firmly attached to vibrating surface
- **Durability:** 100,000+ actuations

**Adjustments:**

- **Sensitivity Pot:** Controls vibration threshold
  - Clockwise: Less sensitive (larger vibrations required)
  - Counterclockwise: More sensitive (smaller vibrations trigger)

**Environmental:**

- **Operating Temperature:** -10°C to 70°C
- **Storage Temperature:** -20°C to 80°C

**Physical:**

- **Size:** 20mm × 20mm Grove module
- **Mounting:** PCB holes for secure attachment

## Common Use Cases

### Theft Alarm for Vehicle

```cpp
const int vibrationPin = 2;
const int sirenPin = 3;
bool armed = false;
unsigned long armDelay = 10000;  // 10 seconds to arm
unsigned long armTime = 0;

void setup() {
  Serial.begin(9600);
  pinMode(vibrationPin, INPUT);
  pinMode(sirenPin, OUTPUT);

  Serial.println("Vehicle Theft Alarm");
  Serial.println("Send 'A' to arm");
}

void loop() {
  if (Serial.available()) {
    char cmd = Serial.read();
    if (cmd == 'A' || cmd == 'a') {
      Serial.println("Arming in 10 seconds...");
      armTime = millis();
      armed = false;
    } else if (cmd == 'D' || cmd == 'd') {
      armed = false;
      armTime = 0;
      digitalWrite(sirenPin, LOW);
      Serial.println("DISARMED");
    }
  }

  // Check arming delay
  if (armTime > 0 && !armed && (millis() - armTime > armDelay)) {
    armed = true;
    Serial.println("System ARMED - vehicle protected");
  }

  // Monitor for theft attempt
  if (armed && digitalRead(vibrationPin) == LOW) {
    Serial.println("!!! THEFT ATTEMPT - ALARM !!!");
    digitalWrite(sirenPin, HIGH);
    delay(100);
    digitalWrite(sirenPin, LOW);
    delay(100);
  }

  delay(50);
}
```

### Seismic Activity Monitor

```cpp
const int vibrationPin = 2;
unsigned long eventCount = 0;
unsigned long lastEvent = 0;

void setup() {
  Serial.begin(9600);
  pinMode(vibrationPin, INPUT);

  Serial.println("Seismic Activity Monitor");
  Serial.println("Time(s),Event#,Interval(ms)");
}

void loop() {
  if (digitalRead(vibrationPin) == LOW) {
    eventCount++;
    unsigned long currentTime = millis();
    unsigned long interval = currentTime - lastEvent;

    Serial.print(currentTime / 1000);
    Serial.print(",");
    Serial.print(eventCount);
    Serial.print(",");
    Serial.println(interval);

    lastEvent = currentTime;
    delay(200);  // Debounce
  }

  delay(50);
}
```

### Package Delivery Detector

```cpp
const int vibrationPin = 2;
const int notifyLED = 3;
bool packageDetected = false;

void setup() {
  Serial.begin(9600);
  pinMode(vibrationPin, INPUT);
  pinMode(notifyLED, OUTPUT);

  Serial.println("Package Delivery Detector");
  Serial.println("Monitors mailbox/porch for deliveries");
}

void loop() {
  static int vibrationCounter = 0;
  static unsigned long lastVibration = 0;

  if (digitalRead(vibrationPin) == LOW && (millis() - lastVibration > 500)) {
    vibrationCounter++;
    lastVibration = millis();

    // Multiple vibrations suggest package placed/door opened
    if (vibrationCounter >= 3 && !packageDetected) {
      packageDetected = true;
      digitalWrite(notifyLED, HIGH);

      Serial.println("========================================");
      Serial.println("📦 PACKAGE DELIVERED!");
      Serial.print("Time: ");
      Serial.print(millis() / 1000);
      Serial.println(" seconds");
      Serial.println("========================================");
    }
  }

  // Reset counter after 5 seconds
  if (millis() - lastVibration > 5000) {
    vibrationCounter = 0;
  }

  // Check for reset command
  if (Serial.available() && Serial.read() == 'R') {
    packageDetected = false;
    digitalWrite(notifyLED, LOW);
    Serial.println("System RESET");
  }

  delay(100);
}
```

## Understanding SW-420 Operation

**Internal Mechanism:**

```
[PCB Board]
    |
[Conductive Spring] ←─ Vibrates/moves
    |
[Contact Pad] ←─ Intermittent contact during vibration
    |
[Output Circuit]
```

**Normal State (No Vibration):**

- Spring separated from contact pad
- Circuit OPEN
- Output: HIGH

**Vibration State:**

- Spring oscillates and touches contact pad
- Circuit CLOSED (intermittently)
- Output: LOW (during contact)

**Why Inverted Logic:**

- Sensor designed as normally-open switch
- Vibration closes the switch
- Similar to collision sensor

## Sensitivity Adjustment Guide

**Potentiometer Effect:**

- Controls how much vibration needed to close contact
- Does NOT filter frequency or vibration type

**Adjustment Procedure:**

```
1. Start with pot at middle position
2. Generate typical vibration for your application
3. If too sensitive (false triggers):
   - Turn pot CLOCKWISE
   - Requires stronger vibration
4. If not sensitive enough (misses events):
   - Turn pot COUNTERCLOCKWISE
   - Lighter vibrations trigger
5. Test thoroughly after adjustment
```

**Application-Specific Settings:**

- **Earthquake detection:** High sensitivity (detect small tremors)
- **Theft alarm:** Medium sensitivity (detect attempted break-in)
- **Knock detection:** High sensitivity (detect hand knocks)
- **Vehicle monitoring:** Low sensitivity (ignore wind, ignore minor bumps)
- **Appliance monitoring:** Medium sensitivity (detect running cycle)

## Debouncing Strategy

**Why Debouncing Needed:**

- Single vibration causes multiple rapid triggers
- Spring bounces creating multiple contacts
- Can read as dozens of triggers per second

**Software Debouncing:**

```cpp
// Method 1: Ignore triggers within time window
unsigned long lastTrigger = 0;
const unsigned long debounceTime = 200;  // 200ms

if (vibration == LOW && (millis() - lastTrigger > debounceTime)) {
  // Valid vibration event
  lastTrigger = millis();
  // Handle event...
}

// Method 2: Count vibrations in window
int vibCount = 0;
unsigned long windowStart = millis();

if (vibration == LOW) vibCount++;

if (millis() - windowStart > 1000) {  // 1 second window
  if (vibCount > 5) {
    // Sustained vibration detected
  }
  vibCount = 0;
  windowStart = millis();
}
```

## SW-420 vs. Accelerometer Comparison

| Feature            | SW-420 Vibration       | Accelerometer (LIS3DHTR)   |
| ------------------ | ---------------------- | -------------------------- |
| **Detection**      | Binary (yes/no)        | Analog (magnitude) ⭐⭐⭐  |
| **Sensitivity**    | Adjustable ⭐⭐        | Configurable ranges ⭐⭐⭐ |
| **Directionality** | None (omnidirectional) | 3-axis (X,Y,Z) ⭐⭐⭐      |
| **Response Time**  | < 10ms ⭐⭐⭐          | ~10ms ⭐⭐⭐               |
| **Data Richness**  | LOW/HIGH only          | Acceleration values ⭐⭐⭐ |
| **Power**          | < 15mA                 | 11µA ⭐⭐⭐                |
| **Cost**           | Very low ⭐⭐⭐        | Low ⭐⭐                   |
| **Complexity**     | Simple ⭐⭐⭐          | Moderate                   |

**Choose SW-420 for:**

- Simple vibration detection (yes/no)
- Low-cost applications
- Knock detection
- Tamper alarms
- Binary event triggering

**Choose Accelerometer for:**

- Measuring vibration magnitude
- Determining direction of vibration
- Frequency analysis
- Precise motion tracking
- Data logging/analysis

## Multiple Sensor Arrays

**Vibration Source Localization:**

```cpp
// 4-sensor array to locate vibration source
const int sensor1 = 2;  // North
const int sensor2 = 3;  // East
const int sensor3 = 4;  // South
const int sensor4 = 5;  // West

void loop() {
  bool n = (digitalRead(sensor1) == LOW);
  bool e = (digitalRead(sensor2) == LOW);
  bool s = (digitalRead(sensor3) == LOW);
  bool w = (digitalRead(sensor4) == LOW);

  if (n && e) Serial.println("Vibration from NORTHEAST");
  else if (n && w) Serial.println("Vibration from NORTHWEST");
  else if (s && e) Serial.println("Vibration from SOUTHEAST");
  else if (s && w) Serial.println("Vibration from SOUTHWEST");
  else if (n) Serial.println("Vibration from NORTH");
  else if (e) Serial.println("Vibration from EAST");
  else if (s) Serial.println("Vibration from SOUTH");
  else if (w) Serial.println("Vibration from WEST");

  delay(100);
}
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining SW-420 with:

- Buzzer/siren (alarm systems)
- LED indicators (status display)
- SMS/WiFi (remote notifications)
- OLED display (event counter/logger)

## Additional Resources

- [SW-420 Datasheet](https://datasheet.lcsc.com/lcsc/2012081504_Shanghai-Nanyang-Sensing-Technology-SW-420_C202575.pdf)
- [Vibration Sensor Applications](https://www.electronics-tutorials.ws/io/io_6.html)
- [Earthquake Early Warning Systems](https://earthquake.usgs.gov/research/earlywarning/)

---

**Source Verification Date:** 2025-11-18  
**Seeed Wiki Last Checked:** 2025-11-18  
**Note:** Inverted logic - LOW = vibration detected, HIGH = normal state. Adjust sensitivity for your application!
