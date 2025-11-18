# Grove Gas Sensor (MQ9)

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Gas_Sensor-MQ9/  
**Connection Type:** Analog

## Overview

The Grove Gas Sensor (MQ9) detects carbon monoxide (CO), methane (CH4), and liquefied petroleum gas (LPG). Provides analog output proportional to gas concentration. Requires 24-48 hour initial burn-in and 20-30 second warm-up before each use. Ideal for gas leak detection and safety monitoring.

## Authoritative References

- [Grove Gas Sensor MQ9 - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Gas_Sensor-MQ9/)
- [MQ-9 Datasheet](https://www.sparkfun.com/datasheets/Sensors/Biometric/MQ-9.pdf)

## Hardware Setup

- **Connection Type:** Analog
- **Grove Port:** Any analog port (A0-A3)
- **Sensor Type:** MQ-9 tin dioxide (SnO2) semiconductor
- **Target Gases:** CO (10-1000ppm), CH4 (100-10000ppm), LPG (100-10000ppm)
- **Operating Voltage:** 5V
- **Warm-up Time:** 20-30 seconds (after 24-48h burn-in)
- **Heater Voltage:** 5V ± 0.1V
- **Load Resistance:** Adjustable (5-47kΩ)
- **Wiring:** Connect to Grove Base Shield analog port using 4-pin Grove cable

![Grove MQ9 Gas Sensor](https://files.seeedstudio.com/wiki/Grove-Gas_Sensor-MQ9/img/Grove-Gas_Sensor-MQ9_big.jpg)

## Software Prerequisites

No library required - uses standard `analogRead()`.

## Example Code

```cpp
/*
  Purpose: Detect presence of Carbon Monoxide, Coal Gas, Liquefied Gas
  Notes:
    1. Analog sensor - higher voltage = higher concentration
    2. Requires 24-48h burn-in when first used
    3. Requires 20-30 second warm-up each power-on
    4. Cannot differentiate between gases
  Author: Ben Jones 23/7/23
  Source: https://wiki.seeedstudio.com/Grove-Gas_Sensor-MQ9/
*/

const int gasPin = A0;

void setup() {
  Serial.begin(9600);
  pinMode(gasPin, INPUT);
  Serial.println("Gas Sensor MQ9 initialized");
  Serial.println("Warming up for 30 seconds...");
  delay(30000);  // 30 second warm-up
  Serial.println("Sensor ready");
}

void loop() {
  int sensorValue = analogRead(gasPin);

  // Convert to voltage (Uno R4: 14-bit ADC, 0-5V)
  float sensor_volt = sensorValue * (5.0 / 16383.0);

  Serial.print("Sensor Value: ");
  Serial.print(sensorValue);
  Serial.print(" | Voltage: ");
  Serial.print(sensor_volt, 3);
  Serial.println("V");

  // Simple threshold detection
  if (sensor_volt > 2.0) {
    Serial.println("WARNING: Gas detected!");
  }

  delay(1000);
}
```

### Gas Leak Alarm

```cpp
const int gasPin = A0;
const int buzzerPin = 3;
const int ledPin = 13;
const float alarmThreshold = 2.0;  // Volts

void setup() {
  Serial.begin(9600);
  pinMode(gasPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
  pinMode(ledPin, OUTPUT);

  Serial.println("Gas leak detector");
  Serial.println("Warming up...");
  delay(30000);
  Serial.println("System armed");
}

void loop() {
  int sensorValue = analogRead(gasPin);
  float sensor_volt = sensorValue * (5.0 / 16383.0);

  Serial.print("Gas level: ");
  Serial.print(sensor_volt, 2);
  Serial.println("V");

  if (sensor_volt > alarmThreshold) {
    // GAS DETECTED - ALARM
    Serial.println("DANGER: GAS LEAK DETECTED!");
    digitalWrite(ledPin, HIGH);
    digitalWrite(buzzerPin, HIGH);
    delay(200);
    digitalWrite(buzzerPin, LOW);
    delay(200);
  } else {
    // All clear
    digitalWrite(ledPin, LOW);
    digitalWrite(buzzerPin, LOW);
  }

  delay(500);
}
```

**Key Points:**

- **CRITICAL:** Requires 24-48h burn-in when first used or after long storage
- Warm-up: 20-30 seconds each power-on
- Higher voltage = higher gas concentration
- Cannot differentiate CO, CH4, or LPG
- Sensitive to temperature and humidity
- Not suitable for precise concentration measurement
- Best for presence/absence detection

## Testing Procedure

**Initial Setup (First Time Use):**

1. Connect MQ9 sensor to analog port (e.g., A0)
2. **Power sensor continuously for 24-48 hours** (critical!)
3. This burns off manufacturing residues

**Daily Use:**

1. Power on sensor
2. **Wait 20-30 seconds for warm-up**
3. Upload basic example
4. Open Serial Monitor (9600 baud)
5. **Baseline (clean air):**
   - Typical voltage: 0.5-1.5V (varies by environment)
6. **Test with gas:**
   - **WARNING: Use small amounts in ventilated area**
   - Bring lighter gas near sensor (don't ignite!)
   - Voltage should increase significantly
   - Remove gas source immediately

**⚠️ SAFETY WARNING:**

- Test only in well-ventilated area
- Never test with ignited gas
- Have fire extinguisher nearby
- Do not use near open flames
- Evacuate if real leak detected

## Troubleshooting

| Problem             | Solution                                               |
| ------------------- | ------------------------------------------------------ |
| Very high readings  | Sensor not burned in; run 24-48h continuously          |
| No response to gas  | Check analog pin, verify sensor is warm (hot to touch) |
| Unstable readings   | Normal during warm-up; wait full 30 seconds            |
| Always reads high   | May be damaged or in contaminated environment          |
| Inconsistent values | Temperature/humidity changes affect sensor             |

## Technical Specifications

- **Sensor Type:** MQ-9 semiconductor (SnO2)
- **Target Gases:**
  - Carbon Monoxide (CO): 10-1000ppm
  - Methane (CH4): 100-10000ppm
  - LPG: 100-10000ppm
- **Heater Voltage:** 5V ± 0.1V
- **Heater Current:** ~150mA
- **Detection Voltage:** 0.3V - 3.0V (typical range)
- **Operating Temperature:** -10°C to 50°C
- **Operating Humidity:** < 95% RH
- **Response Time:** < 10 seconds
- **Recovery Time:** < 30 seconds
- **Burn-in Time:** 24-48 hours (first use)
- **Warm-up Time:** 20-30 seconds (each power-on)
- **Sensitivity:** Can be adjusted via onboard potentiometer

## Common Use Cases

### Kitchen Gas Detector

```cpp
const int gasPin = A0;
const int alarmPin = 3;
const float safeLevel = 1.5;
const float dangerLevel = 2.5;

void setup() {
  Serial.begin(9600);
  pinMode(gasPin, INPUT);
  pinMode(alarmPin, OUTPUT);
  delay(30000);  // Warm-up
  Serial.println("Kitchen gas detector ready");
}

void loop() {
  int sensorValue = analogRead(gasPin);
  float voltage = sensorValue * (5.0 / 16383.0);

  if (voltage < safeLevel) {
    Serial.println("Status: SAFE");
    digitalWrite(alarmPin, LOW);
  } else if (voltage < dangerLevel) {
    Serial.println("Status: CAUTION");
    digitalWrite(alarmPin, HIGH);
    delay(100);
    digitalWrite(alarmPin, LOW);
    delay(1000);
  } else {
    Serial.println("Status: DANGER!");
    digitalWrite(alarmPin, HIGH);
    delay(100);
    digitalWrite(alarmPin, LOW);
    delay(100);
  }

  delay(500);
}
```

### Gas Level Monitor with Averaging

```cpp
const int gasPin = A0;
const int numReadings = 10;
float readings[numReadings];
int readIndex = 0;

void setup() {
  Serial.begin(9600);
  pinMode(gasPin, INPUT);
  delay(30000);

  // Initialize array
  for (int i = 0; i < numReadings; i++) {
    readings[i] = 0;
  }

  Serial.println("Gas monitor with averaging");
}

void loop() {
  int sensorValue = analogRead(gasPin);
  float voltage = sensorValue * (5.0 / 16383.0);

  // Store reading
  readings[readIndex] = voltage;
  readIndex = (readIndex + 1) % numReadings;

  // Calculate average
  float total = 0;
  for (int i = 0; i < numReadings; i++) {
    total += readings[i];
  }
  float average = total / numReadings;

  Serial.print("Current: ");
  Serial.print(voltage, 2);
  Serial.print("V | Average: ");
  Serial.print(average, 2);
  Serial.println("V");

  delay(1000);
}
```

### Baseline Calibration

```cpp
const int gasPin = A0;

void setup() {
  Serial.begin(9600);
  pinMode(gasPin, INPUT);

  Serial.println("Warming up...");
  delay(30000);

  Serial.println("Measuring clean air baseline (30 samples)...");
  float sum = 0;
  for (int i = 0; i < 30; i++) {
    int value = analogRead(gasPin);
    float voltage = value * (5.0 / 16383.0);
    sum += voltage;
    Serial.print(".");
    delay(1000);
  }

  float baseline = sum / 30.0;
  Serial.println();
  Serial.print("Baseline established: ");
  Serial.print(baseline, 2);
  Serial.println("V");
  Serial.println("Use this as your 'clean air' reference");
}

void loop() {
  // Empty - baseline established
}
```

## Burn-In Procedure

**Why Burn-In is Critical:**

- Sensor coating has manufacturing residues
- Residues cause false high readings
- Must be heated continuously for 24-48 hours
- Only needed once (or after months of storage)

**How to Burn-In:**

```cpp
void setup() {
  Serial.begin(9600);
  pinMode(A0, INPUT);  // Initialize sensor
  Serial.println("BURN-IN MODE");
  Serial.println("Keep powered for 24-48 hours");
  Serial.println("Do not disconnect power!");
}

void loop() {
  // Just keep powered - sensor heats automatically
  unsigned long hours = millis() / 3600000;
  Serial.print("Burn-in time: ");
  Serial.print(hours);
  Serial.println(" hours");
  delay(3600000);  // Report every hour
}
```

**After Burn-In:**

- Sensor is ready for normal use
- Only requires 20-30 second warm-up each power-on
- Re-burn-in if stored for >1 month

## Gas Concentration Estimation

The sensor output is non-linear. For approximate concentration:

```cpp
// Rough estimation (not calibrated)
float voltageToPPM(float voltage) {
  // These are approximate values - requires calibration
  if (voltage < 1.0) return 0;      // Clean air
  if (voltage < 2.0) return 100;    // Low concentration
  if (voltage < 3.0) return 500;    // Medium concentration
  return 1000;                      // High concentration
}

void loop() {
  int sensorValue = analogRead(gasPin);
  float voltage = sensorValue * (5.0 / 16383.0);
  float ppm = voltageToPPM(voltage);

  Serial.print("Gas concentration: ~");
  Serial.print(ppm);
  Serial.println(" ppm (estimated)");

  delay(1000);
}
```

**Note:** For accurate ppm readings, sensor requires proper calibration with known gas concentrations.

## Safety Considerations

**CO Toxicity Levels:**

- 35 ppm: Max exposure (8 hours)
- 200 ppm: Headache after 2-3 hours
- 400 ppm: Headache after 1 hour
- 800 ppm: Nausea, dizziness (45 min)
- 1600 ppm: Death within 2 hours
- 3200 ppm: Death within 1 hour

**If Sensor Detects Gas:**

1. ✅ Evacuate area immediately
2. ✅ Ventilate (open windows/doors)
3. ✅ Do not use electrical switches
4. ✅ Call gas company or emergency services
5. ✅ Do not re-enter until cleared

**Sensor Limitations:**

- Not a certified safety device
- For educational/hobby use only
- Cannot replace professional detectors
- Use as early warning only

## Integration Examples

See [integration recipes](../../integrations/) for projects combining MQ9 gas sensor with:

- Buzzer (gas alarm)
- LED (status indicator)
- OLED display (concentration display)
- Relay (ventilation fan control)

## Additional Resources

- [MQ-9 Datasheet](https://www.sparkfun.com/datasheets/Sensors/Biometric/MQ-9.pdf)
- [Gas Sensor Tutorial](https://learn.sparkfun.com/tutorials/mq-gas-sensor-hookup-guide)
- [Carbon Monoxide Safety](https://www.cdc.gov/co/default.htm)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**⚠️ CRITICAL:** Requires 24-48h burn-in on first use!  
**⚠️ SAFETY:** Not a certified safety device - for educational use only!
