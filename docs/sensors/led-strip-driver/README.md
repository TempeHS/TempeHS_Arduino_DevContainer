# Grove LED Strip Driver

**Last Verified:** 2025-11-18  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-LED_Strip_Driver/  
**Connection Type:** Digital/PWM

## Overview

The Grove LED Strip Driver provides high-current control for RGB LED strips using P9813 LED driver chips. Control non-addressable RGB LED strips with PWM brightness adjustment. Drives up to 4 channels (1 RGB strip or multiple single-color strips). Each channel handles up to 20mA continuous current. Ideal for ambient lighting, mood lighting, decorative displays, and color-changing accent lights.

## Authoritative References

- [Grove LED Strip Driver - Seeed Wiki](https://wiki.seeedstudio.com/Grove-LED_Strip_Driver/)
- [P9813 LED Driver Datasheet](https://files.seeedstudio.com/wiki/Grove-LED_Strip_Driver/res/P9813_datasheet.pdf)

## Hardware Setup

- **Connection Type:** Digital (2-wire serial: CLK + DATA)
- **Grove Port:** D2-D11 (CLK and DATA pins)
- **Driver IC:** P9813 constant current LED driver (×2 chips)
- **Channels:** 4 channels total (R, G, B + extra channel)
- **Output Current:** Up to 20mA per channel (continuous)
- **Peak Current:** 30mA per channel (short duration)
- **Operating Voltage:** 3.3V - 5V (input logic)
- **LED Strip Voltage:** 12V typical (external power required)
- **PWM Resolution:** 256 levels (8-bit per channel)
- **Max LED Strip:** Depends on strip power (typically 1-5 meters)
- **Control Protocol:** 2-wire serial (CLK + DATA)
- **Wiring:**
  - Connect Grove module to digital port (e.g., D3/D4)
  - Connect 12V LED strip to screw terminals
  - Provide 12V external power to driver board

![Grove LED Strip Driver](https://files.seeedstudio.com/wiki/Grove-LED_Strip_Driver/img/LED_Strip_Driver_01.jpg)

## Software Prerequisites

Install the Grove_LED_Strip_Driver library:

```bash
# Method 1: Arduino Library Manager
# Open Arduino IDE → Tools → Manage Libraries
# Search "Chainable LED" (uses same P9813 chip)

# Method 2: Manual installation
cd ~/Arduino/libraries
git clone https://github.com/pjpmarques/ChainableLED.git
```

**Library Dependencies:**

- ChainableLED.h (for P9813 driver communication)

**Alternative:** Can use manual bit-banging if library unavailable.

## Example Code

```cpp
/*
  Purpose: Control RGB LED strip with Grove LED Strip Driver
  Notes:
    1. Connect to digital port (CLK=D3, DATA=D4)
    2. Requires 12V external power for LED strip
    3. P9813 driver handles 4 channels (RGB + extra)
    4. PWM brightness: 0-255 per channel
    5. Colors: Red, Green, Blue combinations
  Author: Ben Jones 18/11/25
  Source: https://wiki.seeedstudio.com/Grove-LED_Strip_Driver/
*/

#include <ChainableLED.h>

#define CLK_PIN   3
#define DATA_PIN  4
#define NUM_LEDS  1  // 1 RGB module (3 channels: R, G, B)

ChainableLED led(CLK_PIN, DATA_PIN, NUM_LEDS);

void setup() {
  Serial.begin(9600);
  Serial.println("LED Strip Driver Test");

  led.init();

  Serial.println("Driver initialized");
}

void loop() {
  // Cycle through colors
  Serial.println("Red");
  led.setColorRGB(0, 255, 0, 0);  // (index, R, G, B)
  delay(1000);

  Serial.println("Green");
  led.setColorRGB(0, 0, 255, 0);
  delay(1000);

  Serial.println("Blue");
  led.setColorRGB(0, 0, 0, 255);
  delay(1000);

  Serial.println("White");
  led.setColorRGB(0, 255, 255, 255);
  delay(1000);

  Serial.println("Purple");
  led.setColorRGB(0, 255, 0, 255);
  delay(1000);

  Serial.println("Yellow");
  led.setColorRGB(0, 255, 255, 0);
  delay(1000);

  Serial.println("Cyan");
  led.setColorRGB(0, 0, 255, 255);
  delay(1000);

  Serial.println("Off");
  led.setColorRGB(0, 0, 0, 0);
  delay(1000);
}
```

### Smooth Color Fading

```cpp
#include <ChainableLED.h>

#define CLK_PIN   3
#define DATA_PIN  4
#define NUM_LEDS  1

ChainableLED led(CLK_PIN, DATA_PIN, NUM_LEDS);

void setup() {
  Serial.begin(9600);
  led.init();
  Serial.println("Color Fading Demo");
}

void loop() {
  // Fade through rainbow
  for (int hue = 0; hue < 360; hue += 2) {
    int r, g, b;
    hsvToRgb(hue, 255, 255, r, g, b);
    led.setColorRGB(0, r, g, b);
    delay(20);
  }
}

void hsvToRgb(int h, int s, int v, int &r, int &g, int &b) {
  float H = h / 60.0;
  float S = s / 255.0;
  float V = v / 255.0;

  int i = (int)H;
  float f = H - i;
  float p = V * (1 - S);
  float q = V * (1 - S * f);
  float t = V * (1 - S * (1 - f));

  switch (i % 6) {
    case 0: r = V*255; g = t*255; b = p*255; break;
    case 1: r = q*255; g = V*255; b = p*255; break;
    case 2: r = p*255; g = V*255; b = t*255; break;
    case 3: r = p*255; g = q*255; b = V*255; break;
    case 4: r = t*255; g = p*255; b = V*255; break;
    case 5: r = V*255; g = p*255; b = q*255; break;
  }
}
```

### Brightness Control

```cpp
#include <ChainableLED.h>

#define CLK_PIN   3
#define DATA_PIN  4
#define NUM_LEDS  1

ChainableLED led(CLK_PIN, DATA_PIN, NUM_LEDS);

void setup() {
  Serial.begin(9600);
  led.init();
  Serial.println("Brightness Control");
}

void loop() {
  // Fade white LED in and out
  Serial.println("Fading in...");
  for (int brightness = 0; brightness <= 255; brightness += 5) {
    led.setColorRGB(0, brightness, brightness, brightness);
    Serial.print("Brightness: ");
    Serial.println(brightness);
    delay(30);
  }

  Serial.println("Fading out...");
  for (int brightness = 255; brightness >= 0; brightness -= 5) {
    led.setColorRGB(0, brightness, brightness, brightness);
    Serial.print("Brightness: ");
    Serial.println(brightness);
    delay(30);
  }
}
```

### Temperature Color Indicator

```cpp
#include <ChainableLED.h>

#define CLK_PIN   3
#define DATA_PIN  4
#define NUM_LEDS  1

ChainableLED led(CLK_PIN, DATA_PIN, NUM_LEDS);

void setup() {
  Serial.begin(9600);
  led.init();
  Serial.println("Temperature Color Indicator");
}

void loop() {
  // Simulate temperature (replace with actual sensor)
  float temperature = random(150, 350) / 10.0;  // 15-35°C

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println("°C");

  // Map temperature to color
  int r, g, b;
  if (temperature < 20) {
    // Cold = Blue
    r = 0; g = 0; b = 255;
  } else if (temperature < 22) {
    // Cool = Cyan
    r = 0; g = 150; b = 255;
  } else if (temperature < 24) {
    // Comfortable = Green
    r = 0; g = 255; b = 0;
  } else if (temperature < 26) {
    // Warm = Yellow
    r = 255; g = 200; b = 0;
  } else if (temperature < 28) {
    // Hot = Orange
    r = 255; g = 100; b = 0;
  } else {
    // Very hot = Red
    r = 255; g = 0; b = 0;
  }

  led.setColorRGB(0, r, g, b);
  delay(1000);
}
```

### Button Color Selector

```cpp
#include <ChainableLED.h>

#define CLK_PIN   3
#define DATA_PIN  4
#define NUM_LEDS  1
#define BUTTON_PIN 2

ChainableLED led(CLK_PIN, DATA_PIN, NUM_LEDS);

// Predefined colors
struct Color {
  int r, g, b;
  String name;
};

Color colors[] = {
  {255, 0, 0, "Red"},
  {0, 255, 0, "Green"},
  {0, 0, 255, "Blue"},
  {255, 255, 0, "Yellow"},
  {255, 0, 255, "Magenta"},
  {0, 255, 255, "Cyan"},
  {255, 255, 255, "White"},
  {0, 0, 0, "Off"}
};

int colorIndex = 0;
int numColors = 8;

void setup() {
  Serial.begin(9600);
  led.init();
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  Serial.println("Button Color Selector");

  // Show initial color
  setColor(colorIndex);
}

void loop() {
  if (digitalRead(BUTTON_PIN) == LOW) {
    // Button pressed - next color
    colorIndex++;
    if (colorIndex >= numColors) colorIndex = 0;

    setColor(colorIndex);

    // Debounce
    delay(300);
    while (digitalRead(BUTTON_PIN) == LOW) {
      delay(10);
    }
  }
}

void setColor(int index) {
  Color c = colors[index];
  led.setColorRGB(0, c.r, c.g, c.b);
  Serial.print("Color: ");
  Serial.println(c.name);
}
```

### Sunrise Alarm

```cpp
#include <ChainableLED.h>

#define CLK_PIN   3
#define DATA_PIN  4
#define NUM_LEDS  1

ChainableLED led(CLK_PIN, DATA_PIN, NUM_LEDS);

void setup() {
  Serial.begin(9600);
  led.init();
  Serial.println("Sunrise Alarm - Starting in 3 seconds");
  delay(3000);
}

void loop() {
  Serial.println("Sunrise simulation starting...");

  // 5-minute sunrise (300 seconds)
  int sunriseDuration = 30000;  // 30 seconds for demo (use 300000 for real)
  int steps = 100;
  int delayTime = sunriseDuration / steps;

  for (int step = 0; step <= steps; step++) {
    float progress = (float)step / steps;

    // Start with deep red-orange, fade to bright yellow-white
    int r = (int)(progress * 255);
    int g = (int)(progress * progress * 200);  // Slower green fade
    int b = (int)(progress * progress * progress * 100);  // Even slower blue

    led.setColorRGB(0, r, g, b);

    Serial.print("Sunrise progress: ");
    Serial.print((int)(progress * 100));
    Serial.println("%");

    delay(delayTime);
  }

  Serial.println("Sunrise complete - Full daylight!");
  delay(10000);

  // Sunset
  Serial.println("Sunset...");
  for (int step = steps; step >= 0; step--) {
    float progress = (float)step / steps;
    int r = (int)(progress * 255);
    int g = (int)(progress * progress * 200);
    int b = (int)(progress * progress * progress * 100);
    led.setColorRGB(0, r, g, b);
    delay(delayTime);
  }

  Serial.println("Night - lights off");
  delay(5000);
}
```

### Music Reactive Lighting

```cpp
#include <ChainableLED.h>

#define CLK_PIN   3
#define DATA_PIN  4
#define NUM_LEDS  1
#define MIC_PIN   A0

ChainableLED led(CLK_PIN, DATA_PIN, NUM_LEDS);

void setup() {
  Serial.begin(9600);
  led.init();
  pinMode(MIC_PIN, INPUT);
  Serial.println("Music Reactive Lighting");
}

void loop() {
  // Read audio level
  int audioLevel = analogRead(MIC_PIN);
  int brightness = map(audioLevel, 0, 16383, 0, 255);  // Uno R4: 0-16383

  // Map level to color (blue=quiet, red=loud)
  int r = brightness;
  int g = 255 - brightness;
  int b = 128;

  led.setColorRGB(0, r, g, b);

  Serial.print("Audio level: ");
  Serial.print(audioLevel);
  Serial.print(" -> Brightness: ");
  Serial.println(brightness);

  delay(50);
}
```

**Key Points:**

- P9813 driver chips control PWM for each channel
- Requires 12V external power for LED strips (not from Arduino)
- 2-wire serial protocol (CLK + DATA)
- 256 brightness levels per channel (8-bit PWM)
- Suitable for non-addressable RGB LED strips
- Each channel: up to 20mA continuous current

## Testing Procedure

1. **Hardware setup:**
   - Connect Grove module to D3/D4 (CLK/DATA)
   - Connect 12V LED strip to screw terminals (R, G, B, 12V)
   - Connect 12V power supply to driver board
   - Ensure common ground between Arduino and 12V supply
2. Install ChainableLED library
3. Upload basic RGB cycle example
4. **Test colors:**
   - Red, green, blue should display correctly
   - White should be balanced
5. **Test brightness:**
   - Fade from 0 to 255 should be smooth
   - No flickering
6. **Check connections:**
   - If one color missing, check terminal connections
   - Verify 12V power supply adequate for strip length

## Troubleshooting

| Problem              | Solution                                                            |
| -------------------- | ------------------------------------------------------------------- |
| No LEDs light up     | Check 12V power supply, verify strip polarity, test with multimeter |
| Only one color works | Check RGB terminal connections, verify strip not damaged            |
| Dim output           | 12V supply insufficient current, strip too long, check voltage drop |
| Flickering           | Poor power supply, loose connections, inadequate filtering          |
| Wrong colors         | Verify RGB order in code matches strip wiring                       |
| Erratic behavior     | Check CLK/DATA connections, ensure common ground Arduino↔12V supply |

## Technical Specifications

**P9813 Driver IC:**

- **Type:** Constant current LED driver
- **Channels:** 2 per chip (2 chips = 4 channels total)
- **Output Current:** 20mA continuous per channel
- **Peak Current:** 30mA per channel (brief)
- **PWM Resolution:** 256 levels (8-bit)
- **PWM Frequency:** ~1kHz
- **Control Protocol:** 2-wire serial (CLK + DATA)
- **Data Rate:** Up to 15MHz clock

**Electrical:**

- **Logic Voltage:** 3.3V - 5V (Arduino compatible)
- **LED Strip Voltage:** 12V (external power)
- **Max Output Current:** 80mA total (4 channels × 20mA)
- **Operating Current:** 5mA (logic circuit only)
- **Total Current:** Depends on LED strip power

**Control Interface:**

- **Pins:** CLK (clock), DATA (serial data)
- **Protocol:** Synchronous serial (similar to SPI)
- **Data Frame:** 32 bits per module (8 bits per channel)
- **Daisy-Chain:** Multiple drivers can be chained

**Physical:**

- **Module Size:** 40mm × 20mm
- **Terminal Block:** 4-position screw terminals
- **Wire Gauge:** Supports 18-24 AWG
- **Mounting:** 2× M3 mounting holes

**Environmental:**

- **Operating Temperature:** -10°C to 60°C
- **Storage Temperature:** -20°C to 70°C

## Common Use Cases

### Mood Lighting Controller

```cpp
#include <ChainableLED.h>

#define CLK_PIN   3
#define DATA_PIN  4
#define NUM_LEDS  1

ChainableLED led(CLK_PIN, DATA_PIN, NUM_LEDS);

void setup() {
  led.init();
}

void loop() {
  // Relaxing mode - slow blue-purple fade
  for (int i = 0; i < 100; i++) {
    int blue = 150 + (int)(50 * sin(i * 0.1));
    int purple = 100 + (int)(50 * sin(i * 0.1 + 1.0));
    led.setColorRGB(0, purple, 0, blue);
    delay(100);
  }
}
```

### Desk Lamp with Adjustable Color

```cpp
#include <ChainableLED.h>

#define CLK_PIN   3
#define DATA_PIN  4
#define NUM_LEDS  1
#define POT_PIN   A0

ChainableLED led(CLK_PIN, DATA_PIN, NUM_LEDS);

void setup() {
  led.init();
  pinMode(POT_PIN, INPUT);
}

void loop() {
  // Read potentiometer for color temperature
  int potValue = analogRead(POT_PIN);
  int colorTemp = map(potValue, 0, 16383, 0, 100);  // Uno R4: 0-16383

  // 0 = warm (orange), 50 = neutral (white), 100 = cool (blue-white)
  int r, g, b;
  if (colorTemp < 50) {
    // Warm white
    r = 255;
    g = 200 + colorTemp;
    b = 100 + (colorTemp * 2);
  } else {
    // Cool white
    r = 255 - ((colorTemp - 50) * 2);
    g = 220 + ((colorTemp - 50) * 0.7);
    b = 200 + ((colorTemp - 50) * 1.1);
  }

  led.setColorRGB(0, r, g, b);
  delay(50);
}
```

### Status Indicator System

```cpp
#include <ChainableLED.h>

#define CLK_PIN   3
#define DATA_PIN  4
#define NUM_LEDS  1

ChainableLED led(CLK_PIN, DATA_PIN, NUM_LEDS);

enum SystemStatus {
  STATUS_OK,
  STATUS_WARNING,
  STATUS_ERROR,
  STATUS_BUSY
};

void setup() {
  Serial.begin(9600);
  led.init();
}

void loop() {
  // Simulate system status checks
  SystemStatus status = (SystemStatus)random(0, 4);
  setStatusColor(status);
  delay(3000);
}

void setStatusColor(SystemStatus status) {
  switch (status) {
    case STATUS_OK:
      Serial.println("Status: OK");
      led.setColorRGB(0, 0, 255, 0);  // Green
      break;
    case STATUS_WARNING:
      Serial.println("Status: WARNING");
      led.setColorRGB(0, 255, 150, 0);  // Orange
      break;
    case STATUS_ERROR:
      Serial.println("Status: ERROR");
      led.setColorRGB(0, 255, 0, 0);  // Red
      break;
    case STATUS_BUSY:
      Serial.println("Status: BUSY");
      // Pulsing blue
      for (int i = 0; i < 10; i++) {
        int brightness = 100 + (int)(155 * sin(i * 0.5));
        led.setColorRGB(0, 0, 0, brightness);
        delay(100);
      }
      break;
  }
}
```

## Power Calculations

**LED Strip Current:**

```
12V LED Strip (typical):
- 30 LEDs/meter
- ~20mA per LED @ full white
- 1 meter = 600mA @ full white

Power = 12V × 0.6A = 7.2W per meter
```

**Power Supply Selection:**

- 1 meter strip: 12V/1A supply (minimum)
- 2 meter strip: 12V/2A supply
- 5 meter strip: 12V/5A supply
- Add 20% margin for safety

**Important:** Grove driver board requires separate 12V power - Arduino cannot provide this!

## Comparison: LED Strip Driver vs. WS2813

| Feature        | LED Strip Driver    | WS2813 Strip          |
| -------------- | ------------------- | --------------------- |
| **LED Type**   | Non-addressable RGB | Addressable RGB       |
| **Control**    | All LEDs same color | Each LED individual   |
| **Voltage**    | 12V (external)      | 5V                    |
| **Current**    | Higher (per meter)  | Lower (per LED)       |
| **Wiring**     | 4 wires (R,G,B,12V) | 3 wires (Data,5V,GND) |
| **Cost**       | Lower (strip)       | Higher (strip)        |
| **Complexity** | Simpler             | More complex          |
| **Best For**   | Ambient lighting    | Animations, effects   |

## Integration Examples

See [integration recipes](../../integrations/) for projects combining LED Strip Driver with:

- Potentiometer (manual brightness/color control)
- Button (color mode selector)
- Temperature sensor (color-coded temperature display)
- Light sensor (auto-dimming ambient lighting)

## Additional Resources

- [P9813 Datasheet](https://files.seeedstudio.com/wiki/Grove-LED_Strip_Driver/res/P9813_datasheet.pdf)
- [LED Strip Power Calculator](https://www.kasync.com/2016/09/22/led-strip-power-consumption-calculator/)
- [RGB Color Picker](https://www.google.com/search?q=color+picker)

---

**Source Verification Date:** 2025-11-18  
**Seeed Wiki Last Checked:** 2025-11-18  
**CRITICAL:** Always use external 12V power supply for LED strips - never power from Arduino!
