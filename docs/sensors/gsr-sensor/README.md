# Grove GSR Sensor (Galvanic Skin Response)

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-GSR_Sensor/  
**Connection Type:** Analog

## Overview

The Grove GSR (Galvanic Skin Response) Sensor measures the electrical conductance of skin, which varies with moisture level. Used to detect stress, emotional arousal, and autonomic nervous system activity. Includes finger electrodes for comfortable measurement. Outputs analog voltage proportional to skin conductance. Ideal for biofeedback, stress monitoring, and psychology experiments.

## Authoritative References

- [Grove GSR Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-GSR_Sensor/)
- [Galvanic Skin Response](https://en.wikipedia.org/wiki/Electrodermal_activity)

## Hardware Setup

- **Connection Type:** Analog
- **Grove Port:** Any analog port (A0-A3)
- **Measurement:** Skin conductance/resistance
- **Electrodes:** Two finger electrodes (Velcro straps)
- **Operating Voltage:** 3.3V - 5V
- **Output Range:** 0-5V (varies with skin conductance)
- **Response Time:** < 1 second
- **Wiring:** Connect to Grove Base Shield analog port using 4-pin Grove cable

![Grove GSR Sensor](https://files.seeedstudio.com/wiki/Grove-GSR_Sensor/img/GSR.jpg)

## Software Prerequisites

No library required - uses standard `analogRead()`.

## Example Code

```cpp
/*
  Purpose: Measure galvanic skin response (skin conductance)
  Notes:
    1. Connect to analog pin
    2. Attach finger electrodes to index and middle finger
    3. Higher reading = more stress/arousal
    4. Lower reading = relaxed state
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-GSR_Sensor/
*/

const int gsrPin = A0;
int gsrBaseline = 0;

void setup() {
  Serial.begin(9600);
  pinMode(gsrPin, INPUT);

  Serial.println("GSR Sensor - Calibrating...");
  Serial.println("Relax and wait 5 seconds");
  delay(5000);

  // Establish baseline (relaxed state)
  long sum = 0;
  for (int i = 0; i < 50; i++) {
    sum += analogRead(gsrPin);
    delay(100);
  }
  gsrBaseline = sum / 50;

  Serial.print("Baseline established: ");
  Serial.println(gsrBaseline);
  Serial.println("Monitor started");
}

void loop() {
  int gsrValue = analogRead(gsrPin);

  // Calculate deviation from baseline
  int deviation = gsrValue - gsrBaseline;
  float percentChange = (deviation / (float)gsrBaseline) * 100;

  Serial.print("GSR: ");
  Serial.print(gsrValue);
  Serial.print(" | Baseline: ");
  Serial.print(gsrBaseline);
  Serial.print(" | Change: ");
  Serial.print(percentChange, 1);
  Serial.print("% | Status: ");

  // Classify arousal level
  if (percentChange < 5) {
    Serial.println("Relaxed");
  } else if (percentChange < 15) {
    Serial.println("Slight Arousal");
  } else if (percentChange < 30) {
    Serial.println("Moderate Arousal");
  } else {
    Serial.println("High Arousal/Stress");
  }

  delay(500);
}
```

### Stress Detector with LED

```cpp
const int gsrPin = A0;
const int greenLED = 3;
const int yellowLED = 4;
const int redLED = 5;
int gsrBaseline = 0;

void setup() {
  Serial.begin(9600);
  pinMode(gsrPin, INPUT);
  pinMode(greenLED, OUTPUT);
  pinMode(yellowLED, OUTPUT);
  pinMode(redLED, OUTPUT);

  // Calibration
  Serial.println("Calibrating - stay relaxed");
  delay(5000);

  long sum = 0;
  for (int i = 0; i < 50; i++) {
    sum += analogRead(gsrPin);
    delay(100);
  }
  gsrBaseline = sum / 50;

  Serial.println("Ready - monitoring stress level");
}

void loop() {
  int gsrValue = analogRead(gsrPin);
  float percentChange = ((gsrValue - gsrBaseline) / (float)gsrBaseline) * 100;

  // Turn off all LEDs
  digitalWrite(greenLED, LOW);
  digitalWrite(yellowLED, LOW);
  digitalWrite(redLED, LOW);

  // Indicate stress level
  if (percentChange < 10) {
    digitalWrite(greenLED, HIGH);  // Relaxed
    Serial.println("Status: Relaxed");
  } else if (percentChange < 25) {
    digitalWrite(yellowLED, HIGH);  // Moderate
    Serial.println("Status: Moderate Stress");
  } else {
    digitalWrite(redLED, HIGH);  // High stress
    Serial.println("Status: High Stress");
  }

  delay(1000);
}
```

**Key Points:**

- Measures skin conductance (varies with sweat/moisture)
- Higher reading = more stressed/aroused
- Lower reading = relaxed/calm
- Requires baseline calibration in relaxed state
- Affected by temperature, hydration, individual variation
- Responds to emotional arousal, not just stress
- Used in lie detectors (polygraph tests)

## Testing Procedure

1. Connect GSR sensor to analog port (e.g., A0)
2. Attach finger electrodes:
   - Index finger: one electrode
   - Middle finger: other electrode
   - Adjust Velcro straps (snug but comfortable)
3. Upload basic example
4. **Calibration:**
   - Sit quietly and relax for 5 seconds
   - Baseline value is established
5. Open Serial Monitor (9600 baud)
6. **Test responses:**
   - **Relaxed:** Baseline reading, "Relaxed"
   - **Deep breath:** Slight increase
   - **Mental math:** Moderate increase
   - **Startle (clap nearby):** Sharp increase
   - **Return to calm:** Reading decreases

## Troubleshooting

| Problem              | Solution                                                   |
| -------------------- | ---------------------------------------------------------- |
| Readings always high | Nervous/stressed during calibration; recalibrate when calm |
| Readings always low  | Poor electrode contact; adjust straps, clean fingers       |
| No response          | Check analog pin, verify electrode connections             |
| Erratic readings     | Loose electrodes, hand movement, dry skin                  |
| Baseline drifts      | Normal over time; recalibrate periodically                 |

## Technical Specifications

- **Measurement:** Galvanic skin response (skin conductance)
- **Operating Voltage:** 3.3V - 5V
- **Output Type:** Analog voltage (0-5V)
- **Output Range:** 0-16383 (14-bit ADC on Uno R4)
- **Response Time:** < 1 second
- **Electrode Type:** Stainless steel
- **Electrode Size:** ~15mm diameter
- **Strap Material:** Velcro (adjustable)
- **Operating Temperature:** 0°C to 40°C

## Common Use Cases

### Biofeedback Training

```cpp
const int gsrPin = A0;
const int buzzerPin = 3;
int gsrBaseline = 0;
const int relaxedThreshold = 10;  // % above baseline

void setup() {
  Serial.begin(9600);
  pinMode(gsrPin, INPUT);
  pinMode(buzzerPin, OUTPUT);

  // Calibration
  delay(5000);
  long sum = 0;
  for (int i = 0; i < 50; i++) {
    sum += analogRead(gsrPin);
    delay(100);
  }
  gsrBaseline = sum / 50;

  Serial.println("Biofeedback Training");
  Serial.println("Goal: Keep GSR below threshold");
}

void loop() {
  int gsrValue = analogRead(gsrPin);
  float percentChange = ((gsrValue - gsrBaseline) / (float)gsrBaseline) * 100;

  Serial.print("GSR Change: ");
  Serial.print(percentChange, 1);
  Serial.println("%");

  if (percentChange > relaxedThreshold) {
    // Stress detected - provide feedback
    digitalWrite(buzzerPin, HIGH);
    Serial.println(">> Too stressed - breathe deeply");
    delay(200);
    digitalWrite(buzzerPin, LOW);
  } else {
    // Relaxed state achieved
    Serial.println(">> Good! Staying relaxed");
  }

  delay(1000);
}
```

### Lie Detector (Polygraph Simulation)

```cpp
const int gsrPin = A0;
int gsrBaseline = 0;
int questionCount = 0;

String questions[] = {
  "What is your name?",
  "Are you a student?",
  "Did you eat breakfast today?",
  "Is the sky blue?",
  "Are you nervous right now?"
};

void setup() {
  Serial.begin(9600);
  pinMode(gsrPin, INPUT);

  Serial.println("Polygraph Test - Calibrating");
  delay(5000);

  long sum = 0;
  for (int i = 0; i < 50; i++) {
    sum += analogRead(gsrPin);
    delay(100);
  }
  gsrBaseline = sum / 50;

  Serial.println("Calibration complete");
  Serial.println("Answer each question verbally");
  Serial.println("Press Enter to begin");
  while (!Serial.available()) {}
  Serial.read();
}

void loop() {
  if (questionCount < 5) {
    Serial.println("\n===================");
    Serial.print("Question ");
    Serial.print(questionCount + 1);
    Serial.print(": ");
    Serial.println(questions[questionCount]);
    Serial.println("(Answer now, press Enter when done)");

    // Monitor GSR during answer
    long startTime = millis();
    int maxGSR = 0;

    while (!Serial.available()) {
      int gsrValue = analogRead(gsrPin);
      if (gsrValue > maxGSR) maxGSR = gsrValue;
      delay(100);
    }
    Serial.read();

    // Analyze response
    float percentChange = ((maxGSR - gsrBaseline) / (float)gsrBaseline) * 100;
    Serial.print("Peak GSR Change: ");
    Serial.print(percentChange, 1);
    Serial.print("% | Assessment: ");

    if (percentChange < 15) {
      Serial.println("Likely truthful");
    } else if (percentChange < 30) {
      Serial.println("Inconclusive");
    } else {
      Serial.println("Possible deception");
    }

    questionCount++;
    delay(3000);  // Rest between questions
  } else {
    Serial.println("\n=== Test Complete ===");
    while (1);
  }
}
```

### GSR Logger

```cpp
const int gsrPin = A0;
unsigned long logInterval = 1000;  // 1 second
unsigned long lastLog = 0;

void setup() {
  Serial.begin(9600);
  pinMode(gsrPin, INPUT);
  Serial.println("Time(s),GSR_Value");
}

void loop() {
  if (millis() - lastLog >= logInterval) {
    int gsrValue = analogRead(gsrPin);
    unsigned long seconds = millis() / 1000;

    Serial.print(seconds);
    Serial.print(",");
    Serial.println(gsrValue);

    lastLog = millis();
  }
}
```

## Understanding GSR

**What GSR Measures:**

- Skin conductance (inverse of resistance)
- Sweat gland activity
- Sympathetic nervous system activity

**Physiological Mechanism:**

1. Emotional arousal activates sympathetic nervous system
2. Sweat glands become more active
3. Even small amounts of sweat increase skin conductance
4. GSR sensor detects this conductance change

**Applications:**

- Stress monitoring
- Emotional research
- Biofeedback therapy
- Lie detection (polygraph)
- Gaming (adaptive difficulty)
- Market research (emotional response to ads)

## Factors Affecting GSR

| Factor                | Effect                | Notes                |
| --------------------- | --------------------- | -------------------- |
| **Emotional arousal** | Increases GSR         | Primary signal       |
| **Stress/anxiety**    | Increases GSR         | Strong effect        |
| **Physical activity** | Increases GSR         | Confounding variable |
| **Temperature**       | Warm increases GSR    | Control environment  |
| **Hydration**         | Dry skin lowers GSR   | Drink water          |
| **Skin thickness**    | Thick skin lowers GSR | Individual variation |
| **Fatigue**           | May decrease GSR      | Time of day effect   |

## Electrode Placement

**Standard Placement:**

- Index finger: one electrode
- Middle finger: other electrode
- Same hand (usually non-dominant)

**Alternative Placements:**

- Palm: inside of hand (higher conductance)
- Foot: sole of foot (less common)

**Important:**

- Clean fingers before use (remove oils)
- Adjust straps for good contact (not too tight)
- Wait 1-2 minutes after attachment for stabilization

## Calibration Importance

**Why Calibrate:**

- Baseline varies greatly between individuals
- Skin conductance affected by many factors
- Without baseline, absolute values are meaningless

**Calibration Procedure:**

```
1. Sit comfortably in quiet environment
2. Close eyes and relax for 3-5 minutes
3. Take 50-100 readings over this period
4. Average these readings = baseline
5. All future readings compared to baseline
```

**When to Recalibrate:**

- Start of each session
- After 30+ minutes of continuous use
- If readings drift significantly
- After physical activity or temperature change

## Interpreting Results

**Percentage Change from Baseline:**

| Change | Interpretation          |
| ------ | ----------------------- |
| 0-5%   | Baseline/Relaxed        |
| 5-15%  | Slight arousal          |
| 15-30% | Moderate arousal/stress |
| 30-50% | High arousal/stress     |
| > 50%  | Extreme arousal (rare)  |

**Response Latency:**

- GSR typically peaks 1-3 seconds after stimulus
- Returns to baseline in 10-30 seconds
- Fast response = strong emotional reaction

## Limitations

**GSR Cannot:**

- ❌ Detect specific emotions (just arousal level)
- ❌ Determine if arousal is positive or negative
- ❌ Reliably detect lies (despite polygraph use)
- ❌ Work through gloves or thick calluses
- ❌ Distinguish stress from excitement

**GSR Can:**

- ✅ Detect arousal/activation level
- ✅ Track stress trends over time
- ✅ Provide biofeedback for relaxation training
- ✅ Measure responsiveness to stimuli

## Safety and Ethical Considerations

**⚠️ ELECTRICAL SAFETY:**

- Very low voltage (3.3-5V) - completely safe
- No risk of electrical shock

**⚠️ ETHICAL USE:**

- Obtain informed consent before measuring
- Do not use for punitive purposes
- Not reliable for lie detection
- Respect privacy of physiological data
- For educational/research use only

## Integration Examples

See [integration recipes](../../integrations/) for projects combining GSR sensor with:

- OLED display (stress level display)
- Buzzer (biofeedback training)
- LED (arousal level indicator)
- Data logging (stress tracking over time)

## Additional Resources

- [Electrodermal Activity (EDA)](https://en.wikipedia.org/wiki/Electrodermal_activity)
- [Biofeedback Therapy](https://www.mayoclinic.org/tests-procedures/biofeedback/about/pac-20384664)
- [GSR in Psychology Research](https://www.simplypsychology.org/galvanic-skin-response.html)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**⚠️ DISCLAIMER:** For educational use only - not a medical or forensic device!
