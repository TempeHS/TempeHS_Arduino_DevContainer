# Grove Sound Sensor

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Sound_Sensor/  
**Connection Type:** Analog

## Overview

The Grove Sound Sensor detects sound intensity (loudness) in the environment. Returns analog values proportional to sound level. Ideal for sound-activated projects, noise monitoring, and clap detection.

## Authoritative References

- [Grove Sound Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Sound_Sensor/)
- No external library required (uses standard Arduino analogRead)

## Hardware Setup

- **Connection Type:** Analog
- **Grove Port:** Any Analog port (A0-A3)
- **Power Requirements:** 3.3V - 5V
- **Output Range:** 0 - 1023 (10-bit ADC), 0 - 16383 (14-bit on Uno R4)
- **Sensitivity:** Adjustable via onboard potentiometer
- **Wiring:** Connect to Grove Base Shield analog port using 4-pin Grove cable

![Grove Sound Sensor](https://files.seeedstudio.com/wiki/Grove_Sound_Sensor/images/page_small_1.jpg)

## Software Prerequisites

No external libraries required. Uses built-in Arduino functions:

- `analogRead(pin)`

## Example Code

### Basic Sound Level Reading

```cpp
/*
  Purpose: Example of the Seeed sound level sensor with averaging
  Notes: Takes 32 samples and outputs the average
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Sound_Sensor/
*/

const int soundSensor = A0;

void setup() {
  Serial.begin(9600);
}

void loop() {
  long sum = 0;

  // Take 32 samples
  for(int i = 0; i < 32; i++) {
    sum += analogRead(soundSensor);
  }

  // Calculate average using bitwise shift (sum / 32)
  // >>= 5 means shift right 5 bits, equivalent to dividing by 2^5 = 32
  sum >>= 5;

  Serial.print("Average Sensor Value: ");
  Serial.println(sum);
  delay(100);
}
```

### Clap Detector

```cpp
/*
  Detect loud sounds (claps) and trigger action
*/

const int soundPin = A0;
const int ledPin = 3;
const int threshold = 600;  // Adjust based on environment

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int soundLevel = analogRead(soundPin);

  Serial.println(soundLevel);

  if (soundLevel > threshold) {
    Serial.println("Clap detected!");
    digitalWrite(ledPin, HIGH);
    delay(500);  // LED on for 500ms
    digitalWrite(ledPin, LOW);
    delay(500);  // Prevent multiple triggers
  }

  delay(50);
}
```

### Sound-Activated Lamp (Toggle)

```cpp
/*
  Clap to turn lamp on/off (toggle state)
*/

const int soundPin = A0;
const int lampPin = 3;
const int threshold = 650;
bool lampState = false;
unsigned long lastClap = 0;
const unsigned long debounce = 1000;  // 1 second between claps

void setup() {
  pinMode(lampPin, OUTPUT);
}

void loop() {
  int soundLevel = analogRead(soundPin);

  if (soundLevel > threshold && (millis() - lastClap > debounce)) {
    lampState = !lampState;
    digitalWrite(lampPin, lampState);
    lastClap = millis();
  }

  delay(10);
}
```

**Key Points:**

- Returns higher values when louder sounds detected
- Baseline (quiet) value varies by environment (typically 200-400)
- Clap or loud noise produces spikes (600-900+)
- Averaging multiple samples reduces noise
- Adjust onboard potentiometer for sensitivity

## Testing Procedure

1. Connect Sound Sensor to analog port A0
2. Upload basic reading sketch
3. Open Serial Monitor (9600 baud)
4. **Expected output:**
   - Low values (200-400) in quiet environment
   - Higher values (400-600) with background noise
   - Spikes (600-900+) when clapping or making loud sounds
5. Clap near sensor to test response

## Calibration

Find your environment's baseline and threshold:

```cpp
const int soundPin = A0;
int minValue = 1023;
int maxValue = 0;

void setup() {
  Serial.begin(9600);
  Serial.println("Calibrating - make loud and quiet sounds for 10 seconds");
}

void loop() {
  int reading = analogRead(soundPin);

  if (reading < minValue) minValue = reading;
  if (reading > maxValue) maxValue = reading;

  Serial.print("Current: ");
  Serial.print(reading);
  Serial.print(" | Min: ");
  Serial.print(minValue);
  Serial.print(" | Max: ");
  Serial.println(maxValue);

  delay(50);
}
```

After calibration, set threshold to: `threshold = (minValue + maxValue) / 2 + some_margin`

## Troubleshooting

| Problem                        | Solution                                           |
| ------------------------------ | -------------------------------------------------- |
| Always reads same value        | Check Grove cable connection, verify analog port   |
| No response to sound           | Adjust onboard sensitivity pot, increase threshold |
| Too sensitive (false triggers) | Decrease sensitivity pot, increase threshold value |
| Erratic readings               | Normal; use averaging, add debounce delay          |
| Can't detect quiet sounds      | Increase sensor sensitivity with onboard pot       |

## Technical Specifications

- **Operating Voltage:** 3.3V - 5V
- **Output:** Analog voltage (0-VCC)
- **Microphone Type:** Electret condenser
- **Frequency Range:** 50Hz - 20kHz
- **Sensitivity:** Adjustable (onboard potentiometer)
- **Dimensions:** 20mm x 20mm

## Common Use Cases

### Sound Level Meter

```cpp
const int soundPin = A0;

void loop() {
  long sum = 0;
  for(int i = 0; i < 32; i++) {
    sum += analogRead(soundPin);
  }
  int avg = sum >> 5;

  Serial.print("Sound Level: ");
  if (avg < 300) Serial.println("Quiet");
  else if (avg < 500) Serial.println("Moderate");
  else if (avg < 700) Serial.println("Loud");
  else Serial.println("Very Loud");

  delay(200);
}
```

### Noise Activated Recording

```cpp
const int soundPin = A0;
const int recordPin = 4;
const int threshold = 600;

void loop() {
  if (analogRead(soundPin) > threshold) {
    digitalWrite(recordPin, HIGH);  // Start recording
    delay(5000);  // Record for 5 seconds
    digitalWrite(recordPin, LOW);
  }
  delay(100);
}
```

### Party Mode (Sound-Reactive Lights)

```cpp
const int soundPin = A0;
const int ledPin = 3;

void loop() {
  int soundLevel = analogRead(soundPin);
  int brightness = map(soundLevel, 300, 800, 0, 255);
  brightness = constrain(brightness, 0, 255);
  analogWrite(ledPin, brightness);
  delay(10);
}
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining sound sensor with:

- LED (sound-reactive lighting)
- Relay (clap-on lamp) - **Challenge #4**
- OLED display (sound level meter)
- Buzzer (sound echo/amplifier)

## Additional Resources

- [Arduino analogRead() Reference](https://www.arduino.cc/reference/en/language/functions/analog-io/analogread/)
- [Electret Microphone Basics](https://en.wikipedia.org/wiki/Electret_microphone)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17
