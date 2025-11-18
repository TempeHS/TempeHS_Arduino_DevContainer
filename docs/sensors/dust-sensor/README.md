# Grove Dust Sensor (PPD42NS)

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Dust_Sensor/  
**Connection Type:** Digital Pulse

## Overview

The Grove Dust Sensor (PPD42NS) detects particulate matter (PM) in air using optical sensing. Measures particles > 1 micron in diameter. Outputs pulse signal - longer pulses indicate higher particle concentration. Ideal for air quality monitoring, pollution detection, and indoor environment sensing.

## Authoritative References

- [Grove Dust Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Dust_Sensor/)
- [PPD42NS Datasheet](http://www.seeedstudio.com/wiki/images/4/4c/Grove_-_Dust_sensor.pdf)

## Hardware Setup

- **Connection Type:** Digital Pulse (PWM input)
- **Grove Port:** Any digital port (D2-D13)
- **Sensor Type:** PPD42NS optical dust sensor
- **Detection Size:** Particles > 1 micron
- **Operating Voltage:** 5V DC
- **Warm-up Time:** 1 minute minimum, 30 seconds for stable readings
- **Output:** Digital pulse (Low Pulse Occupancy time)
- **Wiring:** Connect to Grove Base Shield digital port using 4-pin Grove cable

![Grove Dust Sensor](https://files.seeedstudio.com/wiki/Grove-Dust_Sensor/img/Dust_sensor.JPG)

## Software Prerequisites

No library required - uses `pulseIn()` for pulse width measurement.

## Example Code

```cpp
/*
  Purpose: Measure particulate matter (dust) concentration
  Notes:
    1. Connect to digital pin
    2. Requires 1 minute warm-up
    3. Measures pulse width - longer = more dust
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Dust_Sensor/
*/

const int dustPin = 2;
unsigned long duration;
unsigned long starttime;
unsigned long sampletime_ms = 30000;  // 30 second sampling time
unsigned long lowpulseoccupancy = 0;
float ratio = 0;
float concentration = 0;

void setup() {
  Serial.begin(9600);
  pinMode(dustPin, INPUT);
  starttime = millis();

  Serial.println("Dust Sensor initialized");
  Serial.println("Warming up for 1 minute...");
  delay(60000);
  Serial.println("Sensor ready");
}

void loop() {
  duration = pulseIn(dustPin, LOW);
  lowpulseoccupancy = lowpulseoccupancy + duration;

  if ((millis() - starttime) >= sampletime_ms) {
    // Calculate ratio and concentration
    ratio = lowpulseoccupancy / (sampletime_ms * 10.0);
    concentration = 1.1 * pow(ratio, 3) - 3.8 * pow(ratio, 2) + 520 * ratio + 0.62;

    Serial.print("LPO: ");
    Serial.print(lowpulseoccupancy);
    Serial.print(" | Ratio: ");
    Serial.print(ratio);
    Serial.print(" | Concentration: ");
    Serial.print(concentration);
    Serial.println(" pcs/0.01cf");

    // Air quality assessment
    if (concentration < 1000) {
      Serial.println("Air Quality: Excellent");
    } else if (concentration < 10000) {
      Serial.println("Air Quality: Good");
    } else if (concentration < 20000) {
      Serial.println("Air Quality: Moderate");
    } else if (concentration < 40000) {
      Serial.println("Air Quality: Poor");
    } else {
      Serial.println("Air Quality: Very Poor");
    }

    // Reset for next sampling period
    lowpulseoccupancy = 0;
    starttime = millis();
  }
}
```

**Key Points:**

- Measures Low Pulse Occupancy (LPO) time
- Longer pulses = more particles
- Requires 30-second sampling period for accuracy
- Concentration in particles per 0.01 cubic feet
- Warm-up: 1 minute minimum
- Best results with 30-second integration time

## Testing Procedure

1. Connect dust sensor to digital port (e.g., D2)
2. Upload basic example
3. **Wait 1 minute for warm-up** (critical!)
4. Open Serial Monitor (9600 baud)
5. **Wait 30 seconds for first reading**
6. **Baseline (clean air):**
   - Concentration < 1000 pcs/0.01cf
7. **Test with dust:**
   - Gently blow dust near sensor
   - Shake dusty cloth nearby
   - Concentration should increase
8. **Return to clean air:**
   - Readings decrease over time

## Troubleshooting

| Problem                 | Solution                                             |
| ----------------------- | ---------------------------------------------------- |
| Always zero             | Check digital pin, verify 5V power, ensure warm-up   |
| Very high readings      | Sensor in dusty environment; clean area or sensor    |
| No change with dust     | Wait full 30 seconds, increase dust amount           |
| Unstable readings       | Normal; use 30-second averaging                      |
| Readings don't decrease | Dust settled in sensor; blow out with compressed air |

## Technical Specifications

- **Sensor:** PPD42NS optical dust sensor
- **Detection Range:** Particles > 1 micron
- **Operating Voltage:** 5V DC ± 0.3V
- **Operating Current:** 90mA max
- **Output:** Digital pulse (PWM)
- **Detection Range:** 0 - 28,000 pcs/0.01cf
- **Warm-up Time:** 1 minute
- **Response Time:** < 10 seconds
- **Operating Temperature:** 0°C to 45°C
- **Operating Humidity:** 95% RH max

## Common Use Cases

### Air Quality Monitor with LED

```cpp
const int dustPin = 2;
const int greenLED = 3;
const int yellowLED = 4;
const int redLED = 5;

unsigned long lowpulseoccupancy = 0;
unsigned long starttime;
const unsigned long sampletime_ms = 30000;

void setup() {
  Serial.begin(9600);
  pinMode(dustPin, INPUT);
  pinMode(greenLED, OUTPUT);
  pinMode(yellowLED, OUTPUT);
  pinMode(redLED, OUTPUT);

  delay(60000);  // Warm-up
  starttime = millis();
  Serial.println("Air Quality Monitor Ready");
}

void loop() {
  unsigned long duration = pulseIn(dustPin, LOW);
  lowpulseoccupancy += duration;

  if ((millis() - starttime) >= sampletime_ms) {
    float ratio = lowpulseoccupancy / (sampletime_ms * 10.0);
    float concentration = 1.1 * pow(ratio, 3) - 3.8 * pow(ratio, 2) + 520 * ratio + 0.62;

    // Turn off all LEDs
    digitalWrite(greenLED, LOW);
    digitalWrite(yellowLED, LOW);
    digitalWrite(redLED, LOW);

    // Indicate air quality
    if (concentration < 10000) {
      digitalWrite(greenLED, HIGH);  // Good
    } else if (concentration < 20000) {
      digitalWrite(yellowLED, HIGH);  // Moderate
    } else {
      digitalWrite(redLED, HIGH);  // Poor
    }

    Serial.print("Dust: ");
    Serial.println(concentration);

    lowpulseoccupancy = 0;
    starttime = millis();
  }
}
```

### Dust Level Logger

```cpp
const int dustPin = 2;
unsigned long lowpulseoccupancy = 0;
unsigned long starttime;
const unsigned long sampletime_ms = 30000;
int readingCount = 0;

void setup() {
  Serial.begin(9600);
  pinMode(dustPin, INPUT);
  delay(60000);
  starttime = millis();
  Serial.println("Time(min),Concentration,Quality");
}

void loop() {
  unsigned long duration = pulseIn(dustPin, LOW);
  lowpulseoccupancy += duration;

  if ((millis() - starttime) >= sampletime_ms) {
    float ratio = lowpulseoccupancy / (sampletime_ms * 10.0);
    float concentration = 1.1 * pow(ratio, 3) - 3.8 * pow(ratio, 2) + 520 * ratio + 0.62;

    readingCount++;
    unsigned long minutes = readingCount / 2;  // 30-sec readings

    String quality;
    if (concentration < 1000) quality = "Excellent";
    else if (concentration < 10000) quality = "Good";
    else if (concentration < 20000) quality = "Moderate";
    else quality = "Poor";

    Serial.print(minutes);
    Serial.print(",");
    Serial.print(concentration);
    Serial.print(",");
    Serial.println(quality);

    lowpulseoccupancy = 0;
    starttime = millis();
  }
}
```

## Concentration Calculation

The formula converts Low Pulse Occupancy to particle concentration:

```
concentration = 1.1 * ratio³ - 3.8 * ratio² + 520 * ratio + 0.62

Where:
ratio = lowpulseoccupancy / (sampletime_ms * 10.0)
lowpulseoccupancy = total LOW pulse time in microseconds
sampletime_ms = sampling period in milliseconds
```

**Units:**

- Concentration: particles per 0.01 cubic feet (pcs/0.01cf)
- To convert to particles/liter: multiply by ~35.3

## Air Quality Index

Based on particle concentration:

| Concentration   | Air Quality | Health Impact               |
| --------------- | ----------- | --------------------------- |
| 0 - 1,000       | Excellent   | Safe                        |
| 1,000 - 10,000  | Good        | Minor effects               |
| 10,000 - 20,000 | Moderate    | Sensitive groups affected   |
| 20,000 - 40,000 | Poor        | General population affected |
| > 40,000        | Very Poor   | Serious health concerns     |

## Particle Types Detected

The sensor detects particles > 1 micron:

| Particle Source | Size (microns) | Detected |
| --------------- | -------------- | -------- |
| Cigarette smoke | 0.01 - 1.0     | Partial  |
| Dust            | 1 - 100        | ✅ Yes   |
| Pollen          | 10 - 100       | ✅ Yes   |
| Mold spores     | 3 - 40         | ✅ Yes   |
| Bacteria        | 0.3 - 10       | Partial  |
| Fine PM2.5      | < 2.5          | Partial  |
| Coarse PM10     | < 10           | ✅ Yes   |

## Sampling Period Importance

**Why 30 seconds?**

- Dust particles are not uniformly distributed
- Short samples give erratic readings
- 30-second integration provides stable average
- Longer periods (60s+) even more stable

**Adjusting Sample Time:**

```cpp
const unsigned long sampletime_ms = 60000;  // 60 seconds for more stability
```

## Maintenance

**Cleaning:**

- Sensor can accumulate dust internally
- Use compressed air to blow out dust
- Clean every 3-6 months in dusty environments
- Do not disassemble sensor

**Lifespan:**

- Typical: 5+ years
- LED inside sensor may dim over time
- Replace if readings become unreliable

## Integration Examples

See [integration recipes](../../integrations/) for projects combining dust sensor with:

- OLED display (air quality dashboard)
- Buzzer (pollution alarm)
- LED (air quality indicator)
- Relay (air purifier control)

## Additional Resources

- [PPD42NS Datasheet](http://www.seeedstudio.com/wiki/images/4/4c/Grove_-_Dust_sensor.pdf)
- [Air Quality Monitoring Guide](https://www.airnow.gov/)
- [Particle Pollution Basics](https://www.epa.gov/pm-pollution)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Sensor:** PPD42NS optical dust sensor  
**⚠️ Important:** Requires 1 minute warm-up and 30-second sampling periods!
