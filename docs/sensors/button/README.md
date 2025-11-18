# Grove Button

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Button/  
**Connection Type:** Digital

## Overview

The Grove Button is a simple momentary push button (normally open) that provides a clean digital HIGH signal when pressed. Perfect for user input, triggering events, and learning fundamental digital I/O concepts.

## Authoritative References

- [Grove Button - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Button/) – Official documentation
- No external library required (uses standard Arduino digitalRead)

## Hardware Setup

- **Connection Type:** Digital
- **Grove Port:** Any Digital port (D2-D8 recommended)
- **Power Requirements:** 3.3V / 5V compatible
- **Signal:** Digital HIGH (1) when pressed, LOW (0) when released
- **Wiring:** Connect to Grove Base Shield digital port using 4-pin Grove cable

![Grove Button](https://files.seeedstudio.com/wiki/Grove-Button/img/button.jpg)

## Software Prerequisites

### Required Libraries

No external libraries required. Uses built-in Arduino functions:

- `pinMode(pin, INPUT)`
- `digitalRead(pin)`

## Example Code

```cpp
/*
  Purpose: Basic example of the momentary button switch input module
  Notes:
    1. Connect to a Digital pin
    2. Normally open momentary switch
    3. Wired for pull up only
  Author: Ben Jones 13/7/23
  Contact: benjmain.jones21@det.nsw.edu.au
  Source: https://wiki.seeedstudio.com/Grove-Button/
*/

static unsigned int myButton = 3;

void setup() {
  Serial.begin(9600);
  pinMode(myButton, INPUT);
}

void loop() {
  Serial.print("myButton:");
  Serial.println(digitalRead(myButton));
}
```

**Key Points:**

- Button returns HIGH (1) when pressed, LOW (0) when not pressed
- Use `pinMode(pin, INPUT)` to configure the pin
- Grove module includes pull-up resistor, no external resistor needed
- Default pin D3 in example, adjust as needed for your setup

## Testing Procedure

1. Connect button to Grove Base Shield digital port (e.g., D3)
2. Upload the example sketch
3. Open Serial Monitor (Tools → Serial Monitor, or Ctrl+Shift+M)
4. Set baud rate to 9600
5. **Expected output:**
   - Displays "myButton:0" when not pressed
   - Displays "myButton:1" when pressed

## Debouncing

For reliable button detection in production code, implement debouncing:

```cpp
const int buttonPin = 3;
const int debounceDelay = 50; // milliseconds
int lastButtonState = LOW;
int buttonState;
unsigned long lastDebounceTime = 0;

void setup() {
  Serial.begin(9600);
  pinMode(buttonPin, INPUT);
}

void loop() {
  int reading = digitalRead(buttonPin);

  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (reading != buttonState) {
      buttonState = reading;

      if (buttonState == HIGH) {
        Serial.println("Button pressed!");
      }
    }
  }

  lastButtonState = reading;
}
```

## Troubleshooting

| Problem                     | Solution                                              |
| --------------------------- | ----------------------------------------------------- |
| No output on Serial Monitor | Verify baud rate is 9600, check USB connection        |
| Always reads 0              | Check Grove cable connection, verify port assignment  |
| Always reads 1              | Check if button is stuck or cable is faulty           |
| Inconsistent readings       | Implement debouncing (see above)                      |
| Wrong pin number            | Verify which digital port on Base Shield you're using |

## Common Use Cases

- **Trigger actions:** Start measurements, toggle LEDs
- **Mode switching:** Change between program states
- **User confirmation:** Wait for user input before proceeding
- **Event counting:** Count button presses
- **Interrupt-driven input:** Use with `attachInterrupt()` for responsive input

## Integration Examples

See [integration recipes](../../integrations/) for projects combining button with:

- Ultrasonic ranger (button-triggered distance measurement)
- LED control (button toggle)
- OLED display (menu navigation)
- Buzzer (button-activated alarm)

## Additional Resources

- [Arduino digitalRead() Reference](https://www.arduino.cc/reference/en/language/functions/digital-io/digitalread/)
- [Arduino Debounce Tutorial](https://docs.arduino.cc/built-in-examples/digital/Debounce/)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17
