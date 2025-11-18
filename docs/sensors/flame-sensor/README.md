# Grove Flame Sensor

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Flame_Sensor/  
**Connection Type:** Digital

## Overview

The Grove Flame Sensor detects infrared light in the 760nm-1100nm wavelength range, which includes flames and fire. Can detect flame sources from 60cm-100cm distance (depending on flame size). Outputs LOW when flame detected, HIGH when no flame. Ideal for fire detection, flame monitoring, and safety systems.

## Authoritative References

- [Grove Flame Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Flame_Sensor/)
- [Flame Detection Theory](https://en.wikipedia.org/wiki/Flame_detector)

## Hardware Setup

- **Connection Type:** Digital
- **Grove Port:** Any digital port (D2-D13)
- **Detection Range:** 760nm - 1100nm (infrared)
- **Detection Distance:** 60cm - 100cm (flame size dependent)
- **Detection Angle:** ~60° cone
- **Operating Voltage:** 3.3V - 5V
- **Output:** Digital (LOW = flame detected, HIGH = no flame)
- **Sensitivity:** Adjustable via onboard potentiometer
- **Wiring:** Connect to Grove Base Shield digital port using 4-pin Grove cable

![Grove Flame Sensor](https://files.seeedstudio.com/wiki/Grove-Flame_Sensor/img/Flame_Sensor_01.jpg)

## Software Prerequisites

No library required - uses standard `digitalRead()`.

## Example Code

```cpp
/*
  Purpose: Fire/flame detection
  Notes:
    1. Connect to digital pin
    2. LOW = flame detected
    3. HIGH = no flame
    4. Detection range: 60-100cm
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Flame_Sensor/
*/

const int flamePin = 2;  // Connect to D2

void setup() {
  Serial.begin(9600);
  pinMode(flamePin, INPUT);
  Serial.println("Flame Sensor initialized");
}

void loop() {
  int flameState = digitalRead(flamePin);

  if (flameState == LOW) {
    Serial.println("FLAME DETECTED!");
  } else {
    Serial.println("No flame");
  }

  delay(500);
}
```

### Fire Alarm System

```cpp
const int flamePin = 2;
const int buzzerPin = 3;
const int ledPin = 13;

void setup() {
  Serial.begin(9600);
  pinMode(flamePin, INPUT);
  pinMode(buzzerPin, OUTPUT);
  pinMode(ledPin, OUTPUT);
  Serial.println("Fire alarm system active");
}

void loop() {
  int flameState = digitalRead(flamePin);

  if (flameState == LOW) {
    // FLAME DETECTED - SOUND ALARM
    Serial.println("FIRE DETECTED!");
    digitalWrite(ledPin, HIGH);
    digitalWrite(buzzerPin, HIGH);
    delay(200);
    digitalWrite(buzzerPin, LOW);
    delay(100);
  } else {
    // No flame - all clear
    digitalWrite(ledPin, LOW);
    digitalWrite(buzzerPin, LOW);
    Serial.println("All clear");
    delay(1000);
  }
}
```

**Key Points:**

- LOW (0) = Flame detected
- HIGH (1) = No flame
- Detects infrared light from flames (760-1100nm)
- Also responds to sunlight and IR sources
- Detection distance: 60-100cm typical
- Sensitivity adjustable via potentiometer
- Not suitable for precision fire detection

## Testing Procedure

1. Connect flame sensor to digital port (e.g., D2)
2. Upload basic example
3. Open Serial Monitor (9600 baud)
4. **Expected output (no flame):**
   - "No flame"
5. **Test with flame:**
   - **SAFELY** light a lighter or candle
   - Hold 60-100cm from sensor
   - "FLAME DETECTED!"
6. **Extinguish flame:**
   - Returns to "No flame"

**⚠️ SAFETY WARNING:**

- Test only in safe, controlled environment
- Have fire extinguisher nearby
- Never leave flame unattended
- Keep flammable materials away
- Adult supervision required

## Troubleshooting

| Problem                | Solution                                                      |
| ---------------------- | ------------------------------------------------------------- |
| Always reads LOW       | Too sensitive; adjust potentiometer CCW                       |
| Always reads HIGH      | Not sensitive enough; adjust pot CW, or flame too far         |
| False positives        | Sunlight/IR interference; shield sensor or reduce sensitivity |
| No detection           | Flame too far (>100cm), check wiring                          |
| Intermittent detection | Flame flickering is normal; use debouncing                    |

## Technical Specifications

- **Sensor Type:** YG1006 flame detector (photodiode)
- **Detection Wavelength:** 760nm - 1100nm (near-infrared)
- **Detection Angle:** ~60° cone
- **Detection Distance:** 60cm - 100cm (flame size dependent)
- **Operating Voltage:** 3.3V - 5V
- **Operating Current:** < 20mA
- **Output:** Digital (TTL)
- **Response Time:** < 15ms
- **Operating Temperature:** -25°C to 85°C
- **Sensitivity:** Adjustable (potentiometer)

## Common Use Cases

### Fire Detection with Event Counting

```cpp
const int flamePin = 2;
int fireCount = 0;
int lastState = HIGH;

void setup() {
  Serial.begin(9600);
  pinMode(flamePin, INPUT);
  Serial.println("Fire detection counter");
}

void loop() {
  int currentState = digitalRead(flamePin);

  // Count flame detection events
  if (currentState == LOW && lastState == HIGH) {
    fireCount++;
    Serial.print("Fire event #");
    Serial.println(fireCount);
    delay(1000);  // Debounce
  }

  lastState = currentState;
  delay(100);
}
```

### Multi-Zone Fire Detection

```cpp
const int zone1Pin = 2;  // Kitchen
const int zone2Pin = 3;  // Living room
const int zone3Pin = 4;  // Bedroom
const int alarmPin = 5;

void setup() {
  Serial.begin(9600);
  pinMode(zone1Pin, INPUT);
  pinMode(zone2Pin, INPUT);
  pinMode(zone3Pin, INPUT);
  pinMode(alarmPin, OUTPUT);
  Serial.println("Multi-zone fire detection active");
}

void loop() {
  int zone1 = digitalRead(zone1Pin);
  int zone2 = digitalRead(zone2Pin);
  int zone3 = digitalRead(zone3Pin);

  bool fireDetected = false;

  if (zone1 == LOW) {
    Serial.println("FIRE in Kitchen!");
    fireDetected = true;
  }
  if (zone2 == LOW) {
    Serial.println("FIRE in Living Room!");
    fireDetected = true;
  }
  if (zone3 == LOW) {
    Serial.println("FIRE in Bedroom!");
    fireDetected = true;
  }

  if (fireDetected) {
    digitalWrite(alarmPin, HIGH);
    delay(200);
    digitalWrite(alarmPin, LOW);
    delay(200);
  } else {
    digitalWrite(alarmPin, LOW);
    Serial.println("All zones: OK");
    delay(1000);
  }
}
```

### Flame Duration Tracker

```cpp
const int flamePin = 2;
unsigned long flameStartTime = 0;
bool flameActive = false;

void setup() {
  Serial.begin(9600);
  pinMode(flamePin, INPUT);
}

void loop() {
  int flameState = digitalRead(flamePin);

  if (flameState == LOW && !flameActive) {
    // Flame just detected
    flameStartTime = millis();
    flameActive = true;
    Serial.println("Flame detected");
  }

  if (flameState == HIGH && flameActive) {
    // Flame extinguished
    unsigned long duration = (millis() - flameStartTime) / 1000;
    flameActive = false;

    Serial.print("Flame duration: ");
    Serial.print(duration);
    Serial.println(" seconds");
  }

  delay(100);
}
```

### Flame with Buzzer Pattern

```cpp
const int flamePin = 2;
const int buzzerPin = 3;

void setup() {
  Serial.begin(9600);
  pinMode(flamePin, INPUT);
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  int flameState = digitalRead(flamePin);

  if (flameState == LOW) {
    // Fast alarm pattern
    Serial.println("FIRE!");
    for (int i = 0; i < 5; i++) {
      digitalWrite(buzzerPin, HIGH);
      delay(100);
      digitalWrite(buzzerPin, LOW);
      delay(100);
    }
  } else {
    Serial.println("Safe");
    delay(1000);
  }
}
```

## Sensitivity Adjustment

The onboard potentiometer adjusts detection sensitivity:

1. Use small screwdriver
2. **Clockwise:** More sensitive (detects flames farther away, more false positives)
3. **Counter-clockwise:** Less sensitive (closer detection, fewer false positives)
4. **Optimal Setting:**
   - Detects intended flame source at desired distance
   - Doesn't trigger on sunlight or other IR sources

**Calibration Procedure:**

```
1. Place flame source at target distance (e.g., 80cm)
2. Adjust pot until sensor just reliably detects flame
3. Test with no flame - should read HIGH
4. Test with sunlight - adjust if false positives occur
```

## False Positive Sources

The sensor responds to various IR sources:

| Source                 | Response      | Mitigation                        |
| ---------------------- | ------------- | --------------------------------- |
| **Direct sunlight**    | Strong        | Shield sensor, reduce sensitivity |
| **IR remote controls** | Weak          | Usually ignorable                 |
| **Incandescent bulbs** | Moderate      | Shield or reduce sensitivity      |
| **Welding arc**        | Strong        | Shield sensor                     |
| **Hot surfaces**       | Weak-Moderate | Normal operation                  |

**Reducing False Positives:**

- Shield sensor from direct sunlight
- Reduce sensitivity potentiometer
- Mount sensor away from windows
- Use multiple sensors for confirmation

## Detection Distance

Flame detection distance depends on flame size:

| Flame Type    | Detection Distance |
| ------------- | ------------------ |
| Lighter flame | 30-60cm            |
| Candle        | 60-80cm            |
| Large candle  | 80-100cm           |
| Torch         | 100cm+             |

**Factors Affecting Range:**

- Flame size and intensity
- Ambient IR interference
- Sensor sensitivity setting
- Viewing angle

## Debouncing Flame Detection

Flames flicker naturally, causing rapid state changes:

```cpp
const int flamePin = 2;
const unsigned long debounceDelay = 500;
unsigned long lastDebounceTime = 0;
int lastStableState = HIGH;

void setup() {
  Serial.begin(9600);
  pinMode(flamePin, INPUT);
}

void loop() {
  int reading = digitalRead(flamePin);

  if (reading != lastStableState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    // State stable for debounce period
    if (reading == LOW) {
      Serial.println("FIRE (stable)");
    } else {
      Serial.println("No fire (stable)");
    }
    lastStableState = reading;
    delay(500);
  }
}
```

## Safety Considerations

**⚠️ NOT A CERTIFIED FIRE DETECTOR:**

- For educational/hobby use only
- Cannot replace code-compliant smoke/fire detectors
- Not suitable for critical safety applications
- Use as early warning or educational tool only

**If Real Fire Detected:**

1. ✅ Evacuate immediately
2. ✅ Call emergency services (911)
3. ✅ Do not fight large fires
4. ✅ Close doors to contain fire
5. ✅ Meet at designated safe location

## Integration Examples

See [integration recipes](../../integrations/) for projects combining flame sensor with:

- Buzzer (fire alarm)
- LED (flame indicator)
- OLED display (fire location display)
- Relay (fire suppression system trigger)

## Additional Resources

- [Flame Detection Technology](https://en.wikipedia.org/wiki/Flame_detector)
- [Fire Safety Basics](https://www.nfpa.org/Public-Education)
- [YG1006 Flame Sensor Info](https://wiki.seeedstudio.com/Grove-Flame_Sensor/)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**⚠️ SAFETY:** Not a certified fire detector - for educational use only!  
**⚠️ WARNING:** Test safely with fire extinguisher nearby!
