# Grove 12-Key Capacitive Touch Sensor V3 (MPR121)

**Last Verified:** 2025-11-18  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-12-Key-Capacitive-I2C-Touch-Sensor-V3-MPR121/  
**Library Repo:** https://github.com/adafruit/Adafruit_MPR121  
**Connection Type:** I2C

## Overview

The Grove 12-Key Capacitive Touch Sensor detects touch on 12 independent channels using the MPR121 capacitive sensing controller. No mechanical switches required - works through thin plastic, glass, or other insulating materials. Each channel can detect touch/release with adjustable sensitivity. Ideal for touch interfaces, musical instruments, interactive art, custom keyboards, and proximity detection.

## Authoritative References

- [Grove 12-Key Capacitive Touch - Seeed Wiki](https://wiki.seeedstudio.com/Grove-12-Key-Capacitive-I2C-Touch-Sensor-V3-MPR121/)
- [Adafruit MPR121 Library - GitHub](https://github.com/adafruit/Adafruit_MPR121)
- [MPR121 Datasheet - NXP](https://www.nxp.com/docs/en/data-sheet/MPR121.pdf)

## Hardware Setup

- **Connection Type:** I2C
- **Grove Port:** Any I2C port (address 0x5A, 0x5B, 0x5C, or 0x5D)
- **Sensor IC:** MPR121 proximity capacitive touch sensor controller
- **Channels:** 12 independent touch inputs
- **Touch Detection:** Capacitive (no pressure required)
- **Operating Voltage:** 3.3V - 5V
- **Current Draw:** ~29µA standby, ~3.4mA active
- **Response Time:** <10ms touch detection
- **Sensitivity:** Adjustable via thresholds
- **Proximity Detection:** Can detect nearby objects without contact
- **Material:** Works through plastic, glass, wood (non-conductive)
- **Electrode Connection:** Connect touch pads/electrodes to 12 channels
- **Wiring:** Connect to Grove Base Shield I2C port using 4-pin Grove cable

![Grove 12-Key Touch Sensor](https://files.seeedstudio.com/wiki/Grove-12-Key-Capacitive-I2C-Touch-Sensor-V3-MPR121/img/main.jpg)

## Software Prerequisites

Install the Adafruit MPR121 library:

```bash
# Method 1: Arduino Library Manager
# Open Arduino IDE → Tools → Manage Libraries
# Search "Adafruit MPR121" → Install

# Method 2: Manual installation
cd ~/Arduino/libraries
git clone https://github.com/adafruit/Adafruit_MPR121.git
```

**Library Dependencies:**

- Wire.h (built-in I2C library)
- Adafruit_MPR121.h

## Example Code

```cpp
/*
  Purpose: Detect touch on 12 capacitive touch channels
  Notes:
    1. Connect to I2C port
    2. 12 independent touch channels (0-11)
    3. Returns true when touched, false when released
    4. Can detect through thin non-conductive materials
    5. Adjustable sensitivity via touch/release thresholds
  Author: Ben Jones 18/11/25
  Source: https://github.com/adafruit/Adafruit_MPR121
*/

#include <Wire.h>
#include <Adafruit_MPR121.h>

Adafruit_MPR121 cap = Adafruit_MPR121();

// Track previous touch state
uint16_t lasttouched = 0;
uint16_t currtouched = 0;

void setup() {
  Serial.begin(9600);
  Wire.begin();

  Serial.println("12-Key Capacitive Touch Sensor");

  if (!cap.begin(0x5A)) {
    Serial.println("ERROR: MPR121 not found!");
    while (1);
  }

  Serial.println("Sensor initialized - Touch channels 0-11");
}

void loop() {
  // Read current touch state
  currtouched = cap.touched();

  // Check each of 12 channels
  for (uint8_t i = 0; i < 12; i++) {
    // Check if currently touched
    if ((currtouched & (1 << i)) && !(lasttouched & (1 << i))) {
      // Channel was just touched
      Serial.print("Channel ");
      Serial.print(i);
      Serial.println(" TOUCHED");
    }

    // Check if released
    if (!(currtouched & (1 << i)) && (lasttouched & (1 << i))) {
      // Channel was just released
      Serial.print("Channel ");
      Serial.print(i);
      Serial.println(" released");
    }
  }

  lasttouched = currtouched;
  delay(10);
}
```

### Musical Touch Keyboard

```cpp
#include <Wire.h>
#include <Adafruit_MPR121.h>

Adafruit_MPR121 cap = Adafruit_MPR121();

const int speakerPin = 3;

// Musical notes (Hz) - C major scale
int notes[] = {262, 294, 330, 349, 392, 440, 494, 523, 587, 659, 698, 784};
String noteNames[] = {"C", "D", "E", "F", "G", "A", "B", "C", "D", "E", "F", "G"};

uint16_t lasttouched = 0;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  cap.begin(0x5A);
  pinMode(speakerPin, OUTPUT);

  Serial.println("Musical Touch Keyboard");
  Serial.println("Touch channels 0-11 to play notes");
}

void loop() {
  uint16_t currtouched = cap.touched();

  // Check each channel
  bool anyTouched = false;
  for (uint8_t i = 0; i < 12; i++) {
    if (currtouched & (1 << i)) {
      // Play note
      tone(speakerPin, notes[i]);
      anyTouched = true;

      // Print note name if just touched
      if (!(lasttouched & (1 << i))) {
        Serial.print("♪ ");
        Serial.println(noteNames[i]);
      }
      break;  // Only one note at a time
    }
  }

  // Stop tone if nothing touched
  if (!anyTouched) {
    noTone(speakerPin);
  }

  lasttouched = currtouched;
  delay(10);
}
```

### Touch-Controlled LED Strip

```cpp
#include <Wire.h>
#include <Adafruit_MPR121.h>
#include <FastLED.h>

Adafruit_MPR121 cap = Adafruit_MPR121();

#define LED_PIN     3
#define NUM_LEDS    30

CRGB leds[NUM_LEDS];

// Colors for each touch channel
CRGB colors[] = {
  CRGB::Red, CRGB::Orange, CRGB::Yellow, CRGB::Green,
  CRGB::Cyan, CRGB::Blue, CRGB::Purple, CRGB::Magenta,
  CRGB::Pink, CRGB::White, CRGB::Gold, CRGB::Aqua
};

void setup() {
  Serial.begin(9600);
  Wire.begin();
  cap.begin(0x5A);

  FastLED.addLeds<WS2813, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(80);

  Serial.println("Touch-Controlled LED Strip");
}

void loop() {
  uint16_t currtouched = cap.touched();

  // Set LED color based on which channel is touched
  bool touched = false;
  for (uint8_t i = 0; i < 12; i++) {
    if (currtouched & (1 << i)) {
      fill_solid(leds, NUM_LEDS, colors[i]);
      touched = true;
      break;
    }
  }

  // Turn off if nothing touched
  if (!touched) {
    fill_solid(leds, NUM_LEDS, CRGB::Black);
  }

  FastLED.show();
  delay(20);
}
```

### Password Entry System

```cpp
#include <Wire.h>
#include <Adafruit_MPR121.h>

Adafruit_MPR121 cap = Adafruit_MPR121();

const int correctPassword[] = {0, 5, 9, 3};  // Channels to touch in order
const int passwordLength = 4;
int enteredPassword[10];
int entryIndex = 0;

uint16_t lasttouched = 0;

const int lockPin = 2;  // Output to unlock relay/servo

void setup() {
  Serial.begin(9600);
  Wire.begin();
  cap.begin(0x5A);
  pinMode(lockPin, OUTPUT);
  digitalWrite(lockPin, LOW);

  Serial.println("Touch Password Entry");
  Serial.println("Enter password sequence...");
}

void loop() {
  uint16_t currtouched = cap.touched();

  // Detect new touches
  for (uint8_t i = 0; i < 12; i++) {
    if ((currtouched & (1 << i)) && !(lasttouched & (1 << i))) {
      // New touch
      Serial.print("Entered: ");
      Serial.println(i);

      enteredPassword[entryIndex] = i;
      entryIndex++;

      // Check password when enough digits entered
      if (entryIndex >= passwordLength) {
        checkPassword();
        entryIndex = 0;  // Reset
      }
    }
  }

  lasttouched = currtouched;
  delay(10);
}

void checkPassword() {
  bool correct = true;
  for (int i = 0; i < passwordLength; i++) {
    if (enteredPassword[i] != correctPassword[i]) {
      correct = false;
      break;
    }
  }

  if (correct) {
    Serial.println("✓ PASSWORD CORRECT - UNLOCKED");
    digitalWrite(lockPin, HIGH);
    delay(3000);
    digitalWrite(lockPin, LOW);
  } else {
    Serial.println("✗ INCORRECT PASSWORD");
  }
}
```

### Touch Volume Control

```cpp
#include <Wire.h>
#include <Adafruit_MPR121.h>

Adafruit_MPR121 cap = Adafruit_MPR121();

int volume = 5;  // 0-11
const int ledPins[] = {3, 4, 5, 6, 7, 8, 9, 10, 11, 12, A2, A3};

uint16_t lasttouched = 0;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  cap.begin(0x5A);

  // Setup LED pins
  for (int i = 0; i < 12; i++) {
    pinMode(ledPins[i], OUTPUT);
  }

  Serial.println("Touch Volume Control");
  updateDisplay();
}

void loop() {
  uint16_t currtouched = cap.touched();

  // Detect touches
  for (uint8_t i = 0; i < 12; i++) {
    if ((currtouched & (1 << i)) && !(lasttouched & (1 << i))) {
      volume = i;
      Serial.print("Volume: ");
      Serial.print(volume);
      Serial.print("/11 (");
      Serial.print((volume * 100) / 11);
      Serial.println("%)");
      updateDisplay();
    }
  }

  lasttouched = currtouched;
  delay(10);
}

void updateDisplay() {
  // Light LEDs up to current volume
  for (int i = 0; i < 12; i++) {
    digitalWrite(ledPins[i], i <= volume ? HIGH : LOW);
  }
}
```

### Proximity Detection

```cpp
#include <Wire.h>
#include <Adafruit_MPR121.h>

Adafruit_MPR121 cap = Adafruit_MPR121();

void setup() {
  Serial.begin(9600);
  Wire.begin();
  cap.begin(0x5A);

  Serial.println("Proximity Detection");
  Serial.println("Channel\tFiltered\tBaseline");
}

void loop() {
  // Read filtered data (proximity sensing)
  for (uint8_t i = 0; i < 12; i++) {
    uint16_t filtered = cap.filteredData(i);
    uint16_t baseline = cap.baselineData(i);

    Serial.print(i);
    Serial.print("\t");
    Serial.print(filtered);
    Serial.print("\t\t");
    Serial.print(baseline);

    // Detect proximity (before actual touch)
    int delta = baseline - filtered;
    if (delta > 100) {
      Serial.print("\t<< NEAR");
    }

    Serial.println();
  }

  Serial.println("---");
  delay(500);
}
```

### Multi-Touch Combinations

```cpp
#include <Wire.h>
#include <Adafruit_MPR121.h>

Adafruit_MPR121 cap = Adafruit_MPR121();

void setup() {
  Serial.begin(9600);
  Wire.begin();
  cap.begin(0x5A);

  Serial.println("Multi-Touch Gesture Detection");
}

void loop() {
  uint16_t touched = cap.touched();

  // Count number of touches
  int touchCount = 0;
  for (int i = 0; i < 12; i++) {
    if (touched & (1 << i)) touchCount++;
  }

  // Detect specific combinations
  if ((touched & 0b000000000011) == 0b000000000011) {
    // Channels 0 and 1 together
    Serial.println("Gesture: ZOOM IN");
  } else if ((touched & 0b000000001100) == 0b000000001100) {
    // Channels 2 and 3 together
    Serial.println("Gesture: ZOOM OUT");
  } else if (touchCount >= 3) {
    Serial.print("Multi-touch: ");
    Serial.print(touchCount);
    Serial.println(" fingers");
  } else if (touchCount == 1) {
    // Single touch
    for (int i = 0; i < 12; i++) {
      if (touched & (1 << i)) {
        Serial.print("Single touch: ");
        Serial.println(i);
        break;
      }
    }
  }

  delay(100);
}
```

**Key Points:**

- 12 independent capacitive touch channels
- I2C interface (address 0x5A-0x5D, default 0x5A)
- No mechanical contact required
- Works through thin plastic, glass, wood
- Adjustable sensitivity thresholds
- Can detect proximity before touch
- Multi-touch capable

## Testing Procedure

1. Connect touch sensor to I2C port
2. Install Adafruit_MPR121 library
3. **Optional:** Connect electrodes/touch pads to channels 0-11
4. Upload basic touch detection example
5. **Test each channel:**
   - Touch electrode or channel pad
   - Should print "TOUCHED"
   - Release should print "released"
6. **Test sensitivity:**
   - Should detect through 1-2mm plastic
   - Adjust thresholds if too sensitive/insensitive
7. **Test multi-touch:**
   - Touch multiple channels simultaneously
   - Each should register independently

## Troubleshooting

| Problem                   | Solution                                                           |
| ------------------------- | ------------------------------------------------------------------ |
| Sensor not found          | Check I2C wiring, verify address (0x5A default), run I2C scanner   |
| No touch detected         | Check electrode connections, adjust thresholds, verify sensor init |
| Too sensitive             | Decrease touch threshold, check for noise/interference             |
| Not sensitive enough      | Increase touch threshold, shorten electrode wires                  |
| False triggers            | Shield electrodes, move away from noise sources, add ground plane  |
| Some channels not working | Check electrode connections, verify channel in range 0-11          |

## Technical Specifications

**MPR121 Controller:**

- **Channels:** 12 independent touch inputs
- **Detection Method:** Capacitive sensing
- **Touch Detection:** <10ms response time
- **Resolution:** 10-bit capacitance measurement
- **Baseline Tracking:** Automatic environmental compensation
- **Electrode Current:** <16µA per electrode

**I2C Interface:**

- **Addresses:** 0x5A, 0x5B, 0x5C, 0x5D (selectable)
- **Default Address:** 0x5A
- **Clock Speed:** Up to 400kHz (Fast Mode)
- **Data Rate:** ~100Hz touch update rate

**Electrical:**

- **Operating Voltage:** 2.5V - 3.6V (logic), 5V tolerant I2C
- **Current Draw:**
  - Standby: 29µA typical
  - Active: 3.4mA (all channels scanning)
- **Supply Current:** 5µA - 1.71mA (configurable)

**Sensing:**

- **Touch Threshold:** Programmable (default ~12)
- **Release Threshold:** Programmable (default ~6)
- **Max Electrode Capacitance:** 100pF
- **Proximity Detection:** Up to 10cm (depending on electrode size)
- **Material Penetration:** Works through 1-3mm plastic/glass

**Environmental:**

- **Operating Temperature:** -40°C to 85°C
- **Storage Temperature:** -40°C to 125°C

**Physical:**

- **Module Size:** 40mm × 20mm
- **Weight:** ~5g
- **Mounting:** 2× M2 mounting holes
- **Electrode Connector:** 12-pin header (2.54mm pitch)

## Common Use Cases

### Custom Keypad

```cpp
#include <Wire.h>
#include <Adafruit_MPR121.h>

Adafruit_MPR121 cap = Adafruit_MPR121();

char keys[] = {'1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'};
uint16_t lasttouched = 0;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  cap.begin(0x5A);
  Serial.println("Touch Keypad");
}

void loop() {
  uint16_t currtouched = cap.touched();

  for (uint8_t i = 0; i < 12; i++) {
    if ((currtouched & (1 << i)) && !(lasttouched & (1 << i))) {
      Serial.print("Key: ");
      Serial.println(keys[i]);
    }
  }

  lasttouched = currtouched;
  delay(10);
}
```

### Interactive Art Installation

```cpp
#include <Wire.h>
#include <Adafruit_MPR121.h>
#include <FastLED.h>

Adafruit_MPR121 cap = Adafruit_MPR121();

#define LED_PIN 3
#define NUM_LEDS 30

CRGB leds[NUM_LEDS];

void setup() {
  Wire.begin();
  cap.begin(0x5A);
  FastLED.addLeds<WS2813, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(100);
}

void loop() {
  uint16_t touched = cap.touched();

  // Each touch creates a ripple effect
  for (uint8_t i = 0; i < 12; i++) {
    if (touched & (1 << i)) {
      int center = map(i, 0, 11, 0, NUM_LEDS - 1);

      // Create ripple
      for (int dist = 0; dist < 10; dist++) {
        int pos1 = center + dist;
        int pos2 = center - dist;

        if (pos1 < NUM_LEDS) leds[pos1] = CHSV(i * 20, 255, 255 - (dist * 25));
        if (pos2 >= 0) leds[pos2] = CHSV(i * 20, 255, 255 - (dist * 25));
      }
    }
  }

  FastLED.show();
  fadeToBlackBy(leds, NUM_LEDS, 20);
  delay(30);
}
```

## Adjusting Sensitivity

```cpp
// Set custom thresholds for all channels
void setAllThresholds(uint8_t touch, uint8_t release) {
  for (uint8_t i = 0; i < 12; i++) {
    cap.setThresholds(i, touch, release);
  }
}

void setup() {
  // ...
  cap.begin(0x5A);

  // Default: touch=12, release=6
  // More sensitive: lower touch threshold
  setAllThresholds(8, 4);

  // Less sensitive: higher touch threshold
  // setAllThresholds(20, 10);
}
```

## Creating Touch Electrodes

**Materials:**

- Copper tape or aluminum foil
- Wire (22-26 AWG)
- Non-conductive surface (plastic, wood, acrylic)

**Best Practices:**

- Electrode size: 10-50mm diameter works well
- Keep electrodes isolated (no overlap)
- Use short wires (<30cm) to electrodes
- Add ground plane under electrodes for better sensitivity
- Shield from electrical noise sources

## Integration Examples

See [integration recipes](../../integrations/) for projects combining 12-key touch with:

- Speaker (musical keyboard, sound effects)
- LED strip (touch-reactive lighting)
- Servo (touch-controlled movement)
- OLED display (touch interface, games)

## Additional Resources

- [MPR121 Datasheet](https://www.nxp.com/docs/en/data-sheet/MPR121.pdf)
- [Capacitive Sensing Guide](https://learn.sparkfun.com/tutorials/capacitive-touch-sensor-hookup-guide)
- [Adafruit MPR121 Tutorial](https://learn.adafruit.com/adafruit-mpr121-12-key-capacitive-touch-sensor-breakout-tutorial)

---

**Source Verification Date:** 2025-11-18  
**Seeed Wiki Last Checked:** 2025-11-18  
**Tip:** Use larger electrodes for proximity detection, smaller for precise touch points!
