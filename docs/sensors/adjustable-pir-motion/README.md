# Grove Adjustable PIR Motion Sensor

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Adjustable_PIR_Motion_Sensor/  
**Connection Type:** Digital

## Overview

The Grove Adjustable PIR (Passive Infrared) Motion Sensor detects human/animal movement with adjustable sensitivity and delay time. Features two potentiometers for tuning detection range (0-7m) and output duration (0.3-5 minutes). 120° detection angle. Ideal for applications requiring customizable motion detection like automatic lighting, security systems, and smart building automation.

## Authoritative References

- [Grove Adjustable PIR Motion Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Adjustable_PIR_Motion_Sensor/)
- [BISS0001 PIR Controller IC Datasheet](https://www.mouser.com/datasheet/2/813/BISS0001-1102356.pdf)

## Hardware Setup

- **Connection Type:** Digital
- **Grove Port:** Any digital port (D2-D13)
- **Detection Range:** 0-7 meters (adjustable via sensitivity pot)
- **Detection Angle:** 120° cone
- **Operating Voltage:** 3.3V - 5V
- **Current:** 50µA standby, 1-2mA active
- **Output:** HIGH (motion detected), LOW (no motion)
- **Delay Time:** 0.3 to 5 minutes (adjustable via time delay pot)
- **Block Time:** 2.5 seconds (fixed)
- **Adjustments:**
  - **Sensitivity Pot (S):** Controls detection range
  - **Time Delay Pot (T):** Controls output HIGH duration
- **Wiring:** Connect to Grove Base Shield digital port using 4-pin Grove cable

![Grove Adjustable PIR](https://files.seeedstudio.com/wiki/Grove-Adjustable_PIR_Motion_Sensor/img/Adjustable_PIR_sensor_product_view.jpg)

## Software Prerequisites

No library required - uses standard `digitalRead()`.

## Example Code

```cpp
/*
  Purpose: Detect motion with adjustable sensitivity and delay
  Notes:
    1. Connect to digital pin
    2. Wait 60 seconds for calibration after power-on
    3. Adjust sensitivity pot (S) for detection range
    4. Adjust time delay pot (T) for output duration
    5. Output stays HIGH for T duration after last motion
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Adjustable_PIR_Motion_Sensor/
*/

const int pirPin = 2;
const int ledPin = 3;

void setup() {
  Serial.begin(9600);
  pinMode(pirPin, INPUT);
  pinMode(ledPin, OUTPUT);

  Serial.println("Adjustable PIR Motion Sensor");
  Serial.println("Calibrating for 60 seconds...");
  Serial.println("Keep away from sensor during calibration");

  // Calibration countdown
  for (int i = 60; i > 0; i--) {
    Serial.print("Calibration: ");
    Serial.print(i);
    Serial.println(" seconds");
    delay(1000);
  }

  Serial.println("Ready! Adjust pots:");
  Serial.println("- S pot: Detection range (0-7m)");
  Serial.println("- T pot: Output duration (0.3-5min)");
}

void loop() {
  int motionDetected = digitalRead(pirPin);

  if (motionDetected == HIGH) {
    digitalWrite(ledPin, HIGH);
    Serial.println(">>> MOTION DETECTED (output active)");
  } else {
    digitalWrite(ledPin, LOW);
    Serial.println("No motion (delay expired)");
  }

  delay(1000);
}
```

### Smart Lighting with Adjustable Timeout

```cpp
const int pirPin = 2;
const int relayPin = 3;  // Controls lighting via relay
unsigned long motionStartTime = 0;
bool lightsOn = false;

void setup() {
  Serial.begin(9600);
  pinMode(pirPin, INPUT);
  pinMode(relayPin, OUTPUT);
  digitalWrite(relayPin, LOW);  // Lights off initially

  Serial.println("Smart Lighting System");
  Serial.println("Calibrating (60 seconds)...");
  delay(60000);

  Serial.println("System Ready");
  Serial.println("Adjust T pot for light timeout duration");
}

void loop() {
  int motionDetected = digitalRead(pirPin);

  if (motionDetected == HIGH) {
    if (!lightsOn) {
      digitalWrite(relayPin, HIGH);
      lightsOn = true;
      motionStartTime = millis();
      Serial.println("Motion detected - Lights ON");
    }
  } else {
    if (lightsOn) {
      digitalWrite(relayPin, LOW);
      lightsOn = false;
      unsigned long onDuration = (millis() - motionStartTime) / 1000;
      Serial.print("Motion stopped - Lights OFF (on for ");
      Serial.print(onDuration);
      Serial.println(" seconds)");
    }
  }

  delay(500);
}
```

### Occupancy Logger with Timestamps

```cpp
const int pirPin = 2;
unsigned long sessionStart = 0;
bool occupied = false;
int sessionCount = 0;

void setup() {
  Serial.begin(9600);
  pinMode(pirPin, INPUT);

  Serial.println("Occupancy Logger");
  Serial.println("Calibrating...");
  delay(60000);

  Serial.println("Logging started");
  Serial.println("Timestamp(s),Event,Session#,Duration(s)");
}

void loop() {
  int motionDetected = digitalRead(pirPin);
  unsigned long currentTime = millis() / 1000;

  if (motionDetected == HIGH && !occupied) {
    // Occupancy started
    occupied = true;
    sessionCount++;
    sessionStart = currentTime;

    Serial.print(currentTime);
    Serial.print(",OCCUPIED,");
    Serial.print(sessionCount);
    Serial.println(",0");
  } else if (motionDetected == LOW && occupied) {
    // Occupancy ended (delay expired)
    occupied = false;
    unsigned long duration = currentTime - sessionStart;

    Serial.print(currentTime);
    Serial.print(",VACANT,");
    Serial.print(sessionCount);
    Serial.print(",");
    Serial.println(duration);
  }

  delay(1000);
}
```

**Key Points:**

- **Adjustable range:** Turn S pot to set 0-7m detection distance
- **Adjustable delay:** Turn T pot to set 0.3-5 minute output duration
- Output stays HIGH for entire delay time after last motion
- 120° detection angle (narrower than Mini PIR's 170°)
- Ultra-low power: 50µA standby
- 60-second calibration required after power-on

## Testing Procedure

1. Connect Adjustable PIR to digital port (e.g., D2)
2. Upload basic example
3. **Calibration (60 seconds):**
   - Stay away from sensor (5+ meters)
   - Wait full 60 seconds
4. Open Serial Monitor (9600 baud)
5. **Adjust Sensitivity (S pot):**
   - Turn fully counterclockwise: minimum range (~1m)
   - Turn fully clockwise: maximum range (~7m)
   - Test by walking at different distances
6. **Adjust Delay Time (T pot):**
   - Turn fully counterclockwise: ~0.3 minutes (18s)
   - Turn fully clockwise: ~5 minutes (300s)
   - After motion stops, output stays HIGH for T duration
7. **Verify operation:**
   - Walk in front of sensor → Output HIGH
   - Stop moving → Output stays HIGH for T duration
   - After delay → Output goes LOW

## Troubleshooting

| Problem                 | Solution                                                            |
| ----------------------- | ------------------------------------------------------------------- |
| Always detects motion   | Insufficient calibration, reduce sensitivity (turn S pot CCW)       |
| Never detects motion    | Check wiring, increase sensitivity (turn S pot CW), verify 5V power |
| Detects only very close | Sensitivity too low - turn S pot clockwise                          |
| Detects too far away    | Sensitivity too high - turn S pot counterclockwise                  |
| Output too short        | Increase delay time (turn T pot clockwise)                          |
| Output too long         | Decrease delay time (turn T pot counterclockwise)                   |
| False positives         | Temperature changes, air currents, pets - reduce sensitivity        |

## Technical Specifications

**Detection:**

- **Technology:** Passive infrared (PIR) with BISS0001 controller
- **Detection Range:** 0-7 meters (adjustable)
- **Detection Angle:** 120° horizontal cone
- **Wavelength:** 7-14µm (human body IR)

**Electrical:**

- **Operating Voltage:** 3.3V - 5V DC
- **Current (Standby):** 50µA (ultra-low power)
- **Current (Active):** 1-2mA
- **Output Type:** Digital (HIGH/LOW)

**Timing:**

- **Calibration:** 60 seconds after power-on
- **Delay Time:** 0.3 to 5 minutes (adjustable via T pot)
- **Block Time:** 2.5 seconds (minimum between detections)
- **Trigger Mode:** Repeatable (extends HIGH with continued motion)

**Adjustments:**

- **Sensitivity Pot (S):**
  - Clockwise: Increase range (up to 7m)
  - Counterclockwise: Decrease range (down to 0m)
- **Time Delay Pot (T):**
  - Clockwise: Longer delay (up to 5 minutes)
  - Counterclockwise: Shorter delay (down to 0.3 minutes)

**Environmental:**

- **Operating Temperature:** -15°C to 70°C
- **Optimal Performance:** 15-35°C stable environment

**Physical:**

- **Size:** 40mm × 40mm Grove module
- **Lens:** Fresnel lens for IR focusing

## Common Use Cases

### Corridor Lighting with Long Timeout

```cpp
const int pirPin = 2;
const int lightsRelay = 3;

void setup() {
  Serial.begin(9600);
  pinMode(pirPin, INPUT);
  pinMode(lightsRelay, OUTPUT);

  Serial.println("Corridor Lighting");
  delay(60000);  // Calibration

  // Set T pot to 5 minutes for long corridors
  Serial.println("Adjust T pot for 5-minute timeout");
  Serial.println("Lights stay on during entire walk through");
}

void loop() {
  int motion = digitalRead(pirPin);

  if (motion == HIGH) {
    digitalWrite(lightsRelay, HIGH);
  } else {
    digitalWrite(lightsRelay, LOW);
  }

  delay(100);
}
```

### Meeting Room Occupancy Detector

```cpp
const int pirPin = 2;
const int occupiedLED = 3;
const int vacantLED = 4;

void setup() {
  Serial.begin(9600);
  pinMode(pirPin, INPUT);
  pinMode(occupiedLED, OUTPUT);
  pinMode(vacantLED, OUTPUT);

  Serial.println("Meeting Room Occupancy");
  delay(60000);  // Calibration

  // Set T pot to 2-3 minutes (typical meeting gap)
  Serial.println("Adjust T pot for 2-3 minute timeout");
  digitalWrite(vacantLED, HIGH);  // Initially vacant
}

void loop() {
  int motion = digitalRead(pirPin);

  if (motion == HIGH) {
    // Room occupied
    digitalWrite(occupiedLED, HIGH);
    digitalWrite(vacantLED, LOW);
    Serial.println("OCCUPIED");
  } else {
    // Room vacant (no motion for T duration)
    digitalWrite(occupiedLED, LOW);
    digitalWrite(vacantLED, HIGH);
    Serial.println("VACANT");
  }

  delay(2000);
}
```

### Bathroom Exhaust Fan Controller

```cpp
const int pirPin = 2;
const int fanRelay = 3;

void setup() {
  Serial.begin(9600);
  pinMode(pirPin, INPUT);
  pinMode(fanRelay, OUTPUT);

  Serial.println("Bathroom Fan Controller");
  delay(60000);  // Calibration

  // Set T pot to 3-5 minutes (fan runs after occupant leaves)
  Serial.println("Adjust T pot for 3-5 minute post-occupancy");
}

void loop() {
  int motion = digitalRead(pirPin);

  if (motion == HIGH) {
    digitalWrite(fanRelay, HIGH);
    Serial.println("Occupancy detected - Fan ON");
  } else {
    digitalWrite(fanRelay, LOW);
    Serial.println("No motion (delay expired) - Fan OFF");
  }

  delay(1000);
}
```

## Potentiometer Adjustment Guide

**Sensitivity Pot (S) - Detection Range:**

```
CCW (left)  ←─────●─────→  CW (right)
0m range               7m range
(least sensitive)    (most sensitive)
```

**Time Delay Pot (T) - Output Duration:**

```
CCW (left)  ←─────●─────→  CW (right)
0.3 min (18s)          5 min (300s)
(shortest delay)    (longest delay)
```

**Tuning Strategy:**

1. **Start with minimum settings:**
   - Turn both pots fully CCW
2. **Increase sensitivity slowly:**
   - Turn S pot CW until desired range achieved
   - Test at target distance
3. **Set delay time:**
   - Turn T pot CW to desired duration
   - Test by stopping motion and timing output

**Common Settings:**

- **Closet light:** S = low (1-2m), T = short (0.5 min)
- **Hallway light:** S = medium (3-5m), T = medium (2-3 min)
- **Room occupancy:** S = high (5-7m), T = long (4-5 min)
- **Security alarm:** S = maximum (7m), T = short (0.5 min) + external timer

## Mini PIR vs. Adjustable PIR Comparison

| Feature         | Mini PIR        | Adjustable PIR              |
| --------------- | --------------- | --------------------------- |
| **Range**       | 3-5m fixed      | 0-7m adjustable ⭐⭐⭐      |
| **Angle**       | 170° ⭐⭐⭐     | 120°                        |
| **Delay**       | 2.5s fixed      | 0.3-5 min adjustable ⭐⭐⭐ |
| **Sensitivity** | Fixed           | Adjustable ⭐⭐⭐           |
| **Power**       | 0.3mA           | 50µA ⭐⭐⭐                 |
| **Size**        | 20mm ⭐⭐⭐     | 40mm                        |
| **Tuning**      | None            | 2 pots ⭐⭐⭐               |
| **Use Case**    | Simple projects | Tunable applications        |

**Choose Adjustable PIR for:**

- Applications needing variable timeout (lighting, HVAC)
- Need to tune detection range
- Professional installations requiring customization
- Energy management systems

**Choose Mini PIR for:**

- Space-constrained projects
- Wide angle coverage (170° vs 120°)
- Simple plug-and-play applications
- Fast response needed (2.5s vs minutes)

## Power Consumption Analysis

**Ultra-Low Power Operation:**

- Standby: 50µA @ 5V = 0.00025W
- Active: 2mA @ 5V = 0.01W
- Daily energy (10% active): 0.22Wh

**Battery Life Estimates:**

- **CR2032 (220mAh @ 3V):** ~4 months continuous
- **3× AA alkaline (2500mAh @ 4.5V):** ~4 years continuous
- **LiPo 1000mAh:** ~2 years continuous

**Comparison to Mini PIR:**

- Adjustable: 50µA standby ⭐⭐⭐
- Mini: 300µA standby
- Adjustable uses 6× less power in standby!

## Integration Examples

See [integration recipes](../../integrations/) for projects combining Adjustable PIR with:

- Relay (automatic lighting with custom timeout)
- HVAC control (occupancy-based climate control)
- Energy monitoring (occupancy logging)
- Smart building automation

## Additional Resources

- [BISS0001 Datasheet](https://www.mouser.com/datasheet/2/813/BISS0001-1102356.pdf)
- [PIR Motion Sensor Tutorial](https://lastminuteengineers.com/pir-sensor-arduino-tutorial/)
- [Smart Lighting Design Guide](https://www.lutron.com/en-US/Education-Training/Pages/LCE/DaylightingandOccupancySensing.aspx)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Note:** Adjust S and T potentiometers for optimal performance in your application!
