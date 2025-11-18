# Grove Gas Sensor (Alcohol) - MQ-3

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Gas_Sensor-MQ3/  
**Connection Type:** Analog

## Overview

The Grove MQ-3 gas sensor detects alcohol vapor (ethanol) and is suitable for breathalyzer projects, alcohol detection systems, and air quality monitoring. Uses tin dioxide (SnO₂) semiconductor with high sensitivity to alcohol concentrations from 0.04-4 mg/L. Requires 24-48 hour burn-in period before first use. Also responds to benzene, LPG, and other organic vapors.

## Authoritative References

- [Grove Gas Sensor MQ-3 - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Gas_Sensor-MQ3/)
- [MQ-3 Datasheet](https://www.sparkfun.com/datasheets/Sensors/MQ-3.pdf)
- [MQ Sensor Series Guide](https://learn.sparkfun.com/tutorials/gas-sensor-guide)

## Hardware Setup

- **Connection Type:** Analog
- **Grove Port:** Any analog port (A0-A3)
- **Detection Gas:** Alcohol vapor (ethanol, methanol, isopropanol)
- **Detection Range:** 0.04-4 mg/L (25-500 ppm)
- **Operating Voltage:** 5V (heater requires 5V)
- **Heater Voltage:** 5V ± 0.1V
- **Heater Current:** ~150mA (requires adequate power supply)
- **Load Resistance:** 200kΩ (onboard)
- **Warm-up Time:** 20-180 seconds per power-on
- **Burn-in Time:** 24-48 hours before first use
- **Wiring:** Connect to Grove Base Shield analog port using 4-pin Grove cable

![Grove MQ-3 Sensor](https://files.seeedstudio.com/wiki/Grove-Gas_Sensor-MQ3/img/MQ-3.jpg)

**⚠️ SAFETY WARNINGS:**

- Heater element gets HOT during operation
- Do not touch sensor surface while powered
- Keep away from flammable materials
- Ensure adequate ventilation
- Not for professional breathalyzer use
- For educational purposes only

## Software Prerequisites

No library required - uses standard `analogRead()`.

## Example Code

```cpp
/*
  Purpose: Detect alcohol vapor with MQ-3 sensor
  Notes:
    1. Connect to analog pin
    2. Requires 24-48h burn-in before first use
    3. Allow 3-minute warm-up after power-on
    4. Heater draws ~150mA (ensure adequate supply)
    5. Sensor gets hot - do not touch
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Gas_Sensor-MQ3/
*/

const int alcoholPin = A0;
const int buzzerPin = 3;
const int ledPin = 4;

// Calibration values (adjust based on testing)
const int cleanAirValue = 100;  // Reading in clean air (after warm-up)
const int alcoholThreshold = 200;  // Threshold for alcohol detection

void setup() {
  Serial.begin(9600);
  pinMode(alcoholPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
  pinMode(ledPin, OUTPUT);

  Serial.println("MQ-3 Alcohol Sensor");
  Serial.println("⚠️ WARNING: Sensor heater gets HOT!");
  Serial.println("Warming up for 3 minutes...");

  // Warm-up period (3 minutes)
  for (int i = 180; i > 0; i--) {
    Serial.print("Warm-up: ");
    Serial.print(i);
    Serial.println(" seconds remaining");
    delay(1000);
  }

  Serial.println("Sensor ready!");
  Serial.println("Blow alcohol vapor near sensor to test");
}

void loop() {
  int sensorValue = analogRead(alcoholPin);

  Serial.print("Alcohol Level: ");
  Serial.print(sensorValue);

  if (sensorValue > alcoholThreshold) {
    Serial.println(" - ALCOHOL DETECTED!");
    digitalWrite(ledPin, HIGH);
    digitalWrite(buzzerPin, HIGH);
    delay(100);
    digitalWrite(buzzerPin, LOW);
  } else {
    Serial.println(" - Clean air");
    digitalWrite(ledPin, LOW);
  }

  delay(1000);
}
```

### Breathalyzer Simulator

```cpp
const int alcoholPin = A0;
const int greenLED = 3;
const int yellowLED = 4;
const int redLED = 5;
const int buzzerPin = 6;

// Calibration (adjust for your sensor)
const int baselineValue = 100;  // Clean air reading
const int lowLevel = 150;  // Low alcohol
const int mediumLevel = 250;  // Medium alcohol
const int highLevel = 400;  // High alcohol

void setup() {
  Serial.begin(9600);
  pinMode(alcoholPin, INPUT);
  pinMode(greenLED, OUTPUT);
  pinMode(yellowLED, OUTPUT);
  pinMode(redLED, OUTPUT);
  pinMode(buzzerPin, OUTPUT);

  Serial.println("===== BREATHALYZER SIMULATOR =====");
  Serial.println("⚠️ NOT FOR ACTUAL ALCOHOL TESTING");
  Serial.println("Educational purposes only!");
  Serial.println("\nWarm-up in progress (3 minutes)...");

  // Warm-up with countdown
  for (int i = 180; i > 0; i--) {
    if (i % 30 == 0) {
      Serial.print(i);
      Serial.println(" seconds remaining...");
    }
    delay(1000);
  }

  Serial.println("\n✓ Ready for testing");
  Serial.println("Instructions:");
  Serial.println("1. Blow toward sensor from 5cm distance");
  Serial.println("2. Wait 3 seconds for reading");
  Serial.println("3. Results displayed with LED indicator\n");
}

void loop() {
  int sensorValue = analogRead(alcoholPin);
  int alcoholLevel = sensorValue - baselineValue;

  // Turn off all LEDs
  digitalWrite(greenLED, LOW);
  digitalWrite(yellowLED, LOW);
  digitalWrite(redLED, LOW);

  Serial.print("Raw: ");
  Serial.print(sensorValue);
  Serial.print(" | Level: ");
  Serial.print(alcoholLevel);
  Serial.print(" | Status: ");

  // Interpret reading
  if (alcoholLevel < lowLevel) {
    // No alcohol detected
    digitalWrite(greenLED, HIGH);
    Serial.println("✓ PASS - No alcohol detected");
  } else if (alcoholLevel < mediumLevel) {
    // Low alcohol
    digitalWrite(yellowLED, HIGH);
    Serial.println("⚠ CAUTION - Low alcohol detected");
    tone(buzzerPin, 1000, 100);
  } else if (alcoholLevel < highLevel) {
    // Medium alcohol
    digitalWrite(redLED, HIGH);
    Serial.println("✗ WARNING - Medium alcohol detected");
    tone(buzzerPin, 1500, 200);
  } else {
    // High alcohol
    digitalWrite(redLED, HIGH);
    Serial.println("✗✗ DANGER - High alcohol detected!");
    // Pulsing alarm
    for (int i = 0; i < 3; i++) {
      tone(buzzerPin, 2000, 100);
      delay(150);
    }
  }

  delay(2000);
}
```

### Alcohol Vapor Logger

```cpp
const int alcoholPin = A0;
unsigned long logInterval = 5000;  // Log every 5 seconds
unsigned long lastLog = 0;
bool warmUpComplete = false;

void setup() {
  Serial.begin(9600);
  pinMode(alcoholPin, INPUT);

  Serial.println("MQ-3 Alcohol Vapor Logger");
  Serial.println("Warming up (3 minutes)...");

  // Non-blocking warm-up
  delay(180000);  // 3 minutes

  warmUpComplete = true;
  Serial.println("Time(s),Sensor_Value,Status");
}

void loop() {
  if (warmUpComplete && (millis() - lastLog >= logInterval)) {
    int sensorValue = analogRead(alcoholPin);
    unsigned long seconds = millis() / 1000;

    Serial.print(seconds);
    Serial.print(",");
    Serial.print(sensorValue);
    Serial.print(",");

    if (sensorValue < 150) {
      Serial.println("Clean");
    } else if (sensorValue < 300) {
      Serial.println("Low");
    } else if (sensorValue < 500) {
      Serial.println("Medium");
    } else {
      Serial.println("High");
    }

    lastLog = millis();
  }
}
```

**Key Points:**

- **24-48 hour burn-in required** before first use
- 3-minute warm-up after each power-on
- Heater draws 150mA (ensure power supply adequate)
- Responds to alcohol vapor from breath, hand sanitizer, disinfectant
- Cross-sensitivity to other organic vapors (benzene, gasoline)
- Readings drift with temperature and humidity
- Not accurate enough for legal/medical use

## Testing Procedure

1. **Initial Burn-in (FIRST TIME ONLY):**

   - Connect sensor and power continuously for 24-48 hours
   - Place in well-ventilated area
   - Do not test during burn-in period
   - This conditions the sensing element

2. **Normal Operation:**

   - Connect MQ-3 to analog port (e.g., A0)
   - Upload basic example
   - Wait 3 minutes for warm-up
   - Open Serial Monitor (9600 baud)

3. **Baseline Calibration:**

   - Ensure clean air environment
   - Record sensor reading after warm-up
   - This is your `cleanAirValue` baseline
   - Update code with this value

4. **Alcohol Detection Test:**

   - Apply small amount of rubbing alcohol to cloth
   - Hold 5-10cm from sensor (do not touch sensor)
   - Reading should increase significantly
   - Remove alcohol source
   - Reading should return to baseline in 30-60 seconds

5. **Breathalyzer Test:**
   - Blow toward sensor from ~5cm distance
   - After consuming alcohol-free mouthwash or hand sanitizer vapors
   - Should detect elevated alcohol vapor
   - Wait 2-3 minutes between tests

## Troubleshooting

| Problem                | Solution                                                                  |
| ---------------------- | ------------------------------------------------------------------------- |
| No response to alcohol | Sensor not burned in (requires 24-48h), warm-up insufficient (wait 3 min) |
| Reading always high    | Contaminated environment, poor ventilation, sensor degraded               |
| Reading always low     | Heater not working (check 5V supply), sensor damaged                      |
| Slow response          | Normal for MQ sensors (20-30 sec response time), increase warm-up         |
| Erratic readings       | Temperature/humidity changes, inadequate power supply (150mA needed)      |
| Sensor very hot        | Normal - heater operates at high temperature (DO NOT TOUCH)               |

## Technical Specifications

**Detection Characteristics:**

- **Target Gas:** Alcohol vapor (ethanol, methanol, isopropanol)
- **Detection Range:** 0.04-4 mg/L (25-500 ppm)
- **Concentration:** Best accuracy 0.1-1 mg/L
- **Sensitivity:** Rs (in alcohol) / Rs (in clean air) ≥ 5

**Electrical:**

- **Operating Voltage:** 5V DC ± 0.1V
- **Heater Voltage:** 5V ± 0.1V
- **Heater Current:** ~150mA
- **Load Resistance:** 200kΩ (onboard fixed)
- **Output:** Analog voltage (proportional to gas concentration)

**Performance:**

- **Warm-up Time:** 20-180 seconds (3 minutes recommended)
- **Burn-in Time:** 24-48 hours (first use only)
- **Response Time:** < 10 seconds (typical 20-30 seconds)
- **Recovery Time:** < 60 seconds
- **Repeatability:** ±2% (after calibration)
- **Long-term Stability:** ±5% per 6 months

**Cross-Sensitivity (also responds to):**

- Benzene
- Gasoline vapors
- LPG (liquid petroleum gas)
- CO (carbon monoxide)
- Organic solvents

**Environmental:**

- **Operating Temperature:** -10°C to 50°C
- **Operating Humidity:** 15% to 95% RH (non-condensing)
- **Storage Temperature:** -20°C to 70°C

**Physical:**

- **Sensing Element:** Tin dioxide (SnO₂) semiconductor
- **Size:** 20mm × 20mm (Grove module)
- **Heater Temperature:** ~200-300°C (internal, DO NOT TOUCH)

## Common Use Cases

### Party Safety Monitor

```cpp
const int alcoholPin = A0;
const int buzzerPin = 3;
const int threshold = 250;  // Adjust based on environment

unsigned long lastAlert = 0;
const unsigned long alertInterval = 60000;  // Alert once per minute max

void setup() {
  Serial.begin(9600);
  pinMode(alcoholPin, INPUT);
  pinMode(buzzerPin, OUTPUT);

  Serial.println("Party Safety Monitor");
  Serial.println("Warm-up (3 minutes)...");
  delay(180000);
  Serial.println("Monitoring alcohol vapor levels");
}

void loop() {
  int alcoholLevel = analogRead(alcoholPin);

  if (alcoholLevel > threshold) {
    if (millis() - lastAlert > alertInterval) {
      Serial.println("⚠️ ALERT: High alcohol vapor detected!");
      Serial.println("Ensure good ventilation");

      // Sound alarm
      for (int i = 0; i < 5; i++) {
        tone(buzzerPin, 2000, 200);
        delay(300);
      }

      lastAlert = millis();
    }
  }

  delay(5000);  // Check every 5 seconds
}
```

### Lab Safety Alcohol Vapor Detector

```cpp
const int alcoholPin = A0;
const int alarmPin = 3;
const int safeLevel = 150;
const int warningLevel = 300;
const int dangerLevel = 500;

void setup() {
  Serial.begin(9600);
  pinMode(alcoholPin, INPUT);
  pinMode(alarmPin, OUTPUT);

  Serial.println("Lab Safety: Alcohol Vapor Monitor");
  Serial.println("Warming up...");
  delay(180000);  // 3-minute warm-up
  Serial.println("READY - Monitoring lab environment");
}

void loop() {
  int vaporLevel = analogRead(alcoholPin);

  Serial.print("Vapor Level: ");
  Serial.print(vaporLevel);
  Serial.print(" | ");

  if (vaporLevel < safeLevel) {
    Serial.println("✓ SAFE - Normal levels");
    digitalWrite(alarmPin, LOW);
  } else if (vaporLevel < warningLevel) {
    Serial.println("⚠ WARNING - Elevated vapor");
    digitalWrite(alarmPin, LOW);
  } else if (vaporLevel < dangerLevel) {
    Serial.println("⚠⚠ CAUTION - High vapor");
    tone(alarmPin, 1000, 500);
  } else {
    Serial.println("✗✗ DANGER - Excessive vapor!");
    tone(alarmPin, 2000, 1000);
  }

  delay(2000);
}
```

### Disinfection Station Monitor

```cpp
const int alcoholPin = A0;
const int dispenserTrigger = 3;  // Connected to automatic dispenser
int baselineReading = 0;

void setup() {
  Serial.begin(9600);
  pinMode(alcoholPin, INPUT);
  pinMode(dispenserTrigger, OUTPUT);
  digitalWrite(dispenserTrigger, LOW);

  Serial.println("Hand Sanitizer Station Monitor");
  Serial.println("Warming up...");
  delay(180000);

  // Establish baseline
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(alcoholPin);
    delay(100);
  }
  baselineReading = sum / 10;

  Serial.print("Baseline: ");
  Serial.println(baselineReading);
  Serial.println("Monitoring dispenser usage");
}

void loop() {
  int currentReading = analogRead(alcoholPin);
  int increase = currentReading - baselineReading;

  // Detect sanitizer usage (alcohol vapor spike)
  if (increase > 100) {
    Serial.println("✓ Sanitizer dispensed - alcohol detected");
    delay(5000);  // Wait for vapor to dissipate
  }

  delay(500);
}
```

## Understanding MQ-3 Sensor Technology

**Operating Principle:**

1. **Heater Element:** Maintains SnO₂ at ~200-300°C
2. **Clean Air:** High resistance through semiconductor
3. **Alcohol Present:** Alcohol oxidizes on hot surface, releasing electrons
4. **Resistance Drop:** More alcohol = lower resistance
5. **Voltage Change:** Lower resistance = higher output voltage

**Chemical Reaction:**

```
C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O + electrons
(Ethanol reacts with oxygen on hot SnO₂ surface)
```

**Why Burn-in is Critical:**

- Fresh SnO₂ has impurities and unstable crystalline structure
- 24-48h heating at operating temperature:
  - Burns off manufacturing contaminants
  - Stabilizes crystal lattice
  - Establishes consistent baseline resistance
- Without burn-in: unstable readings, false positives, poor repeatability

**Why Warm-up is Needed:**

- Heater must reach operating temperature (~200°C)
- SnO₂ needs thermal equilibrium
- Moisture must be driven off from previous power-down
- 20 seconds minimum, 3 minutes recommended

## Calibration Procedure

**Step 1: Clean Air Baseline**

```cpp
// Run this in clean, well-ventilated area
// After 3-minute warm-up
const int alcoholPin = A0;

void setup() {
  Serial.begin(9600);
  pinMode(alcoholPin, INPUT);
  delay(180000);  // 3-minute warm-up

  Serial.println("Calibration: Clean Air Baseline");
  long sum = 0;
  for (int i = 0; i < 100; i++) {
    sum += analogRead(alcoholPin);
    delay(100);
  }
  int baseline = sum / 100;

  Serial.print("Clean Air Baseline: ");
  Serial.println(baseline);
  Serial.println("Use this value as 'cleanAirValue' in your code");
}

void loop() {
  // Empty
}
```

**Step 2: Alcohol Response Test**

```cpp
// Use known alcohol source (e.g., 70% isopropyl alcohol)
const int alcoholPin = A0;
const int cleanAirValue = 100;  // From Step 1

void setup() {
  Serial.begin(9600);
  pinMode(alcoholPin, INPUT);
  delay(180000);  // Warm-up

  Serial.println("Calibration: Alcohol Response");
  Serial.println("Apply alcohol vapor in 10 seconds...");
  delay(10000);
}

void loop() {
  int reading = analogRead(alcoholPin);
  int delta = reading - cleanAirValue;

  Serial.print("Reading: ");
  Serial.print(reading);
  Serial.print(" | Delta: ");
  Serial.println(delta);

  delay(1000);
}
```

**Step 3: Set Thresholds**
Based on Step 2 results:

- **Low threshold:** cleanAirValue + 50
- **Medium threshold:** cleanAirValue + 150
- **High threshold:** cleanAirValue + 300

## Alcohol Concentration Estimation

**⚠️ DISCLAIMER:** MQ-3 is not calibrated for accurate BAC (Blood Alcohol Content) measurement. For educational estimation only!

**Rough Estimation:**

```cpp
// Very approximate estimation (NOT ACCURATE)
float estimateBAC(int sensorValue, int baseline) {
  int delta = sensorValue - baseline;

  // Extremely rough linear approximation
  // DO NOT USE FOR ACTUAL BAC MEASUREMENT
  float estimatedBAC = delta * 0.0001;  // Arbitrary scaling

  return estimatedBAC;
}

// Example interpretation:
// 0.00% - 0.02%: Sober
// 0.02% - 0.05%: Mild impairment
// 0.05% - 0.08%: Moderate impairment (legal limit many places)
// 0.08% - 0.15%: Significant impairment
// > 0.15%: Severe impairment
```

**Why Not Accurate:**

- No calibration curve for breath alcohol
- Cross-sensitivity to other gases
- Temperature and humidity affect readings
- Individual metabolic differences
- Breath technique affects concentration
- No standardized sampling method

**For Accurate BAC:**

- Use professional breathalyzer (fuel cell or IR spectroscopy)
- Calibrated and certified device
- Follow proper testing protocols
- Legal/medical use requires approved equipment

## Safety Considerations

**⚠️ ELECTRICAL SAFETY:**

- Heater draws 150mA - ensure adequate 5V supply
- Insufficient power → unstable readings
- Use quality USB power supply (≥500mA total)

**⚠️ THERMAL SAFETY:**

- Heater operates at 200-300°C internally
- **DO NOT TOUCH** sensor surface during operation
- Keep 10cm clearance from flammable materials
- Mount in ventilated enclosure
- Allow 5 minutes cool-down after power-off

**⚠️ FLAMMABLE VAPORS:**

- Do not test near open flames
- Alcohol vapor is flammable
- Ensure adequate ventilation
- Do not seal sensor in airtight container

**⚠️ ETHICAL USE:**

- NOT for legal alcohol testing
- NOT for medical diagnosis
- NOT for employment screening
- Educational and experimental use only
- Do not rely on for safety decisions

**⚠️ LIABILITY:**

- Readings are estimates only
- High false positive/negative rates
- Cannot replace certified equipment
- User assumes all responsibility for use

## MQ Sensor Series Comparison

| Sensor     | Target Gas            | Range         | Use Case                   |
| ---------- | --------------------- | ------------- | -------------------------- |
| **MQ-2**   | LPG, Smoke, Methane   | 300-10000 ppm | Fire/gas leak detection    |
| **MQ-3**   | Alcohol               | 25-500 ppm    | Breathalyzer, disinfection |
| **MQ-4**   | Natural Gas (Methane) | 300-10000 ppm | Gas leak detection         |
| **MQ-5**   | LPG, Natural Gas      | 300-10000 ppm | Kitchen safety             |
| **MQ-7**   | Carbon Monoxide       | 20-2000 ppm   | CO poisoning prevention    |
| **MQ-8**   | Hydrogen              | 100-10000 ppm | Fuel cell leaks            |
| **MQ-9**   | CO, Methane, LPG      | 10-1000 ppm   | Indoor air quality         |
| **MQ-135** | NH₃, NOx, Benzene     | 10-1000 ppm   | Air quality monitoring     |

**Note:** All MQ sensors require 24-48h burn-in and warm-up periods.

## Integration Examples

See [integration recipes](../../integrations/) for projects combining MQ-3 with:

- OLED display (alcohol level gauge)
- Buzzer + LED (breathalyzer simulator)
- Relay (ventilation fan control)
- Data logging (alcohol vapor monitoring)

## Additional Resources

- [MQ-3 Datasheet](https://www.sparkfun.com/datasheets/Sensors/MQ-3.pdf)
- [MQ Sensor Tutorial - SparkFun](https://learn.sparkfun.com/tutorials/gas-sensor-guide)
- [Alcohol Detection Technology](https://www.nhtsa.gov/technology-innovation/alcohol-detection)
- [Breathalyzer Types Comparison](https://www.bactrack.com/blogs/expert-center/35040645-breathalyzer-types)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**⚠️ DISCLAIMER:** For educational use only - NOT for legal, medical, or safety-critical alcohol testing!
