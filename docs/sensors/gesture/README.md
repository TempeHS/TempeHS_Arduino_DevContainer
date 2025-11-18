# Grove Gesture Sensor (PAJ7620U2)

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Gesture_v1.0/  
**Library Repo:** https://github.com/Seeed-Studio/Gesture_PAJ7620  
**Connection Type:** I2C

## Overview

The Grove Gesture Sensor detects 9 basic gestures using infrared sensors: Up, Down, Left, Right, Forward, Backward, Clockwise, Counter-Clockwise, and Wave. Recognition distance: 5-10cm. Ideal for touchless interfaces, interactive displays, and accessibility projects.

## Authoritative References

- [Grove Gesture Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Gesture_v1.0/)
- [Gesture_PAJ7620 Library](https://github.com/Seeed-Studio/Gesture_PAJ7620)
- [PAJ7620U2 Datasheet](http://wiki.seeedstudio.com/Grove-Gesture_v1.0/#resources)

## Hardware Setup

- **Connection Type:** I2C
- **Grove Port:** I2C port on Base Shield
- **Sensor Chip:** PAJ7620U2
- **Detection Range:** 5-10cm optimal
- **Detection Area:** ~60° cone angle
- **Gestures Detected:** 9 basic gestures
- **Operating Voltage:** 3.3V - 5V
- **I2C Address:** 0x73
- **Wiring:** Connect to Grove Base Shield I2C port using 4-pin Grove cable

![Grove Gesture Sensor](https://files.seeedstudio.com/wiki/Grove_Gesture_V_1.0/img/400px-Gesture_sensor_3.png)

## Software Prerequisites

### Required Libraries

```bash
arduino-cli lib install "Grove - Gesture"
```

Or via Arduino IDE: Sketch → Include Library → Manage Libraries → Search "Grove Gesture"

## Example Code

```cpp
/*
  Purpose: Basic gesture detection example
  Notes:
    1. Connect to I2C port
    2. Detection range: 5-10cm
    3. 9 gestures: Up, Down, Left, Right, Forward, Backward, CW, CCW, Wave
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Gesture_v1.0/
  Library: https://github.com/Seeed-Studio/Gesture_PAJ7620
*/

#include <Wire.h>
#include "paj7620.h"

void setup() {
  Serial.begin(9600);
  Serial.println("Gesture Sensor Test");

  uint8_t error = paj7620Init();  // Initialize sensor

  if (error) {
    Serial.print("Sensor init failed. Error code: ");
    Serial.println(error);
  } else {
    Serial.println("Sensor initialized successfully");
    Serial.println("Wave your hand 5-10cm from sensor");
  }
}

void loop() {
  uint8_t data = 0;

  paj7620ReadReg(0x43, 1, &data);  // Read gesture

  if (data) {
    switch (data) {
      case GES_RIGHT_FLAG:
        Serial.println("Right");
        break;
      case GES_LEFT_FLAG:
        Serial.println("Left");
        break;
      case GES_UP_FLAG:
        Serial.println("Up");
        break;
      case GES_DOWN_FLAG:
        Serial.println("Down");
        break;
      case GES_FORWARD_FLAG:
        Serial.println("Forward");
        break;
      case GES_BACKWARD_FLAG:
        Serial.println("Backward");
        break;
      case GES_CLOCKWISE_FLAG:
        Serial.println("Clockwise");
        break;
      case GES_COUNT_CLOCKWISE_FLAG:
        Serial.println("Counter-Clockwise");
        break;
      case GES_WAVE_FLAG:
        Serial.println("Wave");
        break;
    }
  }

  delay(100);
}
```

### Gesture-Controlled LED

```cpp
#include <Wire.h>
#include "paj7620.h"

const int ledPin = 13;
int ledState = LOW;

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);

  paj7620Init();
  Serial.println("Wave to toggle LED");
}

void loop() {
  uint8_t data = 0;
  paj7620ReadReg(0x43, 1, &data);

  if (data == GES_WAVE_FLAG) {
    ledState = !ledState;
    digitalWrite(ledPin, ledState);

    Serial.print("LED ");
    Serial.println(ledState ? "ON" : "OFF");

    delay(500);  // Debounce
  }

  delay(100);
}
```

**Key Points:**

- Optimal detection: 5-10cm from sensor
- Hand should be within 60° cone angle
- Gestures return specific flag values
- Returns 0 when no gesture detected
- Fast gestures may not register (move steadily)
- Sensor requires ~300ms initialization time

## Testing Procedure

1. Connect gesture sensor to I2C port
2. Install Grove Gesture library
3. Upload basic example
4. Open Serial Monitor (9600 baud)
5. **Expected output:**
   - "Sensor initialized successfully"
6. **Test gestures (5-10cm from sensor):**
   - Move hand left → "Left"
   - Move hand right → "Right"
   - Move hand up → "Up"
   - Move hand down → "Down"
   - Push hand toward sensor → "Forward"
   - Pull hand away → "Backward"
   - Circle clockwise → "Clockwise"
   - Circle counter-clockwise → "Counter-Clockwise"
   - Wave hand → "Wave"

## Troubleshooting

| Problem                 | Solution                                                 |
| ----------------------- | -------------------------------------------------------- |
| Sensor init failed      | Check I2C connection, verify power, restart Arduino      |
| No gestures detected    | Adjust distance to 5-10cm, ensure hand within cone angle |
| Erratic readings        | Move hand slower, check ambient IR interference          |
| Only some gestures work | Practice gesture motion, ensure clear movement           |
| Recognition delays      | Normal behavior; sensor processes at ~10Hz               |

## Technical Specifications

- **Sensor:** PAJ7620U2 integrated gesture recognition chip
- **Detection Range:** 5-10cm optimal, up to 15cm max
- **Detection Angle:** ~60° cone
- **Gestures Supported:** 9 basic gestures
- **Frame Rate:** ~120 FPS internal processing
- **Response Time:** ~60ms typical
- **Interface:** I2C (address 0x73)
- **Operating Voltage:** 3.3V - 5V
- **Operating Current:** 2.4mA (suspend), 6mA (normal)
- **Operating Temperature:** -40°C to +85°C
- **Ambient Light Immunity:** Excellent (uses IR)

## Common Use Cases

### Gesture-Controlled Servo (Open/Close)

```cpp
#include <Wire.h>
#include "paj7620.h"
#include <Servo.h>

Servo myservo;
const int servoPin = 5;
int position = 0;  // 0 = closed, 90 = open

void setup() {
  Serial.begin(9600);
  myservo.attach(servoPin);
  paj7620Init();
  myservo.write(position);
  Serial.println("Wave to open/close");
}

void loop() {
  uint8_t data = 0;
  paj7620ReadReg(0x43, 1, &data);

  if (data == GES_WAVE_FLAG) {
    if (position == 0) {
      position = 90;  // Open
      Serial.println("Opening");
    } else {
      position = 0;   // Close
      Serial.println("Closing");
    }
    myservo.write(position);
    delay(500);
  }

  delay(100);
}
```

### Directional Navigation with OLED

```cpp
#include <Wire.h>
#include "paj7620.h"
#include <U8g2lib.h>

U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);
int cursorX = 64;
int cursorY = 32;

void setup() {
  u8g2.begin();
  paj7620Init();
}

void loop() {
  uint8_t data = 0;
  paj7620ReadReg(0x43, 1, &data);

  // Move cursor based on gesture
  if (data == GES_RIGHT_FLAG) cursorX += 5;
  if (data == GES_LEFT_FLAG) cursorX -= 5;
  if (data == GES_UP_FLAG) cursorY -= 5;
  if (data == GES_DOWN_FLAG) cursorY += 5;

  // Keep cursor on screen
  cursorX = constrain(cursorX, 0, 127);
  cursorY = constrain(cursorY, 0, 63);

  // Display cursor
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_ncenB08_tr);
  u8g2.drawStr(0, 10, "Gesture Control");
  u8g2.drawDisc(cursorX, cursorY, 3);  // Draw cursor
  u8g2.sendBuffer();

  delay(100);
}
```

### Volume Control (Up/Down)

```cpp
#include <Wire.h>
#include "paj7620.h"

int volume = 5;  // 0-10

void setup() {
  Serial.begin(9600);
  paj7620Init();
  Serial.println("Up/Down to adjust volume");
  displayVolume();
}

void loop() {
  uint8_t data = 0;
  paj7620ReadReg(0x43, 1, &data);

  if (data == GES_UP_FLAG) {
    if (volume < 10) {
      volume++;
      displayVolume();
      delay(300);
    }
  } else if (data == GES_DOWN_FLAG) {
    if (volume > 0) {
      volume--;
      displayVolume();
      delay(300);
    }
  }

  delay(100);
}

void displayVolume() {
  Serial.print("Volume: ");
  for (int i = 0; i < volume; i++) {
    Serial.print("█");
  }
  Serial.println();
}
```

### Menu Navigation

```cpp
#include <Wire.h>
#include "paj7620.h"

int menuIndex = 0;
const int menuItems = 4;
String menu[] = {"Option 1", "Option 2", "Option 3", "Option 4"};

void setup() {
  Serial.begin(9600);
  paj7620Init();
  Serial.println("Left/Right to navigate, Forward to select");
  displayMenu();
}

void loop() {
  uint8_t data = 0;
  paj7620ReadReg(0x43, 1, &data);

  if (data == GES_RIGHT_FLAG) {
    menuIndex = (menuIndex + 1) % menuItems;
    displayMenu();
    delay(300);
  } else if (data == GES_LEFT_FLAG) {
    menuIndex = (menuIndex - 1 + menuItems) % menuItems;
    displayMenu();
    delay(300);
  } else if (data == GES_FORWARD_FLAG) {
    Serial.print("Selected: ");
    Serial.println(menu[menuIndex]);
    delay(500);
  }

  delay(100);
}

void displayMenu() {
  Serial.println("\n--- Menu ---");
  for (int i = 0; i < menuItems; i++) {
    if (i == menuIndex) {
      Serial.print("> ");
    } else {
      Serial.print("  ");
    }
    Serial.println(menu[i]);
  }
}
```

## Gesture Definitions

| Gesture               | Motion                      | Typical Use               |
| --------------------- | --------------------------- | ------------------------- |
| **Right**             | Hand moves left to right    | Next, forward navigation  |
| **Left**              | Hand moves right to left    | Previous, back navigation |
| **Up**                | Hand moves bottom to top    | Increase, scroll up       |
| **Down**              | Hand moves top to bottom    | Decrease, scroll down     |
| **Forward**           | Hand pushes toward sensor   | Select, confirm, zoom in  |
| **Backward**          | Hand pulls away from sensor | Back, cancel, zoom out    |
| **Clockwise**         | Circular motion (clockwise) | Rotate right, increase    |
| **Counter-Clockwise** | Circular motion (CCW)       | Rotate left, decrease     |
| **Wave**              | Quick side-to-side motion   | Activate, toggle, wake    |

## Detection Tips

**For Reliable Recognition:**

- ✅ Keep hand 5-10cm from sensor
- ✅ Move steadily (not too fast)
- ✅ Complete full gesture motion
- ✅ Wait briefly between gestures
- ✅ Keep hand flat and open

**Avoid:**

- ❌ Too fast movements
- ❌ Incomplete gestures
- ❌ Multiple hands simultaneously
- ❌ Extreme angles (stay within cone)
- ❌ Rapid repeated gestures

## Advanced Features

### Wake-Up Mode

```cpp
void setup() {
  Serial.begin(9600);
  paj7620Init();

  // Configure for low power wake-up mode
  paj7620SelectBank(BANK0);
  paj7620WriteReg(0xEF, 0x01);  // Enable gesture wake-up
}
```

### Proximity Detection Only

```cpp
void loop() {
  uint16_t proximity = 0;

  // Read proximity value (0-255)
  paj7620ReadReg(0x6C, 1, (uint8_t*)&proximity);

  Serial.print("Proximity: ");
  Serial.println(proximity);

  if (proximity > 200) {
    Serial.println("Hand detected nearby");
  }

  delay(100);
}
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining gesture sensor with:

- Servo motor (Challenge #6: Auto-open bin)
- OLED display (gesture-controlled menu)
- LED (touchless control)
- Relay (appliance control)

## Additional Resources

- [PAJ7620U2 Datasheet](http://wiki.seeedstudio.com/Grove-Gesture_v1.0/#resources)
- [Library Examples](https://github.com/Seeed-Studio/Gesture_PAJ7620/tree/master/examples)
- [Gesture Recognition Basics](https://en.wikipedia.org/wiki/Gesture_recognition)
- [I2C Protocol](https://www.arduino.cc/en/Reference/Wire)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Library Version:** Check [releases](https://github.com/Seeed-Studio/Gesture_PAJ7620/releases)
