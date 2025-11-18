# Grove Relay

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Relay/  
**Connection Type:** Digital

## Overview

The Grove Relay is an electronically operated switch that allows the Arduino to control high-voltage/high-current devices (up to 250V AC / 10A or 30V DC / 10A). Completely isolates low-voltage Arduino circuit from high-voltage load. Commonly used to control lamps, fans, motors, appliances, and other AC/DC devices.

## Authoritative References

- [Grove Relay - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Relay/)
- [Relay Basics - Arduino Tutorial](https://www.arduino.cc/en/Tutorial/BuiltInExamples)

## Hardware Setup

- **Connection Type:** Digital
- **Grove Port:** Any digital port (D2-D13)
- **Switch Rating:** 250V AC / 10A, 30V DC / 10A
- **Operating Voltage:** 5V
- **Control Signal:** Digital HIGH (relay ON), LOW (relay OFF)
- **Indicator LED:** Shows relay state (ON/OFF)
- **Wiring:** Connect to Grove Base Shield digital port using 4-pin Grove cable

![Grove Relay](https://files.seeedstudio.com/wiki/Grove-Relay/img/Twig-Relay.jpg)

**SAFETY WARNING:**

- **High voltage can be lethal!**
- Only qualified persons should work with AC mains voltage
- Ensure all connections are secure before applying power
- Never touch relay terminals when powered
- Use appropriate wire gauge for current load
- Always disconnect mains power before wiring

## Software Prerequisites

No library required - uses standard `digitalWrite()`.

## Example Code

```cpp
/*
  Purpose: Basic relay on/off control
  Notes:
    1. Connect to digital pin
    2. HIGH = relay ON (circuit closed)
    3. LOW = relay OFF (circuit open)
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Relay/
*/

const int relayPin = 2;  // Connect to D2

void setup() {
  pinMode(relayPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("Relay control ready");
}

void loop() {
  // Turn relay ON (close circuit)
  digitalWrite(relayPin, HIGH);
  Serial.println("Relay ON");
  delay(2000);

  // Turn relay OFF (open circuit)
  digitalWrite(relayPin, LOW);
  Serial.println("Relay OFF");
  delay(2000);
}
```

### Button-Controlled Relay

```cpp
const int relayPin = 2;
const int buttonPin = 3;
int lastButtonState = LOW;
int relayState = LOW;

void setup() {
  pinMode(relayPin, OUTPUT);
  pinMode(buttonPin, INPUT);
  Serial.begin(9600);
}

void loop() {
  int buttonState = digitalRead(buttonPin);

  // Toggle relay when button pressed
  if (buttonState == HIGH && lastButtonState == LOW) {
    relayState = !relayState;
    digitalWrite(relayPin, relayState);

    Serial.print("Relay ");
    Serial.println(relayState ? "ON" : "OFF");

    delay(200);  // Debounce
  }

  lastButtonState = buttonState;
}
```

**Key Points:**

- HIGH (1) = Relay energized, contacts closed, load ON
- LOW (0) = Relay de-energized, contacts open, load OFF
- Audible "click" when relay switches
- LED on module indicates relay state
- NO (Normally Open) and NC (Normally Closed) terminals available
- COM (Common) is the switch contact

## Testing Procedure

### Safe Low-Voltage Test

1. Connect relay to digital port (e.g., D2)
2. **DO NOT connect AC power yet**
3. Upload basic example
4. Open Serial Monitor (9600 baud)
5. **Expected behavior:**
   - Hear relay "click" every 2 seconds
   - See LED on relay module toggle
   - Serial Monitor shows "Relay ON" / "Relay OFF"

### High-Voltage Test (Qualified Personnel Only)

1. **Disconnect all power**
2. Wire load:
   - Connect one wire from AC source to **COM** terminal
   - Connect load's input to **NO** (Normally Open) terminal
   - Complete circuit by connecting load's other wire to AC source
3. Double-check all connections
4. Power Arduino
5. Test relay switching
6. **Always disconnect mains before making changes**

## Troubleshooting

| Problem                            | Solution                                               |
| ---------------------------------- | ------------------------------------------------------ |
| Relay doesn't click                | Check digital pin connection, verify 5V power          |
| Load doesn't turn on               | Check wiring to NO/NC/COM terminals, verify load power |
| Relay stuck ON                     | May be welded contacts; replace relay                  |
| Intermittent operation             | Loose connections, check all terminals                 |
| Arduino resets when relay switches | Power supply insufficient; use external 5V supply      |

## Technical Specifications

- **Relay Type:** Electromechanical, SPDT (Single Pole Double Throw)
- **Coil Voltage:** 5V DC
- **Coil Current:** ~90mA
- **Contact Rating:** 10A @ 250V AC, 10A @ 30V DC
- **Max Switching Voltage:** 250V AC / 30V DC
- **Max Switching Current:** 10A
- **Contact Resistance:** < 100mΩ
- **Operate Time:** < 15ms
- **Release Time:** < 10ms
- **Mechanical Life:** 10,000,000 operations
- **Electrical Life:** 100,000 operations @ rated load

## Common Use Cases

### Timed Relay (Auto Shutoff)

```cpp
const int relayPin = 2;
const unsigned long onTime = 5000;  // 5 seconds

void setup() {
  pinMode(relayPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  Serial.println("Turning ON for 5 seconds");
  digitalWrite(relayPin, HIGH);
  delay(onTime);

  Serial.println("Turning OFF");
  digitalWrite(relayPin, LOW);
  delay(5000);  // Wait before repeating
}
```

### Sound-Activated Relay (Clap Switch)

```cpp
const int relayPin = 2;
const int soundPin = A0;
const int threshold = 500;  // Adjust for sensitivity
int relayState = LOW;

void setup() {
  pinMode(relayPin, OUTPUT);
  pinMode(soundPin, INPUT);
  Serial.begin(9600);
}

void loop() {
  int soundLevel = analogRead(soundPin);

  if (soundLevel > threshold) {
    // Toggle relay on loud sound
    relayState = !relayState;
    digitalWrite(relayPin, relayState);

    Serial.print("Sound detected! Relay ");
    Serial.println(relayState ? "ON" : "OFF");

    delay(1000);  // Prevent rapid toggling
  }

  delay(50);
}
```

### Light-Controlled Relay (Photocell Switch)

```cpp
const int relayPin = 2;
const int lightSensorPin = A0;
const int darkThreshold = 300;  // Turn on when dark

void setup() {
  pinMode(relayPin, OUTPUT);
  pinMode(lightSensorPin, INPUT);
  Serial.begin(9600);
}

void loop() {
  int lightLevel = analogRead(lightSensorPin);

  Serial.print("Light level: ");
  Serial.println(lightLevel);

  if (lightLevel < darkThreshold) {
    // Dark - turn light ON
    digitalWrite(relayPin, HIGH);
    Serial.println("Lamp ON (dark)");
  } else {
    // Bright - turn light OFF
    digitalWrite(relayPin, LOW);
    Serial.println("Lamp OFF (bright)");
  }

  delay(1000);
}
```

### Temperature-Controlled Fan

```cpp
#include <DHT20.h>
#include <Wire.h>

const int relayPin = 2;
const float fanOnTemp = 25.0;   // °C
const float fanOffTemp = 23.0;  // °C (hysteresis)

DHT20 dht20;

void setup() {
  pinMode(relayPin, OUTPUT);
  Wire.begin();
  dht20.begin();
  Serial.begin(9600);
}

void loop() {
  float temp = dht20.getTemperature();

  Serial.print("Temperature: ");
  Serial.print(temp);
  Serial.println(" °C");

  int relayState = digitalRead(relayPin);

  if (temp > fanOnTemp && relayState == LOW) {
    digitalWrite(relayPin, HIGH);
    Serial.println("Fan ON");
  } else if (temp < fanOffTemp && relayState == HIGH) {
    digitalWrite(relayPin, LOW);
    Serial.println("Fan OFF");
  }

  delay(2000);
}
```

### Timer-Based Scheduler

```cpp
const int relayPin = 2;

void setup() {
  pinMode(relayPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  // Get time in seconds since start
  unsigned long seconds = millis() / 1000;

  // ON for 10 seconds every minute
  if ((seconds % 60) < 10) {
    digitalWrite(relayPin, HIGH);
    Serial.println("Relay ON (scheduled)");
  } else {
    digitalWrite(relayPin, LOW);
    Serial.println("Relay OFF");
  }

  delay(1000);
}
```

## Terminal Connections

The relay has 3 screw terminals:

```
COM (Common) - Always connected to power source
NO (Normally Open) - Closed when relay is ON
NC (Normally Closed) - Open when relay is ON (rarely used)
```

**Typical Wiring (Switching a Lamp):**

```
AC Hot → COM
NO → Lamp Hot
Lamp Neutral → AC Neutral
```

When relay is OFF: Circuit open, lamp OFF  
When relay is ON: COM connects to NO, lamp ON

**Using NC (Normally Closed):**

```
AC Hot → COM
NC → Lamp Hot
```

When relay is OFF: Circuit closed, lamp ON  
When relay is ON: COM disconnects from NC, lamp OFF

## Safety Best Practices

**Before Wiring:**

- ✅ Disconnect ALL power sources
- ✅ Verify relay rating exceeds load requirements
- ✅ Use appropriate wire gauge (14-16 AWG for 10A)
- ✅ Secure all terminal connections tightly
- ✅ Insulate exposed terminals

**During Operation:**

- ✅ Never touch terminals when powered
- ✅ Keep relay module dry
- ✅ Ensure adequate ventilation
- ✅ Monitor for overheating
- ✅ Listen for abnormal clicking/buzzing

**Electrical Ratings:**

- Don't exceed 10A continuous current
- Don't exceed 250V AC / 30V DC
- For inductive loads (motors, fans), derate to 70% of rating
- For incandescent lamps, consider inrush current (10x normal)

## Power Considerations

Relay coil draws ~90mA when energized:

**Single Relay:** Arduino USB power (500mA) is sufficient  
**Multiple Relays:** Use external 5V power supply (1A+ per 10 relays)

If Arduino resets when relay switches:

1. Add 100µF capacitor across Arduino power pins
2. Use separate 5V supply for relays
3. Ensure common ground between Arduino and relay power

## Relay Lifespan

- **Mechanical Life:** 10 million operations (no load)
- **Electrical Life:** 100,000 operations @ full load
- **Factors Affecting Life:**
  - High current loads reduce lifespan
  - Inductive loads (motors) cause arcing
  - Frequent switching accelerates wear
  - Operating beyond ratings damages contacts

## Inductive Load Protection

When switching inductive loads (motors, solenoids, transformers), add a flyback diode or snubber circuit across the load to prevent voltage spikes and extend relay life.

## Integration Examples

See [integration recipes](../../integrations/) for projects combining relay with:

- Sound sensor (Challenge #4: Clap on/off lamp)
- Light sensor (auto night light)
- Temperature sensor (thermostat control)
- Button (manual override switch)

## Additional Resources

- [Relay Basics - Tutorial](https://learn.sparkfun.com/tutorials/beefcake-relay-control-hookup-guide)
- [Electrical Safety Guide](https://www.arduino.cc/en/Tutorial/BuiltInExamples)
- [Relay Selection Guide](https://en.wikipedia.org/wiki/Relay)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**⚠️ SAFETY:** High voltage can be lethal. Only qualified personnel should work with AC mains.
