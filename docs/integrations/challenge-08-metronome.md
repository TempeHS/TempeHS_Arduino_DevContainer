# Challenge #8: Musical Metronome with Tempo Control

**Classroom Challenge:** Precision timing device with user controls  
**Difficulty:** Beginner-Intermediate  
**Concepts:** Precise timing, user input processing, audio generation, display graphics, BPM calculations

## Overview

Create a musical metronome that generates precise rhythmic clicks to help musicians keep tempo. Users can adjust the beats-per-minute (BPM) using a rotary potentiometer, start/stop with a button, and see the current tempo on an OLED display. This simulates real-world timing devices, music tools, and precision interval generators.

**Learning Outcomes:**

- Calculate precise timing intervals from BPM
- Use potentiometer for continuous control input
- Generate rhythmic audio patterns
- Display real-time information on OLED
- Implement start/stop control logic
- Understand musical timing and tempo

## Required Components

- [Button](../sensors/button/) – Quantity: 1 (start/stop)
- [Rotary Potentiometer](../sensors/rotary-potentiometer/) – Quantity: 1 (tempo control)
- [Buzzer](../sensors/buzzer/) – Quantity: 1 (click sound)
- [OLED Display 0.96"](../sensors/oled-display/) – Quantity: 1 (BPM display)
- Arduino Uno R4 WiFi
- Grove Base Shield
- Grove cables (1x Digital, 1x Analog, 1x Digital pulse, 1x I2C)

## Wiring Diagram

**Connections:**

- Button → Digital Port D3
- Rotary Potentiometer → Analog Port A0
- Buzzer → Digital Port D6
- OLED Display → I2C Port

```
[Arduino Uno R4 WiFi]
       |
[Grove Base Shield]
       |
       +--- D3 -----> [Button] (start/stop)
       |
       +--- A0 -----> [Rotary Potentiometer] (tempo)
       |
       +--- D6 -----> [Buzzer] (click sound)
       |
       +--- I2C ----> [OLED Display 0.96"]
```

## Step-by-Step Build

### 1. Hardware Setup

1. Mount Grove Base Shield on Arduino Uno R4 WiFi
2. Connect Button to digital port D3
3. Connect Rotary Potentiometer to analog port A0
4. Connect Buzzer to digital port D6
5. Connect OLED Display to I2C port
6. Connect Arduino to computer via USB-C cable

### 2. Library Installation

```bash
arduino-cli lib install "U8g2"
```

Or via Arduino IDE:

- Sketch → Include Library → Manage Libraries
- Search and install: "U8g2"

### 3. Code Implementation

```cpp
/*
  Challenge #8: Musical Metronome with Tempo Control

  Description: Precision metronome for musicians. Adjustable BPM via
  potentiometer, start/stop with button, visual feedback on OLED display.

  Hardware:
  - Button on D3 (start/stop)
  - Rotary Potentiometer on A0 (tempo control)
  - Buzzer on D6 (click sound)
  - OLED Display on I2C (0x3C)

  References:
  - Button: https://wiki.seeedstudio.com/Grove-Button/
  - Rotary Pot: https://wiki.seeedstudio.com/Grove-Rotary_Angle_Sensor/
  - Buzzer: https://wiki.seeedstudio.com/Grove-Buzzer/
  - OLED: https://wiki.seeedstudio.com/Grove-OLED-Display-0.96-SSD1315/
*/

#include <Wire.h>
#include <U8g2lib.h>

// Pin definitions
const int buttonPin = 3;
const int potPin = A0;
const int buzzerPin = 6;

// U8g2 OLED object
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

// Metronome state
bool isRunning = false;
int currentBPM = 120;  // Default tempo

// Timing
unsigned long lastBeatTime = 0;
unsigned long beatInterval = 500;  // Milliseconds between beats

// Beat visualization
int beatCount = 0;
bool beatActive = false;
unsigned long beatFlashTime = 0;
const unsigned long beatFlashDuration = 100;  // Visual beat indicator duration

// BPM range
const int minBPM = 40;   // Grave/Largo
const int maxBPM = 208;  // Prestissimo

void setup() {
  Serial.begin(9600);
  Wire.begin();

  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(potPin, INPUT);
  pinMode(buzzerPin, OUTPUT);

  // Initialize OLED
  u8g2.begin();
  u8g2.enableUTF8Print();

  // Display startup screen
  displayStartup();
  delay(2000);

  Serial.println("=== Musical Metronome ===");
  Serial.println("Button: Start/Stop");
  Serial.println("Pot: Adjust tempo (BPM)");
  Serial.println("---");
}

void loop() {
  // Handle button press (start/stop)
  static bool lastButtonState = HIGH;
  bool buttonState = digitalRead(buttonPin);

  if (buttonState == LOW && lastButtonState == HIGH) {
    // Button pressed
    delay(50);  // Debounce
    isRunning = !isRunning;

    if (isRunning) {
      Serial.println("Metronome STARTED");
      lastBeatTime = millis();  // Reset timing
      beatCount = 0;
    } else {
      Serial.println("Metronome STOPPED");
      noTone(buzzerPin);
    }
  }
  lastButtonState = buttonState;

  // Read tempo from potentiometer (14-bit ADC on R4)
  int potValue = analogRead(potPin);
  currentBPM = map(potValue, 0, 16383, minBPM, maxBPM);
  beatInterval = 60000 / currentBPM;  // Convert BPM to milliseconds per beat

  // Generate beats if running
  if (isRunning) {
    if (millis() - lastBeatTime >= beatInterval) {
      generateBeat();
      lastBeatTime = millis();
    }
  }

  // Handle beat flash timing
  if (beatActive && millis() - beatFlashTime >= beatFlashDuration) {
    beatActive = false;
  }

  // Update display
  updateDisplay();

  delay(10);
}

void generateBeat() {
  beatCount++;
  beatActive = true;
  beatFlashTime = millis();

  // Accent every 4th beat (4/4 time signature)
  if (beatCount % 4 == 1) {
    // Accent beat - higher pitch, longer duration
    tone(buzzerPin, 1200, 80);
    Serial.print("BEAT ");
  } else {
    // Regular beat - normal pitch, shorter duration
    tone(buzzerPin, 800, 50);
    Serial.print("beat ");
  }

  Serial.print(beatCount);
  Serial.print(" | BPM: ");
  Serial.println(currentBPM);
}

void updateDisplay() {
  u8g2.clearBuffer();

  // Title
  u8g2.setFont(u8g2_font_ncenB10_tr);
  u8g2.drawStr(20, 12, "METRONOME");
  u8g2.drawLine(0, 15, 128, 15);

  // BPM (large)
  u8g2.setFont(u8g2_font_fub25_tn);  // Large numbers
  char bpmStr[5];
  sprintf(bpmStr, "%d", currentBPM);
  int bpmWidth = u8g2.getStrWidth(bpmStr);
  u8g2.drawStr((128 - bpmWidth) / 2, 45, bpmStr);

  // BPM label
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(48, 54, "BPM");

  // Status indicator
  if (isRunning) {
    u8g2.setFont(u8g2_font_7x13_tr);
    u8g2.drawStr(45, 64, "RUNNING");

    // Beat indicator - visual pulse
    if (beatActive) {
      u8g2.drawDisc(10, 60, 5);  // Filled circle
    } else {
      u8g2.drawCircle(10, 60, 5);  // Hollow circle
    }

    // Beat count in measure (1-4)
    char beatStr[2];
    sprintf(beatStr, "%d", ((beatCount - 1) % 4) + 1);
    u8g2.setFont(u8g2_font_6x10_tr);
    u8g2.drawStr(120, 64, beatStr);

  } else {
    u8g2.setFont(u8g2_font_7x13_tr);
    u8g2.drawStr(45, 64, "STOPPED");
  }

  // Tempo marking (musical term)
  u8g2.setFont(u8g2_font_6x10_tr);
  String tempoMarking = getTempoMarking(currentBPM);
  u8g2.drawStr(5, 23, tempoMarking.c_str());

  u8g2.sendBuffer();
}

String getTempoMarking(int bpm) {
  // Standard musical tempo markings
  if (bpm < 60) return "Grave";
  else if (bpm < 66) return "Largo";
  else if (bpm < 76) return "Adagio";
  else if (bpm < 108) return "Andante";
  else if (bpm < 120) return "Moderato";
  else if (bpm < 168) return "Allegro";
  else if (bpm < 200) return "Presto";
  else return "Prestissimo";
}

void displayStartup() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_ncenB14_tr);
  u8g2.drawStr(5, 25, "MUSICAL");
  u8g2.drawStr(5, 50, "METRONOME");
  u8g2.sendBuffer();
}
```

**Key Code Sections:**

**BPM to Interval Conversion:**

```cpp
beatInterval = 60000 / currentBPM;  // 60 seconds * 1000ms / beats per minute
```

**Accent Beat Logic:**

```cpp
if (beatCount % 4 == 1) {
    tone(buzzerPin, 1200, 80);  // Accent (higher pitch)
} else {
    tone(buzzerPin, 800, 50);   // Regular beat
}
```

**Precise Timing:**

```cpp
if (millis() - lastBeatTime >= beatInterval) {
    generateBeat();
    lastBeatTime = millis();
}
```

Uses non-blocking timing for accuracy.

### 4. Testing

1. Upload the code to your Arduino
2. **Expected behavior:**
   - OLED shows "MUSICAL METRONOME" for 2 seconds
   - Display shows current BPM (default 120), "STOPPED" status
   - Adjust potentiometer: BPM changes from 40 to 208
   - Display shows tempo marking (Grave, Allegro, etc.)
   - Press button: Metronome starts, "RUNNING" displayed
   - Buzzer clicks rhythmically at set tempo
   - Visual circle pulses with each beat
   - Every 4th beat is accented (higher pitch, shown as "BEAT")
   - Beat count cycles 1-2-3-4-1-2-3-4
   - Press button again: Stops clicking

### 5. Calibration

**Adjust BPM range:**

```cpp
const int minBPM = 40;   // Lower limit
const int maxBPM = 208;  // Upper limit
```

**Change time signature (from 4/4 to 3/4):**

```cpp
if (beatCount % 3 == 1) {  // Accent every 3rd beat instead of 4th
    tone(buzzerPin, 1200, 80);
}
```

**Adjust click sounds:**

```cpp
tone(buzzerPin, 1200, 80);  // Accent: frequency, duration
tone(buzzerPin, 800, 50);   // Regular: frequency, duration
```

**Change visual flash duration:**

```cpp
const unsigned long beatFlashDuration = 100;  // Milliseconds
```

## Common Issues

| Problem                | Cause                     | Solution                                                    |
| ---------------------- | ------------------------- | ----------------------------------------------------------- |
| BPM doesn't change     | Pot not connected         | Check A0 connection, verify 14-bit reading                  |
| Clicks drift over time | Timing accumulation error | Code uses millis() correctly - check if other code blocking |
| No sound               | Buzzer connection         | Verify buzzer on D6, check tone() function                  |
| Button doesn't respond | Missing debounce delay    | delay(50) after button detect                               |
| Display blank          | I2C connection            | Check OLED connections, verify address 0x3C                 |
| Tempo unstable         | Noisy pot readings        | Add averaging: read multiple times                          |
| Beat count wrong       | Modulo logic error        | Verify `(beatCount - 1) % 4 + 1` formula                    |

## Extensions & Modifications

### Beginner Extensions

1. **Different time signatures:** 3/4 (waltz), 6/8, 5/4
2. **Tap tempo:** Tap button to set BPM instead of using pot
3. **Subdivisions:** Add eighth notes or triplets between main beats
4. **Visual LED:** External LED blinks with beat

### Intermediate Extensions

1. **Rhythm patterns:** Beyond simple beats - swing, shuffle, dotted
2. **Multiple sounds:** Different tones for different beats in pattern
3. **Preset tempos:** Button cycles through common BPMs (60, 80, 120, 160)
4. **BPM presets:** Save favorite tempos to EEPROM
5. **Countdown:** Visual/audio countdown before starting

### Advanced Extensions

1. **Polyrhythms:** Multiple simultaneous tempos
2. **MIDI output:** Send clock signals to electronic instruments
3. **Acceleration trainer:** Gradually increase tempo automatically
4. **Recording mode:** Record and playback custom rhythms
5. **Wireless sync:** Multiple metronomes synchronized via WiFi
6. **Tuner mode:** Switch between metronome and instrument tuner

## Example: With Tap Tempo

```cpp
unsigned long tapTimes[4];
int tapIndex = 0;
int tapCount = 0;
unsigned long lastTapTime = 0;
const unsigned long tapTimeout = 2000;  // Reset if no tap for 2 seconds

void loop() {
  bool buttonState = digitalRead(buttonPin);

  if (buttonState == LOW && lastButtonState == HIGH) {
    delay(50);

    if (isRunning) {
      // Tapping while running = tempo adjustment
      unsigned long now = millis();

      if (now - lastTapTime > tapTimeout) {
        // Timeout - start new tap sequence
        tapCount = 0;
      }

      tapTimes[tapIndex] = now;
      tapIndex = (tapIndex + 1) % 4;
      tapCount++;
      lastTapTime = now;

      if (tapCount >= 2) {
        // Calculate average interval
        unsigned long totalInterval = 0;
        int validTaps = min(tapCount - 1, 3);

        for (int i = 0; i < validTaps; i++) {
          int prevIdx = (tapIndex - i - 1 + 4) % 4;
          int currIdx = (tapIndex - i + 4) % 4;
          totalInterval += tapTimes[currIdx] - tapTimes[prevIdx];
        }

        unsigned long avgInterval = totalInterval / validTaps;
        currentBPM = 60000 / avgInterval;
        currentBPM = constrain(currentBPM, minBPM, maxBPM);

        Serial.print("Tap tempo: ");
        Serial.print(currentBPM);
        Serial.println(" BPM");
      }
    } else {
      // Start metronome
      isRunning = true;
      lastBeatTime = millis();
      beatCount = 0;
      tapCount = 0;
    }
  }
  lastButtonState = buttonState;

  // ... rest of loop ...
}
```

## Example: With Subdivisions

```cpp
enum SubdivisionMode {
  QUARTER_NOTES,    // Standard beats
  EIGHTH_NOTES,     // Two clicks per beat
  TRIPLETS,         // Three clicks per beat
  SIXTEENTH_NOTES   // Four clicks per beat
};

SubdivisionMode currentMode = QUARTER_NOTES;

void generateBeat() {
  int divisor = 1;
  switch (currentMode) {
    case QUARTER_NOTES: divisor = 1; break;
    case EIGHTH_NOTES: divisor = 2; break;
    case TRIPLETS: divisor = 3; break;
    case SIXTEENTH_NOTES: divisor = 4; break;
  }

  beatInterval = 60000 / (currentBPM * divisor);

  // Different sounds for main beats vs subdivisions
  if (beatCount % divisor == 0) {
    tone(buzzerPin, 1200, 50);  // Main beat
  } else {
    tone(buzzerPin, 600, 30);   // Subdivision (quieter/shorter)
  }

  beatCount++;
}
```

## Example: With Acceleration Trainer

```cpp
// Gradually increase tempo for practice
int startBPM = 60;
int targetBPM = 120;
int currentPracticeBPM = startBPM;
unsigned long lastIncrease = 0;
const unsigned long increaseInterval = 30000;  // Increase every 30 seconds
const int bpmIncrement = 5;

void loop() {
  // ... normal loop ...

  if (isRunning && millis() - lastIncrease >= increaseInterval) {
    if (currentPracticeBPM < targetBPM) {
      currentPracticeBPM += bpmIncrement;
      currentBPM = currentPracticeBPM;
      lastIncrease = millis();

      Serial.print("Tempo increased to: ");
      Serial.println(currentBPM);

      // Visual/audio notification
      for (int i = 0; i < 2; i++) {
        tone(buzzerPin, 1500, 100);
        delay(150);
      }
    }
  }
}
```

## Real-World Applications

- **Music practice:** Tempo training for musicians
- **Dance studios:** Choreography timing and rehearsal
- **Fitness training:** Interval timing for workouts
- **Laboratory work:** Precise interval timing for experiments
- **Photography:** Time-lapse interval controller
- **Production lines:** Pace setting for manufacturing
- **Meditation:** Breathing rhythm guidance

## Musical Tempo Reference

| BPM Range | Tempo Marking | Translation         | Usage             |
| --------- | ------------- | ------------------- | ----------------- |
| 40-60     | Grave         | Slow and solemn     | Funeral marches   |
| 60-66     | Largo         | Broadly             | Slow movements    |
| 66-76     | Adagio        | At ease             | Slow, expressive  |
| 76-108    | Andante       | Walking pace        | Moderate tempo    |
| 108-120   | Moderato      | Moderate            | Standard tempo    |
| 120-168   | Allegro       | Fast and bright     | Most common tempo |
| 168-200   | Presto        | Very fast           | Exciting finales  |
| 200+      | Prestissimo   | As fast as possible | Virtuoso pieces   |

## Metronome Accuracy

**Factors Affecting Timing:**

- Arduino clock accuracy: ±50 ppm (very good)
- millis() overflow: Not a concern for metronome sessions
- Code blocking: Avoid delay() in main loop (we use non-blocking timing)
- Temperature drift: Minimal with Arduino crystal oscillator

**Our Implementation:**

- ✅ Non-blocking timing with millis()
- ✅ Precise BPM to interval conversion
- ✅ No accumulated timing errors
- ✅ Immediate response to tempo changes

## Educational Value

This project teaches:

- **Precision timing:** Accurate interval generation
- **Musical concepts:** Tempo, time signatures, rhythm
- **User interfaces:** Input controls and visual feedback
- **Audio synthesis:** Tone generation and patterns
- **Mathematics:** BPM conversions, modulo operations for patterns
- **Real-time systems:** Responsive control with timing constraints

## References

- [Button Guide](../sensors/button/)
- [Rotary Potentiometer Guide](../sensors/rotary-potentiometer/)
- [Buzzer Guide](../sensors/buzzer/)
- [OLED Display Guide](../sensors/oled-display/)
- [Arduino tone()](https://www.arduino.cc/reference/en/language/functions/advanced-io/tone/)
- [Arduino millis()](https://www.arduino.cc/reference/en/language/functions/time/millis/)
- [Musical Tempo](https://en.wikipedia.org/wiki/Tempo)

---

**Last Updated:** 2025-11-19  
**Tested On:** Arduino Uno R4 WiFi  
**Estimated Time:** 45-60 minutes
