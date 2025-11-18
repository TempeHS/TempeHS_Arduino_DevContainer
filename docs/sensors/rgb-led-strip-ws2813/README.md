# Grove RGB LED Strip (WS2813)

**Last Verified:** 2025-11-18  
**Product Page:** https://www.seeedstudio.com/Grove-WS2813-RGB-LED-Strip-Waterproof-30-LED-m-1m.html  
**Connection Type:** Digital (Single-wire data)

## Overview

The Grove WS2813 RGB LED Strip features individually addressable RGB LEDs with 30 LEDs per meter. Each LED can display 16.7 million colors with PWM brightness control. Create animations, color patterns, lighting effects, and dynamic displays. WS2813 includes backup data line for reliability. Waterproof IP65 rating. Ideal for ambient lighting, decorative displays, visual indicators, wearables, and interactive art projects.

## Authoritative References

- [Grove WS2813 RGB LED Strip - Seeed Product](https://www.seeedstudio.com/Grove-WS2813-RGB-LED-Strip-Waterproof-30-LED-m-1m.html)
- [WS2813 LED Datasheet](https://cdn-shop.adafruit.com/product-files/2842/WS2813+LED.pdf)
- [FastLED Library Documentation](http://fastled.io/)
- [Adafruit NeoPixel Guide](https://learn.adafruit.com/adafruit-neopixel-uberguide)

## Hardware Setup

- **Connection Type:** Digital (single-wire serial protocol)
- **Grove Port:** D2-D8 (any digital pin)
- **LED Type:** WS2813 addressable RGB LEDs
- **LED Count:** 30 LEDs/meter (1m strip = 30 LEDs)
- **LED Chip:** WS2813 with integrated driver IC
- **Colors:** 16.7 million (256 levels per channel × 3 channels)
- **Brightness:** 256 levels per LED (PWM control)
- **Operating Voltage:** 5V DC
- **Current per LED:** ~60mA @ full white brightness
- **Total Current:** 1.8A @ 5V for 30 LEDs (full white)
- **Data Rate:** 800kHz (1.25µs per bit)
- **Backup Data:** Dual signal line (continues if one LED fails)
- **Waterproof:** IP65 (silicon sleeve)
- **Wiring:** Connect to Grove Base Shield digital port using 4-pin Grove cable

![Grove WS2813 LED Strip](https://files.seeedstudio.com/wiki/Grove-WS2813-RGB-LED-Strip/img/main.jpg)

## Software Prerequisites

Install the FastLED library (recommended) or Adafruit NeoPixel:

```bash
# Method 1: Arduino Library Manager
# Open Arduino IDE → Tools → Manage Libraries
# Search "FastLED" → Install latest version

# Method 2: Manual installation
cd ~/Arduino/libraries
git clone https://github.com/FastLED/FastLED.git

# Alternative: Adafruit NeoPixel
# Search "Adafruit NeoPixel" in Library Manager
```

**Library Dependencies:**

- FastLED (recommended for performance and effects)
- OR Adafruit_NeoPixel (alternative, simpler API)

## Example Code

```cpp
/*
  Purpose: Control WS2813 RGB LED strip with animations
  Notes:
    1. Connect to any digital port (D2-D8)
    2. Each LED: 60mA @ full white, 30 LEDs = 1.8A total
    3. External 5V power recommended for full brightness
    4. 256 brightness levels per color channel
    5. WS2813 has backup data line (continues if one LED fails)
  Author: Ben Jones 18/11/25
  Source: http://fastled.io/
*/

#include <FastLED.h>

#define LED_PIN     3        // Data pin
#define NUM_LEDS    30       // Number of LEDs in strip
#define LED_TYPE    WS2813   // LED chip type
#define COLOR_ORDER GRB      // Color byte order

CRGB leds[NUM_LEDS];

void setup() {
  Serial.begin(9600);
  Serial.println("WS2813 RGB LED Strip");

  // Initialize FastLED
  FastLED.addLeds<LED_TYPE, LED_PIN, COLOR_ORDER>(leds, NUM_LEDS);
  FastLED.setBrightness(50);  // 0-255 (50 = ~20% for safety)

  Serial.println("LED strip initialized");
}

void loop() {
  // Cycle through rainbow colors
  static uint8_t hue = 0;

  for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = CHSV(hue + (i * 10), 255, 255);  // HSV color
  }

  FastLED.show();
  hue++;
  delay(20);
}
```

### Color Patterns

```cpp
#include <FastLED.h>

#define LED_PIN     3
#define NUM_LEDS    30

CRGB leds[NUM_LEDS];

void setup() {
  Serial.begin(9600);
  FastLED.addLeds<WS2813, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(80);
}

void loop() {
  // Solid red
  Serial.println("Solid red");
  fill_solid(leds, NUM_LEDS, CRGB::Red);
  FastLED.show();
  delay(1000);

  // Solid green
  Serial.println("Solid green");
  fill_solid(leds, NUM_LEDS, CRGB::Green);
  FastLED.show();
  delay(1000);

  // Solid blue
  Serial.println("Solid blue");
  fill_solid(leds, NUM_LEDS, CRGB::Blue);
  FastLED.show();
  delay(1000);

  // Rainbow gradient
  Serial.println("Rainbow gradient");
  fill_rainbow(leds, NUM_LEDS, 0, 255 / NUM_LEDS);
  FastLED.show();
  delay(2000);

  // Alternating colors
  Serial.println("Alternating");
  for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = (i % 2 == 0) ? CRGB::Purple : CRGB::Orange;
  }
  FastLED.show();
  delay(2000);
}
```

### Running Light Animation

```cpp
#include <FastLED.h>

#define LED_PIN     3
#define NUM_LEDS    30

CRGB leds[NUM_LEDS];

void setup() {
  FastLED.addLeds<WS2813, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(60);
}

void loop() {
  static int pos = 0;

  // Clear all LEDs
  fill_solid(leds, NUM_LEDS, CRGB::Black);

  // Light up 5 LEDs in red, moving along strip
  for (int i = 0; i < 5; i++) {
    int ledPos = (pos + i) % NUM_LEDS;
    leds[ledPos] = CRGB::Red;
  }

  FastLED.show();
  pos++;
  delay(50);
}
```

### Color Wipe

```cpp
#include <FastLED.h>

#define LED_PIN     3
#define NUM_LEDS    30

CRGB leds[NUM_LEDS];

void setup() {
  FastLED.addLeds<WS2813, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(80);
}

void loop() {
  colorWipe(CRGB::Red, 50);
  colorWipe(CRGB::Green, 50);
  colorWipe(CRGB::Blue, 50);
  colorWipe(CRGB::Black, 50);  // Turn off
}

void colorWipe(CRGB color, int wait) {
  for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = color;
    FastLED.show();
    delay(wait);
  }
}
```

### Theater Chase

```cpp
#include <FastLED.h>

#define LED_PIN     3
#define NUM_LEDS    30

CRGB leds[NUM_LEDS];

void setup() {
  FastLED.addLeds<WS2813, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(80);
}

void loop() {
  theaterChase(CRGB::Red, 100);
  theaterChase(CRGB::Blue, 100);
  theaterChase(CRGB::Green, 100);
}

void theaterChase(CRGB color, int wait) {
  for (int cycle = 0; cycle < 10; cycle++) {
    for (int offset = 0; offset < 3; offset++) {
      // Clear strip
      fill_solid(leds, NUM_LEDS, CRGB::Black);

      // Light every 3rd LED
      for (int i = offset; i < NUM_LEDS; i += 3) {
        leds[i] = color;
      }

      FastLED.show();
      delay(wait);
    }
  }
}
```

### Fire Effect

```cpp
#include <FastLED.h>

#define LED_PIN     3
#define NUM_LEDS    30

CRGB leds[NUM_LEDS];

void setup() {
  FastLED.addLeds<WS2813, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(100);
}

void loop() {
  fireEffect();
}

void fireEffect() {
  for (int i = 0; i < NUM_LEDS; i++) {
    // Random flickering orange/red
    int heat = random(150, 255);
    leds[i] = CHSV(random(0, 30), 255, heat);  // Hue 0-30 = red-orange
  }
  FastLED.show();
  delay(random(50, 150));
}
```

### Temperature Indicator

```cpp
#include <FastLED.h>

#define LED_PIN     3
#define NUM_LEDS    30

CRGB leds[NUM_LEDS];

void setup() {
  Serial.begin(9600);
  FastLED.addLeds<WS2813, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(80);
}

void loop() {
  // Simulate temperature (replace with actual sensor)
  float temperature = random(150, 350) / 10.0;  // 15-35°C

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println("°C");

  // Map temperature to color (blue = cold, red = hot)
  CRGB color;
  if (temperature < 20) {
    color = CRGB::Blue;
  } else if (temperature < 25) {
    color = CRGB::Green;
  } else if (temperature < 30) {
    color = CRGB::Yellow;
  } else {
    color = CRGB::Red;
  }

  // Fill strip with color
  fill_solid(leds, NUM_LEDS, color);
  FastLED.show();

  delay(1000);
}
```

### VU Meter / Bar Graph

```cpp
#include <FastLED.h>

#define LED_PIN     3
#define NUM_LEDS    30
#define MIC_PIN     A0

CRGB leds[NUM_LEDS];

void setup() {
  FastLED.addLeds<WS2813, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(100);
  pinMode(MIC_PIN, INPUT);
}

void loop() {
  // Read audio level
  int audioLevel = analogRead(MIC_PIN);
  int numLit = map(audioLevel, 0, 16383, 0, NUM_LEDS);  // Uno R4: 0-16383

  // Clear strip
  fill_solid(leds, NUM_LEDS, CRGB::Black);

  // Light LEDs based on level (green → yellow → red)
  for (int i = 0; i < numLit; i++) {
    if (i < NUM_LEDS / 3) {
      leds[i] = CRGB::Green;
    } else if (i < 2 * NUM_LEDS / 3) {
      leds[i] = CRGB::Yellow;
    } else {
      leds[i] = CRGB::Red;
    }
  }

  FastLED.show();
  delay(50);
}
```

**Key Points:**

- WS2813 = improved WS2812B with backup data line
- Each LED needs 60mA @ full white (18mA per channel)
- 30 LEDs = 1.8A max (use external 5V power supply)
- Single-wire protocol (800kHz data rate)
- Timing critical - avoid interrupts during updates
- GRB color order (not RGB)
- FastLED provides excellent effects library

## Testing Procedure

1. Connect LED strip to digital port (e.g., D3)
2. **Important:** For full strip, connect external 5V power supply
   - Arduino can power 8-10 LEDs safely
   - Full strip needs dedicated 5V/2A+ supply
3. Install FastLED library
4. Upload rainbow example
5. **Test basic operation:**
   - All LEDs should cycle through colors
   - Smooth color transitions
6. **Test individual colors:**
   - Red, green, blue should be pure
   - White should be balanced
7. **Test brightness:**
   - Adjust `FastLED.setBrightness(0-255)`
   - Start low (50) to limit current
8. **Check current draw:**
   - Measure with multimeter
   - Full white = highest current

## Troubleshooting

| Problem                     | Solution                                                             |
| --------------------------- | -------------------------------------------------------------------- |
| No LEDs light up            | Check data pin connection, verify 5V power, check LED_PIN in code    |
| Wrong colors                | Adjust COLOR_ORDER (try GRB, RGB, or BGR)                            |
| First LED works, rest don't | Data corruption - check power supply, add 470Ω resistor on data line |
| LEDs flicker                | Insufficient power, use external 5V supply, add 1000µF capacitor     |
| Random colors/glitches      | Timing issues - disable interrupts, check cable length (<5m)         |
| Some LEDs stuck             | Failed LED - WS2813 has backup data line, should skip failed LED     |

## Technical Specifications

**LED Chip (WS2813):**

- **Type:** Individually addressable RGB LED with integrated driver
- **Colors:** 16.7 million (8-bit per channel: R, G, B)
- **Brightness Levels:** 256 per channel (24-bit color total)
- **LED Type:** 5050 SMD RGB LED
- **Color Order:** GRB (Green-Red-Blue byte order)
- **PWM Frequency:** ~1.2kHz (per channel)

**Electrical:**

- **Operating Voltage:** 5V DC (4.5V-5.5V range)
- **Current per LED:**
  - Red: ~20mA @ full brightness
  - Green: ~20mA @ full brightness
  - Blue: ~20mA @ full brightness
  - White (all on): ~60mA
- **Total Current (30 LEDs):** Up to 1.8A @ full white
- **Typical Current:** 0.5-1.0A (mixed colors, medium brightness)
- **Standby Current:** ~1mA per LED

**Data Protocol:**

- **Data Rate:** 800kHz (1.25µs per bit)
- **Protocol:** Single-wire NRZ (non-return-to-zero)
- **Data Signal:** 5V logic (3.3V may work with short cable)
- **Refresh Rate:** Limited by data rate (~30-60 Hz for 30 LEDs)
- **Backup Signal:** Dual data lines (continues if one LED fails)

**Physical:**

- **LED Density:** 30 LEDs/meter (33.3mm spacing)
- **Strip Length:** 1 meter (30 LEDs total)
- **Strip Width:** 10mm
- **LED Size:** 5050 SMD (5mm × 5mm)
- **Waterproof:** IP65 (silicon sleeve)
- **Cutting Points:** Every LED (marked on strip)
- **Connector:** 4-pin Grove cable (VCC, GND, Data, NC)

**Environmental:**

- **Operating Temperature:** -25°C to 60°C
- **Storage Temperature:** -40°C to 80°C
- **Waterproof Rating:** IP65 (splash/rain resistant, not submersible)

**Advantages Over WS2812B:**

- **Backup Data Line:** If one LED fails, strip continues working
- **Higher Refresh Rate:** Improved data transmission reliability
- **Better Color Consistency:** Tighter manufacturing tolerances

## Common Use Cases

### Ambient Room Lighting

```cpp
#include <FastLED.h>

#define LED_PIN     3
#define NUM_LEDS    30

CRGB leds[NUM_LEDS];

void setup() {
  FastLED.addLeds<WS2813, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(100);
}

void loop() {
  // Slowly cycle through warm colors
  static uint8_t hue = 0;

  // Warm color range (hue 0-50 = red-orange-yellow)
  CRGB color = CHSV(hue % 50, 200, 255);
  fill_solid(leds, NUM_LEDS, color);
  FastLED.show();

  hue++;
  delay(100);
}
```

### Notification Indicator

```cpp
#include <FastLED.h>

#define LED_PIN     3
#define NUM_LEDS    30

CRGB leds[NUM_LEDS];

void setup() {
  Serial.begin(9600);
  FastLED.addLeds<WS2813, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(80);
}

void loop() {
  // Check for notification (replace with actual check)
  bool hasEmail = random(0, 10) < 2;
  bool hasMessage = random(0, 10) < 2;

  if (hasEmail) {
    Serial.println("Email notification");
    pulseColor(CRGB::Blue, 3);
  }

  if (hasMessage) {
    Serial.println("Message notification");
    pulseColor(CRGB::Green, 3);
  }

  // Idle state
  fill_solid(leds, NUM_LEDS, CRGB::Black);
  FastLED.show();
  delay(2000);
}

void pulseColor(CRGB color, int times) {
  for (int i = 0; i < times; i++) {
    // Fade in
    for (int brightness = 0; brightness <= 255; brightness += 5) {
      fill_solid(leds, NUM_LEDS, color);
      FastLED.setBrightness(brightness);
      FastLED.show();
      delay(10);
    }
    // Fade out
    for (int brightness = 255; brightness >= 0; brightness -= 5) {
      fill_solid(leds, NUM_LEDS, color);
      FastLED.setBrightness(brightness);
      FastLED.show();
      delay(10);
    }
  }
  FastLED.setBrightness(80);  // Reset
}
```

### Progress Bar

```cpp
#include <FastLED.h>

#define LED_PIN     3
#define NUM_LEDS    30

CRGB leds[NUM_LEDS];

void setup() {
  Serial.begin(9600);
  FastLED.addLeds<WS2813, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(80);
}

void loop() {
  Serial.println("Starting process...");

  for (int progress = 0; progress <= 100; progress += 5) {
    int ledsToLight = map(progress, 0, 100, 0, NUM_LEDS);

    // Clear strip
    fill_solid(leds, NUM_LEDS, CRGB::Black);

    // Fill with green up to progress
    fill_solid(leds, ledsToLight, CRGB::Green);
    FastLED.show();

    Serial.print("Progress: ");
    Serial.print(progress);
    Serial.println("%");

    delay(200);
  }

  Serial.println("Complete!");
  delay(2000);
}
```

## Power Requirements

**Critical Safety Information:**

- **Arduino USB (500mA):** Can power 8-10 LEDs safely @ medium brightness
- **Arduino 5V pin (500mA):** Can power 8-10 LEDs safely
- **Full strip (30 LEDs):** Requires external 5V/2A+ power supply

**Current Calculations:**

```cpp
// Full white (R+G+B = 60mA per LED)
30 LEDs × 60mA = 1800mA (1.8A)

// Single color (20mA per LED)
30 LEDs × 20mA = 600mA

// 50% brightness
1800mA × 0.5 = 900mA

// Mixed colors (typical)
30 LEDs × 30mA (average) = 900mA
```

**External Power Setup:**

```
5V Power Supply (2A+)
├── (+) → LED Strip VCC
├── (-) → LED Strip GND
└── (-) → Arduino GND (common ground!)

Arduino
├── D3 → LED Strip Data
└── GND → Power Supply GND (shared)
```

**Important:** Always connect Arduino GND to power supply GND!

## FastLED vs. NeoPixel Library

**FastLED (Recommended):**

- Faster updates
- More built-in effects
- Better color management (HSV support)
- Precise timing control
- Example: `fill_rainbow()`, `fadeToBlackBy()`

**Adafruit NeoPixel:**

- Simpler API
- Easier for beginners
- Less features
- Example: `strip.setPixelColor()`

## Integration Examples

See [integration recipes](../../integrations/) for projects combining RGB LED strip with:

- Sound sensor (music visualizer, VU meter)
- Temperature sensor (thermal indicator)
- Button (color picker, mode selector)
- Accelerometer (motion-reactive lighting)

## Additional Resources

- [FastLED Library Documentation](http://fastled.io/)
- [WS2813 Datasheet](https://cdn-shop.adafruit.com/product-files/2842/WS2813+LED.pdf)
- [NeoPixel Best Practices](https://learn.adafruit.com/adafruit-neopixel-uberguide/best-practices)
- [LED Strip Power Calculator](https://www.kasync.com/2016/09/22/led-strip-power-consumption-calculator/)

---

**Source Verification Date:** 2025-11-18  
**Product Page Last Checked:** 2025-11-18  
**WARNING:** Full strip draws up to 1.8A - use external 5V power supply for >10 LEDs!
