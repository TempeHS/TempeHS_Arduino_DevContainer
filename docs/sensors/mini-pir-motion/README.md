# Grove Mini PIR Motion Sensor

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-mini_PIR_motion_sensor/  
**Connection Type:** Digital

## Overview

The Grove Mini PIR (Passive Infrared) Motion Sensor detects human/animal movement within 3-5 meters range using infrared radiation changes. Ultra-compact design with 170° detection angle. Outputs HIGH when motion detected, LOW otherwise. Ideal for security systems, automatic lighting, presence detection, and energy-saving applications. Consumes only 0.3mA in standby.

## Authoritative References

- [Grove Mini PIR Motion Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-mini_PIR_motion_sensor/)
- [PIR Sensor Technology Explained](https://www.adafruit.com/product/189)

## Hardware Setup

- **Connection Type:** Digital
- **Grove Port:** Any digital port (D2-D13)
- **Detection Range:** 3-5 meters
- **Detection Angle:** 170° (wide coverage)
- **Operating Voltage:** 3.3V - 5V
- **Current:** 0.3mA standby, 2mA active
- **Output:** HIGH (motion detected), LOW (no motion)
- **Trigger Mode:** Repeatable trigger (pulse extends with continued motion)
- **Delay Time:** 2.5 seconds (internal, not adjustable)
- **Block Time:** 2.5 seconds (minimum between detections)
- **Wiring:** Connect to Grove Base Shield digital port using 4-pin Grove cable

![Grove Mini PIR](https://files.seeedstudio.com/wiki/Grove-mini_PIR_motion_sensor/img/Grove-mini_PIR_motion_sensor.jpg)

## Software Prerequisites

No library required - uses standard `digitalRead()`.

## Example Code

```cpp
/*
  Purpose: Detect motion using Mini PIR sensor
  Notes:
    1. Connect to digital pin
    2. Wait 60 seconds after power-on for sensor to stabilize
    3. Motion detected = HIGH output
    4. 170° wide detection angle
    5. 2.5s delay between detections
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-mini_PIR_motion_sensor/
*/

const int pirPin = 2;
const int ledPin = 3;

void setup() {
  Serial.begin(9600);
  pinMode(pirPin, INPUT);
  pinMode(ledPin, OUTPUT);

  Serial.println("Mini PIR Motion Sensor");
  Serial.println("Calibrating for 60 seconds...");
  Serial.println("Stay away from sensor during calibration");

  // Calibration period (60 seconds)
  for (int i = 60; i > 0; i--) {
    Serial.print("Calibration: ");
    Serial.print(i);
    Serial.println(" seconds remaining");
    delay(1000);
  }

  Serial.println("Calibration complete - monitoring for motion");
}

void loop() {
  int motionDetected = digitalRead(pirPin);

  if (motionDetected == HIGH) {
    digitalWrite(ledPin, HIGH);
    Serial.println(">>> MOTION DETECTED!");
  } else {
    digitalWrite(ledPin, LOW);
    Serial.println("No motion");
  }

  delay(500);
}
```

### Security Alarm

```cpp
const int pirPin = 2;
const int buzzerPin = 3;
const int ledPin = 4;
bool armed = false;
unsigned long armDelay = 30000;  // 30 second arm delay
unsigned long armTime = 0;

void setup() {
  Serial.begin(9600);
  pinMode(pirPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
  pinMode(ledPin, OUTPUT);

  Serial.println("=== SECURITY ALARM SYSTEM ===");
  Serial.println("Calibrating sensor (60 seconds)...");
  delay(60000);

  Serial.println("System ready");
  Serial.println("Send 'A' to arm, 'D' to disarm");
}

void loop() {
  // Check for serial commands
  if (Serial.available()) {
    char command = Serial.read();
    if (command == 'A' || command == 'a') {
      Serial.println("Arming system in 30 seconds...");
      armTime = millis();
      armed = false;  // Not yet armed
      digitalWrite(ledPin, LOW);
    } else if (command == 'D' || command == 'd') {
      armed = false;
      armTime = 0;
      digitalWrite(buzzerPin, LOW);
      digitalWrite(ledPin, LOW);
      Serial.println("System DISARMED");
    }
  }

  // Check if arming delay has passed
  if (armTime > 0 && !armed && (millis() - armTime >= armDelay)) {
    armed = true;
    digitalWrite(ledPin, HIGH);  // Armed indicator
    Serial.println("System ARMED - monitoring for motion");
  }

  // Monitor for motion if armed
  if (armed) {
    int motionDetected = digitalRead(pirPin);

    if (motionDetected == HIGH) {
      Serial.println("!!! INTRUSION DETECTED !!!");
      // Sound alarm
      for (int i = 0; i < 10; i++) {
        digitalWrite(buzzerPin, HIGH);
        delay(100);
        digitalWrite(buzzerPin, LOW);
        delay(100);
      }
    }
  }

  delay(100);
}
```

### Auto Light with Timeout

```cpp
const int pirPin = 2;
const int ledPin = 3;
unsigned long motionTime = 0;
const unsigned long timeout = 30000;  // 30 seconds
bool lightOn = false;

void setup() {
  Serial.begin(9600);
  pinMode(pirPin, INPUT);
  pinMode(ledPin, OUTPUT);

  Serial.println("Automatic Light System");
  Serial.println("Calibrating (60 seconds)...");
  delay(60000);
  Serial.println("Ready - light turns on with motion, off after 30s no motion");
}

void loop() {
  int motionDetected = digitalRead(pirPin);

  if (motionDetected == HIGH) {
    // Motion detected - turn on light and reset timer
    if (!lightOn) {
      digitalWrite(ledPin, HIGH);
      lightOn = true;
      Serial.println("Motion detected - Light ON");
    }
    motionTime = millis();  // Reset timeout
  } else {
    // No motion - check timeout
    if (lightOn && (millis() - motionTime >= timeout)) {
      digitalWrite(ledPin, LOW);
      lightOn = false;
      Serial.println("No motion for 30s - Light OFF");
    }
  }

  delay(500);
}
```

**Key Points:**

- Detects motion via infrared radiation changes from warm bodies
- 170° wide detection angle (nearly semicircle coverage)
- 60-second calibration required after power-on
- 2.5s delay between consecutive detections (internal)
- Works best in stable temperature environments
- Cannot detect stationary objects (only movement)
- Ultra-low power: 0.3mA standby

## Testing Procedure

1. Connect Mini PIR to digital port (e.g., D2)
2. Upload basic example
3. **Calibration (CRITICAL):**
   - Wait 60 seconds without movement near sensor
   - Stay at least 5 meters away
   - Sensor learns "normal" IR background
4. Open Serial Monitor (9600 baud)
5. **Test detection:**
   - Walk toward sensor from 5 meters away
   - Should detect and output "MOTION DETECTED!"
   - LED turns on
6. **Test range:**
   - Walk at different distances (1m, 3m, 5m)
   - Verify detection at each distance
7. **Test angle:**
   - Move across sensor field of view
   - 170° coverage (almost semicircle)

## Troubleshooting

| Problem                   | Solution                                                                     |
| ------------------------- | ---------------------------------------------------------------------------- |
| Always detects motion     | Insufficient calibration time (wait full 60s), unstable temperature/lighting |
| Never detects motion      | Check wiring, verify 5V power, sensor may be defective                       |
| Detects only close motion | Normal - sensitivity decreases with distance (max 3-5m)                      |
| False positives           | Air conditioning vents, heaters, direct sunlight, pets                       |
| Delayed detection         | 2.5s internal delay is normal, cannot be reduced                             |
| Misses some motion        | Slow movement, person stationary, moving away from sensor                    |

## Technical Specifications

**Detection:**

- **Technology:** Passive infrared (PIR) - detects IR radiation changes
- **Detection Range:** 3-5 meters (varies with conditions)
- **Detection Angle:** 170° horizontal
- **Wavelength:** 7-14µm (human body IR emission peak)

**Electrical:**

- **Operating Voltage:** 3.3V - 5V DC
- **Current (Standby):** 0.3mA
- **Current (Active):** 2mA
- **Output Type:** Digital (HIGH/LOW)
- **Output HIGH:** Motion detected
- **Output LOW:** No motion

**Timing:**

- **Calibration Time:** 60 seconds (after power-on or long idle)
- **Delay Time:** 2.5 seconds (internal, fixed)
- **Block Time:** 2.5 seconds minimum between detections
- **Trigger Mode:** Repeatable (extends HIGH while motion continues)

**Environmental:**

- **Operating Temperature:** -15°C to 70°C
- **Optimal Performance:** 15-35°C (stable room temperature)
- **Sensitivity to:** Temperature changes, air currents, sunlight

**Physical:**

- **Size:** 20mm × 20mm (Grove module)
- **Weight:** ~5g
- **Lens:** Fresnel lens (focuses IR onto sensor element)

## Common Use Cases

### Occupancy Counter

```cpp
const int pirPin = 2;
int occupancyCount = 0;
unsigned long lastDetection = 0;
const unsigned long debounceTime = 5000;  // 5 seconds between counts

void setup() {
  Serial.begin(9600);
  pinMode(pirPin, INPUT);

  Serial.println("Occupancy Counter");
  Serial.println("Calibrating...");
  delay(60000);
  Serial.println("Ready - counting entries");
}

void loop() {
  int motionDetected = digitalRead(pirPin);

  if (motionDetected == HIGH && (millis() - lastDetection > debounceTime)) {
    occupancyCount++;
    lastDetection = millis();

    Serial.print("Entry detected | Count: ");
    Serial.println(occupancyCount);
  }

  delay(100);
}
```

### Energy Saving Auto-Off

```cpp
const int pirPin = 2;
const int deviceRelay = 3;  // Controls appliance via relay
unsigned long lastMotion = 0;
const unsigned long idleTimeout = 300000;  // 5 minutes

void setup() {
  Serial.begin(9600);
  pinMode(pirPin, INPUT);
  pinMode(deviceRelay, OUTPUT);
  digitalWrite(deviceRelay, HIGH);  // Device ON initially

  Serial.println("Energy Saver - Auto Power Off");
  delay(60000);  // Calibration
  Serial.println("Device will turn off after 5 minutes of no motion");
  lastMotion = millis();
}

void loop() {
  int motionDetected = digitalRead(pirPin);

  if (motionDetected == HIGH) {
    // Motion detected - ensure device is on
    digitalWrite(deviceRelay, HIGH);
    lastMotion = millis();
    Serial.println("Motion detected - device ON");
  } else {
    // No motion - check timeout
    if (millis() - lastMotion >= idleTimeout) {
      digitalWrite(deviceRelay, LOW);
      Serial.println("No motion for 5 min - device OFF (power saving)");
      delay(10000);  // Check less frequently when off
    }
  }

  delay(500);
}
```

### Wildlife Camera Trigger

```cpp
const int pirPin = 2;
const int cameraTrigger = 3;  // Connected to camera shutter
unsigned long lastPhoto = 0;
const unsigned long photoInterval = 10000;  // 10 seconds between photos
int photoCount = 0;

void setup() {
  Serial.begin(9600);
  pinMode(pirPin, INPUT);
  pinMode(cameraTrigger, OUTPUT);
  digitalWrite(cameraTrigger, LOW);

  Serial.println("Wildlife Camera Trigger");
  delay(60000);  // Calibration
  Serial.println("Ready - will trigger camera when animal detected");
}

void loop() {
  int motionDetected = digitalRead(pirPin);

  if (motionDetected == HIGH && (millis() - lastPhoto > photoInterval)) {
    // Animal detected - trigger camera
    photoCount++;
    Serial.print("Wildlife detected! Taking photo #");
    Serial.println(photoCount);

    // Trigger camera (pulse)
    digitalWrite(cameraTrigger, HIGH);
    delay(500);
    digitalWrite(cameraTrigger, LOW);

    lastPhoto = millis();
  }

  delay(100);
}
```

## Understanding PIR Technology

**How PIR Sensors Work:**

1. **Dual Element:** Two IR-sensitive pyroelectric crystals
2. **Difference Detection:** Measures IR difference between elements
3. **Warm Body Passes:** One element sees IR before the other
4. **Voltage Change:** Temperature difference creates voltage
5. **Digital Output:** Comparator converts to HIGH/LOW

**Why Calibration is Needed:**

- Sensor must learn ambient IR "baseline"
- Temperature equilibrium required
- Initial power-on creates thermal transients
- 60 seconds ensures stable operation

**What PIR Can Detect:**

- ✅ Humans (98.6°F / 37°C body temperature)
- ✅ Animals (dogs, cats, wildlife)
- ✅ Moving heat sources (vehicles with hot engines)

**What PIR Cannot Detect:**

- ❌ Stationary objects (no IR change)
- ❌ Slow movement (below threshold)
- ❌ Objects at ambient temperature
- ❌ Motion behind walls/glass

**Optimal Conditions:**

- Stable room temperature (15-35°C)
- No direct sunlight on sensor
- No air conditioning vents pointing at sensor
- No heaters nearby

## Mini PIR vs. Adjustable PIR

| Feature             | Mini PIR           | Adjustable PIR             |
| ------------------- | ------------------ | -------------------------- |
| **Size**            | 20mm × 20mm ⭐⭐⭐ | 40mm × 40mm                |
| **Range**           | 3-5m               | 3-7m (adjustable) ⭐⭐     |
| **Sensitivity**     | Fixed              | Adjustable ⭐⭐⭐          |
| **Delay Time**      | 2.5s fixed         | 0.3-5min adjustable ⭐⭐⭐ |
| **Power**           | 0.3mA ⭐⭐⭐       | 50µA ⭐⭐⭐                |
| **Detection Angle** | 170° ⭐⭐⭐        | 120°                       |
| **Price**           | Lower ⭐⭐⭐       | Higher                     |
| **Use Case**        | Compact projects   | Tunable applications       |

**Choose Mini PIR for:**

- Space-constrained projects
- Wide angle coverage (170°)
- Simple plug-and-play operation
- Battery-powered devices

**Choose Adjustable PIR for:**

- Need to tune sensitivity
- Variable delay times (e.g., lighting control)
- Longer detection range
- Professional installations

## False Positive Reduction

**Common Causes of False Triggers:**

1. **Temperature Changes:**

   - Air conditioning turning on/off
   - Heating vents
   - Direct sunlight moving across room
   - Solution: Shield sensor from direct airflow/sun

2. **Pets:**

   - Dogs, cats trigger sensor (they're warm-blooded)
   - Solution: Mount sensor higher (pets closer to floor), or use pet-immune PIR

3. **Moving Curtains/Plants:**

   - If heated by sun, can trigger sensor
   - Solution: Secure curtains, remove plants from field of view

4. **Electrical Interference:**
   - Fluorescent lights
   - High-power appliances
   - Solution: Shield sensor, use decoupling capacitor on power

**Code-Based Filtering:**

```cpp
const int pirPin = 2;
const int confirmationCount = 3;  // Require 3 consecutive detections
int detectionCounter = 0;

void loop() {
  int motion = digitalRead(pirPin);

  if (motion == HIGH) {
    detectionCounter++;
    if (detectionCounter >= confirmationCount) {
      Serial.println("Confirmed motion (not false positive)");
      detectionCounter = confirmationCount;  // Cap counter
    }
  } else {
    detectionCounter = 0;  // Reset if no motion
  }

  delay(500);
}
```

## Mounting Considerations

**Optimal Height:**

- **Ceiling Mount:** 2.4-3m height, sensor facing down (best for room coverage)
- **Wall Mount:** 2-2.4m height, sensor parallel to floor (best for hallways)
- **Corner Mount:** 2m height, 45° angle (covers two walls)

**Avoid:**

- Near windows (sunlight causes false triggers)
- Above heaters/AC vents (air currents affect detection)
- Directly facing reflective surfaces (mirrors, shiny walls)
- Outdoor use (unless weatherproofed and shaded)

**Field of View Diagram:**

```
        Top View (170° coverage)

             \        |        /
              \       |       /
               \      |      /
                \     |     /
                 \    |    /
              ---[ PIR SENSOR ]---
                  (semicircle)
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining Mini PIR with:

- LED/relay (automatic lighting)
- Buzzer (security alarm)
- OLED display (motion counter/dashboard)
- Camera trigger (wildlife/security photography)

## Additional Resources

- [How PIR Sensors Work - Adafruit](https://learn.adafruit.com/pir-passive-infrared-proximity-motion-sensor/)
- [PIR Sensor Interfacing](https://lastminuteengineers.com/pir-sensor-arduino-tutorial/)
- [PIR Sensor Applications](https://www.electronicshub.org/pir-sensor/)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Note:** Allow 60-second calibration after power-on for reliable operation!
