# Grove Speaker

**Last Verified:** 2025-11-18  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Speaker/  
**Connection Type:** Digital (PWM)

## Overview

The Grove Speaker is an audio output module with an 8Ω/2W speaker driven by a PWM amplifier. Play tones, melodies, alarms, sound effects, and simple audio. Adjustable volume via onboard potentiometer. Louder and better sound quality than piezo buzzers. Ideal for alarms, music players, interactive toys, voice notifications, and educational projects.

## Authoritative References

- [Grove Speaker - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Speaker/)
- [LM386 Audio Amplifier Datasheet](https://www.ti.com/lit/ds/symlink/lm386.pdf)
- [Arduino Tone Function Reference](https://www.arduino.cc/reference/en/language/functions/advanced-io/tone/)

## Hardware Setup

- **Connection Type:** Digital (PWM recommended)
- **Grove Port:** D2-D8 (PWM pins D3, D5, D6, D9, D10, D11 for best results)
- **Speaker:** 8Ω impedance, 2W maximum power
- **Amplifier:** LM386 low voltage audio power amplifier
- **Gain:** 20× to 200× (adjustable with external components)
- **Volume Control:** Onboard potentiometer (turn clockwise = louder)
- **Operating Voltage:** 3.3V - 5V
- **Max Output Power:** 0.7W @ 5V (2W @ 9V with external power)
- **Frequency Range:** 100Hz - 10kHz (speaker limited)
- **Control:** PWM signal generates audio tones
- **Wiring:** Connect to Grove Base Shield digital port using 4-pin Grove cable

![Grove Speaker](https://files.seeedstudio.com/wiki/Grove-Speaker/img/Grove_Speaker_01.jpg)

## Software Prerequisites

No special library required - uses Arduino built-in `tone()` and `noTone()` functions.

```cpp
// Basic usage
tone(speakerPin, frequency);      // Play frequency (Hz)
tone(speakerPin, frequency, duration);  // Play for duration (ms)
noTone(speakerPin);               // Stop playing
```

**Optional Enhanced Libraries:**

```bash
# For more advanced audio
cd ~/Arduino/libraries
git clone https://github.com/arduino/arduino-tone
```

## Example Code

```cpp
/*
  Purpose: Play tones and melodies on Grove Speaker
  Notes:
    1. Connect to digital port (PWM pins preferred)
    2. tone(pin, frequency) plays a tone in Hz
    3. tone(pin, frequency, duration) plays for specified ms
    4. noTone(pin) stops the tone
    5. Adjust volume with onboard potentiometer
  Author: Ben Jones 18/11/25
  Source: https://wiki.seeedstudio.com/Grove-Speaker/
*/

const int speakerPin = 3;  // Connect to D3 (PWM)

void setup() {
  Serial.begin(9600);
  pinMode(speakerPin, OUTPUT);

  Serial.println("Grove Speaker Test");

  // Play scale: C D E F G A B C
  int notes[] = {262, 294, 330, 349, 392, 440, 494, 523};
  String noteNames[] = {"C", "D", "E", "F", "G", "A", "B", "C"};

  for (int i = 0; i < 8; i++) {
    Serial.print("Playing: ");
    Serial.println(noteNames[i]);
    tone(speakerPin, notes[i]);
    delay(500);
  }

  noTone(speakerPin);
  Serial.println("Test complete");
}

void loop() {
  // Play a simple melody every 5 seconds
  Serial.println("Playing melody...");

  tone(speakerPin, 523, 200);  // C5
  delay(250);
  tone(speakerPin, 659, 200);  // E5
  delay(250);
  tone(speakerPin, 784, 200);  // G5
  delay(250);
  tone(speakerPin, 1047, 400); // C6
  delay(500);

  noTone(speakerPin);
  Serial.println("Done\n");
  delay(5000);
}
```

### Play "Twinkle Twinkle Little Star"

```cpp
/*
  Purpose: Play complete melody with proper timing
*/

const int speakerPin = 3;

// Note frequencies (Hz)
#define NOTE_C4  262
#define NOTE_D4  294
#define NOTE_E4  330
#define NOTE_F4  349
#define NOTE_G4  392
#define NOTE_A4  440
#define NOTE_B4  494
#define NOTE_C5  523

// Melody notes
int melody[] = {
  NOTE_C4, NOTE_C4, NOTE_G4, NOTE_G4, NOTE_A4, NOTE_A4, NOTE_G4,
  NOTE_F4, NOTE_F4, NOTE_E4, NOTE_E4, NOTE_D4, NOTE_D4, NOTE_C4
};

// Note durations (4 = quarter note, 8 = eighth note, etc.)
int noteDurations[] = {
  4, 4, 4, 4, 4, 4, 2,
  4, 4, 4, 4, 4, 4, 2
};

void setup() {
  Serial.begin(9600);
  pinMode(speakerPin, OUTPUT);
  Serial.println("Playing: Twinkle Twinkle Little Star");
}

void loop() {
  playMelody();
  delay(3000);
}

void playMelody() {
  for (int i = 0; i < 14; i++) {
    // Calculate note duration (1000ms = whole note)
    int duration = 1000 / noteDurations[i];
    tone(speakerPin, melody[i], duration);

    // Pause between notes (30% of duration)
    int pause = duration * 1.30;
    delay(pause);

    noTone(speakerPin);
  }
}
```

### Alarm with Siren Sound

```cpp
/*
  Purpose: Create emergency siren sound effect
*/

const int speakerPin = 3;

void setup() {
  Serial.begin(9600);
  pinMode(speakerPin, OUTPUT);
  Serial.println("Alarm Siren");
}

void loop() {
  Serial.println("ALARM ACTIVE");

  // Rising siren (5 cycles)
  for (int cycle = 0; cycle < 5; cycle++) {
    // Sweep from 400Hz to 1000Hz
    for (int freq = 400; freq <= 1000; freq += 10) {
      tone(speakerPin, freq);
      delay(10);
    }
    // Sweep back down
    for (int freq = 1000; freq >= 400; freq -= 10) {
      tone(speakerPin, freq);
      delay(10);
    }
  }

  noTone(speakerPin);
  Serial.println("Alarm stopped\n");
  delay(3000);
}
```

### Button-Activated Sound Effects

```cpp
/*
  Purpose: Play different sounds based on button presses
*/

const int speakerPin = 3;
const int button1 = 2;
const int button2 = 4;
const int button3 = 5;

void setup() {
  Serial.begin(9600);
  pinMode(speakerPin, OUTPUT);
  pinMode(button1, INPUT_PULLUP);
  pinMode(button2, INPUT_PULLUP);
  pinMode(button3, INPUT_PULLUP);
  Serial.println("Sound Effects - Press buttons!");
}

void loop() {
  if (digitalRead(button1) == LOW) {
    Serial.println("Laser sound");
    playLaser();
    delay(200);
  }

  if (digitalRead(button2) == LOW) {
    Serial.println("Jump sound");
    playJump();
    delay(200);
  }

  if (digitalRead(button3) == LOW) {
    Serial.println("Coin sound");
    playCoin();
    delay(200);
  }
}

void playLaser() {
  for (int freq = 1500; freq > 200; freq -= 20) {
    tone(speakerPin, freq);
    delay(5);
  }
  noTone(speakerPin);
}

void playJump() {
  for (int freq = 300; freq < 1000; freq += 50) {
    tone(speakerPin, freq);
    delay(10);
  }
  noTone(speakerPin);
}

void playCoin() {
  tone(speakerPin, 988, 100);   // B5
  delay(120);
  tone(speakerPin, 1319, 400);  // E6
  delay(450);
  noTone(speakerPin);
}
```

### Temperature Alert System

```cpp
/*
  Purpose: Audio alert when temperature exceeds threshold
*/

const int speakerPin = 3;
const float tempThreshold = 30.0;  // °C

void setup() {
  Serial.begin(9600);
  pinMode(speakerPin, OUTPUT);
  Serial.println("Temperature Alert System");
}

void loop() {
  // Simulate temperature reading (replace with actual sensor)
  float temperature = random(200, 350) / 10.0;  // 20.0-35.0°C

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println("°C");

  if (temperature > tempThreshold) {
    Serial.println("WARNING: High temperature!");
    playWarningBeep();
  }

  delay(2000);
}

void playWarningBeep() {
  for (int i = 0; i < 3; i++) {
    tone(speakerPin, 1000, 200);  // 1kHz beep
    delay(250);
    tone(speakerPin, 1500, 200);  // 1.5kHz beep
    delay(250);
  }
  noTone(speakerPin);
}
```

### Musical Doorbell

```cpp
/*
  Purpose: Play doorbell chime when button pressed
*/

const int speakerPin = 3;
const int buttonPin = 2;

#define NOTE_E5  659
#define NOTE_C5  523

void setup() {
  Serial.begin(9600);
  pinMode(speakerPin, OUTPUT);
  pinMode(buttonPin, INPUT_PULLUP);
  Serial.println("Musical Doorbell");
}

void loop() {
  if (digitalRead(buttonPin) == LOW) {
    Serial.println("Ding dong!");

    // Ding-dong chime
    tone(speakerPin, NOTE_E5, 500);
    delay(600);
    tone(speakerPin, NOTE_C5, 800);
    delay(900);
    noTone(speakerPin);

    // Debounce
    delay(500);
    while (digitalRead(buttonPin) == LOW) {
      delay(10);
    }
  }
}
```

### Morse Code Transmitter

```cpp
/*
  Purpose: Convert text to Morse code audio
*/

const int speakerPin = 3;
const int toneFreq = 800;  // Hz
const int dotDuration = 100;  // ms
const int dashDuration = 300;
const int symbolGap = 100;
const int letterGap = 300;

void setup() {
  Serial.begin(9600);
  pinMode(speakerPin, OUTPUT);
  Serial.println("Morse Code Transmitter");

  // Transmit SOS
  Serial.println("Sending: SOS");
  sendMorse("SOS");
  delay(2000);
}

void loop() {
  Serial.println("Sending: HELLO");
  sendMorse("HELLO");
  delay(5000);
}

void sendMorse(String text) {
  text.toUpperCase();

  for (int i = 0; i < text.length(); i++) {
    char c = text[i];

    if (c == ' ') {
      delay(letterGap * 2);
    } else {
      sendChar(c);
      delay(letterGap);
    }
  }
}

void sendChar(char c) {
  // Simplified Morse code (A-Z)
  switch (c) {
    case 'A': dit(); dah(); break;
    case 'B': dah(); dit(); dit(); dit(); break;
    case 'E': dit(); break;
    case 'H': dit(); dit(); dit(); dit(); break;
    case 'L': dit(); dah(); dit(); dit(); break;
    case 'O': dah(); dah(); dah(); break;
    case 'S': dit(); dit(); dit(); break;
    // Add more letters as needed
  }
}

void dit() {
  tone(speakerPin, toneFreq, dotDuration);
  delay(dotDuration + symbolGap);
}

void dah() {
  tone(speakerPin, toneFreq, dashDuration);
  delay(dashDuration + symbolGap);
}
```

**Key Points:**

- Uses Arduino `tone()` function to generate frequencies
- Frequency range: 31Hz - 65,535Hz (speaker limits to ~100Hz-10kHz)
- Adjust volume with onboard potentiometer
- Only one tone can play at a time per pin
- `tone()` uses Timer2 on most Arduino boards
- PWM pins recommended for best performance

## Testing Procedure

1. Connect speaker to digital port (e.g., D3)
2. Adjust volume potentiometer to mid-position
3. Upload basic scale example
4. **Test tones:**
   - Should hear 8 notes (C-D-E-F-G-A-B-C)
   - Each 500ms duration
5. **Test volume:**
   - Turn pot clockwise = louder
   - Turn CCW = quieter
6. **Test frequency range:**
   - Low: `tone(speakerPin, 100)` - deep bass
   - Mid: `tone(speakerPin, 1000)` - clear tone
   - High: `tone(speakerPin, 5000)` - sharp treble
7. **Test melody:**
   - Play "Twinkle Twinkle" - verify timing and notes

## Troubleshooting

| Problem                  | Solution                                                           |
| ------------------------ | ------------------------------------------------------------------ |
| No sound                 | Check wiring, verify speaker connection, turn volume pot up        |
| Very quiet               | Turn volume potentiometer clockwise, check 5V power supply         |
| Distorted sound          | Lower volume pot, reduce frequencies above 4kHz                    |
| Clicking/popping         | Add small delay between tones, use `noTone()` between notes        |
| Tone won't stop          | Call `noTone(pin)` explicitly, check for infinite loops            |
| Multiple tones interfere | Only one `tone()` per timer - use different pins or sequence tones |

## Technical Specifications

**Speaker:**

- **Type:** Dynamic cone speaker
- **Impedance:** 8Ω nominal
- **Power Rating:** 2W maximum (0.7W typical @ 5V)
- **Frequency Response:** 100Hz - 10kHz
- **Sensitivity:** ~85dB @ 1W/1m
- **Diameter:** 23mm (varies by model)

**Amplifier (LM386):**

- **Type:** Low voltage audio power amplifier
- **Gain:** 20× (26dB) default, up to 200× with external cap
- **Bandwidth:** 300kHz
- **THD:** 0.2% typical @ 1kHz
- **Input Impedance:** 50kΩ
- **Output Power:** 0.7W @ 5V into 8Ω

**Electrical:**

- **Operating Voltage:** 3.3V - 5V (4-12V possible with external power)
- **Current Draw:** 10-400mA depending on volume and frequency
- **Typical Current:** 50-100mA @ moderate volume
- **Input Signal:** PWM from Arduino (digital pin)

**Audio:**

- **Frequency Range:** 31Hz - 65,535Hz (Arduino tone() limit)
- **Practical Range:** 100Hz - 10kHz (speaker limited)
- **Max Volume:** ~85-90dB SPL @ 30cm
- **Tone Resolution:** 1Hz steps

**Environmental:**

- **Operating Temperature:** -10°C to 60°C
- **Storage Temperature:** -20°C to 70°C

**Physical:**

- **Module Size:** 40mm × 20mm (varies)
- **Speaker Diameter:** 23mm typical
- **Weight:** ~10g
- **Volume Control:** Onboard trim potentiometer

## Common Use Cases

### Wake-Up Alarm

```cpp
const int speakerPin = 3;
const int hour = 7;  // 7 AM

void setup() {
  pinMode(speakerPin, OUTPUT);
  // Setup RTC here
}

void loop() {
  // Check if alarm time
  // if (currentHour == hour && currentMinute == 0)
  playAlarm();
}

void playAlarm() {
  // Increasingly urgent beeping
  for (int i = 0; i < 20; i++) {
    int freq = 800 + (i * 20);  // Rising frequency
    int duration = 200 - (i * 5);  // Faster beeps
    tone(speakerPin, freq, duration);
    delay(duration + 50);
  }
  noTone(speakerPin);
}
```

### Quiz Buzzer System

```cpp
const int speakerPin = 3;
const int button1 = 2;
const int button2 = 4;
const int button3 = 5;

void setup() {
  Serial.begin(9600);
  pinMode(speakerPin, OUTPUT);
  pinMode(button1, INPUT_PULLUP);
  pinMode(button2, INPUT_PULLUP);
  pinMode(button3, INPUT_PULLUP);
}

void loop() {
  if (digitalRead(button1) == LOW) {
    Serial.println("Player 1 buzzed!");
    playBuzz(400);
    delay(2000);
  }
  if (digitalRead(button2) == LOW) {
    Serial.println("Player 2 buzzed!");
    playBuzz(600);
    delay(2000);
  }
  if (digitalRead(button3) == LOW) {
    Serial.println("Player 3 buzzed!");
    playBuzz(800);
    delay(2000);
  }
}

void playBuzz(int freq) {
  tone(speakerPin, freq, 500);
}
```

### Parking Sensor Audio Feedback

```cpp
const int speakerPin = 3;
const int trigPin = 4;
const int echoPin = 5;

void setup() {
  pinMode(speakerPin, OUTPUT);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}

void loop() {
  int distance = getDistance();

  if (distance < 10) {
    // Very close - continuous tone
    tone(speakerPin, 2000);
    delay(50);
  } else if (distance < 30) {
    // Close - fast beeps
    tone(speakerPin, 1500, 100);
    delay(150);
  } else if (distance < 100) {
    // Moderate - slow beeps
    tone(speakerPin, 1000, 100);
    delay(map(distance, 30, 100, 200, 1000));
  } else {
    noTone(speakerPin);
    delay(200);
  }
}

int getDistance() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH);
  return duration * 0.034 / 2;
}
```

## Musical Note Frequencies

**Common Notes (Hz):**

```cpp
// Octave 3
#define NOTE_C3  131
#define NOTE_D3  147
#define NOTE_E3  165
#define NOTE_F3  175
#define NOTE_G3  196
#define NOTE_A3  220
#define NOTE_B3  247

// Octave 4 (Middle C)
#define NOTE_C4  262
#define NOTE_D4  294
#define NOTE_E4  330
#define NOTE_F4  349
#define NOTE_G4  392
#define NOTE_A4  440  // Concert A
#define NOTE_B4  494

// Octave 5
#define NOTE_C5  523
#define NOTE_D5  587
#define NOTE_E5  659
#define NOTE_F5  698
#define NOTE_G5  784
#define NOTE_A5  880
#define NOTE_B5  988
```

## Power Consumption

**Current Draw:**

- Idle/silent: ~5mA (amplifier quiescent)
- Low volume tone: 20-50mA
- Medium volume: 50-150mA
- High volume: 150-400mA

**Battery Life:**

- **USB (500mA):** Unlimited for normal use
- **9V battery (500mAh):** 1-2 hours continuous @ high volume, 10+ hours intermittent
- **4× AA (2500mAh):** 6-12 hours continuous, 50+ hours intermittent

**Power Saving:**

```cpp
// Use shorter tones
tone(pin, freq, 100);  // vs. continuous

// Lower volume (adjust pot)
// Turn down potentiometer = less current

// Turn off when not needed
noTone(pin);
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining speaker with:

- Button (musical keyboard, sound effects)
- Ultrasonic sensor (parking sensor, distance alerts)
- Temperature sensor (threshold alarms)
- Light sensor (light-activated sounds)

## Additional Resources

- [Arduino Tone Tutorial](https://www.arduino.cc/en/Tutorial/ToneMelody)
- [Musical Note Frequencies](https://pages.mtu.edu/~suits/notefreqs.html)
- [LM386 Application Notes](https://www.ti.com/lit/ds/symlink/lm386.pdf)
- [Sound Effect Programming](https://www.instructables.com/Arduino-Sound-Effects/)

---

**Source Verification Date:** 2025-11-18  
**Seeed Wiki Last Checked:** 2025-11-18  
**Tip:** Adjust the blue potentiometer for optimal volume without distortion!
