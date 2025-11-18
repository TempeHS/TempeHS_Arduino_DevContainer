# Grove Buzzer

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://www.seeedstudio.com/Grove-Buzzer.html  
**Connection Type:** Digital

## Overview

The Grove Buzzer module uses a piezo buzzer to produce sound/tones. Can generate different frequencies for alarms, notifications, musical notes, or audio feedback.

## Authoritative References

- [Grove Buzzer - Seeed Studio](https://www.seeedstudio.com/Grove-Buzzer.html)
- No external library required (uses standard Arduino tone functions)

## Hardware Setup

- **Connection Type:** Digital
- **Grove Port:** Any Digital port (D2-D13)
- **Power Requirements:** 3.3V - 5V
- **Sound Output:** 85dB @ 10cm
- **Frequency Range:** 2-5kHz
- **Wiring:** Connect to Grove Base Shield using 4-pin Grove cable

## Software Prerequisites

No external libraries required. Uses built-in Arduino functions:

- `digitalWrite(pin, HIGH/LOW)` for simple beep
- `tone(pin, frequency)` for specific tones
- `tone(pin, frequency, duration)` for timed tones
- `noTone(pin)` to stop sound

## Example Code

### Basic Beeping

```cpp
/*
  Purpose: Basic example of the Seeed Buzzer output module
  Author: Ben Jones 13/7/23
  Source: https://www.seeedstudio.com/Grove-Buzzer.html
*/

static unsigned int myBuzzer = 3;

void setup() {
  Serial.begin(9600);
  pinMode(myBuzzer, OUTPUT);
}

void loop() {
  digitalWrite(myBuzzer, HIGH);
  delay(1000);
  digitalWrite(myBuzzer, LOW);
  delay(3000);
}
```

### Multi-Tone Example

```cpp
/*
  Play different frequency tones
*/

static unsigned int myBuzzer = 3;

void setup() {
  pinMode(myBuzzer, OUTPUT);
}

void loop() {
  tone(myBuzzer, 1000);  // 1kHz
  delay(1000);

  tone(myBuzzer, 750);   // 750Hz
  delay(1000);

  tone(myBuzzer, 500);   // 500Hz
  delay(1000);

  tone(myBuzzer, 250);   // 250Hz
  delay(1000);

  noTone(myBuzzer);      // Stop
  delay(1000);
}
```

### Musical Notes

```cpp
/*
  Play a simple melody
  Note frequencies based on middle C = 262Hz
*/

#define NOTE_C  262
#define NOTE_D  294
#define NOTE_E  330
#define NOTE_F  349
#define NOTE_G  392
#define NOTE_A  440
#define NOTE_B  494

const int buzzerPin = 3;

int melody[] = {NOTE_C, NOTE_D, NOTE_E, NOTE_F, NOTE_G, NOTE_A, NOTE_B};
int noteDuration = 500;  // milliseconds

void setup() {
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  for (int i = 0; i < 7; i++) {
    tone(buzzerPin, melody[i]);
    delay(noteDuration);
    noTone(buzzerPin);
    delay(50);  // Short pause between notes
  }
  delay(2000);  // Wait before repeating
}
```

**Key Points:**

- `digitalWrite()` produces basic on/off beep
- `tone()` allows frequency control (Hz)
- Always call `noTone()` to stop sound
- Can play musical notes by frequency
- For songs, see: https://github.com/robsoncouto/arduino-songs

## Testing Procedure

1. Connect buzzer to digital port (e.g., D3)
2. Upload basic beep sketch
3. **Expected behavior:**
   - Buzzer sounds for 1 second
   - Silence for 3 seconds
   - Pattern repeats
4. For tone test: Should hear different pitches

## Common Use Cases

### Alarm Sound

```cpp
const int buzzerPin = 3;

void alarm() {
  for (int i = 0; i < 5; i++) {
    tone(buzzerPin, 1000);
    delay(200);
    noTone(buzzerPin);
    delay(200);
  }
}
```

### Warning Beep Pattern

```cpp
const int buzzerPin = 3;

void warning() {
  // Three short beeps
  for (int i = 0; i < 3; i++) {
    tone(buzzerPin, 2000, 100);
    delay(150);
  }
}
```

### Siren Effect

```cpp
const int buzzerPin = 3;

void siren() {
  for (int freq = 500; freq < 2000; freq += 50) {
    tone(buzzerPin, freq);
    delay(10);
  }
  for (int freq = 2000; freq > 500; freq -= 50) {
    tone(buzzerPin, freq);
    delay(10);
  }
}
```

### Button Press Confirmation

```cpp
const int buzzerPin = 3;
const int buttonPin = 2;

void setup() {
  pinMode(buzzerPin, OUTPUT);
  pinMode(buttonPin, INPUT);
}

void loop() {
  if (digitalRead(buttonPin) == HIGH) {
    tone(buzzerPin, 1500, 50);  // Short beep
    delay(300);  // Debounce
  }
}
```

## Troubleshooting

| Problem                   | Solution                                             |
| ------------------------- | ---------------------------------------------------- |
| No sound                  | Check connection, verify pin number, ensure power    |
| Continuous sound          | Make sure noTone() is called, check loop logic       |
| Sound too quiet           | Normal for piezo; use larger buzzer for louder sound |
| Wrong frequency           | Verify tone() parameter (Hz), typical range 100-5000 |
| Buzzer clicks but no tone | May be at frequency limit; try different frequency   |

## Frequency Guide

### Common Notes (Middle Octave)

- C: 262 Hz
- D: 294 Hz
- E: 330 Hz
- F: 349 Hz
- G: 392 Hz
- A: 440 Hz (standard tuning)
- B: 494 Hz

### Useful Frequencies

- Low warning: 200-500 Hz
- Mid tone: 500-1000 Hz
- High alert: 1000-2000 Hz
- Very high: 2000-4000 Hz

## Technical Specifications

- **Type:** Piezoelectric buzzer
- **Operating Voltage:** 3.3V - 5V
- **Sound Pressure Level:** 85dB @ 10cm
- **Resonant Frequency:** 2300Hz ±300Hz
- **Operating Current:** <25mA
- **Dimensions:** 20mm x 20mm

## Advanced: Non-Blocking Tones

```cpp
const int buzzerPin = 3;
unsigned long previousMillis = 0;
const long interval = 1000;
bool buzzerState = false;

void setup() {
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    if (buzzerState) {
      noTone(buzzerPin);
    } else {
      tone(buzzerPin, 1000);
    }
    buzzerState = !buzzerState;
  }

  // Other code can run here without blocking
}
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining buzzer with:

- Button (button-activated alarm)
- Ultrasonic ranger (proximity alert) - **Challenge #5**
- Temperature sensor (overheat alarm)
- Motion sensor (security alarm)
- Sound sensor (clap detector) - **Challenge #4**

## Additional Resources

- [Arduino tone() Reference](https://www.arduino.cc/reference/en/language/functions/advanced-io/tone/)
- [Arduino noTone() Reference](https://www.arduino.cc/reference/en/language/functions/advanced-io/notone/)
- [Arduino Songs Library](https://github.com/robsoncouto/arduino-songs)
- [Musical Note Frequencies](https://en.wikipedia.org/wiki/Piano_key_frequencies)

---

**Source Verification Date:** 2025-11-17  
**Seeed Product Page Last Checked:** 2025-11-17
