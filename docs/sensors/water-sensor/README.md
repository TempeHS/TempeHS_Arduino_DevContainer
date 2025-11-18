# Grove Water Sensor

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Water_Sensor/  
**Connection Type:** Digital

## Overview

The Grove Water Sensor detects the presence of water or conductive liquids. Uses exposed traces that complete a circuit when water bridges them. Outputs LOW when water detected, HIGH when dry. Ideal for leak detection, rain sensors, and water level monitoring.

## Authoritative References

- [Grove Water Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Water_Sensor/)
- [Water Detection Systems](https://www.arduino.cc/en/Tutorial/BuiltInExamples)

## Hardware Setup

- **Connection Type:** Digital
- **Grove Port:** Any digital port (D2-D13)
- **Detection Method:** Conductivity between exposed traces
- **Sensitivity:** Adjustable via onboard potentiometer
- **Operating Voltage:** 3.3V - 5V
- **Output:** Digital (LOW = water detected, HIGH = dry)
- **Wiring:** Connect to Grove Base Shield digital port using 4-pin Grove cable

![Grove Water Sensor](https://files.seeedstudio.com/wiki/Grove-Water_Sensor/img/Grove-Water_Sensor-1.png)

## Software Prerequisites

No library required - uses standard `digitalRead()`.

## Example Code

```cpp
/*
  Purpose: Water leak detection
  Notes:
    1. Connect to digital pin
    2. LOW = water detected
    3. HIGH = dry
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Water_Sensor/
*/

const int waterPin = 2;  // Connect to D2

void setup() {
  Serial.begin(9600);
  pinMode(waterPin, INPUT);
  Serial.println("Water Sensor initialized");
}

void loop() {
  int waterState = digitalRead(waterPin);

  if (waterState == LOW) {
    Serial.println("WATER DETECTED!");
  } else {
    Serial.println("Dry");
  }

  delay(500);
}
```

### Water Leak Alarm

```cpp
const int waterPin = 2;
const int buzzerPin = 3;
const int ledPin = 13;

void setup() {
  Serial.begin(9600);
  pinMode(waterPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
  pinMode(ledPin, OUTPUT);
  Serial.println("Water leak detector active");
}

void loop() {
  int waterState = digitalRead(waterPin);

  if (waterState == LOW) {
    // Water detected - sound alarm
    Serial.println("LEAK DETECTED!");
    digitalWrite(ledPin, HIGH);
    digitalWrite(buzzerPin, HIGH);
    delay(200);
    digitalWrite(buzzerPin, LOW);
    delay(200);
  } else {
    // No water - all clear
    digitalWrite(ledPin, LOW);
    digitalWrite(buzzerPin, LOW);
  }

  delay(100);
}
```

**Key Points:**

- LOW (0) = Water detected (circuit closed)
- HIGH (1) = Dry (circuit open)
- Works with tap water, rain, most liquids
- Sensitivity adjustable with potentiometer
- Not suitable for pure distilled water (low conductivity)
- Exposed traces can corrode over time

## Testing Procedure

1. Connect water sensor to digital port (e.g., D2)
2. Upload basic example
3. Open Serial Monitor (9600 baud)
4. **Expected output (dry):**
   - "Dry"
5. **Test with water:**
   - Touch wet finger across sensor traces
   - "WATER DETECTED!"
6. **Dry sensor:**
   - Wipe sensor dry
   - Returns to "Dry"

## Troubleshooting

| Problem               | Solution                                         |
| --------------------- | ------------------------------------------------ |
| Always reads LOW      | Sensor wet or corroded; clean/dry sensor         |
| Always reads HIGH     | Not enough water contact; adjust sensitivity pot |
| Intermittent readings | Water evaporating; normal for small amounts      |
| No response           | Check digital pin connection, verify power       |
| Corroded traces       | Replace sensor or apply conformal coating        |

## Technical Specifications

- **Detection Method:** Electrical conductivity
- **Operating Voltage:** 3.3V - 5V
- **Output Type:** Digital (TTL)
- **Sensitivity:** Adjustable (potentiometer)
- **Response Time:** Immediate (<100ms)
- **Trace Spacing:** ~2mm
- **Detection Area:** Exposed copper traces on PCB
- **Operating Temperature:** 0°C to 40°C
- **Lifespan:** Limited by corrosion (6-12 months typical)

## Common Use Cases

### Basement Flood Detector

```cpp
const int waterPin = 2;
const int alarmPin = 3;
bool alarmTriggered = false;

void setup() {
  Serial.begin(9600);
  pinMode(waterPin, INPUT);
  pinMode(alarmPin, OUTPUT);
  Serial.println("Basement flood detector active");
}

void loop() {
  int waterState = digitalRead(waterPin);

  if (waterState == LOW && !alarmTriggered) {
    Serial.println("FLOOD DETECTED!");
    alarmTriggered = true;
    // Send notification, log event, etc.
  }

  if (alarmTriggered) {
    // Continuous alarm
    digitalWrite(alarmPin, HIGH);
    delay(500);
    digitalWrite(alarmPin, LOW);
    delay(500);
  }

  delay(100);
}
```

### Rain Detector

```cpp
const int waterPin = 2;

void setup() {
  Serial.begin(9600);
  pinMode(waterPin, INPUT);
  Serial.println("Rain detector ready");
}

void loop() {
  int rainState = digitalRead(waterPin);

  if (rainState == LOW) {
    Serial.println("RAINING!");
  } else {
    Serial.println("No rain");
  }

  delay(1000);
}
```

### Multiple Water Sensors

```cpp
const int sensor1Pin = 2;  // Kitchen
const int sensor2Pin = 3;  // Bathroom
const int sensor3Pin = 4;  // Basement

void setup() {
  Serial.begin(9600);
  pinMode(sensor1Pin, INPUT);
  pinMode(sensor2Pin, INPUT);
  pinMode(sensor3Pin, INPUT);
  Serial.println("Multi-zone water detection active");
}

void loop() {
  int kitchen = digitalRead(sensor1Pin);
  int bathroom = digitalRead(sensor2Pin);
  int basement = digitalRead(sensor3Pin);

  if (kitchen == LOW) {
    Serial.println("LEAK in Kitchen!");
  }
  if (bathroom == LOW) {
    Serial.println("LEAK in Bathroom!");
  }
  if (basement == LOW) {
    Serial.println("LEAK in Basement!");
  }

  if (kitchen == HIGH && bathroom == HIGH && basement == HIGH) {
    Serial.println("All zones: OK");
  }

  delay(1000);
}
```

### Water Detection Counter

```cpp
const int waterPin = 2;
int detectionCount = 0;
int lastState = HIGH;

void setup() {
  Serial.begin(9600);
  pinMode(waterPin, INPUT);
  Serial.println("Water detection counter");
}

void loop() {
  int currentState = digitalRead(waterPin);

  // Count transitions from dry to wet
  if (currentState == LOW && lastState == HIGH) {
    detectionCount++;
    Serial.print("Detection event #");
    Serial.println(detectionCount);
    delay(1000);  // Debounce
  }

  lastState = currentState;
  delay(100);
}
```

## Sensitivity Adjustment

The onboard potentiometer adjusts detection sensitivity:

1. Use small screwdriver
2. **Clockwise:** More sensitive (detects smaller water amounts)
3. **Counter-clockwise:** Less sensitive (requires more water)
4. Test with small water droplets
5. Optimal setting: Just reliably detects your target amount

## Maintenance and Longevity

**Extending Sensor Life:**

- Apply conformal coating to exposed traces
- Keep sensor clean and dry when not in use
- Avoid prolonged water exposure
- Mount vertically to prevent water pooling
- Use in intermittent detection (not continuous immersion)

**Signs of Wear:**

- Green/white corrosion on copper traces
- Intermittent false readings
- Reduced sensitivity
- Discolored PCB

**Replacement:** Sensor is consumable; expect 6-12 month lifespan with regular water exposure.

## Placement Tips

**For Leak Detection:**

- Place on floor at lowest point
- Near water heaters, washing machines, sinks
- Behind toilets, under sinks
- Basement corners

**For Rain Detection:**

- Mount sensor outdoors (angled to shed water)
- Protect electronics (only sensor exposed)
- Ensure good drainage

**For General Use:**

- Sensor must be horizontal (traces up)
- Avoid standing water (can damage sensor)
- Ensure traces are accessible to liquid

## Limitations

**Won't Detect:**

- Pure distilled water (no conductivity)
- Non-conductive liquids (oil, alcohol)
- Very small amounts (< 1-2 drops)

**Best Detects:**

- Tap water (excellent)
- Salt water (excellent)
- Rain water (good)
- Most aqueous solutions (good)

## Integration Examples

See [integration recipes](../../integrations/) for projects combining water sensor with:

- Buzzer (leak alarm)
- LED (water indicator)
- OLED display (zone monitoring)
- Relay (automatic shutoff valve)

## Additional Resources

- [Water Detection Systems](https://www.arduino.cc/en/Tutorial/BuiltInExamples)
- [Leak Detection Guide](https://en.wikipedia.org/wiki/Water_detection)
- [Sensor Maintenance Tips](https://wiki.seeedstudio.com/Grove-Water_Sensor/)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Lifespan:** 6-12 months typical (consumable component)
