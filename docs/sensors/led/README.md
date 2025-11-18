# Grove Red LED

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://www.seeedstudio.com/Grove-Red-LED.html  
**Connection Type:** Digital / PWM

## Overview

The Grove Red LED module is a simple LED output device that can be used for indication, status display, or visual feedback. Supports both digital on/off control and PWM brightness control.

## Authoritative References

- [Grove Red LED - Seeed Studio](https://www.seeedstudio.com/Grove-Red-LED.html)
- No external library required (uses standard Arduino digitalWrite/analogWrite)

## Hardware Setup

- **Connection Type:** Digital or PWM
- **Grove Port:** Any Digital port (D2-D13), PWM pins for brightness control (D3, D5, D6, D9, D10, D11)
- **Power Requirements:** 5V
- **Current:** ~20mA
- **Wiring:** Connect to Grove Base Shield using 4-pin Grove cable

## Software Prerequisites

No external libraries required. Uses built-in Arduino functions:

- `digitalWrite(pin, HIGH/LOW)` for on/off
- `analogWrite(pin, 0-255)` for brightness control (PWM pins only)

## Example Code

### Basic On/Off Blink

```cpp
/*
  Purpose: Basic example of the Red LED Seeed output module
  Author: Ben Jones 13/7/23
  Source: https://www.seeedstudio.com/Grove-Red-LED.html
*/

static unsigned int red_LED = 3;

void setup() {
  Serial.begin(9600);
  pinMode(red_LED, OUTPUT);
}

void loop() {
  digitalWrite(red_LED, HIGH);  // Turn on
  delay(1000);
  digitalWrite(red_LED, LOW);   // Turn off
  delay(1000);
}
```

### PWM Brightness Control (Fade In/Out)

```cpp
/*
  LED fades from off to full brightness and back
  Requires PWM-capable pin (3, 5, 6, 9, 10, 11)
*/

static unsigned int red_LED = 3;  // Must be PWM pin

void setup() {
  pinMode(red_LED, OUTPUT);
}

void loop() {
  // Fade in from min to max
  for (int fadeValue = 0; fadeValue <= 255; fadeValue += 5) {
    analogWrite(red_LED, fadeValue);
    delay(30);
  }

  // Fade out from max to min
  for (int fadeValue = 255; fadeValue >= 0; fadeValue -= 5) {
    analogWrite(red_LED, fadeValue);
    delay(30);
  }
}
```

### Breathing Effect

```cpp
const int ledPin = 3;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  // Smooth breathing using sine wave
  for (int i = 0; i < 360; i++) {
    float radians = i * (PI / 180);
    int brightness = (sin(radians) + 1) * 127.5;
    analogWrite(ledPin, brightness);
    delay(10);
  }
}
```

**Key Points:**

- Use `digitalWrite()` for simple on/off
- Use `analogWrite()` on PWM pins for brightness control (0 = off, 255 = full brightness)
- Built-in current limiting resistor included on module
- Can be used as visual indicator or status light

## Testing Procedure

1. Connect LED module to digital port (e.g., D3)
2. Upload basic blink sketch
3. **Expected behavior:**
   - LED turns on for 1 second
   - LED turns off for 1 second
   - Pattern repeats continuously
4. For PWM test: LED should smoothly fade in and out

## Common Use Cases

### Status Indicator

```cpp
const int ledPin = 3;
const int buttonPin = 2;

void setup() {
  pinMode(ledPin, OUTPUT);
  pinMode(buttonPin, INPUT);
}

void loop() {
  if (digitalRead(buttonPin) == HIGH) {
    digitalWrite(ledPin, HIGH);  // LED on when button pressed
  } else {
    digitalWrite(ledPin, LOW);   // LED off when button released
  }
}
```

### Alert/Warning Flasher

```cpp
const int ledPin = 3;

void alert() {
  for (int i = 0; i < 10; i++) {
    digitalWrite(ledPin, HIGH);
    delay(100);
    digitalWrite(ledPin, LOW);
    delay(100);
  }
}
```

### Heartbeat Pattern

```cpp
const int ledPin = 3;

void heartbeat() {
  digitalWrite(ledPin, HIGH);
  delay(50);
  digitalWrite(ledPin, LOW);
  delay(50);
  digitalWrite(ledPin, HIGH);
  delay(50);
  digitalWrite(ledPin, LOW);
  delay(850);  // Long pause between beats
}
```

## Troubleshooting

| Problem                  | Solution                                                  |
| ------------------------ | --------------------------------------------------------- |
| LED doesn't light up     | Check connection, verify correct pin number in code       |
| LED stays on constantly  | Check if digitalWrite HIGH without LOW, verify loop logic |
| LED very dim             | If using PWM, check analogWrite value (should be 0-255)   |
| Can't control brightness | Must use PWM-capable pin (3, 5, 6, 9, 10, 11)             |
| LED flickers             | Check power supply, ensure stable connection              |

## PWM vs Digital Control

### Digital Control (All pins)

- Simple on/off only
- Use `digitalWrite(pin, HIGH)` or `digitalWrite(pin, LOW)`
- Works on any digital pin (D2-D13)

### PWM Control (PWM pins only)

- Variable brightness (0-255)
- Use `analogWrite(pin, value)`
- Only works on pins 3, 5, 6, 9, 10, 11 on Uno R4

## Technical Specifications

- **LED Color:** Red
- **Forward Voltage:** ~2.0V
- **Forward Current:** 20mA (max)
- **Brightness Control:** PWM (requires PWM pin)
- **Operating Voltage:** 3.3V - 5V
- **Built-in Resistor:** Yes (current limiting)

## Multiple LED Control

```cpp
const int led1 = 3;
const int led2 = 5;
const int led3 = 6;

void setup() {
  pinMode(led1, OUTPUT);
  pinMode(led2, OUTPUT);
  pinMode(led3, OUTPUT);
}

void loop() {
  // Sequential lighting
  digitalWrite(led1, HIGH);
  delay(300);
  digitalWrite(led2, HIGH);
  delay(300);
  digitalWrite(led3, HIGH);
  delay(300);

  digitalWrite(led1, LOW);
  digitalWrite(led2, LOW);
  digitalWrite(led3, LOW);
  delay(300);
}
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining LED with:

- Light sensor (automatic brightness) - **Challenge #1**
- Button (manual control)
- Ultrasonic ranger (distance indication)
- Temperature sensor (temperature alert)

## Additional Resources

- [Arduino digitalWrite() Reference](https://www.arduino.cc/reference/en/language/functions/digital-io/digitalwrite/)
- [Arduino analogWrite() Reference](https://www.arduino.cc/reference/en/language/functions/analog-io/analogwrite/)
- [PWM Explained](https://www.arduino.cc/en/Tutorial/PWM)

---

**Source Verification Date:** 2025-11-17  
**Seeed Product Page Last Checked:** 2025-11-17
