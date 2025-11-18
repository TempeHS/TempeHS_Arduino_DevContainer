# Grove Loudness Sensor

**Last Verified:** 2025-11-18  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Loudness_Sensor/  
**Connection Type:** Analog

## Overview

The Grove Loudness Sensor measures ambient sound intensity using an amplified microphone. Outputs analog voltage proportional to sound level. Detects loudness (volume) but not audio frequency. Ideal for sound-activated devices, noise monitoring, voice detection, clap switches, and sound level indicators. More sensitive than basic sound sensor with better signal conditioning.

## Authoritative References

- [Grove Loudness Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Loudness_Sensor/)
- [LM2904 Op-Amp Datasheet](https://www.ti.com/lit/ds/symlink/lm2904.pdf)

## Hardware Setup

- **Connection Type:** Analog
- **Grove Port:** A0-A3
- **Microphone:** Electret condenser microphone
- **Amplifier:** LM2904 dual op-amp
- **Gain:** Adjustable via onboard potentiometer
- **Output:** 0V - 5V analog (proportional to loudness)
- **Operating Voltage:** 3.3V - 5V
- **Current Draw:** ~5mA
- **Frequency Response:** 50Hz - 20kHz (microphone dependent)
- **Sensitivity:** Adjustable (turn pot clockwise = more sensitive)
- **Detection Range:** ~1-2 meters (typical conversation)
- **Wiring:** Connect to Grove Base Shield analog port A0-A3 using 4-pin Grove cable

![Grove Loudness Sensor](https://files.seeedstudio.com/wiki/Grove-Loudness_Sensor/img/Loudness%20Sensor_01.jpg)

## Software Prerequisites

No special library required - uses standard Arduino `analogRead()`.

```cpp
// Basic usage
int loudness = analogRead(A0);  // Read loudness level
```

## Example Code

```cpp
/*
  Purpose: Measure ambient sound loudness level
  Notes:
    1. Connect to analog port (A0-A3)
    2. analogRead() returns 0-16383 on Uno R4 (14-bit ADC)
    3. Higher value = louder sound
    4. Adjust sensitivity with onboard potentiometer
    5. Detects volume, not specific frequencies
  Author: Ben Jones 18/11/25
  Source: https://wiki.seeedstudio.com/Grove-Loudness_Sensor/
*/

const int loudnessPin = A0;

void setup() {
  Serial.begin(9600);
  pinMode(loudnessPin, INPUT);

  Serial.println("Grove Loudness Sensor");
  Serial.println("Monitoring sound levels...");
}

void loop() {
  // Read loudness level (0-16383 on Uno R4)
  int loudness = analogRead(loudnessPin);

  // Convert to percentage
  int loudnessPercent = map(loudness, 0, 16383, 0, 100);

  Serial.print("Loudness: ");
  Serial.print(loudness);
  Serial.print(" (");
  Serial.print(loudnessPercent);
  Serial.println("%)");

  delay(100);
}
```

### Sound Level Indicator with LEDs

```cpp
/*
  Purpose: Visual sound level indicator using LEDs
  Hardware: Loudness sensor on A0, LEDs on D3-D7
*/

const int loudnessPin = A0;
const int led1 = 3;
const int led2 = 4;
const int led3 = 5;
const int led4 = 6;
const int led5 = 7;

void setup() {
  Serial.begin(9600);
  pinMode(loudnessPin, INPUT);
  pinMode(led1, OUTPUT);
  pinMode(led2, OUTPUT);
  pinMode(led3, OUTPUT);
  pinMode(led4, OUTPUT);
  pinMode(led5, OUTPUT);

  Serial.println("Sound Level Indicator");
}

void loop() {
  int loudness = analogRead(loudnessPin);
  int level = map(loudness, 0, 16383, 0, 5);

  // Light LEDs based on sound level
  digitalWrite(led1, level >= 1 ? HIGH : LOW);
  digitalWrite(led2, level >= 2 ? HIGH : LOW);
  digitalWrite(led3, level >= 3 ? HIGH : LOW);
  digitalWrite(led4, level >= 4 ? HIGH : LOW);
  digitalWrite(led5, level >= 5 ? HIGH : LOW);

  Serial.print("Level: ");
  Serial.print(level);
  Serial.println("/5");

  delay(50);
}
```

### Clap Switch

```cpp
/*
  Purpose: Toggle LED on/off with clap detection
*/

const int loudnessPin = A0;
const int ledPin = 3;

int threshold = 8000;  // Adjust based on environment (0-16383)
bool ledState = false;
unsigned long lastClapTime = 0;
int clapDebounce = 500;  // ms

void setup() {
  Serial.begin(9600);
  pinMode(loudnessPin, INPUT);
  pinMode(ledPin, OUTPUT);

  Serial.println("Clap Switch - Clap to toggle LED");
  Serial.print("Threshold: ");
  Serial.println(threshold);
}

void loop() {
  int loudness = analogRead(loudnessPin);
  unsigned long currentTime = millis();

  // Detect clap (sudden loud sound)
  if (loudness > threshold && (currentTime - lastClapTime) > clapDebounce) {
    ledState = !ledState;
    digitalWrite(ledPin, ledState);

    Serial.print("CLAP detected! Level: ");
    Serial.print(loudness);
    Serial.print(" - LED ");
    Serial.println(ledState ? "ON" : "OFF");

    lastClapTime = currentTime;
  }

  delay(10);
}
```

### Noise Level Monitor

```cpp
/*
  Purpose: Monitor and log noise levels over time
*/

const int loudnessPin = A0;
const int sampleInterval = 1000;  // 1 second
const int warningThreshold = 10000;  // Adjust for environment

unsigned long lastSample = 0;
int maxLoudness = 0;
int minLoudness = 16383;
long totalLoudness = 0;
int sampleCount = 0;

void setup() {
  Serial.begin(9600);
  pinMode(loudnessPin, INPUT);

  Serial.println("Noise Level Monitor");
  Serial.println("Time\tCurrent\tMin\tMax\tAverage");
}

void loop() {
  int loudness = analogRead(loudnessPin);

  // Track statistics
  if (loudness > maxLoudness) maxLoudness = loudness;
  if (loudness < minLoudness) minLoudness = loudness;
  totalLoudness += loudness;
  sampleCount++;

  // Log every second
  if (millis() - lastSample >= sampleInterval) {
    int average = totalLoudness / sampleCount;

    Serial.print(millis() / 1000);
    Serial.print("s\t");
    Serial.print(loudness);
    Serial.print("\t");
    Serial.print(minLoudness);
    Serial.print("\t");
    Serial.print(maxLoudness);
    Serial.print("\t");
    Serial.print(average);

    if (average > warningThreshold) {
      Serial.print("\t⚠ HIGH NOISE");
    }

    Serial.println();

    // Reset for next interval
    lastSample = millis();
    totalLoudness = 0;
    sampleCount = 0;
  }

  delay(10);
}
```

### Voice-Activated Recording

```cpp
/*
  Purpose: Detect voice activity for recording trigger
*/

const int loudnessPin = A0;
const int recordPin = 3;  // Output to recording device

int voiceThreshold = 5000;
int silenceThreshold = 2000;
int voiceDuration = 2000;  // ms of voice to trigger
int silenceDuration = 3000;  // ms of silence to stop

unsigned long voiceStartTime = 0;
unsigned long silenceStartTime = 0;
bool recording = false;

void setup() {
  Serial.begin(9600);
  pinMode(loudnessPin, INPUT);
  pinMode(recordPin, OUTPUT);
  digitalWrite(recordPin, LOW);

  Serial.println("Voice-Activated Recording");
  Serial.print("Voice threshold: ");
  Serial.println(voiceThreshold);
}

void loop() {
  int loudness = analogRead(loudnessPin);

  if (loudness > voiceThreshold) {
    // Voice detected
    if (!recording) {
      if (voiceStartTime == 0) {
        voiceStartTime = millis();
      } else if (millis() - voiceStartTime >= voiceDuration) {
        // Start recording
        recording = true;
        digitalWrite(recordPin, HIGH);
        Serial.println("🔴 RECORDING STARTED");
      }
    }
    silenceStartTime = 0;

  } else if (loudness < silenceThreshold) {
    // Silence detected
    voiceStartTime = 0;

    if (recording) {
      if (silenceStartTime == 0) {
        silenceStartTime = millis();
      } else if (millis() - silenceStartTime >= silenceDuration) {
        // Stop recording
        recording = false;
        digitalWrite(recordPin, LOW);
        Serial.println("⏹ RECORDING STOPPED");
        silenceStartTime = 0;
      }
    }
  }

  delay(50);
}
```

### Sound-Activated Night Light

```cpp
/*
  Purpose: Turn on light when sound detected in dark
  Hardware: Loudness sensor A0, light sensor A1, LED D3
*/

const int loudnessPin = A0;
const int lightPin = A1;
const int ledPin = 3;

int soundThreshold = 6000;
int darkThreshold = 2000;  // Light sensor reading
int lightDuration = 30000;  // 30 seconds

unsigned long lightOnTime = 0;
bool lightOn = false;

void setup() {
  Serial.begin(9600);
  pinMode(loudnessPin, INPUT);
  pinMode(lightPin, INPUT);
  pinMode(ledPin, OUTPUT);

  Serial.println("Sound-Activated Night Light");
}

void loop() {
  int loudness = analogRead(loudnessPin);
  int lightLevel = analogRead(lightPin);

  // Check if it's dark
  bool isDark = (lightLevel < darkThreshold);

  // Sound detected in dark
  if (isDark && loudness > soundThreshold) {
    digitalWrite(ledPin, HIGH);
    lightOn = true;
    lightOnTime = millis();

    Serial.println("💡 Light ON (sound detected)");
  }

  // Auto-off after duration
  if (lightOn && (millis() - lightOnTime >= lightDuration)) {
    digitalWrite(ledPin, LOW);
    lightOn = false;
    Serial.println("💡 Light OFF (timeout)");
  }

  delay(100);
}
```

### Decibel Estimator

```cpp
/*
  Purpose: Estimate approximate dB level
  Note: Not calibrated - for relative measurements only
*/

const int loudnessPin = A0;

void setup() {
  Serial.begin(9600);
  pinMode(loudnessPin, INPUT);

  Serial.println("Decibel Estimator (Relative)");
  Serial.println("Reading\tdB (est)");
}

void loop() {
  // Sample multiple readings for stability
  long sum = 0;
  for (int i = 0; i < 32; i++) {
    sum += analogRead(loudnessPin);
    delay(1);
  }
  int loudness = sum / 32;

  // Rough dB estimation (not scientifically calibrated!)
  // Assumes quiet room = 40dB, conversation = 60dB, loud = 80dB
  float db = 40 + (loudness / 16383.0) * 40;

  Serial.print(loudness);
  Serial.print("\t");
  Serial.print(db, 1);
  Serial.print(" dB");

  // Sound level description
  if (db < 50) {
    Serial.println(" (Quiet)");
  } else if (db < 60) {
    Serial.println(" (Moderate)");
  } else if (db < 70) {
    Serial.println(" (Conversation)");
  } else if (db < 80) {
    Serial.println(" (Loud)");
  } else {
    Serial.println(" (Very Loud)");
  }

  delay(500);
}
```

**Key Points:**

- Measures sound intensity (loudness), not specific frequencies
- Analog output: higher voltage = louder sound
- Adjust sensitivity with onboard potentiometer
- Uno R4: 14-bit ADC (0-16383 range)
- Sample multiple readings for stability
- Best for relative measurements, not absolute dB levels

## Testing Procedure

1. Connect loudness sensor to analog port (e.g., A0)
2. Upload basic loudness monitor example
3. **Test ambient noise:**
   - Quiet room: typical reading ~500-2000
   - Normal conversation: ~5000-10000
   - Loud clap/shout: >12000
4. **Adjust sensitivity:**
   - Turn onboard potentiometer clockwise = more sensitive
   - Counter-clockwise = less sensitive
5. **Test threshold detection:**
   - Set threshold in code
   - Make noise to trigger
   - Adjust as needed
6. **Verify no false triggers:**
   - Should not trigger on ambient noise
   - Should trigger reliably on target sounds

## Troubleshooting

| Problem                 | Solution                                                     |
| ----------------------- | ------------------------------------------------------------ |
| Always low readings     | Turn sensitivity pot clockwise, check power supply           |
| Always high readings    | Turn sensitivity pot counter-clockwise, reduce ambient noise |
| Erratic readings        | Average multiple samples, add delay between reads            |
| Not detecting sounds    | Increase sensitivity, lower threshold in code                |
| Too many false triggers | Decrease sensitivity, raise threshold, add debounce delay    |
| No response             | Check wiring, verify pin in code matches hardware            |

## Technical Specifications

**Microphone:**

- **Type:** Electret condenser microphone
- **Sensitivity:** -52dB ±3dB (typical)
- **Frequency Response:** 50Hz - 20kHz
- **Directivity:** Omnidirectional
- **SNR:** >60dB

**Amplifier:**

- **IC:** LM2904 dual op-amp
- **Gain:** Adjustable via potentiometer
- **Bandwidth:** 1MHz (LM2904)
- **Output Swing:** Rail-to-rail (0V - VCC)

**Electrical:**

- **Operating Voltage:** 3.3V - 5V
- **Current Draw:** ~5mA
- **Output Voltage:** 0V - 5V (analog)
- **ADC Resolution:** 14-bit (Uno R4: 0-16383)

**Performance:**

- **Detection Range:** 1-2 meters (typical conversation)
- **Response Time:** ~10ms
- **Dynamic Range:** ~40-80dB (estimated, uncalibrated)

**Environmental:**

- **Operating Temperature:** -10°C to 60°C
- **Storage Temperature:** -20°C to 70°C
- **Humidity:** 10-90% RH non-condensing

**Physical:**

- **Module Size:** 20mm × 20mm
- **Microphone Diameter:** 9.7mm
- **Weight:** ~3g
- **Mounting:** 2× M2 mounting holes

## Common Use Cases

### Sound-Activated Security Alarm

```cpp
const int loudnessPin = A0;
const int buzzerPin = 3;
const int armButton = 2;

bool armed = false;
int alarmThreshold = 10000;

void setup() {
  Serial.begin(9600);
  pinMode(loudnessPin, INPUT);
  pinMode(buzzerPin, OUTPUT);
  pinMode(armButton, INPUT_PULLUP);
  Serial.println("Security Alarm System");
}

void loop() {
  // Arm/disarm with button
  if (digitalRead(armButton) == LOW) {
    armed = !armed;
    Serial.println(armed ? "🔒 ARMED" : "🔓 DISARMED");
    delay(500);
  }

  if (armed) {
    int loudness = analogRead(loudnessPin);
    if (loudness > alarmThreshold) {
      // ALARM!
      Serial.println("🚨 INTRUDER DETECTED!");
      for (int i = 0; i < 20; i++) {
        digitalWrite(buzzerPin, HIGH);
        delay(100);
        digitalWrite(buzzerPin, LOW);
        delay(100);
      }
    }
  }

  delay(50);
}
```

### Baby Monitor Alert

```cpp
const int loudnessPin = A0;
const int ledPin = 3;

int cryThreshold = 8000;
int sustainedDuration = 2000;  // 2 seconds of crying
unsigned long loudStartTime = 0;

void setup() {
  Serial.begin(9600);
  pinMode(loudnessPin, INPUT);
  pinMode(ledPin, OUTPUT);
  Serial.println("Baby Monitor");
}

void loop() {
  int loudness = analogRead(loudnessPin);

  if (loudness > cryThreshold) {
    if (loudStartTime == 0) {
      loudStartTime = millis();
    } else if (millis() - loudStartTime >= sustainedDuration) {
      // Alert: Baby crying
      digitalWrite(ledPin, HIGH);
      Serial.println("👶 BABY CRYING - Alert!");
    }
  } else {
    loudStartTime = 0;
    digitalWrite(ledPin, LOW);
  }

  delay(100);
}
```

### Applause Meter

```cpp
const int loudnessPin = A0;
const int measurementTime = 5000;  // 5 seconds

void setup() {
  Serial.begin(9600);
  pinMode(loudnessPin, INPUT);
  Serial.println("Applause Meter - Ready!");
}

void loop() {
  Serial.println("Measuring applause...");

  long totalVolume = 0;
  int peakVolume = 0;
  int samples = 0;

  unsigned long startTime = millis();
  while (millis() - startTime < measurementTime) {
    int loudness = analogRead(loudnessPin);
    totalVolume += loudness;
    if (loudness > peakVolume) peakVolume = loudness;
    samples++;
    delay(10);
  }

  int averageVolume = totalVolume / samples;
  int score = map(averageVolume, 0, 16383, 0, 100);

  Serial.println("\n===== RESULTS =====");
  Serial.print("Average: ");
  Serial.println(averageVolume);
  Serial.print("Peak: ");
  Serial.println(peakVolume);
  Serial.print("SCORE: ");
  Serial.print(score);
  Serial.println("/100");
  Serial.println("===================\n");

  delay(5000);
}
```

## Loudness Sensor vs. Sound Sensor

**Loudness Sensor (This Module):**

- Amplified signal with op-amp
- Adjustable sensitivity (potentiometer)
- Better SNR (signal-to-noise ratio)
- More suitable for precise loudness measurement
- Higher cost

**Basic Sound Sensor:**

- Simple microphone + comparator
- Digital output (threshold-based)
- Less sensitive to ambient noise variations
- Good for simple sound detection
- Lower cost

## Calibration Tips

**Finding Threshold Values:**

```cpp
// Run this to find appropriate thresholds for your environment
void calibrate() {
  Serial.println("Calibration Mode");
  Serial.println("Make target sound repeatedly...");

  int maxReading = 0;
  int minReading = 16383;

  for (int i = 0; i < 100; i++) {
    int reading = analogRead(loudnessPin);
    if (reading > maxReading) maxReading = reading;
    if (reading < minReading) minReading = reading;
    Serial.println(reading);
    delay(100);
  }

  Serial.print("Min: ");
  Serial.println(minReading);
  Serial.print("Max: ");
  Serial.println(maxReading);
  Serial.print("Suggested threshold: ");
  Serial.println((minReading + maxReading) / 2);
}
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining loudness sensor with:

- LED strip (sound-reactive lighting, VU meter)
- OLED display (sound level visualization)
- Relay (sound-activated power control)
- Buzzer (noise level alarm)

## Additional Resources

- [Understanding Electret Microphones](https://www.mouser.com/pdfdocs/InvenSense-Electret-vs-MEMS-Microphones-WP-v1_1.pdf)
- [Sound Level Reference](https://www.chem.purdue.edu/chemsafety/Training/PPETrain/dblevels.htm)
- [Arduino Audio Input](https://www.instructables.com/Arduino-Audio-Input/)

---

**Source Verification Date:** 2025-11-18  
**Seeed Wiki Last Checked:** 2025-11-18  
**Tip:** Adjust onboard potentiometer for optimal sensitivity in your environment!
