# Grove Ear-Clip Heart Rate Sensor

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Ear-clip_Heart_Rate_Sensor/  
**Connection Type:** Digital Pulse

## Overview

The Grove Ear-Clip Heart Rate Sensor detects heartbeat using photoelectric pulse wave method. The ear clip contains an infrared LED and photodetector that measures blood volume changes. Outputs digital pulse signal synchronized with heartbeat. Ideal for fitness monitoring, health tracking, and biomedical projects. Measures heart rate ≥30 BPM.

## Authoritative References

- [Grove Ear-Clip Heart Rate Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Ear-clip_Heart_Rate_Sensor/)
- [Photoplethysmography (PPG)](https://en.wikipedia.org/wiki/Photoplethysmogram)

## Hardware Setup

- **Connection Type:** Digital Pulse
- **Grove Port:** Any digital port (D2-D13, interrupt pins D2/D3 recommended)
- **Detection Method:** Photoelectric pulse wave (PPG)
- **Measurement Range:** ≥30 BPM
- **Operating Voltage:** 3.3V - 5V
- **Output:** Digital pulse (one pulse per heartbeat)
- **Cable Length:** ~120cm (ear clip to module)
- **Wiring:** Connect to Grove Base Shield digital port using 4-pin Grove cable

![Grove Ear Clip Heart Rate](https://files.seeedstudio.com/wiki/Grove-Ear-clip_Heart_Rate_Sensor/img/Grove-Ear-clip-Heart-Rate-Sensor-1.jpg)

## Software Prerequisites

No library required - uses interrupt-driven pulse counting.

## Example Code

```cpp
/*
  Purpose: Measure heart rate from ear-clip sensor
  Notes:
    1. Connect to interrupt pin (D2 or D3 recommended)
    2. Attach clip to earlobe
    3. Each pulse = one heartbeat
    4. Calculate BPM from pulse frequency
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Ear-clip_Heart_Rate_Sensor/
*/

const int heartPin = 2;  // Connect to D2 (interrupt)
volatile unsigned long pulseCount = 0;
unsigned long lastBeatTime = 0;
unsigned long startTime = 0;

void setup() {
  Serial.begin(9600);
  pinMode(heartPin, INPUT);
  attachInterrupt(digitalPinToInterrupt(heartPin), countPulse, RISING);

  startTime = millis();
  Serial.println("Ear-Clip Heart Rate Sensor");
  Serial.println("Attach clip to earlobe");
  Serial.println("Stay still for accurate reading");
}

void loop() {
  // Calculate BPM every 10 seconds
  if (millis() - startTime >= 10000) {
    detachInterrupt(digitalPinToInterrupt(heartPin));

    // Calculate BPM
    float elapsedTime = (millis() - startTime) / 60000.0;  // Convert to minutes
    float bpm = pulseCount / elapsedTime;

    Serial.print("Pulse Count: ");
    Serial.print(pulseCount);
    Serial.print(" | Heart Rate: ");
    Serial.print(bpm, 1);
    Serial.println(" BPM");

    // Assess heart rate
    if (bpm < 60) {
      Serial.println("Status: Bradycardia (slow)");
    } else if (bpm <= 100) {
      Serial.println("Status: Normal");
    } else if (bpm <= 120) {
      Serial.println("Status: Elevated");
    } else {
      Serial.println("Status: Tachycardia (fast)");
    }

    // Reset for next measurement
    pulseCount = 0;
    startTime = millis();
    attachInterrupt(digitalPinToInterrupt(heartPin), countPulse, RISING);
  }

  delay(100);
}

void countPulse() {
  pulseCount++;
}
```

### Real-Time BPM with Averaging

```cpp
const int heartPin = 2;
volatile unsigned long lastBeatTime = 0;
volatile float bpm = 0;
const int numReadings = 5;
float readings[numReadings];
int readIndex = 0;

void setup() {
  Serial.begin(9600);
  pinMode(heartPin, INPUT);
  attachInterrupt(digitalPinToInterrupt(heartPin), calculateBPM, RISING);

  // Initialize array
  for (int i = 0; i < numReadings; i++) {
    readings[i] = 0;
  }

  Serial.println("Real-time heart rate monitor");
}

void loop() {
  if (bpm > 0) {
    // Store reading
    readings[readIndex] = bpm;
    readIndex = (readIndex + 1) % numReadings;

    // Calculate average
    float total = 0;
    int validReadings = 0;
    for (int i = 0; i < numReadings; i++) {
      if (readings[i] > 30 && readings[i] < 200) {  // Valid range
        total += readings[i];
        validReadings++;
      }
    }

    if (validReadings > 0) {
      float avgBPM = total / validReadings;
      Serial.print("Heart Rate: ");
      Serial.print(avgBPM, 1);
      Serial.println(" BPM (averaged)");
    }
  }

  delay(2000);
}

void calculateBPM() {
  unsigned long currentTime = millis();
  unsigned long timeBetweenBeats = currentTime - lastBeatTime;

  // Filter out noise (heart rate range: 30-200 BPM)
  if (timeBetweenBeats > 300 && timeBetweenBeats < 2000) {
    bpm = 60000.0 / timeBetweenBeats;
  }

  lastBeatTime = currentTime;
}
```

**Key Points:**

- Each pulse = one heartbeat
- Attach clip to earlobe (soft tissue with good blood flow)
- Requires stillness for accurate reading
- Use interrupt pins (D2/D3) for reliable pulse detection
- Heart rate range: typically 30-200 BPM
- Measurement affected by movement, ambient light, clip pressure

## Testing Procedure

1. Connect ear-clip sensor to interrupt pin (D2 or D3)
2. Upload basic example
3. **Attach ear clip to earlobe:**
   - Clip should be snug but not painful
   - Position on soft part of earlobe
4. Open Serial Monitor (9600 baud)
5. **Stay still for 10 seconds**
6. **Expected output:**
   - Pulse count increases
   - Heart rate displayed (typical resting: 60-100 BPM)
7. **Test exercise effect:**
   - Do jumping jacks for 1 minute
   - Reattach clip and measure
   - Heart rate should be elevated

## Troubleshooting

| Problem                | Solution                                            |
| ---------------------- | --------------------------------------------------- |
| No pulses detected     | Adjust clip position, ensure good contact with skin |
| Erratic readings       | Stay still, clip may be too loose/tight             |
| BPM too high/low       | Check clip position, filter outliers in code        |
| Intermittent detection | Ambient light interference; shield sensor           |
| Reading of zero        | Clip not attached or damaged sensor                 |

## Technical Specifications

- **Detection Method:** Photoelectric pulse wave (PPG)
- **Measurement Range:** ≥30 BPM (up to ~200 BPM typical)
- **Operating Voltage:** 3.3V - 5V
- **Operating Current:** < 10mA
- **Output:** Digital pulse (TTL)
- **Pulse Width:** ~60ms typical
- **Cable Length:** ~120cm
- **Clip Size:** ~15mm × 15mm
- **Measurement Site:** Earlobe (fingertip also possible)

## Common Use Cases

### Fitness Monitor with LED

```cpp
const int heartPin = 2;
const int ledPin = 13;
volatile unsigned long pulseCount = 0;
unsigned long startTime = 0;

void setup() {
  Serial.begin(9600);
  pinMode(heartPin, INPUT);
  pinMode(ledPin, OUTPUT);
  attachInterrupt(digitalPinToInterrupt(heartPin), pulseDetected, RISING);
  startTime = millis();
}

void loop() {
  if (millis() - startTime >= 15000) {  // Every 15 seconds
    float elapsedMin = (millis() - startTime) / 60000.0;
    float bpm = pulseCount / elapsedMin;

    Serial.print("Heart Rate: ");
    Serial.print(bpm, 1);
    Serial.println(" BPM");

    // Heart rate zones
    if (bpm < 60) {
      Serial.println("Zone: Resting");
    } else if (bpm < 120) {
      Serial.println("Zone: Light Activity");
    } else if (bpm < 150) {
      Serial.println("Zone: Moderate Activity");
    } else {
      Serial.println("Zone: Intense Activity");
    }

    pulseCount = 0;
    startTime = millis();
  }

  delay(100);
}

void pulseDetected() {
  pulseCount++;
  // Blink LED on each heartbeat
  digitalWrite(ledPin, HIGH);
  delay(50);
  digitalWrite(ledPin, LOW);
}
```

### Stress Monitor

```cpp
const int heartPin = 2;
volatile unsigned long lastBeatTime = 0;
volatile float bpm = 0;
float baselineBPM = 0;
bool baselineSet = false;

void setup() {
  Serial.begin(9600);
  pinMode(heartPin, INPUT);
  attachInterrupt(digitalPinToInterrupt(heartPin), calculateBPM, RISING);

  Serial.println("Stress Monitor");
  Serial.println("Establishing baseline (30 seconds)...");
  delay(30000);
  baselineBPM = bpm;
  baselineSet = true;
  Serial.print("Baseline: ");
  Serial.print(baselineBPM, 1);
  Serial.println(" BPM");
}

void loop() {
  if (baselineSet && bpm > 0) {
    float deviation = ((bpm - baselineBPM) / baselineBPM) * 100;

    Serial.print("Current: ");
    Serial.print(bpm, 1);
    Serial.print(" BPM | Deviation: ");
    Serial.print(deviation, 1);
    Serial.println("%");

    if (deviation > 20) {
      Serial.println("STATUS: Elevated heart rate (possible stress)");
    } else if (deviation > 10) {
      Serial.println("STATUS: Slight elevation");
    } else {
      Serial.println("STATUS: Normal");
    }
  }

  delay(3000);
}

void calculateBPM() {
  unsigned long currentTime = millis();
  unsigned long interval = currentTime - lastBeatTime;

  if (interval > 300 && interval < 2000) {
    bpm = 60000.0 / interval;
  }

  lastBeatTime = currentTime;
}
```

## Heart Rate Zones

| Zone         | BPM Range (typical adult) | Activity Level            |
| ------------ | ------------------------- | ------------------------- |
| **Resting**  | 60-80                     | At rest, relaxed          |
| **Light**    | 80-110                    | Walking, light activity   |
| **Moderate** | 110-140                   | Jogging, cycling          |
| **Vigorous** | 140-170                   | Running, intense exercise |
| **Maximum**  | 170-200                   | Sprint, peak effort       |

**Maximum Heart Rate (estimated):** 220 - age

**Target Zones:**

- Fat burn: 60-70% of max HR
- Cardio: 70-85% of max HR
- Peak: 85-95% of max HR

## Measurement Tips

**For Accurate Readings:**

- ✅ Clip on soft part of earlobe
- ✅ Ensure snug but comfortable fit
- ✅ Stay still during measurement
- ✅ Keep clip away from direct light
- ✅ Clean earlobe before use (remove oils)
- ✅ Wait 10-15 seconds for stable reading

**Avoid:**

- ❌ Talking during measurement
- ❌ Moving head or body
- ❌ Clip too loose (poor contact)
- ❌ Clip too tight (restricts blood flow)
- ❌ Direct sunlight on sensor
- ❌ Cold earlobes (warm up first)

## Alternative Measurement Sites

While designed for earlobe, sensor can also work on:

- **Fingertip:** Good alternative, may need custom holder
- **Toe:** Possible but less convenient
- **Any peripheral site** with good blood flow and thin skin

**Earlobe advantages:**

- Consistent positioning
- Less prone to movement artifacts
- Doesn't interfere with hands-free operation

## Signal Processing

**Filtering Noise:**

```cpp
volatile unsigned long beatTimes[10];
int beatIndex = 0;

void calculateBPM() {
  unsigned long currentTime = millis();
  unsigned long interval = currentTime - lastBeatTime;

  // Only accept physiologically possible intervals (30-200 BPM)
  if (interval >= 300 && interval <= 2000) {
    beatTimes[beatIndex] = interval;
    beatIndex = (beatIndex + 1) % 10;

    // Calculate median interval
    unsigned long sortedTimes[10];
    memcpy(sortedTimes, beatTimes, sizeof(beatTimes));
    // Sort array (simple bubble sort for small array)
    for (int i = 0; i < 10; i++) {
      for (int j = i + 1; j < 10; j++) {
        if (sortedTimes[i] > sortedTimes[j]) {
          unsigned long temp = sortedTimes[i];
          sortedTimes[i] = sortedTimes[j];
          sortedTimes[j] = temp;
        }
      }
    }

    // Use median value
    unsigned long medianInterval = sortedTimes[5];
    bpm = 60000.0 / medianInterval;
  }

  lastBeatTime = currentTime;
}
```

## Safety and Medical Disclaimer

**⚠️ NOT A MEDICAL DEVICE:**

- For educational and hobby use only
- Not FDA approved or clinically validated
- Do not use for medical diagnosis
- Consult healthcare professional for medical concerns

**If experiencing:**

- Chest pain
- Irregular heartbeat
- Dizziness
- Shortness of breath
  → **Seek immediate medical attention**

## Integration Examples

See [integration recipes](../../integrations/) for projects combining heart rate sensor with:

- OLED display (heart rate display)
- Buzzer (heart rate zone alarm)
- LED (heartbeat visualization)
- Data logging (fitness tracking)

## Additional Resources

- [Photoplethysmography Theory](https://en.wikipedia.org/wiki/Photoplethysmogram)
- [Heart Rate Variability](https://www.health.harvard.edu/heart-health/heart-rate-variability)
- [Target Heart Rate Zones](https://www.heart.org/en/healthy-living/fitness/fitness-basics/target-heart-rates)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**⚠️ DISCLAIMER:** Not a medical device - for educational use only!
