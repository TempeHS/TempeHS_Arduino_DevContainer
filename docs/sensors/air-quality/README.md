# Grove Air Quality Sensor v1.3

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Air_Quality_Sensor_v1.3/  
**Connection Type:** Analog

## Overview

The Grove Air Quality Sensor v1.3 detects harmful gases including carbon monoxide (CO), alcohol, acetone, thinner, and formaldehyde. Provides analog output proportional to air quality level. Requires 2-3 minute warm-up for accurate readings. Ideal for indoor air quality monitoring and ventilation control.

## Authoritative References

- [Grove Air Quality Sensor v1.3 - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Air_Quality_Sensor_v1.3/)
- [Air Quality Monitoring Guide](https://en.wikipedia.org/wiki/Air_quality_index)

## Hardware Setup

- **Connection Type:** Analog
- **Grove Port:** Any analog port (A0-A3)
- **Sensor Type:** TP-401A gas sensor
- **Detects:** CO, alcohol, acetone, thinner, formaldehyde
- **Warm-up Time:** 2-3 minutes minimum
- **Operating Voltage:** 5V
- **Detection Range:** 10-1000ppm (various gases)
- **Wiring:** Connect to Grove Base Shield analog port using 4-pin Grove cable

![Grove Air Quality](https://files.seeedstudio.com/wiki/Grove_Air_Quality_Sensor_v1.3/img/Grove%20Air%20Quality%20Sensor_01.jpg)

## Software Prerequisites

No library required - uses standard `analogRead()`.

## Example Code

```cpp
/*
  Purpose: Monitor indoor air quality
  Notes:
    1. Connect to analog pin
    2. Requires 2-3 minute warm-up
    3. Higher value = worse air quality
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Air_Quality_Sensor_v1.3/
*/

const int airQualityPin = A0;

void setup() {
  Serial.begin(9600);
  pinMode(airQualityPin, INPUT);
  Serial.println("Air Quality Sensor initialized");
  Serial.println("Warming up for 2-3 minutes...");
  delay(180000);  // 3 minute warm-up
  Serial.println("Sensor ready");
}

void loop() {
  int airQuality = analogRead(airQualityPin);

  Serial.print("Air Quality: ");
  Serial.print(airQuality);
  Serial.print(" - ");

  // Classify air quality (typical thresholds)
  if (airQuality < 300) {
    Serial.println("Excellent (fresh air)");
  } else if (airQuality < 500) {
    Serial.println("Good (low pollution)");
  } else if (airQuality < 700) {
    Serial.println("Moderate (light pollution)");
  } else if (airQuality < 900) {
    Serial.println("Poor (high pollution)");
  } else {
    Serial.println("Very Poor (dangerous)");
  }

  delay(2000);
}
```

### Air Quality Monitor with LED

```cpp
const int airQualityPin = A0;
const int greenLED = 3;
const int yellowLED = 4;
const int redLED = 5;

void setup() {
  Serial.begin(9600);
  pinMode(airQualityPin, INPUT);
  pinMode(greenLED, OUTPUT);
  pinMode(yellowLED, OUTPUT);
  pinMode(redLED, OUTPUT);

  Serial.println("Warming up...");
  delay(180000);
  Serial.println("Ready");
}

void loop() {
  int airQuality = analogRead(airQualityPin);

  // Turn off all LEDs
  digitalWrite(greenLED, LOW);
  digitalWrite(yellowLED, LOW);
  digitalWrite(redLED, LOW);

  if (airQuality < 500) {
    digitalWrite(greenLED, HIGH);  // Good
    Serial.println("Air: GOOD");
  } else if (airQuality < 700) {
    digitalWrite(yellowLED, HIGH);  // Moderate
    Serial.println("Air: MODERATE");
  } else {
    digitalWrite(redLED, HIGH);  // Poor
    Serial.println("Air: POOR");
  }

  delay(2000);
}
```

**Key Points:**

- **Must warm up 2-3 minutes** before use
- Higher reading = worse air quality
- Sensitive to many gases (not gas-specific)
- Baseline value varies by environment
- Responds to smoke, alcohol vapors, VOCs
- Indoor use only (not weatherproof)

## Testing Procedure

1. Connect air quality sensor to analog port (e.g., A0)
2. Upload basic example
3. **Wait 2-3 minutes for warm-up** (critical!)
4. Open Serial Monitor (9600 baud)
5. **Baseline reading (clean air):**
   - Typical: 100-300 (varies by location)
6. **Test with contaminant:**
   - Bring hand sanitizer/alcohol near sensor
   - Reading should increase significantly
   - Remove source, reading returns to baseline

## Troubleshooting

| Problem                   | Solution                                     |
| ------------------------- | -------------------------------------------- |
| Very high initial reading | Sensor not warmed up; wait 2-3 minutes       |
| Reading doesn't change    | Check analog pin connection, verify power    |
| Unstable readings         | Normal during warm-up; wait full 3 minutes   |
| Always reads maximum      | Sensor may be damaged or saturated           |
| Baseline too high         | Environment may have pollution; open windows |

## Technical Specifications

- **Sensor:** TP-401A gas sensor
- **Target Gases:** CO, alcohol, acetone, thinner, formaldehyde
- **Detection Range:** 10-1000ppm (various gases)
- **Operating Voltage:** 5V DC
- **Operating Current:** < 100mA
- **Output:** Analog voltage (0-5V)
- **Warm-up Time:** 2-3 minutes minimum
- **Response Time:** < 10 seconds
- **Operating Temperature:** -10°C to 50°C
- **Operating Humidity:** 15% to 90% RH

## Common Use Cases

### Ventilation Controller

```cpp
const int airQualityPin = A0;
const int fanRelayPin = 2;
const int thresholdOn = 600;
const int thresholdOff = 400;

void setup() {
  Serial.begin(9600);
  pinMode(airQualityPin, INPUT);
  pinMode(fanRelayPin, OUTPUT);

  delay(180000);  // Warm-up
  Serial.println("Ventilation system ready");
}

void loop() {
  int airQuality = analogRead(airQualityPin);
  int fanState = digitalRead(fanRelayPin);

  Serial.print("Air quality: ");
  Serial.println(airQuality);

  if (airQuality > thresholdOn && fanState == LOW) {
    digitalWrite(fanRelayPin, HIGH);
    Serial.println("Fan ON (poor air)");
  } else if (airQuality < thresholdOff && fanState == HIGH) {
    digitalWrite(fanRelayPin, LOW);
    Serial.println("Fan OFF (good air)");
  }

  delay(5000);
}
```

### Air Quality Logger

```cpp
const int airQualityPin = A0;
unsigned long logInterval = 60000;  // 1 minute
unsigned long lastLog = 0;

void setup() {
  Serial.begin(9600);
  pinMode(airQualityPin, INPUT);
  delay(180000);
  Serial.println("Time(min),Air Quality");
}

void loop() {
  if (millis() - lastLog >= logInterval) {
    int airQuality = analogRead(airQualityPin);
    unsigned long minutes = millis() / 60000;

    Serial.print(minutes);
    Serial.print(",");
    Serial.println(airQuality);

    lastLog = millis();
  }
}
```

## Calibration

Establish baseline for your environment:

```cpp
const int airQualityPin = A0;
const int numSamples = 50;

void setup() {
  Serial.begin(9600);
  pinMode(airQualityPin, INPUT);

  Serial.println("Warming up...");
  delay(180000);

  Serial.println("Calibrating baseline (50 samples)...");
  long sum = 0;
  for (int i = 0; i < numSamples; i++) {
    sum += analogRead(airQualityPin);
    delay(100);
  }

  int baseline = sum / numSamples;
  Serial.print("Baseline established: ");
  Serial.println(baseline);
  Serial.println("Use this value as your 'clean air' reference");
}

void loop() {
  // Continuous monitoring code here
}
```

## Detected Gases

The sensor responds to multiple gases (not gas-specific):

| Gas                      | Detection        | Typical Sources                |
| ------------------------ | ---------------- | ------------------------------ |
| **Carbon Monoxide (CO)** | Yes              | Incomplete combustion, engines |
| **Alcohol**              | High sensitivity | Hand sanitizer, beverages      |
| **Acetone**              | Yes              | Nail polish remover, solvents  |
| **Thinner/Toluene**      | Yes              | Paint thinner, adhesives       |
| **Formaldehyde**         | Yes              | Building materials, furniture  |
| **Smoke**                | Moderate         | Tobacco, cooking               |
| **LPG/Natural Gas**      | Low              | Gas leaks                      |

**Note:** Sensor cannot differentiate between gases; it provides general air quality level.

## Warm-up Importance

**Why warm-up is critical:**

- Sensor element must reach stable operating temperature
- Initial readings are unreliable during warm-up
- Cold sensor gives false high readings
- Minimum: 2 minutes, recommended: 3 minutes

**Warm-up code patterns:**

```cpp
// Option 1: Blocking warm-up
void setup() {
  Serial.begin(9600);
  Serial.println("Warming up...");
  delay(180000);  // 3 minutes
  Serial.println("Ready!");
}

// Option 2: Non-blocking warm-up
unsigned long warmupStart = 0;
bool sensorReady = false;

void setup() {
  Serial.begin(9600);
  warmupStart = millis();
}

void loop() {
  if (!sensorReady) {
    if (millis() - warmupStart >= 180000) {
      sensorReady = true;
      Serial.println("Sensor ready!");
    } else {
      Serial.println("Warming up...");
      delay(1000);
      return;
    }
  }

  // Normal operation here
}
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining air quality sensor with:

- OLED display (air quality dashboard)
- Relay (automatic ventilation fan)
- LED (air quality indicator)
- Buzzer (pollution alarm)

## Additional Resources

- [TP-401A Datasheet](http://wiki.seeedstudio.com/Grove-Air_Quality_Sensor_v1.3/)
- [Air Quality Index Guide](https://www.airnow.gov/aqi/aqi-basics/)
- [Indoor Air Quality](https://www.epa.gov/indoor-air-quality-iaq)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Sensor:** TP-401A gas sensor  
**⚠️ Important:** Requires 2-3 minute warm-up before use!
