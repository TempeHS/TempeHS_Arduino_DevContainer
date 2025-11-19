# Challenge #4: Clap-Activated Lamp with Relay

**Classroom Challenge:** Sound-activated appliance control  
**Difficulty:** Beginner-Intermediate  
**Concepts:** Analog input processing, threshold detection, relay control, debouncing

## Overview

Create a clap-activated lamp that toggles on/off when you clap your hands. The system uses a loudness sensor to detect claps and a relay to control a lamp or LED. This simulates real-world sound-activated devices like clap lights, voice-activated switches, and smart home automation.

**Learning Outcomes:**

- Detect sound events using threshold detection
- Control high-power devices safely with relays
- Implement debouncing for reliable triggering
- Distinguish between claps and background noise
- Create toggle (flip-flop) behavior with boolean logic

## Required Components

- [Loudness Sensor](../sensors/loudness-sensor/) – Quantity: 1
- [Relay Module](../sensors/relay/) – Quantity: 1
- [LED (Red LED module)](../sensors/led/) – Quantity: 1 (to simulate lamp)
- Arduino Uno R4 WiFi
- Grove Base Shield
- Grove cables (2x Analog, 1x Digital)
- Optional: Desk lamp with standard plug (for advanced use)

## Wiring Diagram

**Connections:**

- Loudness Sensor → Analog Port A0
- Relay Module → Digital Port D5
- LED Module → Connect to relay's Normally Open (NO) terminals

```
[Arduino Uno R4 WiFi]
       |
[Grove Base Shield]
       |
       +--- A0 -----> [Loudness Sensor]
       |
       +--- D5 -----> [Relay Module]
                           |
                      [NO Terminal] -----> [LED Module or Lamp]
```

**Safety Note:** For this classroom project, use the Grove LED module connected to the relay. **Do NOT connect mains voltage (110V/240V) appliances without qualified supervision.**

## Step-by-Step Build

### 1. Hardware Setup

1. Mount Grove Base Shield on Arduino Uno R4 WiFi
2. Connect Loudness Sensor to analog port A0
3. Connect Relay module to digital port D5
4. Connect LED module to relay's NO (Normally Open) and COM terminals
5. Connect Arduino to computer via USB-C cable

### 2. Library Installation

No external libraries required for this project.

### 3. Code Implementation

```cpp
/*
  Challenge #4: Clap-Activated Lamp with Relay

  Description: Sound-activated lamp control. Clap once to turn on,
  clap again to turn off. Uses loudness sensor to detect claps and
  relay to control LED/lamp.

  Hardware:
  - Loudness Sensor on A0
  - Relay on D5
  - LED connected to relay NO/COM terminals

  References:
  - Loudness Sensor: https://wiki.seeedstudio.com/Grove-Loudness_Sensor/
  - Relay: https://wiki.seeedstudio.com/Grove-Relay/
  - LED: https://wiki.seeedstudio.com/Grove-Red_LED/
*/

const int loudnessPin = A0;
const int relayPin = 5;

// Clap detection parameters
const int clapThreshold = 100;  // Adjust based on ambient noise (0-16383 on R4)
const int silenceThreshold = 50;  // Threshold to detect silence
const unsigned long clapTimeout = 500;  // Max time between claps (ms)
const unsigned long debounceDelay = 300;  // Ignore sounds for 300ms after clap

// State tracking
bool lampOn = false;
unsigned long lastClapTime = 0;
bool waitingForSilence = false;

void setup() {
  Serial.begin(9600);
  pinMode(loudnessPin, INPUT);
  pinMode(relayPin, OUTPUT);

  // Start with lamp off
  digitalWrite(relayPin, LOW);

  Serial.println("Clap-Activated Lamp System");
  Serial.println("Clap to toggle lamp on/off");
  Serial.println("---");

  // Calibration prompt
  Serial.println("Calibrating...");
  calibrateSensor();
}

void loop() {
  // Read loudness sensor (14-bit on R4: 0-16383)
  int loudness = analogRead(loudnessPin);

  // Check if we're in debounce period
  if (millis() - lastClapTime < debounceDelay) {
    delay(10);
    return;
  }

  // Detect clap
  if (loudness > clapThreshold && !waitingForSilence) {
    Serial.print("CLAP detected! Level: ");
    Serial.println(loudness);

    // Toggle lamp state
    lampOn = !lampOn;
    digitalWrite(relayPin, lampOn ? HIGH : LOW);

    Serial.print("Lamp is now: ");
    Serial.println(lampOn ? "ON" : "OFF");
    Serial.println("---");

    // Record time and wait for silence before detecting next clap
    lastClapTime = millis();
    waitingForSilence = true;
  }

  // Wait for sound to drop below silence threshold
  if (waitingForSilence && loudness < silenceThreshold) {
    waitingForSilence = false;
  }

  delay(10);  // Small delay for stability
}

void calibrateSensor() {
  // Measure ambient noise for 3 seconds
  Serial.println("Measuring ambient noise (stay quiet)...");

  long total = 0;
  int samples = 0;
  unsigned long startTime = millis();

  while (millis() - startTime < 3000) {
    int reading = analogRead(loudnessPin);
    total += reading;
    samples++;
    delay(50);
  }

  int averageNoise = total / samples;
  Serial.print("Average ambient noise: ");
  Serial.println(averageNoise);
  Serial.print("Clap threshold set to: ");
  Serial.println(clapThreshold);

  if (averageNoise > silenceThreshold) {
    Serial.println("WARNING: Ambient noise high - consider quieter environment");
  }

  Serial.println("Calibration complete. Ready for claps!");
  Serial.println("---");
}
```

**Key Code Sections:**

**Clap Detection:**

```cpp
if (loudness > clapThreshold && !waitingForSilence) {
    // Clap detected!
}
```

Requires sound above threshold AND not waiting for previous sound to end.

**Toggle Logic:**

```cpp
lampOn = !lampOn;  // Flip the state
digitalWrite(relayPin, lampOn ? HIGH : LOW);
```

Simple boolean toggle creates on/off/on/off pattern.

**Debouncing:**

```cpp
if (millis() - lastClapTime < debounceDelay) {
    return;  // Ignore readings during debounce period
}
```

Prevents multiple triggers from single clap.

### 4. Testing

1. Upload the code to your Arduino
2. Open Serial Monitor (9600 baud)
3. **Expected behavior:**
   - System calibrates for 3 seconds (stay quiet)
   - Shows average ambient noise level
   - Clap once: Relay clicks, LED turns ON, message "Lamp is now: ON"
   - Clap again: Relay clicks, LED turns OFF, message "Lamp is now: OFF"
   - Clap detected messages show loudness levels
   - Background talking/noise should NOT trigger (if threshold set correctly)

### 5. Calibration

**If system is too sensitive (triggers on speech, footsteps):**

```cpp
const int clapThreshold = 150;  // Increase threshold
```

**If system doesn't respond to claps:**

```cpp
const int clapThreshold = 50;  // Decrease threshold
```

**Fine-tune by monitoring Serial output:**

1. Watch loudness values during normal activity
2. Watch loudness values when clapping
3. Set threshold midway between typical values

**For noisy environments:**

```cpp
const unsigned long debounceDelay = 500;  // Increase to reduce false triggers
```

## Common Issues

| Problem                            | Cause                              | Solution                                |
| ---------------------------------- | ---------------------------------- | --------------------------------------- |
| Triggers on every sound            | Threshold too low                  | Increase clapThreshold value            |
| Doesn't respond to claps           | Threshold too high or sensor issue | Decrease threshold, check connections   |
| Triggers multiple times per clap   | Insufficient debouncing            | Increase debounceDelay value            |
| Relay clicks but LED doesn't light | Wrong relay terminal               | Connect LED to NO and COM, not NC       |
| Inconsistent triggering            | Ambient noise fluctuating          | Add averaging/smoothing to readings     |
| Doesn't work after upload          | Calibration during noise           | Re-run calibration in quiet environment |

## Extensions & Modifications

### Beginner Extensions

1. **Double-clap detection:** Require two claps within time window
2. **Status LED:** Separate always-on LED showing current state
3. **Adjustable sensitivity:** Use potentiometer to set threshold
4. **Clap counter:** Display how many times toggled

### Intermediate Extensions

1. **Triple-clap for different mode:** Different brightness levels
2. **Timeout auto-off:** Turn off after 5 minutes of no activity
3. **Clap patterns:** Different patterns for different actions
4. **Multiple devices:** Control multiple relays with different clap counts
5. **OLED display:** Show state, clap count, sound level

### Advanced Extensions

1. **Voice command recognition:** Detect specific sound patterns
2. **Learning mode:** Adapt threshold to environment automatically
3. **WiFi control:** Combine clap + smartphone app control
4. **Schedule integration:** Only active during certain hours
5. **Multi-room sync:** Multiple units that sync state

## Example: Double-Clap Detection

```cpp
const int clapThreshold = 100;
const unsigned long doubleSnapWindow = 600;  // Must clap twice within 600ms

int clapCount = 0;
unsigned long firstClapTime = 0;

void loop() {
  int loudness = analogRead(loudnessPin);

  if (millis() - lastClapTime < debounceDelay) {
    delay(10);
    return;
  }

  if (loudness > clapThreshold && !waitingForSilence) {
    clapCount++;

    if (clapCount == 1) {
      firstClapTime = millis();
      Serial.println("First clap detected...");
    } else if (clapCount == 2) {
      unsigned long timeBetweenClaps = millis() - firstClapTime;

      if (timeBetweenClaps < doubleSnapWindow) {
        // Valid double-clap!
        lampOn = !lampOn;
        digitalWrite(relayPin, lampOn ? HIGH : LOW);
        Serial.println(lampOn ? "Lamp ON" : "Lamp OFF");
      } else {
        Serial.println("Claps too far apart - try again");
      }

      clapCount = 0;  // Reset
    }

    lastClapTime = millis();
    waitingForSilence = true;
  }

  // Reset if timeout
  if (clapCount == 1 && millis() - firstClapTime > doubleSnapWindow) {
    clapCount = 0;
    Serial.println("Double-clap timeout - try again");
  }

  if (waitingForSilence && loudness < silenceThreshold) {
    waitingForSilence = false;
  }

  delay(10);
}
```

## Example: With Brightness Control (PWM LED instead of Relay)

```cpp
// For this variation, connect LED to PWM pin (D6) instead of relay
const int ledPin = 6;  // PWM-capable pin
int brightnessLevel = 0;  // 0=off, 1=low, 2=medium, 3=high
const int brightnessValues[] = {0, 85, 170, 255};

void loop() {
  int loudness = analogRead(loudnessPin);

  if (loudness > clapThreshold && !waitingForSilence) {
    // Cycle through brightness levels
    brightnessLevel = (brightnessLevel + 1) % 4;
    analogWrite(ledPin, brightnessValues[brightnessLevel]);

    Serial.print("Brightness level: ");
    Serial.println(brightnessLevel);

    lastClapTime = millis();
    waitingForSilence = true;
  }

  if (waitingForSilence && loudness < silenceThreshold) {
    waitingForSilence = false;
  }

  delay(10);
}
```

## Example: With Visual Feedback (Listening Indicator)

```cpp
const int statusLedPin = 4;  // Separate LED for status

void setup() {
  // ... previous setup ...
  pinMode(statusLedPin, OUTPUT);
}

void loop() {
  int loudness = analogRead(loudnessPin);

  // Pulse status LED to show system is listening
  if (!waitingForSilence) {
    int brightness = map(loudness, 0, 200, 0, 255);
    brightness = constrain(brightness, 0, 255);
    analogWrite(statusLedPin, brightness);
  } else {
    digitalWrite(statusLedPin, LOW);
  }

  // ... rest of clap detection ...
}
```

## Real-World Applications

- **Home lighting control:** Hands-free light switches
- **Accessibility devices:** Control for users with limited mobility
- **Appliance automation:** Sound-activated fans, heaters, devices
- **Hotel room controls:** Touch-free switches for hygiene
- **Smart home integration:** Voice-free control option
- **Emergency signaling:** Activation without finding switches in dark
- **Industrial controls:** Hands-free operation in workshops

## Relay Safety Considerations

**For classroom use with Grove LED:**

- ✅ Safe for educational projects
- ✅ Low voltage (5V DC)
- ✅ No electrical hazard

**For controlling mains-powered devices (110V/240V AC):**

- ⚠️ **DANGER:** High voltage can cause serious injury or death
- ⚠️ Only qualified electricians should wire AC devices
- ⚠️ Use proper enclosures and strain reliefs
- ⚠️ Verify relay current rating exceeds device requirements
- ⚠️ Never touch relay terminals when AC power connected
- ⚠️ Ensure proper grounding and electrical isolation
- ⚠️ Consider using solid-state relays for frequent switching

## Educational Value

This project teaches:

- **Signal processing:** Detecting patterns in noisy analog data
- **Threshold logic:** Distinguishing signal from noise
- **Debouncing:** Software techniques for clean state transitions
- **Relay operation:** Electromagnetic switching for isolation
- **Toggle logic:** Creating flip-flop behavior with code
- **Calibration:** Adapting systems to different environments

## References

- [Loudness Sensor Guide](../sensors/loudness-sensor/)
- [Relay Module Guide](../sensors/relay/)
- [LED Guide](../sensors/led/)
- [Arduino analogRead()](https://www.arduino.cc/reference/en/language/functions/analog-io/analogread/)
- [Debouncing Tutorial](https://www.arduino.cc/en/Tutorial/BuiltInExamples/Debounce)

---

**Last Updated:** 2025-11-19  
**Tested On:** Arduino Uno R4 WiFi  
**Estimated Time:** 30-45 minutes
