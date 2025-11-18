# Grove Screw Terminal

**Last Verified:** 2025-11-18  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Screw_Terminal/  
**Connection Type:** Universal Adapter

## Overview

The Grove Screw Terminal adapter converts Grove's 4-pin connector to standard screw terminals, allowing connection of bare wires, custom sensors, or non-Grove components to the Grove system. Perfect for prototyping, connecting external power supplies, interfacing with industrial sensors, or creating custom Grove-compatible modules. Works with all Grove port types (Digital, Analog, I2C, UART).

## Authoritative References

- [Grove Screw Terminal - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Screw_Terminal/)
- [Wire Gauge Guide](https://en.wikipedia.org/wiki/American_wire_gauge)

## Hardware Setup

- **Connection Type:** Universal adapter (Digital/Analog/I2C/UART)
- **Grove Port:** Connects to any Grove port on Base Shield
- **Screw Terminals:** 4× terminals for wire connection
- **Wire Compatibility:** 22-28 AWG (0.3-0.8mm diameter)
- **Terminal Type:** Screw clamp (flat-head screwdriver required)
- **Contact Material:** Tin-plated copper
- **Maximum Current:** 2A per terminal
- **Maximum Voltage:** 125V AC or 30V DC
- **Pin Mapping:**
  - Terminal 1: Signal 1 (Yellow wire / Digital/Analog/SDA)
  - Terminal 2: Signal 2 (White wire / Digital/SCL)
  - Terminal 3: VCC (+5V or +3.3V, Red wire)
  - Terminal 4: GND (Black wire)
- **Polarity:** Observe correct voltage polarity (VCC positive, GND negative)
- **Wiring:** Connect screw terminal to Grove Base Shield port, then attach wires to screw terminals

![Grove Screw Terminal](https://files.seeedstudio.com/wiki/Grove-Screw_Terminal/img/Grove-screw_terminal.jpg)

## Software Prerequisites

No libraries required - functions as wire adapter only. Use appropriate code for connected device:

```cpp
// For digital devices
pinMode(pin, INPUT/OUTPUT);
digitalWrite(pin, HIGH/LOW);
digitalRead(pin);

// For analog devices
analogRead(pin);
analogWrite(pin, value);

// For I2C devices
#include <Wire.h>
Wire.begin();
```

## Example Code

```cpp
/*
  Purpose: Use screw terminal to connect custom digital sensor
  Notes:
    1. Terminal 1 (Yellow): Signal pin
    2. Terminal 2 (White): Not used for single digital signal
    3. Terminal 3 (Red): VCC (+5V)
    4. Terminal 4 (Black): GND
    5. Connect external sensor wires to screw terminals
  Author: Ben Jones 18/11/25
  Source: https://wiki.seeedstudio.com/Grove-Screw_Terminal/
*/

const int sensorPin = 2;  // Connected to Terminal 1 (Yellow)

void setup() {
  Serial.begin(9600);
  pinMode(sensorPin, INPUT);

  Serial.println("Custom Digital Sensor via Screw Terminal");
}

void loop() {
  int state = digitalRead(sensorPin);

  Serial.print("Sensor state: ");
  Serial.println(state == HIGH ? "HIGH" : "LOW");

  delay(500);
}
```

### Analog Sensor Connection

```cpp
const int sensorPin = A0;  // Screw terminal on Analog port

void setup() {
  Serial.begin(9600);
  pinMode(sensorPin, INPUT);

  Serial.println("Custom Analog Sensor");
}

void loop() {
  int rawValue = analogRead(sensorPin);
  float voltage = (rawValue * 5.0) / 16383.0;  // 14-bit ADC on Uno R4

  Serial.print("Raw: ");
  Serial.print(rawValue);
  Serial.print(" | Voltage: ");
  Serial.print(voltage, 3);
  Serial.println("V");

  delay(100);
}
```

### External Power Supply Connection

```cpp
/*
  Connect external power supply via screw terminal
  Terminal 3 (VCC): +5V from external supply
  Terminal 4 (GND): Ground from external supply
  Use Terminal 1/2 for signal pass-through if needed
*/

const int powerMonitorPin = A0;

void setup() {
  Serial.begin(9600);

  Serial.println("External Power Monitor");
  Serial.println("Measuring voltage on VCC terminal");
}

void loop() {
  // If monitoring power supply voltage
  int reading = analogRead(powerMonitorPin);
  float voltage = (reading * 5.0) / 16383.0;

  Serial.print("Supply voltage: ");
  Serial.print(voltage, 2);
  Serial.println("V");

  delay(1000);
}
```

### I2C Device Breakout

```cpp
#include <Wire.h>

// Screw terminal pins for I2C:
// Terminal 1 (Yellow): SDA
// Terminal 2 (White): SCL
// Terminal 3 (Red): VCC
// Terminal 4 (Black): GND

const byte I2C_ADDRESS = 0x50;  // Example address

void setup() {
  Serial.begin(9600);
  Wire.begin();

  Serial.println("I2C Device via Screw Terminal");
}

void loop() {
  // Communicate with I2C device
  Wire.beginTransmission(I2C_ADDRESS);
  Wire.write(0x00);  // Register address
  byte error = Wire.endTransmission();

  if (error == 0) {
    Serial.println("I2C device responding");
  } else {
    Serial.println("I2C device not found");
  }

  delay(1000);
}
```

### Dual Channel Digital Sensor

```cpp
// Use both signal terminals for two independent digital inputs
const int sensor1Pin = 2;  // Terminal 1 (Yellow)
const int sensor2Pin = 3;  // Terminal 2 (White)

void setup() {
  Serial.begin(9600);
  pinMode(sensor1Pin, INPUT);
  pinMode(sensor2Pin, INPUT);

  Serial.println("Dual Channel Digital Sensor");
}

void loop() {
  int state1 = digitalRead(sensor1Pin);
  int state2 = digitalRead(sensor2Pin);

  Serial.print("Sensor 1: ");
  Serial.print(state1);
  Serial.print(" | Sensor 2: ");
  Serial.println(state2);

  delay(200);
}
```

### External Button with Pull-up

```cpp
const int buttonPin = 2;  // Terminal 1

void setup() {
  Serial.begin(9600);
  pinMode(buttonPin, INPUT_PULLUP);  // Use internal pull-up

  Serial.println("External Button via Screw Terminal");
}

void loop() {
  if (digitalRead(buttonPin) == LOW) {  // Active LOW with pull-up
    Serial.println("Button pressed");
    delay(200);  // Debounce
  }
}
```

### Custom Temperature Sensor (Thermistor)

```cpp
const int thermistorPin = A0;
const float SERIES_RESISTOR = 10000.0;  // 10kΩ series resistor
const float NOMINAL_RESISTANCE = 10000.0;
const float NOMINAL_TEMPERATURE = 25.0;
const float B_COEFFICIENT = 3950.0;

void setup() {
  Serial.begin(9600);
  Serial.println("Thermistor Temperature Sensor");
}

void loop() {
  int raw = analogRead(thermistorPin);

  // Calculate resistance
  float resistance = SERIES_RESISTOR / ((16383.0 / raw) - 1);

  // Steinhart-Hart equation
  float steinhart = resistance / NOMINAL_RESISTANCE;
  steinhart = log(steinhart);
  steinhart /= B_COEFFICIENT;
  steinhart += 1.0 / (NOMINAL_TEMPERATURE + 273.15);
  steinhart = 1.0 / steinhart;
  steinhart -= 273.15;  // Convert to Celsius

  Serial.print("Temperature: ");
  Serial.print(steinhart, 2);
  Serial.println("°C");

  delay(1000);
}
```

**Key Points:**

- Adapter only - no active electronics
- Converts Grove connector to screw terminals
- 4 terminals: Signal 1, Signal 2, VCC, GND
- Works with any Grove port type
- Maximum 2A per terminal
- Use 22-28 AWG wire

## Testing Procedure

1. Connect screw terminal to Grove port on Base Shield
2. **Identify terminal functions:**
   - Terminal 1: Primary signal (Yellow wire equivalent)
   - Terminal 2: Secondary signal (White wire equivalent)
   - Terminal 3: VCC power (Red wire equivalent)
   - Terminal 4: GND (Black wire equivalent)
3. **Strip wires:** Remove 5-7mm of insulation
4. **Insert wires:** Place stripped end into terminal
5. **Tighten screws:** Use flat-head screwdriver
6. **Test connection:** Gently tug wire to verify secure
7. **Upload test sketch:** Verify signal reading

## Troubleshooting

| Problem             | Solution                                                                          |
| ------------------- | --------------------------------------------------------------------------------- |
| No connection       | Tighten screw terminals, ensure wire fully inserted, check wire not broken        |
| Intermittent signal | Re-strip wire, clean terminals, ensure wire gauge compatible (22-28 AWG)          |
| Wrong voltage       | Verify correct terminal (Terminal 3=VCC, Terminal 4=GND), check polarity          |
| Noise in readings   | Add capacitor between signal and GND, shorten wire length, use shielded cable     |
| Short circuit       | Check wires not touching, verify correct polarity, inspect for damaged insulation |
| Can't tighten screw | Don't overtighten (strips threads), ensure wire not too thick                     |

## Technical Specifications

**Terminals:**

- **Quantity:** 4× screw terminals
- **Type:** Screw clamp (flat-head)
- **Wire Range:** 22-28 AWG (0.3-0.8mm diameter)
- **Stripping Length:** 5-7mm recommended
- **Contact Material:** Tin-plated copper
- **Terminal Pitch:** 2.54mm (0.1")

**Electrical:**

- **Maximum Current:** 2A per terminal
- **Maximum Voltage:** 125V AC or 30V DC
- **Contact Resistance:** <20mΩ
- **Insulation Resistance:** >100MΩ
- **Withstand Voltage:** 1000V AC (1 minute)

**Mechanical:**

- **Screw Type:** M2 Phillips/flat-head
- **Torque:** Hand-tight (do not overtighten)
- **Wire Retention:** 5N minimum pull force
- **Insertion Cycles:** >50 cycles

**Pin Mapping:**

- **Terminal 1:** Signal 1 / Digital / Analog / SDA (Yellow)
- **Terminal 2:** Signal 2 / Digital / SCL (White)
- **Terminal 3:** VCC (+5V or +3.3V) (Red)
- **Terminal 4:** GND (Black)

**Environmental:**

- **Operating Temperature:** -25°C to 85°C
- **Storage Temperature:** -40°C to 125°C
- **Humidity:** 5-95% RH non-condensing

**Physical:**

- **PCB Size:** 40mm × 20mm
- **Height:** 15mm (with terminals)
- **Weight:** ~8g
- **Mounting:** 2× M2 mounting holes
- **Grove Connector:** Standard 4-pin

## Wire Gauge Reference

| AWG | Diameter (mm) | Recommended Use            |
| --- | ------------- | -------------------------- |
| 22  | 0.64          | Power wires, thick sensors |
| 24  | 0.51          | General purpose            |
| 26  | 0.40          | Signal wires               |
| 28  | 0.32          | Fine signal wires          |

**Note:** Thinner wire (higher AWG) is easier to work with but has higher resistance.

## Common Use Cases

### Connecting Legacy Sensors

Convert old sensors without Grove connectors to work with Grove system.

### External Power Injection

Connect external power supply to power high-current devices.

### Custom Sensor Development

Prototype new sensors before creating custom Grove modules.

### Industrial Sensor Interface

Connect 4-20mA sensors, thermocouples, or industrial switches.

### Wire Splicing

Create Y-cables or wire branches for custom configurations.

## Wiring Best Practices

### Wire Preparation

1. Strip 5-7mm insulation (not too much)
2. Twist stranded wire ends tightly
3. Optional: Tin wire ends with solder for better contact

### Connection

1. Loosen screw completely
2. Insert wire fully into terminal
3. Tighten screw until snug (don't overtighten)
4. Tug gently to verify connection

### Safety

- Never connect/disconnect under power
- Verify polarity before applying power
- Use proper wire gauge for current requirements
- Insulate exposed connections if needed

## Integration Examples

### External LED

```cpp
// Connect LED via screw terminal
// Terminal 1: LED anode (through resistor)
// Terminal 4: LED cathode (GND)

const int ledPin = 2;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(ledPin, HIGH);
  delay(1000);
  digitalWrite(ledPin, LOW);
  delay(1000);
}
```

### Custom Switch

```cpp
// Connect switch between Terminal 1 and Terminal 4
const int switchPin = 2;

void setup() {
  Serial.begin(9600);
  pinMode(switchPin, INPUT_PULLUP);
}

void loop() {
  if (digitalRead(switchPin) == LOW) {
    Serial.println("Switch closed");
  } else {
    Serial.println("Switch open");
  }
  delay(200);
}
```

## Additional Resources

- [Wire Stripping Tutorial](https://learn.sparkfun.com/tutorials/working-with-wire)
- [Grove System Guide](https://wiki.seeedstudio.com/Grove_System/)
- [Connector Basics](https://learn.sparkfun.com/tutorials/connector-basics)

---

**Source Verification Date:** 2025-11-18  
**Seeed Wiki Last Checked:** 2025-11-18  
**Tip:** Strip 5-7mm of wire insulation for best connection. Don't overtighten screws!
