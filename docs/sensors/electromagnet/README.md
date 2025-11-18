# Grove Electromagnet

**Last Verified:** 2025-11-18  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Electromagnet/  
**Connection Type:** Digital

## Overview

The Grove Electromagnet is a powerful coil that generates a magnetic field when energized, capable of holding up to 1kg of ferromagnetic material (iron, steel, nickel). Uses a P-N transistor to control high current from external power. Perfect for electromagnetic locks, sorting systems, magnetic switches, robotic grippers, and educational demonstrations of electromagnetism. Safe 5V operation with onboard flyback diode for protection.

## Authoritative References

- [Grove Electromagnet - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Electromagnet/)
- [Electromagnet Basics Tutorial](https://learn.sparkfun.com/tutorials/transistors/applications-i-switches)

## Hardware Setup

- **Connection Type:** Digital
- **Grove Port:** D2-D8 (any digital port)
- **Control Circuit:** P-N transistor driver
- **Holding Force:** Up to 1kg (with proper power supply)
- **Coil Resistance:** ~26Ω
- **Operating Voltage:** 5V (from external power)
- **Control Voltage:** 5V Arduino digital pin
- **Current Draw:** ~400mA at 5V (from external supply)
- **Duty Cycle:** <50% recommended for continuous use
- **Protection:** Onboard flyback diode prevents back-EMF damage
- **External Power:** Required for full holding force
- **Wiring:** Connect to Grove Base Shield digital port using 4-pin Grove cable
- **Power Supply:** Connect 5V external supply to electromagnet module (separate from Arduino)

![Grove Electromagnet](https://files.seeedstudio.com/wiki/Grove-Electromagnet/img/Grove_Electromagnet_02.jpg)

## Software Prerequisites

No additional libraries required - uses standard Arduino `digitalWrite()`:

```cpp
// Built-in functions only
pinMode(pin, OUTPUT);
digitalWrite(pin, HIGH/LOW);
```

## Example Code

```cpp
/*
  Purpose: Control electromagnet to hold/release metal objects
  Notes:
    1. Connect to digital port (D2-D8)
    2. HIGH = magnet energized (holds metal)
    3. LOW = magnet off (releases metal)
    4. Avoid continuous operation >50% duty cycle (overheating)
    5. External 5V power recommended for full strength
  Author: Ben Jones 18/11/25
  Source: https://wiki.seeedstudio.com/Grove-Electromagnet/
*/

const int magnetPin = 2;

void setup() {
  Serial.begin(9600);
  pinMode(magnetPin, OUTPUT);
  digitalWrite(magnetPin, LOW);  // Start with magnet off

  Serial.println("Electromagnet Control");
  Serial.println("Magnet OFF");
}

void loop() {
  // Hold for 3 seconds
  Serial.println("Magnet ON - Holding");
  digitalWrite(magnetPin, HIGH);
  delay(3000);

  // Release for 3 seconds
  Serial.println("Magnet OFF - Released");
  digitalWrite(magnetPin, LOW);
  delay(3000);
}
```

### Magnetic Sorting System

```cpp
const int magnetPin = 2;
const int sensorPin = 3;  // Metal detector sensor

void setup() {
  Serial.begin(9600);
  pinMode(magnetPin, OUTPUT);
  pinMode(sensorPin, INPUT);
  digitalWrite(magnetPin, LOW);

  Serial.println("Magnetic Sorting System");
}

void loop() {
  // Check if metal object detected
  if (digitalRead(sensorPin) == HIGH) {
    Serial.println("Metal detected - Activating magnet");
    digitalWrite(magnetPin, HIGH);
    delay(2000);  // Hold for 2 seconds

    Serial.println("Releasing object");
    digitalWrite(magnetPin, LOW);
    delay(1000);
  }

  delay(100);
}
```

### Door Lock System

```cpp
const int magnetPin = 2;
const int buttonPin = 3;
const int ledPin = 4;

bool locked = true;

void setup() {
  Serial.begin(9600);
  pinMode(magnetPin, OUTPUT);
  pinMode(buttonPin, INPUT);
  pinMode(ledPin, OUTPUT);

  // Start locked
  digitalWrite(magnetPin, HIGH);
  digitalWrite(ledPin, HIGH);

  Serial.println("Electromagnetic Door Lock");
  Serial.println("Press button to unlock");
}

void loop() {
  if (digitalRead(buttonPin) == HIGH) {
    locked = !locked;

    if (locked) {
      Serial.println("LOCKED");
      digitalWrite(magnetPin, HIGH);
      digitalWrite(ledPin, HIGH);
    } else {
      Serial.println("UNLOCKED");
      digitalWrite(magnetPin, LOW);
      digitalWrite(ledPin, LOW);
    }

    delay(500);  // Debounce
  }
}
```

### Timed Release Mechanism

```cpp
const int magnetPin = 2;
const unsigned long holdTime = 10000;  // 10 seconds

void setup() {
  Serial.begin(9600);
  pinMode(magnetPin, OUTPUT);

  Serial.println("Timed Release Mechanism");
  Serial.println("Holding for 10 seconds...");

  digitalWrite(magnetPin, HIGH);
  delay(holdTime);

  Serial.println("RELEASED!");
  digitalWrite(magnetPin, LOW);
}

void loop() {
  // One-time operation in setup
}
```

### PWM Strength Control

```cpp
const int magnetPin = 3;  // Must be PWM-capable pin (D3, D5, D6, D9, D10, D11)
const int potPin = A0;

void setup() {
  Serial.begin(9600);
  pinMode(magnetPin, OUTPUT);

  Serial.println("Variable Magnet Strength");
}

void loop() {
  // Read potentiometer (0-1023)
  int potValue = analogRead(potPin);

  // Map to PWM (0-255)
  int magnetStrength = map(potValue, 0, 1023, 0, 255);

  // Control magnet strength
  analogWrite(magnetPin, magnetStrength);

  // Display
  Serial.print("Strength: ");
  Serial.print((magnetStrength * 100) / 255);
  Serial.println("%");

  delay(100);
}
```

### Pulse Pattern for Reduced Heating

```cpp
const int magnetPin = 2;

void setup() {
  Serial.begin(9600);
  pinMode(magnetPin, OUTPUT);

  Serial.println("Pulsed Electromagnet (30% duty cycle)");
}

void loop() {
  // 30% duty cycle reduces heating
  digitalWrite(magnetPin, HIGH);
  delay(30);

  digitalWrite(magnetPin, LOW);
  delay(70);
}
```

### Robotic Gripper Control

```cpp
const int magnetPin = 2;
const int pickupButton = 3;
const int releaseButton = 4;

bool holding = false;

void setup() {
  Serial.begin(9600);
  pinMode(magnetPin, OUTPUT);
  pinMode(pickupButton, INPUT);
  pinMode(releaseButton, INPUT);
  digitalWrite(magnetPin, LOW);

  Serial.println("Robotic Gripper Control");
  Serial.println("Button 1: Pickup");
  Serial.println("Button 2: Release");
}

void loop() {
  if (digitalRead(pickupButton) == HIGH && !holding) {
    Serial.println("Picking up object");
    digitalWrite(magnetPin, HIGH);
    holding = true;
    delay(500);
  }

  if (digitalRead(releaseButton) == HIGH && holding) {
    Serial.println("Releasing object");
    digitalWrite(magnetPin, LOW);
    holding = false;
    delay(500);
  }

  delay(50);
}
```

### Fail-Safe Auto-Release

```cpp
const int magnetPin = 2;
const unsigned long maxHoldTime = 60000;  // 1 minute max
unsigned long holdStartTime = 0;
bool holding = false;

void setup() {
  Serial.begin(9600);
  pinMode(magnetPin, OUTPUT);
  digitalWrite(magnetPin, LOW);

  Serial.println("Fail-Safe Electromagnet");
}

void loop() {
  // Activate magnet
  if (!holding) {
    Serial.println("Activating magnet");
    digitalWrite(magnetPin, HIGH);
    holdStartTime = millis();
    holding = true;
  }

  // Check for timeout
  if (holding && (millis() - holdStartTime >= maxHoldTime)) {
    Serial.println("Auto-release (safety timeout)");
    digitalWrite(magnetPin, LOW);
    holding = false;
    delay(5000);  // Wait 5 seconds before next cycle
  }

  delay(100);
}
```

**Key Points:**

- Digital control (HIGH = on, LOW = off)
- Holds up to 1kg ferromagnetic material
- Requires external 5V power for full strength
- Onboard flyback diode protects against back-EMF
- Keep duty cycle <50% for continuous operation
- Current draw ~400mA

## Testing Procedure

1. Connect electromagnet to digital port (D2-D8)
2. **Connect external 5V power** to electromagnet module
3. Upload basic control example
4. **Test with metal object:**
   - Place small metal object near electromagnet
   - Set pin HIGH
   - Object should be attracted and held
   - Set pin LOW
   - Object should release
5. **Test holding force:**
   - Start with light objects (paperclips)
   - Progress to heavier objects (up to 1kg with proper power)
6. **Monitor temperature:**
   - Should stay cool with <50% duty cycle
   - If hot, reduce duty cycle or add cooling time

## Troubleshooting

| Problem                   | Solution                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| Weak holding force        | Check external power supply connected, verify 5V supply, ensure metal object is ferromagnetic |
| No magnetic field         | Verify pin set HIGH, check Grove cable, test with LED on same pin                             |
| Electromagnet overheating | Reduce duty cycle below 50%, add cooling delays, use pulsed operation                         |
| Metal won't release       | Verify pin set LOW, check for residual magnetism (normal), tap object gently                  |
| Erratic behavior          | Check flyback diode present, use external power supply, separate grounds properly             |
| Arduino resets            | Current too high - must use external power, not Arduino 5V pin                                |

## Technical Specifications

**Electromagnet:**

- **Coil Type:** Solenoid electromagnet
- **Holding Force:** Up to 1kg (with adequate power)
- **Coil Resistance:** ~26Ω
- **Inductance:** ~40mH
- **Wire Gauge:** ~0.5mm enameled copper

**Electrical:**

- **Operating Voltage:** 5V DC
- **Control Voltage:** 5V digital signal (3.3V compatible)
- **Current Draw:** ~400mA at 5V (from external supply)
- **Power Consumption:** ~2W
- **Control Method:** P-N transistor switching

**Driver Circuit:**

- **Transistor:** NPN (exact model varies)
- **Protection:** Flyback diode (prevents back-EMF damage)
- **Switching Speed:** <10ms

**Duty Cycle:**

- **Continuous:** <50% recommended
- **Maximum:** 100% for short periods (<30 seconds)
- **Cooling:** Natural air cooling sufficient at 50% duty

**Environmental:**

- **Operating Temperature:** -25°C to 85°C
- **Storage Temperature:** -40°C to 125°C

**Physical:**

- **Module Size:** 40mm × 20mm
- **Coil Size:** 10mm diameter × 20mm length
- **Weight:** ~15g
- **Mounting:** 2× M2 mounting holes
- **Magnetic Face:** 10mm diameter

**Compatibility:**

- **Ferromagnetic Materials:** Iron, steel, nickel, cobalt
- **Non-Magnetic Materials:** Aluminum, copper, brass, plastic (won't attract)

## Common Use Cases

### Electromagnetic Door Lock

```cpp
// Lock door when system armed
const int magnetPin = 2;
const int armSwitch = 3;

void setup() {
  pinMode(magnetPin, OUTPUT);
  pinMode(armSwitch, INPUT_PULLUP);
}

void loop() {
  if (digitalRead(armSwitch) == LOW) {
    digitalWrite(magnetPin, HIGH);  // Locked
  } else {
    digitalWrite(magnetPin, LOW);   // Unlocked
  }
  delay(50);
}
```

### Metal Separator (Recycling)

Automatically separate ferromagnetic metals from other materials on a conveyor system.

### Magnetic Levitation Demo

Create educational demonstrations of magnetic repulsion and attraction.

### Smart Package Holder

Hold packages in delivery box until recipient authenticates.

## Safety Considerations

**Electrical Safety:**

- ⚠️ Do not power electromagnet from Arduino 5V pin (draws too much current)
- Always use external 5V power supply
- Ensure flyback diode is present (prevents voltage spikes)
- Keep duty cycle <50% for continuous operation

**Thermal Safety:**

- Electromagnet will heat up during continuous use
- Monitor temperature during extended operation
- Add cooling delays if temperature exceeds 60°C
- Use pulsed operation for long-duration applications

**Magnetic Field Safety:**

- Keep away from magnetic media (credit cards, hard drives, etc.)
- May interfere with compass sensors nearby
- Residual magnetism normal after use

## Integration Examples

See [integration recipes](../../integrations/) for projects combining electromagnet with:

- Button (manual release control)
- Magnetic switch (proximity detection)
- Timer (automatic release)
- Relay (high-power control)

## Additional Resources

- [Electromagnet Physics](https://en.wikipedia.org/wiki/Electromagnet)
- [Transistor Switching Tutorial](https://learn.sparkfun.com/tutorials/transistors/applications-i-switches)
- [Flyback Diode Explanation](https://en.wikipedia.org/wiki/Flyback_diode)

---

**Source Verification Date:** 2025-11-18  
**Seeed Wiki Last Checked:** 2025-11-18  
**Tip:** Use external 5V power for full 1kg holding force. Keep duty cycle <50% to prevent overheating!
