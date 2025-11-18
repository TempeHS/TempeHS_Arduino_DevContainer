# Grove Capacitive Moisture Sensor (Corrosion Resistant)

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Capacitive_Moisture_Sensor-Corrosion-Resistant/  
**Connection Type:** Analog

## Overview

The Grove Capacitive Moisture Sensor measures soil moisture using capacitive sensing. Unlike resistive sensors, capacitive sensors have no exposed metal contacts, making them corrosion-resistant and longer-lasting. Provides analog output proportional to moisture level. Ideal for plant monitoring, irrigation control, and agricultural projects.

## Authoritative References

- [Grove Capacitive Moisture Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Capacitive_Moisture_Sensor-Corrosion-Resistant/)
- [Capacitive Soil Sensors](https://en.wikipedia.org/wiki/Capacitive_sensing)

## Hardware Setup

- **Connection Type:** Analog
- **Grove Port:** Any analog port (A0-A3)
- **Sensing Technology:** Capacitive (corrosion-resistant)
- **Operating Voltage:** 3.3V - 5V
- **Output Range:** 0-5V (varies with soil moisture)
- **Response Time:** ~1 second
- **Probe Material:** PCB substrate (no exposed metal)
- **Wiring:** Connect to Grove Base Shield analog port using 4-pin Grove cable

![Grove Soil Moisture](https://files.seeedstudio.com/wiki/Grove-Capacitive_Moisture_Sensor-Corrosion-Resistant/img/Thumbnail.jpg)

## Software Prerequisites

No library required - uses standard `analogRead()`.

## Example Code

```cpp
/*
  Purpose: Monitor soil moisture level
  Notes:
    1. Connect to analog pin
    2. Higher reading = wetter soil
    3. Requires calibration for soil type
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Capacitive_Moisture_Sensor-Corrosion-Resistant/
*/

const int moisturePin = A0;

void setup() {
  Serial.begin(9600);
  pinMode(moisturePin, INPUT);
  Serial.println("Soil Moisture Sensor initialized");
}

void loop() {
  int moisture = analogRead(moisturePin);

  // Convert to voltage (Uno R4: 14-bit ADC, 0-5V)
  float voltage = moisture * (5.0 / 16383.0);

  Serial.print("Moisture: ");
  Serial.print(moisture);
  Serial.print(" | Voltage: ");
  Serial.print(voltage, 2);
  Serial.print("V | ");

  // Classify moisture level (typical thresholds - calibrate for your soil)
  if (moisture < 4000) {
    Serial.println("Very Dry");
  } else if (moisture < 8000) {
    Serial.println("Dry");
  } else if (moisture < 12000) {
    Serial.println("Moist");
  } else {
    Serial.println("Wet");
  }

  delay(1000);
}
```

### Plant Watering Monitor

```cpp
const int moisturePin = A0;
const int ledPin = 13;
const int dryThreshold = 6000;  // Adjust for your plant

void setup() {
  Serial.begin(9600);
  pinMode(moisturePin, INPUT);
  pinMode(ledPin, OUTPUT);
  Serial.println("Plant watering monitor");
}

void loop() {
  int moisture = analogRead(moisturePin);

  Serial.print("Soil moisture: ");
  Serial.println(moisture);

  if (moisture < dryThreshold) {
    // Soil too dry - plant needs water
    Serial.println("STATUS: Plant needs water!");
    digitalWrite(ledPin, HIGH);
  } else {
    // Soil moist enough
    Serial.println("STATUS: Soil moisture OK");
    digitalWrite(ledPin, LOW);
  }

  delay(2000);
}
```

**Key Points:**

- Higher reading = wetter soil
- Lower reading = drier soil
- **Must calibrate** for specific soil type
- Air: ~0-1000 (very dry)
- Water: ~15000-16000 (very wet)
- Typical plant range: 6000-12000
- No exposed metal = longer lifespan

## Testing Procedure

1. Connect moisture sensor to analog port (e.g., A0)
2. Upload basic example
3. Open Serial Monitor (9600 baud)
4. **Test in air:**
   - Hold sensor in air
   - Reading: ~500-2000 (very dry)
5. **Test in dry soil:**
   - Insert sensor into dry pot
   - Reading: ~3000-6000
6. **Test in moist soil:**
   - Water the soil
   - Reading increases: ~8000-12000
7. **Test in water:**
   - Insert tip in water
   - Reading: ~14000-16000 (saturated)

## Troubleshooting

| Problem               | Solution                                                 |
| --------------------- | -------------------------------------------------------- |
| Always reads low      | Sensor not in soil; check analog pin connection          |
| Always reads high     | Sensor in water or very wet soil; let dry                |
| Inconsistent readings | Soil composition varies; use averaging                   |
| No response to water  | Wait 1-2 minutes for water to penetrate                  |
| Reading drifts        | Normal for soil sensors; use thresholds not exact values |

## Technical Specifications

- **Sensing Method:** Capacitive (no exposed electrodes)
- **Operating Voltage:** 3.3V - 5V
- **Output Type:** Analog voltage (0-5V)
- **Output Range:** 0-16383 (14-bit ADC on Uno R4)
- **Probe Length:** ~60mm
- **Probe Width:** ~20mm
- **Response Time:** ~1 second
- **Operating Temperature:** 0°C to 40°C
- **Lifespan:** Years (corrosion-resistant)
- **Power Consumption:** < 5mA

## Common Use Cases

### Automatic Irrigation Controller

```cpp
const int moisturePin = A0;
const int pumpRelayPin = 2;
const int dryThreshold = 6000;
const int wetThreshold = 10000;

void setup() {
  Serial.begin(9600);
  pinMode(moisturePin, INPUT);
  pinMode(pumpRelayPin, OUTPUT);
  Serial.println("Auto irrigation system");
}

void loop() {
  int moisture = analogRead(moisturePin);
  int pumpState = digitalRead(pumpRelayPin);

  Serial.print("Moisture: ");
  Serial.println(moisture);

  if (moisture < dryThreshold && pumpState == LOW) {
    // Soil dry - start watering
    digitalWrite(pumpRelayPin, HIGH);
    Serial.println("Pump ON");
  } else if (moisture > wetThreshold && pumpState == HIGH) {
    // Soil wet enough - stop watering
    digitalWrite(pumpRelayPin, LOW);
    Serial.println("Pump OFF");
  }

  delay(5000);  // Check every 5 seconds
}
```

### Soil Moisture Logger

```cpp
const int moisturePin = A0;
unsigned long logInterval = 60000;  // 1 minute
unsigned long lastLog = 0;

void setup() {
  Serial.begin(9600);
  pinMode(moisturePin, INPUT);
  Serial.println("Time(min),Moisture,Status");
}

void loop() {
  if (millis() - lastLog >= logInterval) {
    int moisture = analogRead(moisturePin);
    unsigned long minutes = millis() / 60000;

    String status;
    if (moisture < 4000) status = "Very Dry";
    else if (moisture < 8000) status = "Dry";
    else if (moisture < 12000) status = "Moist";
    else status = "Wet";

    Serial.print(minutes);
    Serial.print(",");
    Serial.print(moisture);
    Serial.print(",");
    Serial.println(status);

    lastLog = millis();
  }
}
```

### Multiple Plant Monitor

```cpp
const int plant1Pin = A0;
const int plant2Pin = A1;
const int plant3Pin = A2;

void setup() {
  Serial.begin(9600);
  Serial.println("Multi-plant monitor");
}

void loop() {
  int plant1 = analogRead(plant1Pin);
  int plant2 = analogRead(plant2Pin);
  int plant3 = analogRead(plant3Pin);

  Serial.print("Plant 1: ");
  Serial.print(plant1);
  Serial.print(" | Plant 2: ");
  Serial.print(plant2);
  Serial.print(" | Plant 3: ");
  Serial.println(plant3);

  // Check which plants need water
  Serial.print("Needs water: ");
  if (plant1 < 6000) Serial.print("Plant1 ");
  if (plant2 < 6000) Serial.print("Plant2 ");
  if (plant3 < 6000) Serial.print("Plant3 ");
  Serial.println();

  delay(5000);
}
```

## Calibration Procedure

**Important:** Calibrate sensor for your specific soil type.

```cpp
const int moisturePin = A0;

void setup() {
  Serial.begin(9600);
  pinMode(moisturePin, INPUT);

  Serial.println("Soil Moisture Calibration");
  Serial.println("1. Insert sensor in completely DRY soil");
  Serial.println("   Press Enter when ready");
  while (!Serial.available()) {}
  Serial.read();

  // Measure dry soil
  long drySum = 0;
  for (int i = 0; i < 50; i++) {
    drySum += analogRead(moisturePin);
    delay(100);
  }
  int dryValue = drySum / 50;
  Serial.print("DRY value: ");
  Serial.println(dryValue);

  Serial.println("\n2. Water soil thoroughly");
  Serial.println("   Wait 2 minutes, then press Enter");
  while (!Serial.available()) {}
  Serial.read();
  delay(1000);

  // Measure wet soil
  long wetSum = 0;
  for (int i = 0; i < 50; i++) {
    wetSum += analogRead(moisturePin);
    delay(100);
  }
  int wetValue = wetSum / 50;
  Serial.print("WET value: ");
  Serial.println(wetValue);

  Serial.println("\n--- Calibration Complete ---");
  Serial.println("Use these values in your code:");
  Serial.print("const int dryThreshold = ");
  Serial.print(dryValue);
  Serial.println(";");
  Serial.print("const int wetThreshold = ");
  Serial.print(wetValue);
  Serial.println(";");
}

void loop() {
  // Calibration done in setup
}
```

## Moisture Percentage Conversion

Convert raw reading to percentage:

```cpp
const int airValue = 1000;    // Calibrated dry value
const int waterValue = 15000; // Calibrated wet value

int moisture = analogRead(moisturePin);

// Convert to percentage (0-100%)
int moisturePercent = map(moisture, airValue, waterValue, 0, 100);
moisturePercent = constrain(moisturePercent, 0, 100);

Serial.print("Moisture: ");
Serial.print(moisturePercent);
Serial.println("%");
```

## Soil Type Considerations

Different soils have different characteristics:

| Soil Type       | Typical Range   | Notes                                   |
| --------------- | --------------- | --------------------------------------- |
| **Sandy**       | Lower readings  | Drains quickly, needs frequent watering |
| **Loam**        | Mid readings    | Ideal for most plants                   |
| **Clay**        | Higher readings | Retains moisture longer                 |
| **Potting mix** | Varies          | Calibrate for specific brand            |

**Recommendation:** Calibrate sensor in the specific soil you'll use.

## Plant Watering Guidelines

Different plants have different moisture needs:

| Plant Type           | Soil Preference    | Typical Threshold |
| -------------------- | ------------------ | ----------------- |
| **Cacti/Succulents** | Very dry           | 3000-5000         |
| **Herbs**            | Dry-moist          | 5000-8000         |
| **Vegetables**       | Moist              | 8000-11000        |
| **Tropical plants**  | Consistently moist | 10000-13000       |
| **Ferns**            | Very moist         | 12000-14000       |

## Sensor Placement

**For Accurate Readings:**

- Insert sensor vertically to marked line
- Place near plant roots (not against stem)
- Keep sensor in same location for consistent readings
- Avoid touching sensor (body moisture affects reading)
- Don't insert/remove frequently (compacts soil)

## Advantages Over Resistive Sensors

| Feature         | Capacitive                    | Resistive                  |
| --------------- | ----------------------------- | -------------------------- |
| **Corrosion**   | None (no exposed metal)       | High (electrodes corrode)  |
| **Lifespan**    | Years                         | Months                     |
| **Accuracy**    | Stable long-term              | Degrades over time         |
| **Soil effect** | Minimal chemical interference | Affected by soil chemistry |
| **Cost**        | Higher                        | Lower                      |

## Integration Examples

See [integration recipes](../../integrations/) for projects combining soil moisture sensor with:

- OLED display (moisture dashboard)
- Relay (automatic watering system)
- LED (moisture indicator)
- Buzzer (watering reminder)

## Additional Resources

- [Capacitive Sensing Guide](https://en.wikipedia.org/wiki/Capacitive_sensing)
- [Plant Watering Needs](https://www.gardenersworld.com/how-to/grow-plants/how-to-water-plants/)
- [Soil Moisture Basics](https://www.arduino.cc/en/Tutorial/BuiltInExamples)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**⚠️ Important:** Calibrate sensor for your specific soil type!  
**✅ Advantage:** Corrosion-resistant, long lifespan!
