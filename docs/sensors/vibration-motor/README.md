# Grove Vibration Motor

**Last Verified:** 2025-11-18  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Vibration_Motor/  
**Connection Type:** Digital

## Overview

The Grove Vibration Motor provides haptic feedback through a coin-type vibration motor controlled by a MOSFET driver. Simple ON/OFF control or PWM for variable intensity. Ideal for tactile notifications, alerts, user feedback, wearables, gaming controllers, and accessibility devices. Silent notification alternative to buzzers.

## Authoritative References

- [Grove Vibration Motor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Vibration_Motor/)
- [DRV8833 Motor Driver Datasheet](https://www.ti.com/lit/ds/symlink/drv8833.pdf) (similar circuit)

## Hardware Setup

- **Connection Type:** Digital
- **Grove Port:** D2-D8 (any digital port)
- **Motor Type:** Coin vibration motor (pancake DC motor with eccentric weight)
- **Driver:** N-channel MOSFET (drives up to 150mA)
- **Operating Voltage:** 3.3V - 5V
- **Motor Voltage:** 3.3V nominal
- **Current Draw:** 50-150mA when active
- **Response Time:** ~50ms startup, ~100ms stop
- **Vibration Frequency:** ~200Hz (motor dependent)
- **Control:** HIGH = ON, LOW = OFF, PWM = variable intensity
- **Wiring:** Connect to Grove Base Shield digital port D2-D8 using 4-pin Grove cable

![Grove Vibration Motor](https://files.seeedstudio.com/wiki/Grove-Vibration_Motor/img/Gvib.jpg)

## Software Prerequisites

No special library required - uses standard Arduino `digitalWrite()` or `analogWrite()`.

```cpp
// Basic setup
pinMode(motorPin, OUTPUT);
digitalWrite(motorPin, HIGH);  // Motor ON
digitalWrite(motorPin, LOW);   // Motor OFF

// PWM intensity control
analogWrite(motorPin, 128);    // 50% intensity
```

## Example Code

```cpp
/*
  Purpose: Control vibration motor for haptic feedback
  Notes:
    1. Connect to digital port (D2-D8)
    2. HIGH = motor ON, LOW = motor OFF
    3. Can use PWM (analogWrite) for variable intensity
    4. Motor draws 50-150mA when active
    5. Add delays for distinct vibration patterns
  Author: Ben Jones 18/11/25
  Source: https://wiki.seeedstudio.com/Grove-Vibration_Motor/
*/

const int motorPin = 3;  // Connect to D3

void setup() {
  Serial.begin(9600);
  pinMode(motorPin, OUTPUT);

  Serial.println("Vibration Motor Test");

  // Test pattern: 3 short pulses
  for (int i = 0; i < 3; i++) {
    digitalWrite(motorPin, HIGH);
    delay(100);
    digitalWrite(motorPin, LOW);
    delay(200);
  }

  Serial.println("Test complete");
}

void loop() {
  // Single vibration pulse every 5 seconds
  Serial.println("Vibrating...");
  digitalWrite(motorPin, HIGH);
  delay(500);  // Vibrate for 500ms
  digitalWrite(motorPin, LOW);

  Serial.println("Off");
  delay(5000);  // Wait 5 seconds
}
```

### Variable Intensity (PWM Control)

```cpp
/*
  Purpose: Control vibration intensity using PWM
  Notes: analogWrite() values 0-255 control motor speed/intensity
*/

const int motorPin = 3;  // Must be PWM-capable pin (D3, D5, D6, D9, D10, D11)

void setup() {
  Serial.begin(9600);
  pinMode(motorPin, OUTPUT);
  Serial.println("PWM Vibration Control");
}

void loop() {
  // Gradually increase intensity
  Serial.println("Ramping up...");
  for (int intensity = 50; intensity <= 255; intensity += 20) {
    analogWrite(motorPin, intensity);
    Serial.print("Intensity: ");
    Serial.println(intensity);
    delay(500);
  }

  // Turn off
  analogWrite(motorPin, 0);
  Serial.println("Off\n");
  delay(2000);

  // Gradually decrease intensity
  Serial.println("Ramping down...");
  for (int intensity = 255; intensity >= 50; intensity -= 20) {
    analogWrite(motorPin, intensity);
    Serial.print("Intensity: ");
    Serial.println(intensity);
    delay(500);
  }

  analogWrite(motorPin, 0);
  Serial.println("Off\n");
  delay(2000);
}
```

### Vibration Patterns

```cpp
/*
  Purpose: Create distinct vibration patterns for different notifications
*/

const int motorPin = 3;

void setup() {
  Serial.begin(9600);
  pinMode(motorPin, OUTPUT);
  Serial.println("Vibration Patterns Demo");
}

void loop() {
  // Pattern 1: Single long pulse (incoming call)
  Serial.println("Pattern 1: Long pulse");
  vibrateLong();
  delay(2000);

  // Pattern 2: Two short pulses (message received)
  Serial.println("Pattern 2: Double pulse");
  vibrateDouble();
  delay(2000);

  // Pattern 3: Three short pulses (alert)
  Serial.println("Pattern 3: Triple pulse");
  vibrateTriple();
  delay(2000);

  // Pattern 4: SOS pattern (... --- ...)
  Serial.println("Pattern 4: SOS");
  vibrateSOS();
  delay(3000);

  // Pattern 5: Heartbeat pattern
  Serial.println("Pattern 5: Heartbeat");
  vibrateHeartbeat();
  delay(2000);
}

void vibrateLong() {
  digitalWrite(motorPin, HIGH);
  delay(1000);
  digitalWrite(motorPin, LOW);
}

void vibrateDouble() {
  for (int i = 0; i < 2; i++) {
    digitalWrite(motorPin, HIGH);
    delay(200);
    digitalWrite(motorPin, LOW);
    delay(200);
  }
}

void vibrateTriple() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(motorPin, HIGH);
    delay(150);
    digitalWrite(motorPin, LOW);
    delay(150);
  }
}

void vibrateSOS() {
  // S: 3 short
  for (int i = 0; i < 3; i++) {
    digitalWrite(motorPin, HIGH);
    delay(150);
    digitalWrite(motorPin, LOW);
    delay(150);
  }
  delay(300);

  // O: 3 long
  for (int i = 0; i < 3; i++) {
    digitalWrite(motorPin, HIGH);
    delay(400);
    digitalWrite(motorPin, LOW);
    delay(150);
  }
  delay(300);

  // S: 3 short
  for (int i = 0; i < 3; i++) {
    digitalWrite(motorPin, HIGH);
    delay(150);
    digitalWrite(motorPin, LOW);
    delay(150);
  }
}

void vibrateHeartbeat() {
  // Lub-dub pattern
  digitalWrite(motorPin, HIGH);
  delay(100);
  digitalWrite(motorPin, LOW);
  delay(100);
  digitalWrite(motorPin, HIGH);
  delay(150);
  digitalWrite(motorPin, LOW);
  delay(500);
}
```

### Button-Triggered Haptic Feedback

```cpp
/*
  Purpose: Provide haptic feedback when button is pressed
*/

const int buttonPin = 2;
const int motorPin = 3;

void setup() {
  Serial.begin(9600);
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(motorPin, OUTPUT);
  Serial.println("Button Haptic Feedback");
}

void loop() {
  if (digitalRead(buttonPin) == LOW) {
    Serial.println("Button pressed - vibrating");

    // Short confirmation pulse
    digitalWrite(motorPin, HIGH);
    delay(50);
    digitalWrite(motorPin, LOW);

    // Debounce and wait for release
    delay(200);
    while (digitalRead(buttonPin) == LOW) {
      delay(10);
    }

    Serial.println("Button released");
  }
}
```

### Timer with Vibration Alert

```cpp
/*
  Purpose: Countdown timer with vibration notification
*/

const int motorPin = 3;
const int timerSeconds = 10;  // 10 second timer

void setup() {
  Serial.begin(9600);
  pinMode(motorPin, OUTPUT);
  Serial.println("Timer with Vibration Alert");
  Serial.print("Starting ");
  Serial.print(timerSeconds);
  Serial.println(" second countdown...");
}

void loop() {
  // Countdown
  for (int sec = timerSeconds; sec > 0; sec--) {
    Serial.print("Time remaining: ");
    Serial.print(sec);
    Serial.println("s");

    // Warning vibration at 3, 2, 1
    if (sec <= 3) {
      digitalWrite(motorPin, HIGH);
      delay(100);
      digitalWrite(motorPin, LOW);
    }

    delay(1000);
  }

  // Time's up - strong alert pattern
  Serial.println("TIME'S UP!");
  for (int i = 0; i < 3; i++) {
    digitalWrite(motorPin, HIGH);
    delay(500);
    digitalWrite(motorPin, LOW);
    delay(300);
  }

  delay(5000);
  Serial.println("\nRestarting timer...\n");
}
```

### Distance Alert System

```cpp
/*
  Purpose: Vibration intensity increases as object gets closer
  Hardware: Ultrasonic sensor on D4/D5, vibration motor on D3
*/

const int motorPin = 3;
const int trigPin = 4;
const int echoPin = 5;

void setup() {
  Serial.begin(9600);
  pinMode(motorPin, OUTPUT);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  Serial.println("Proximity Vibration Alert");
}

void loop() {
  // Measure distance
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  int distance = duration * 0.034 / 2;  // cm

  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  // Vibrate based on proximity
  if (distance < 10) {
    // Very close - continuous vibration
    analogWrite(motorPin, 255);
    delay(50);
  } else if (distance < 30) {
    // Close - rapid pulses
    digitalWrite(motorPin, HIGH);
    delay(100);
    digitalWrite(motorPin, LOW);
    delay(100);
  } else if (distance < 50) {
    // Moderate - slow pulses
    digitalWrite(motorPin, HIGH);
    delay(100);
    digitalWrite(motorPin, LOW);
    delay(500);
  } else {
    // Far - no vibration
    digitalWrite(motorPin, LOW);
    delay(200);
  }
}
```

**Key Points:**

- Simple ON/OFF control with `digitalWrite()`
- PWM for variable intensity (must use PWM-capable pins)
- Current draw 50-150mA (ensure adequate power supply)
- Response time ~50ms on, ~100ms off
- Create distinct patterns for different notifications
- Use short pulses to save power and reduce motor wear

## Testing Procedure

1. Connect vibration motor to digital port (e.g., D3)
2. Upload basic ON/OFF example
3. **Test basic operation:**
   - Motor should vibrate for 500ms
   - Pause for 5 seconds
   - Repeat cycle
4. **Test PWM intensity:**
   - Feel intensity increase gradually
   - Should ramp from weak to strong
5. **Test patterns:**
   - Distinguish between single, double, triple pulses
   - Verify SOS pattern (short-long-short)
6. **Check power consumption:**
   - Motor draws 50-150mA when active
   - No significant current when off

## Troubleshooting

| Problem                          | Solution                                                     |
| -------------------------------- | ------------------------------------------------------------ |
| Motor doesn't vibrate            | Check wiring, verify pin mode OUTPUT, test with LED first    |
| Weak vibration                   | Increase PWM value (255 = max), check power supply voltage   |
| Motor vibrates continuously      | Code stuck with HIGH output, add debug Serial.print()        |
| Motor buzzes but doesn't vibrate | Insufficient current, check power supply, try different port |
| Intermittent operation           | Loose connection, check Grove cable, reseat module           |
| Erratic behavior                 | EMI from motor, add 100µF capacitor across motor terminals   |

## Technical Specifications

**Motor:**

- **Type:** Coin vibration motor (pancake DC motor)
- **Size:** 10mm diameter × 2.7mm thick (typical)
- **Operating Voltage:** 3.0V - 3.3V nominal
- **Rated Current:** 50-100mA @ 3.3V
- **Max Current:** 150mA
- **Starting Voltage:** ~2.0V
- **Vibration Frequency:** ~200Hz (8000-10000 RPM)
- **Amplitude:** ~0.3-0.8G (gravity)

**Driver Circuit:**

- **Type:** N-channel MOSFET switch
- **Max Current:** 1A (motor limited to 150mA)
- **Input Logic:** 3.3V/5V compatible
- **Protection:** Flyback diode for inductive kickback

**Electrical:**

- **Operating Voltage:** 3.3V - 5V (regulated to 3.3V for motor)
- **Logic Input:** HIGH = ON, LOW = OFF
- **PWM Frequency:** Default Arduino PWM (~490Hz or ~980Hz)
- **Current Draw:** 50-150mA when active, <1mA standby

**Timing:**

- **Startup Time:** ~50ms (motor inertia)
- **Stop Time:** ~100ms (coasting to stop)
- **Min Pulse Width:** 50ms (for noticeable vibration)
- **Recommended Pulse:** 100-500ms

**Environmental:**

- **Operating Temperature:** -10°C to 60°C
- **Storage Temperature:** -20°C to 70°C
- **Lifespan:** ~10,000 hours (continuous operation)

**Physical:**

- **Module Size:** 20mm × 20mm
- **Weight:** ~5g
- **Mounting:** 2× M2 mounting holes

## Common Use Cases

### Notification Alert System

```cpp
const int motorPin = 3;

void notifyIncomingCall() {
  // Long vibration
  for (int i = 0; i < 3; i++) {
    digitalWrite(motorPin, HIGH);
    delay(800);
    digitalWrite(motorPin, LOW);
    delay(400);
  }
}

void notifyMessage() {
  // Two short pulses
  for (int i = 0; i < 2; i++) {
    digitalWrite(motorPin, HIGH);
    delay(200);
    digitalWrite(motorPin, LOW);
    delay(200);
  }
}

void notifyAlarm() {
  // Rapid pulsing
  for (int i = 0; i < 10; i++) {
    digitalWrite(motorPin, HIGH);
    delay(100);
    digitalWrite(motorPin, LOW);
    delay(100);
  }
}
```

### Wearable Fitness Reminder

```cpp
const int motorPin = 3;
const unsigned long reminderInterval = 3600000;  // 1 hour in ms
unsigned long lastReminder = 0;

void setup() {
  pinMode(motorPin, OUTPUT);
}

void loop() {
  unsigned long currentTime = millis();

  if (currentTime - lastReminder >= reminderInterval) {
    // Hourly movement reminder
    digitalWrite(motorPin, HIGH);
    delay(500);
    digitalWrite(motorPin, LOW);
    delay(300);
    digitalWrite(motorPin, HIGH);
    delay(500);
    digitalWrite(motorPin, LOW);

    lastReminder = currentTime;
  }

  delay(1000);
}
```

### Gaming Controller Feedback

```cpp
const int motorPin = 3;
const int buttonFire = 2;
const int buttonHit = 4;

void setup() {
  pinMode(motorPin, OUTPUT);
  pinMode(buttonFire, INPUT_PULLUP);
  pinMode(buttonHit, INPUT_PULLUP);
}

void loop() {
  // Fire weapon - short pulse
  if (digitalRead(buttonFire) == LOW) {
    digitalWrite(motorPin, HIGH);
    delay(50);
    digitalWrite(motorPin, LOW);
    delay(100);
  }

  // Take hit - strong vibration
  if (digitalRead(buttonHit) == LOW) {
    for (int i = 0; i < 3; i++) {
      digitalWrite(motorPin, HIGH);
      delay(150);
      digitalWrite(motorPin, LOW);
      delay(100);
    }
    delay(500);
  }
}
```

## Understanding Vibration Motors

**How Coin Motors Work:**

- DC motor with off-center weight (eccentric mass)
- Rotation creates oscillating force
- Frequency = motor RPM / 60
- Amplitude depends on weight offset and speed

**Advantages vs. Buzzers:**

- Silent operation (no audible tone)
- Better for discreet notifications
- More pleasant tactile sensation
- Suitable for wearables and quiet environments

**Disadvantages:**

- Slower response time (~50-100ms)
- Wears out over time (mechanical)
- Higher current draw
- Less precise timing than piezo buzzers

## Power Consumption

**Current Draw:**

- Active (full intensity): 100-150mA @ 3.3V
- Active (50% PWM): 50-75mA
- Idle/off: <1mA

**Battery Life Estimates:**

- **USB (500mA):** Unlimited (within budget)
- **9V battery (500mAh):** 3-5 hours continuous, 50+ hours with 10% duty cycle
- **LiPo 1000mAh:** 6-10 hours continuous, 100+ hours intermittent

**Power Saving Tips:**

```cpp
// Use short pulses instead of continuous
digitalWrite(motorPin, HIGH);
delay(100);  // vs. 1000ms
digitalWrite(motorPin, LOW);

// Lower PWM intensity
analogWrite(motorPin, 150);  // vs. 255

// Turn off when not needed
digitalWrite(motorPin, LOW);
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining vibration motor with:

- Button (haptic feedback on press)
- Ultrasonic sensor (proximity alerts)
- Accelerometer (shake/impact detection)
- Timer (countdown notifications)

## Additional Resources

- [Haptic Feedback Patterns](https://www.immersion.com/haptics/)
- [Vibration Motor Selection Guide](https://www.precisionmicrodrives.com/vibration-motors/vibration-motor-comparison-guide/)
- [Arduino PWM Guide](https://www.arduino.cc/en/Tutorial/PWM)

---

**Source Verification Date:** 2025-11-18  
**Seeed Wiki Last Checked:** 2025-11-18  
**Note:** Use PWM-capable pins (D3, D5, D6, D9, D10, D11 on Uno R4) for intensity control!
