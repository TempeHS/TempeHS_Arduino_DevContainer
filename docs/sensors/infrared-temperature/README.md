# Grove Infrared Temperature Sensor

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Infrared_Temperature_Sensor/  
**Connection Type:** Analog

## Overview

The Grove Infrared Temperature Sensor measures temperature without physical contact using infrared radiation. Can measure object temperatures from -10°C to 80°C with ambient range -10°C to 80°C. Ideal for non-contact temperature measurement, fever detection, and surface temperature monitoring.

## Authoritative References

- [Grove Infrared Temperature Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Infrared_Temperature_Sensor/)
- [Infrared Thermometer Theory](https://en.wikipedia.org/wiki/Infrared_thermometer)

## Hardware Setup

- **Connection Type:** Analog
- **Grove Port:** Any analog port (A0-A3)
- **Sensor Type:** MLX90615 infrared thermometer
- **Measurement Range:** -10°C to 80°C (object), -10°C to 80°C (ambient)
- **Detection Distance:** ~1-5cm optimal
- **Accuracy:** ±2°C (typical)
- **Operating Voltage:** 3.3V - 5V
- **Wiring:** Connect to Grove Base Shield analog port using 4-pin Grove cable

![Grove IR Temperature](https://files.seeedstudio.com/wiki/Grove-Infrared_Temperature_Sensor/img/Grove_-_Infrared_Temperature_Sensor.jpg)

## Software Prerequisites

No library required - uses standard `analogRead()` with voltage conversion.

## Example Code

```cpp
/*
  Purpose: Non-contact temperature measurement
  Notes:
    1. Connect to analog pin
    2. Measurement range: -10°C to 80°C
    3. Distance: 1-5cm optimal
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Infrared_Temperature_Sensor/
*/

const int tempPin = A0;

void setup() {
  Serial.begin(9600);
  pinMode(tempPin, INPUT);
  Serial.println("IR Temperature Sensor initialized");
  Serial.println("Hold object 1-5cm from sensor");
}

void loop() {
  int reading = analogRead(tempPin);

  // Convert to voltage (Uno R4: 14-bit ADC, 0-5V)
  float voltage = reading * (5.0 / 16383.0);

  // Convert voltage to temperature
  // Formula from datasheet: T = (V - 0.5) / 0.01
  float temperature = (voltage - 0.5) * 100.0;

  Serial.print("Reading: ");
  Serial.print(reading);
  Serial.print(" | Voltage: ");
  Serial.print(voltage, 3);
  Serial.print("V | Temperature: ");
  Serial.print(temperature, 1);
  Serial.println("°C");

  delay(1000);
}
```

### Fever Detector

```cpp
const int tempPin = A0;
const float feverThreshold = 37.5;  // °C

void setup() {
  Serial.begin(9600);
  pinMode(tempPin, INPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.println("Fever Detection System");
  Serial.println("Hold near forehead (1-5cm)");
}

void loop() {
  int reading = analogRead(tempPin);
  float voltage = reading * (5.0 / 16383.0);
  float temperature = (voltage - 0.5) * 100.0;

  Serial.print("Temperature: ");
  Serial.print(temperature, 1);
  Serial.print("°C - ");

  if (temperature >= feverThreshold) {
    Serial.println("FEVER DETECTED!");
    digitalWrite(LED_BUILTIN, HIGH);
  } else {
    Serial.println("Normal");
    digitalWrite(LED_BUILTIN, LOW);
  }

  delay(2000);
}
```

**Key Points:**

- Non-contact measurement (no physical touch)
- Detection distance: 1-5cm optimal, up to 10cm possible
- Measures infrared radiation from object surface
- Affected by emissivity of surface (matte surfaces better than shiny)
- Cannot measure through glass or transparent materials
- Accuracy: ±2°C typical, ±0.5°C best case

## Testing Procedure

1. Connect IR temperature sensor to analog port (e.g., A0)
2. Upload basic example
3. Open Serial Monitor (9600 baud)
4. **Test with hand:**
   - Hold hand 3cm from sensor
   - Should read ~30-35°C (skin temperature)
5. **Test with warm object:**
   - Hold warm cup 3cm from sensor
   - Should read higher temperature
6. **Test distance effect:**
   - Move object closer/farther
   - Reading changes with distance

## Troubleshooting

| Problem              | Solution                                           |
| -------------------- | -------------------------------------------------- |
| Reading too high/low | Recalibrate formula, check voltage reference       |
| Unstable readings    | Keep distance constant (1-5cm), avoid air currents |
| Incorrect values     | Adjust for emissivity, use matte surface           |
| No response          | Check analog pin connection, verify power          |
| Reads ambient only   | Object too far; move closer (<5cm)                 |

## Technical Specifications

- **Sensor:** MLX90615 infrared thermometer
- **Object Temperature Range:** -10°C to 80°C
- **Ambient Temperature Range:** -10°C to 80°C
- **Accuracy:** ±2°C (typical)
- **Resolution:** 0.01°C
- **Field of View:** 35° cone
- **Response Time:** ~260ms
- **Operating Voltage:** 3.3V - 5V
- **Operating Current:** ~1.5mA
- **Output:** Analog voltage (proportional to temp)

## Common Use Cases

### Surface Temperature Monitor

```cpp
const int tempPin = A0;

void setup() {
  Serial.begin(9600);
  pinMode(tempPin, INPUT);
  Serial.println("Surface Temperature Monitor");
}

void loop() {
  int reading = analogRead(tempPin);
  float voltage = reading * (5.0 / 16383.0);
  float temperature = (voltage - 0.5) * 100.0;

  Serial.print("Surface: ");
  Serial.print(temperature, 1);
  Serial.println("°C");

  // Categorize temperature
  if (temperature < 20) {
    Serial.println("Status: COLD");
  } else if (temperature < 40) {
    Serial.println("Status: WARM");
  } else {
    Serial.println("Status: HOT");
  }

  delay(1000);
}
```

### Temperature Logging

```cpp
const int tempPin = A0;
const int numReadings = 10;
float readings[numReadings];
int readIndex = 0;

void setup() {
  Serial.begin(9600);
  pinMode(tempPin, INPUT);

  // Initialize array
  for (int i = 0; i < numReadings; i++) {
    readings[i] = 0;
  }
}

void loop() {
  int reading = analogRead(tempPin);
  float voltage = reading * (5.0 / 16383.0);
  float temperature = (voltage - 0.5) * 100.0;

  // Store reading
  readings[readIndex] = temperature;
  readIndex = (readIndex + 1) % numReadings;

  // Calculate average
  float total = 0;
  for (int i = 0; i < numReadings; i++) {
    total += readings[i];
  }
  float average = total / numReadings;

  Serial.print("Current: ");
  Serial.print(temperature, 1);
  Serial.print("°C | Average: ");
  Serial.print(average, 1);
  Serial.println("°C");

  delay(1000);
}
```

### Temperature Alarm

```cpp
const int tempPin = A0;
const int buzzerPin = 3;
const float maxTemp = 50.0;  // °C

void setup() {
  Serial.begin(9600);
  pinMode(tempPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
  Serial.println("Temperature Alarm System");
}

void loop() {
  int reading = analogRead(tempPin);
  float voltage = reading * (5.0 / 16383.0);
  float temperature = (voltage - 0.5) * 100.0;

  Serial.print("Temp: ");
  Serial.print(temperature, 1);
  Serial.println("°C");

  if (temperature > maxTemp) {
    Serial.println("ALARM: Temperature too high!");
    digitalWrite(buzzerPin, HIGH);
    delay(100);
    digitalWrite(buzzerPin, LOW);
    delay(100);
  }

  delay(500);
}
```

## Calibration

The sensor may require calibration for accuracy:

```cpp
// Adjust these values based on known reference temperature
const float offsetCorrection = 0.0;  // Add/subtract °C
const float gainCorrection = 1.0;    // Multiply by factor

void loop() {
  int reading = analogRead(tempPin);
  float voltage = reading * (5.0 / 16383.0);
  float rawTemp = (voltage - 0.5) * 100.0;

  // Apply calibration
  float calibratedTemp = (rawTemp * gainCorrection) + offsetCorrection;

  Serial.print("Raw: ");
  Serial.print(rawTemp, 1);
  Serial.print("°C | Calibrated: ");
  Serial.print(calibratedTemp, 1);
  Serial.println("°C");

  delay(1000);
}
```

## Emissivity Considerations

Different surfaces emit infrared radiation differently (emissivity):

| Surface Type      | Emissivity | Measurement Accuracy |
| ----------------- | ---------- | -------------------- |
| Human skin        | 0.98       | Excellent            |
| Matte black       | 0.95       | Excellent            |
| White paint       | 0.90       | Good                 |
| Wood              | 0.85       | Good                 |
| Plastic           | 0.80       | Fair                 |
| Shiny metal       | 0.10       | Poor                 |
| Polished aluminum | 0.05       | Very poor            |

**Best Practices:**

- Use matte surfaces for accurate readings
- Avoid reflective/shiny surfaces
- For metals, paint surface matte black
- Human skin measurements are naturally accurate

## Distance Effect

Temperature reading changes with distance:

```
Distance | Measured Area | Accuracy
---------|---------------|----------
1-2cm    | Small spot    | Best
3-5cm    | Medium spot   | Good
6-10cm   | Large area    | Fair
>10cm    | Very large    | Poor
```

Closer distances provide more accurate readings of smaller areas.

## Integration Examples

See [integration recipes](../../integrations/) for projects combining IR temperature with:

- OLED display (temperature display)
- Buzzer (fever alarm)
- LED (temperature indicator)
- Relay (temperature-controlled devices)

## Additional Resources

- [MLX90615 Datasheet](https://www.melexis.com/en/product/MLX90615/Digital-Plug-Play-Infrared-Thermometer-TO-Can)
- [Infrared Thermometry Guide](https://en.wikipedia.org/wiki/Infrared_thermometer)
- [Emissivity Reference](https://www.thermoworks.com/emissivity-table/)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Sensor:** MLX90615 infrared thermometer
