# Challenge #7: Door Alarm with Magnetic Switch

**Classroom Challenge:** Security system with entry detection  
**Difficulty:** Beginner  
**Concepts:** Digital input detection, state change monitoring, alarm generation, security logic

## Overview

Create a door/window security alarm that triggers when a door opens. The system uses a magnetic switch (reed switch) to detect when a door separates from its frame, then activates visual (LED) and audio (buzzer) alarms. This simulates real-world security systems, burglar alarms, and entry monitoring applications.

**Learning Outcomes:**

- Detect magnetic field changes with reed switches
- Implement edge detection (state changes)
- Create alarm sequences with timing
- Understand security system logic
- Add arming/disarming controls

## Required Components

- [Magnetic Switch (Reed Switch)](../sensors/magnetic-switch/) – Quantity: 1
- [LED (Red LED module)](../sensors/led/) – Quantity: 1
- [Buzzer](../sensors/buzzer/) – Quantity: 1
- [Button](../sensors/button/) – Quantity: 1 (for arming/disarming)
- Arduino Uno R4 WiFi
- Grove Base Shield
- Grove cables (4x Digital)

## Wiring Diagram

**Connections:**

- Magnetic Switch → Digital Port D2
- LED Module → Digital Port D5
- Buzzer → Digital Port D6
- Button (Arm/Disarm) → Digital Port D3

```
[Arduino Uno R4 WiFi]
       |
[Grove Base Shield]
       |
       +--- D2 -----> [Magnetic Switch on door frame]
       |                      [Magnet on door]
       +--- D3 -----> [Button] (arm/disarm)
       |
       +--- D5 -----> [LED Module]
       |
       +--- D6 -----> [Buzzer]
```

**Physical Setup:**

- Mount magnetic switch sensor on door frame (stationary side)
- Mount magnet on door (moving side)
- Align magnet with sensor when door is closed (gap < 1cm)
- When door opens, magnet moves away, switch opens

## Step-by-Step Build

### 1. Hardware Setup

1. Mount Grove Base Shield on Arduino Uno R4 WiFi
2. Connect Magnetic Switch to digital port D2
3. Connect Button to digital port D3 (arm/disarm control)
4. Connect LED module to digital port D5
5. Connect Buzzer to digital port D6
6. Connect Arduino to computer via USB-C cable

### 2. Library Installation

No external libraries required for this project.

### 3. Code Implementation

```cpp
/*
  Challenge #7: Door Alarm with Magnetic Switch

  Description: Security system that detects door opening using magnetic
  switch. Triggers LED and buzzer alarms. Button arms/disarms system.

  Hardware:
  - Magnetic Switch (Reed Switch) on D2
  - Button (Arm/Disarm) on D3
  - LED on D5
  - Buzzer on D6

  References:
  - Magnetic Switch: https://wiki.seeedstudio.com/Grove-Magnetic_Switch/
  - Button: https://wiki.seeedstudio.com/Grove-Button/
  - LED: https://wiki.seeedstudio.com/Grove-Red_LED/
  - Buzzer: https://wiki.seeedstudio.com/Grove-Buzzer/
*/

const int magneticSwitchPin = 2;
const int buttonPin = 3;
const int ledPin = 5;
const int buzzerPin = 6;

// System states
enum SystemState {
  DISARMED,
  ARMING,
  ARMED,
  ALARM_TRIGGERED
};
SystemState currentState = DISARMED;

// Door state tracking
bool doorClosed = true;
bool previousDoorState = true;

// Timing
const unsigned long armingDelay = 10000;  // 10 second delay to exit before arming
const unsigned long alarmDuration = 30000;  // 30 seconds of alarm
unsigned long stateChangeTime = 0;

void setup() {
  Serial.begin(9600);

  pinMode(magneticSwitchPin, INPUT_PULLUP);
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);
  pinMode(buzzerPin, OUTPUT);

  // Initial state
  digitalWrite(ledPin, LOW);
  noTone(buzzerPin);

  Serial.println("=== Door Alarm System ===");
  Serial.println("Press button to ARM system");
  Serial.println("Press button again to DISARM");
  Serial.println("---");

  // Startup beep
  tone(buzzerPin, 1000, 200);
  delay(300);
}

void loop() {
  // Read sensors
  doorClosed = digitalRead(magneticSwitchPin) == LOW;  // LOW = magnet nearby (closed)
  bool buttonPressed = digitalRead(buttonPin) == LOW;

  // Handle button press (with debouncing)
  static unsigned long lastButtonPress = 0;
  static bool buttonWasPressed = false;

  if (buttonPressed && !buttonWasPressed && millis() - lastButtonPress > 300) {
    lastButtonPress = millis();
    handleButtonPress();
  }
  buttonWasPressed = buttonPressed;

  // Detect door state change
  if (doorClosed != previousDoorState) {
    handleDoorStateChange();
  }
  previousDoorState = doorClosed;

  // Handle current state
  switch (currentState) {
    case DISARMED:
      handleDisarmedState();
      break;

    case ARMING:
      handleArmingState();
      break;

    case ARMED:
      handleArmedState();
      break;

    case ALARM_TRIGGERED:
      handleAlarmState();
      break;
  }

  delay(50);
}

void handleButtonPress() {
  if (currentState == DISARMED) {
    // Start arming sequence
    Serial.println("ARMING system - you have 10 seconds to exit");
    currentState = ARMING;
    stateChangeTime = millis();

    // Arming beeps
    for (int i = 0; i < 3; i++) {
      tone(buzzerPin, 1500, 100);
      delay(200);
    }

  } else if (currentState == ARMING || currentState == ARMED || currentState == ALARM_TRIGGERED) {
    // Disarm system
    Serial.println("System DISARMED");
    currentState = DISARMED;
    digitalWrite(ledPin, LOW);
    noTone(buzzerPin);

    // Disarm confirmation
    tone(buzzerPin, 800, 300);
    delay(400);
  }
}

void handleDoorStateChange() {
  if (doorClosed) {
    Serial.println("Door CLOSED");
  } else {
    Serial.println("Door OPENED");
  }
}

void handleDisarmedState() {
  // LED off, no alarm
  digitalWrite(ledPin, LOW);
  noTone(buzzerPin);
}

void handleArmingState() {
  // Slow blink LED during arming delay
  static unsigned long lastBlink = 0;
  static bool ledState = false;

  if (millis() - lastBlink > 500) {
    lastBlink = millis();
    ledState = !ledState;
    digitalWrite(ledPin, ledState);
  }

  // Check if arming period complete
  if (millis() - stateChangeTime >= armingDelay) {
    currentState = ARMED;
    Serial.println("System ARMED - monitoring door");

    // Armed confirmation
    tone(buzzerPin, 2000, 200);
    delay(250);
    tone(buzzerPin, 2000, 200);
    delay(250);
  }
}

void handleArmedState() {
  // Steady LED on
  digitalWrite(ledPin, HIGH);

  // Check for intrusion (door opened)
  if (!doorClosed) {
    triggerAlarm();
  }
}

void handleAlarmState() {
  // Rapid flashing LED and siren
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  static bool sirenHigh = false;

  if (millis() - lastBlink > 150) {
    lastBlink = millis();
    ledState = !ledState;
    sirenHigh = !sirenHigh;

    digitalWrite(ledPin, ledState);
    tone(buzzerPin, sirenHigh ? 1800 : 1200, 150);
  }

  // Check if alarm duration expired
  if (millis() - stateChangeTime >= alarmDuration) {
    Serial.println("Alarm timeout - returning to ARMED state");
    currentState = ARMED;
    digitalWrite(ledPin, HIGH);  // Steady on
    noTone(buzzerPin);
  }
}

void triggerAlarm() {
  Serial.println("*** ALARM TRIGGERED ***");
  Serial.println("Door opened while armed!");
  currentState = ALARM_TRIGGERED;
  stateChangeTime = millis();
}
```

**Key Code Sections:**

**Reed Switch Reading:**

```cpp
doorClosed = digitalRead(magneticSwitchPin) == LOW;
```

Reed switch is LOW when magnet nearby (door closed), HIGH when away (door open).

**State Machine:**

```cpp
enum SystemState { DISARMED, ARMING, ARMED, ALARM_TRIGGERED };
```

Clear progression through security system states.

**Edge Detection:**

```cpp
if (doorClosed != previousDoorState) {
    handleDoorStateChange();
}
```

Detect when door state changes, not just current state.

### 4. Testing

1. Upload the code to your Arduino
2. Open Serial Monitor (9600 baud)
3. **Expected behavior:**
   - System starts DISARMED, LED off
   - Press button: System starts ARMING, LED blinks slowly, 3 beeps
   - After 10 seconds: System ARMED, LED solid on, 2 confirmation beeps
   - Separate magnet from switch (simulate door opening): ALARM triggers
   - LED flashes rapidly, buzzer sounds siren (alternating tones)
   - Press button any time: System DISARMS, LED off, single low beep
   - Serial Monitor shows all state changes

**Testing Without Physical Door:**
Place magnet on sensor, then move it away to simulate door opening.

### 5. Calibration

**Adjust arming delay:**

```cpp
const unsigned long armingDelay = 10000;  // Time to exit before armed
```

**Adjust alarm duration:**

```cpp
const unsigned long alarmDuration = 30000;  // How long alarm sounds
```

**Adjust alarm sounds:**

```cpp
tone(buzzerPin, sirenHigh ? 1800 : 1200, 150);  // Change frequencies/timing
```

## Common Issues

| Problem                    | Cause                      | Solution                               |
| -------------------------- | -------------------------- | -------------------------------------- |
| Always shows "door open"   | Magnet too far from sensor | Position magnet within 1cm when closed |
| Never detects door open    | Magnet always near sensor  | Test by manually moving magnet away    |
| Button doesn't respond     | Debouncing too aggressive  | Reduce debounce delay from 300ms       |
| Alarm triggers immediately | No arming delay            | Check armingDelay is set correctly     |
| Alarm never stops          | Duration too long          | Check alarmDuration value              |
| Buzzer too quiet           | Connection issue           | Verify buzzer connected to D6          |
| Random false alarms        | Electrical interference    | Check all connections secure           |

## Extensions & Modifications

### Beginner Extensions

1. **Entry delay:** Allow 10 seconds to disarm after door opens
2. **Status display:** Show current state on OLED
3. **Multiple sensors:** Monitor multiple doors/windows
4. **Adjustable sensitivity:** Potentiometer sets arming/alarm durations

### Intermediate Extensions

1. **Zone monitoring:** Different alerts for different doors
2. **Log system:** Record all events with timestamps (RTC)
3. **LCD keypad:** Numeric code to arm/disarm instead of button
4. **Tamper detection:** Alert if system moved or disconnected
5. **Remote arming:** Use IR remote or WiFi to control

### Advanced Extensions

1. **SMS notifications:** Send text alerts when alarm triggers
2. **Camera integration:** Capture photo when door opens
3. **Smart home integration:** Connect to home automation system
4. **Multiple user codes:** Different PINs for different users
5. **Scheduled arming:** Auto-arm at certain times
6. **Battery backup:** Continue operation during power outage

## Example: With Entry Delay

```cpp
// Add these variables
const unsigned long entryDelay = 10000;  // 10 seconds to disarm
unsigned long entryStartTime = 0;
bool inEntryDelay = false;

void handleArmedState() {
  digitalWrite(ledPin, HIGH);

  if (!doorClosed && !inEntryDelay) {
    // Door opened - start entry delay
    Serial.println("Door opened - you have 10 seconds to disarm");
    inEntryDelay = true;
    entryStartTime = millis();
  }

  if (inEntryDelay) {
    // Fast blink during entry delay
    static unsigned long lastBlink = 0;
    if (millis() - lastBlink > 200) {
      lastBlink = millis();
      digitalWrite(ledPin, !digitalRead(ledPin));
      tone(buzzerPin, 1000, 50);  // Warning beeps
    }

    // Check if entry delay expired
    if (millis() - entryStartTime >= entryDelay) {
      inEntryDelay = false;
      triggerAlarm();
    }
  }
}

void handleButtonPress() {
  if (currentState == DISARMED) {
    // ... arming code ...
  } else {
    // Disarming now cancels entry delay
    inEntryDelay = false;
    Serial.println("System DISARMED");
    currentState = DISARMED;
    digitalWrite(ledPin, LOW);
    noTone(buzzerPin);
    tone(buzzerPin, 800, 300);
  }
}
```

## Example: With Numeric Keypad

```cpp
// Requires 4x4 Matrix Keypad (not Grove)
#include <Keypad.h>

const byte ROWS = 4;
const byte COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {9, 8, 7, 6};
byte colPins[COLS] = {5, 4, 3, 2};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

const String correctCode = "1234";
String enteredCode = "";

void loop() {
  char key = keypad.getKey();

  if (key) {
    Serial.print("Key pressed: ");
    Serial.println(key);

    if (key == '#') {
      // Check code
      if (enteredCode == correctCode) {
        Serial.println("Correct code!");
        if (currentState == DISARMED) {
          // Start arming
          currentState = ARMING;
          stateChangeTime = millis();
        } else {
          // Disarm
          currentState = DISARMED;
          digitalWrite(ledPin, LOW);
          noTone(buzzerPin);
        }
      } else {
        Serial.println("Incorrect code!");
        tone(buzzerPin, 400, 500);
      }
      enteredCode = "";
    } else if (key == '*') {
      // Clear
      enteredCode = "";
      Serial.println("Code cleared");
    } else {
      // Add digit
      enteredCode += key;
      Serial.print("Code: ");
      for (int i = 0; i < enteredCode.length(); i++) Serial.print("*");
      Serial.println();
    }
  }

  // ... rest of loop ...
}
```

## Example: Multiple Doors

```cpp
const int door1Pin = 2;
const int door2Pin = 4;
const int door3Pin = 7;

void loop() {
  bool door1Closed = digitalRead(door1Pin) == LOW;
  bool door2Closed = digitalRead(door2Pin) == LOW;
  bool door3Closed = digitalRead(door3Pin) == LOW;

  // ... button handling ...

  if (currentState == ARMED) {
    if (!door1Closed) {
      Serial.println("*** ALARM: Front door opened! ***");
      triggerAlarm();
    } else if (!door2Closed) {
      Serial.println("*** ALARM: Back door opened! ***");
      triggerAlarm();
    } else if (!door3Closed) {
      Serial.println("*** ALARM: Window opened! ***");
      triggerAlarm();
    }
  }
}
```

## Real-World Applications

- **Home security systems:** Burglar alarms for doors and windows
- **Commercial buildings:** After-hours entry monitoring
- **Server rooms:** Unauthorized access detection
- **Display cases:** Museum and retail theft prevention
- **Safe monitoring:** Alert when safe opened
- **Garage doors:** Open/closed status monitoring
- **Mailbox alerts:** Notification when mail delivered

## Security System Logic

**Typical Security System States:**

1. **Disarmed** - Normal operation, no monitoring
2. **Arming** - Delay to allow exit before activation
3. **Armed** - Actively monitoring sensors
4. **Entry Delay** - Time to disarm after entry
5. **Alarm** - Intrusion detected, alerts active
6. **Tamper** - System tampering detected

**This Project Implements:**

- ✅ Disarmed state
- ✅ Arming delay (exit time)
- ✅ Armed monitoring
- ✅ Alarm triggering
- ⚠️ Entry delay (in extension example)
- ⚠️ Tamper detection (advanced extension)

## Reed Switch Specifications

**How Reed Switches Work:**

- Glass tube contains two ferromagnetic contacts
- Normally open (contacts separated)
- Magnet brings contacts together (closes circuit)
- When magnet removed, contacts separate (opens circuit)

**Typical Specifications:**

- Operating distance: 0-15mm (depends on magnet strength)
- Contact resistance: <200mΩ
- Max current: 1A (not issue with digital input)
- Lifespan: 1 million+ operations

**Installation Tips:**

- Mount sensor on stationary surface (door frame)
- Mount magnet on moving surface (door)
- Align magnet with sensor center when closed
- Gap should be <10mm for reliable detection

## Educational Value

This project teaches:

- **Security system logic:** Understanding alarm system behavior
- **State machines:** Complex sequential operation management
- **Edge detection:** Responding to changes, not just states
- **Timing control:** Delays and duration management
- **User interface design:** Button debouncing and feedback
- **Real-world application:** Practical home automation

## References

- [Magnetic Switch Guide](../sensors/magnetic-switch/)
- [Button Guide](../sensors/button/)
- [LED Guide](../sensors/led/)
- [Buzzer Guide](../sensors/buzzer/)
- [Arduino State Machines](https://www.arduino.cc/en/Tutorial/BuiltInExamples/StateChangeDetection)
- [Reed Switch Basics](https://en.wikipedia.org/wiki/Reed_switch)

---

**Last Updated:** 2025-11-19  
**Tested On:** Arduino Uno R4 WiFi  
**Estimated Time:** 30-45 minutes
