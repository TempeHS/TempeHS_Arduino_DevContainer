# Grove Red LED Matrix 8×8 with Driver

**Last Verified:** 2025-11-18  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Red_LED_Matrix_w_Driver/  
**Library Repo:** https://github.com/Seeed-Studio/Grove_LED_Matrix_Driver_HT16K33  
**Connection Type:** I2C

## Overview

The Grove LED Matrix 8×8 features 64 bright red LEDs arranged in an 8×8 grid, driven by the HT16K33 chip. Display text, numbers, icons, animations, and graphics. Adjustable brightness (16 levels), I2C control, built-in display RAM. Ideal for status indicators, scrolling text, games, animations, and visual feedback in compact spaces.

## Authoritative References

- [Grove Red LED Matrix - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Red_LED_Matrix_w_Driver/)
- [Grove_LED_Matrix_Driver_HT16K33 Library - GitHub](https://github.com/Seeed-Studio/Grove_LED_Matrix_Driver_HT16K33)
- [HT16K33 Datasheet - Holtek](https://www.holtek.com/documents/10179/116711/HT16K33v120.pdf)

## Hardware Setup

- **Connection Type:** I2C
- **Grove Port:** Any I2C port (address 0x70-0x77)
- **Display:** 8×8 red LED matrix (64 LEDs total)
- **Driver IC:** HT16K33 LED controller with keyscan
- **Operating Voltage:** 3.3V - 5V
- **Current:** ~120mA @ max brightness (all LEDs on)
- **Brightness Levels:** 16 levels (1/16 to 16/16 duty cycle)
- **Display RAM:** 16×8 bits (supports up to 128 LEDs)
- **Update Rate:** Software controlled (typically 10-60 FPS)
- **LED Color:** Red (620-625nm)
- **Wiring:** Connect to Grove Base Shield I2C port using 4-pin Grove cable

![Grove LED Matrix 8x8](https://files.seeedstudio.com/wiki/Grove-Red_LED_Matrix_w_Driver/img/main.jpg)

## Software Prerequisites

Install the Grove LED Matrix library:

```bash
# Method 1: Arduino Library Manager
# Open Arduino IDE → Tools → Manage Libraries
# Search "Grove LED Matrix Driver HT16K33" → Install

# Method 2: Manual installation
cd ~/Arduino/libraries
git clone https://github.com/Seeed-Studio/Grove_LED_Matrix_Driver_HT16K33.git
```

**Library Dependencies:**

- Wire.h (built-in I2C library)

## Example Code

```cpp
/*
  Purpose: Display text and graphics on 8×8 LED matrix
  Notes:
    1. Connect to I2C port
    2. 64 LEDs arranged in 8 rows × 8 columns
    3. 16 brightness levels (0-15)
    4. Can display numbers, letters, icons, animations
    5. Lower brightness saves power
  Author: Ben Jones 14/7/23
  Source: https://github.com/Seeed-Studio/Grove_LED_Matrix_Driver_HT16K33
*/

#include <Wire.h>
#include "Grove_LED_Matrix_Driver_HT16K33.h"

Matrix_8x8 matrix;

void setup() {
  Serial.begin(9600);
  Wire.begin();

  Serial.println("8x8 LED Matrix Display");

  // Initialize matrix
  matrix.init();
  matrix.setBrightness(8);  // 0-15 (8 = medium brightness)
  matrix.clear();
  matrix.writeDisplay();

  Serial.println("Matrix initialized");
}

void loop() {
  // Display number 0-9
  for (int i = 0; i <= 9; i++) {
    matrix.clear();
    matrix.writeNumber(i);
    matrix.writeDisplay();
    delay(500);
  }

  // Display letters A-Z
  for (char c = 'A'; c <= 'Z'; c++) {
    matrix.clear();
    matrix.writeChar(c);
    matrix.writeDisplay();
    delay(300);
  }

  // Display smiley face
  matrix.clear();
  uint8_t smiley[8] = {
    0b00111100,
    0b01000010,
    0b10100101,
    0b10000001,
    0b10100101,
    0b10011001,
    0b01000010,
    0b00111100
  };
  matrix.writePixels(smiley);
  matrix.writeDisplay();
  delay(2000);

  // Display heart
  matrix.clear();
  uint8_t heart[8] = {
    0b00000000,
    0b01100110,
    0b11111111,
    0b11111111,
    0b01111110,
    0b00111100,
    0b00011000,
    0b00000000
  };
  matrix.writePixels(heart);
  matrix.writeDisplay();
  delay(2000);
}
```

### Scrolling Text Display

```cpp
#include <Wire.h>
#include "Grove_LED_Matrix_Driver_HT16K33.h"

Matrix_8x8 matrix;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  matrix.init();
  matrix.setBrightness(10);
  matrix.clear();
  matrix.writeDisplay();
}

void loop() {
  String message = "HELLO WORLD! ";

  // Scroll text from right to left
  for (int i = 0; i < message.length(); i++) {
    matrix.clear();
    matrix.writeChar(message[i]);
    matrix.writeDisplay();
    delay(400);
  }

  delay(1000);
}
```

### Animation - Bouncing Ball

```cpp
#include <Wire.h>
#include "Grove_LED_Matrix_Driver_HT16K33.h"

Matrix_8x8 matrix;

int ballX = 3;
int ballY = 3;
int velocityX = 1;
int velocityY = 1;

void setup() {
  Wire.begin();
  matrix.init();
  matrix.setBrightness(8);
}

void loop() {
  // Update ball position
  ballX += velocityX;
  ballY += velocityY;

  // Bounce off walls
  if (ballX <= 0 || ballX >= 7) {
    velocityX = -velocityX;
    ballX += velocityX * 2;  // Prevent sticking to wall
  }
  if (ballY <= 0 || ballY >= 7) {
    velocityY = -velocityY;
    ballY += velocityY * 2;
  }

  // Clear and draw ball
  matrix.clear();
  matrix.setPixel(ballY, ballX);  // Note: (row, col)
  matrix.writeDisplay();

  delay(100);
}
```

### Temperature Display with Bar Graph

```cpp
#include <Wire.h>
#include "Grove_LED_Matrix_Driver_HT16K33.h"

Matrix_8x8 matrix;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  matrix.init();
  matrix.setBrightness(12);
}

void loop() {
  // Simulate temperature reading (replace with actual sensor)
  float temperature = random(15, 35);  // 15-35°C

  // Display temperature as number
  matrix.clear();
  int tempInt = (int)temperature;
  matrix.writeNumber(tempInt);
  matrix.writeDisplay();
  delay(2000);

  // Display as bar graph (vertical bars)
  matrix.clear();
  int bars = map(tempInt, 15, 35, 1, 8);  // 1-8 bars
  for (int col = 0; col < 8; col++) {
    for (int row = 8 - bars; row < 8; row++) {
      matrix.setPixel(row, col);
    }
  }
  matrix.writeDisplay();
  delay(2000);
}
```

### Game - Snake

```cpp
#include <Wire.h>
#include "Grove_LED_Matrix_Driver_HT16K33.h"

Matrix_8x8 matrix;

struct Point {
  int x, y;
};

Point snake[64];  // Max snake length
int snakeLength = 3;
Point food;
int dirX = 1;
int dirY = 0;

void setup() {
  Wire.begin();
  matrix.init();
  matrix.setBrightness(10);

  // Initialize snake
  snake[0] = {4, 4};
  snake[1] = {3, 4};
  snake[2] = {2, 4};

  // Place food
  randomSeed(analogRead(0));
  placeFood();
}

void placeFood() {
  food.x = random(0, 8);
  food.y = random(0, 8);
}

void loop() {
  // Move snake
  for (int i = snakeLength - 1; i > 0; i--) {
    snake[i] = snake[i - 1];
  }
  snake[0].x += dirX;
  snake[0].y += dirY;

  // Wrap around edges
  if (snake[0].x < 0) snake[0].x = 7;
  if (snake[0].x > 7) snake[0].x = 0;
  if (snake[0].y < 0) snake[0].y = 7;
  if (snake[0].y > 7) snake[0].y = 0;

  // Check if snake ate food
  if (snake[0].x == food.x && snake[0].y == food.y) {
    snakeLength++;
    placeFood();
  }

  // Draw
  matrix.clear();
  // Draw snake
  for (int i = 0; i < snakeLength; i++) {
    matrix.setPixel(snake[i].y, snake[i].x);
  }
  // Draw food (blinking)
  if (millis() % 500 < 250) {
    matrix.setPixel(food.y, food.x);
  }
  matrix.writeDisplay();

  // Simple AI - random direction changes
  if (random(0, 10) < 2) {
    int newDir = random(0, 4);
    switch (newDir) {
      case 0: dirX = 1; dirY = 0; break;  // Right
      case 1: dirX = -1; dirY = 0; break; // Left
      case 2: dirX = 0; dirY = 1; break;  // Down
      case 3: dirX = 0; dirY = -1; break; // Up
    }
  }

  delay(200);
}
```

**Key Points:**

- 8×8 = 64 individually controllable red LEDs
- HT16K33 driver handles multiplexing and RAM
- 16 brightness levels (duty cycle control)
- Built-in character set for numbers and letters
- Custom patterns via bit arrays
- Low refresh rate needs (10-60 FPS sufficient)

## Testing Procedure

1. Connect LED Matrix to I2C port
2. Install Grove_LED_Matrix_Driver_HT16K33 library
3. Upload basic example
4. **Test initialization:**
   - All LEDs should flash briefly
   - Matrix clears to all off
5. **Test numbers:**
   - Should display 0-9 sequentially
6. **Test letters:**
   - Should display A-Z
7. **Test brightness:**
   - Try different levels (0-15)
   - Level 0 = very dim, 15 = maximum
8. **Test custom graphics:**
   - Smiley face and heart icons display

## Troubleshooting

| Problem               | Solution                                                            |
| --------------------- | ------------------------------------------------------------------- |
| Nothing displays      | Check I2C wiring, verify address (0x70 default), check power supply |
| Random pixels lit     | Initialization failed, power cycle, check library version           |
| Display too dim       | Increase brightness: `matrix.setBrightness(15)`                     |
| Display too bright    | Decrease brightness to save power: `matrix.setBrightness(5)`        |
| Flickering            | Low I2C speed, poor power supply, try adding capacitor              |
| Some LEDs don't light | Hardware defect, try different patterns to isolate                  |

## Technical Specifications

**Display:**

- **Matrix Size:** 8 rows × 8 columns = 64 LEDs
- **LED Type:** Red (GaAsP), 620-625nm
- **LED Size:** 2.5mm diameter
- **Pixel Pitch:** ~4mm
- **Viewing Angle:** 120° typical

**Driver IC (HT16K33):**

- **Display RAM:** 16×8 bits (128 LED capacity)
- **Brightness:** 16 levels (1/16 to 16/16 duty cycle)
- **Scan Rate:** Software configurable
- **Key Scan:** 13×3 matrix (not used in this module)
- **Built-in RC Oscillator:** 128kHz

**Communication:**

- **Interface:** I2C (up to 400kHz Fast Mode)
- **I2C Address:** 0x70 (default), adjustable to 0x70-0x77 via solder pads

**Electrical:**

- **Operating Voltage:** 3.3V - 5V (regulated to 3.3V)
- **Current (All LEDs On):** ~120mA @ max brightness
- **Current (Typical):** 30-60mA (partial display)
- **Current (Standby):** < 1mA

**Environmental:**

- **Operating Temperature:** -20°C to 70°C
- **Storage Temperature:** -40°C to 85°C

**Physical:**

- **Module Size:** 40mm × 40mm
- **Display Area:** 32mm × 32mm
- **Weight:** ~15g

## Common Use Cases

### Real-Time Clock Display

```cpp
#include <Wire.h>
#include "Grove_LED_Matrix_Driver_HT16K33.h"

Matrix_8x8 matrix;

int hours = 12;
int minutes = 30;

void setup() {
  Wire.begin();
  matrix.init();
  matrix.setBrightness(8);
}

void loop() {
  // Display hours (first 2 seconds)
  matrix.clear();
  matrix.writeNumber(hours);
  matrix.writeDisplay();
  delay(2000);

  // Display minutes (next 2 seconds)
  matrix.clear();
  matrix.writeNumber(minutes);
  matrix.writeDisplay();
  delay(2000);

  // Update time (every 4 seconds = simulated time)
  minutes++;
  if (minutes >= 60) {
    minutes = 0;
    hours++;
    if (hours > 12) hours = 1;
  }
}
```

### Music Visualizer (VU Meter)

```cpp
#include <Wire.h>
#include "Grove_LED_Matrix_Driver_HT16K33.h"

Matrix_8x8 matrix;
const int micPin = A0;

void setup() {
  Wire.begin();
  pinMode(micPin, INPUT);
  matrix.init();
  matrix.setBrightness(12);
}

void loop() {
  // Read audio level
  int audioLevel = analogRead(micPin);
  int bars = map(audioLevel, 0, 16383, 0, 8);  // Uno R4: 0-16383

  // Display as spectrum bars (8 columns)
  matrix.clear();
  for (int col = 0; col < 8; col++) {
    int height = bars + random(-1, 2);  // Add variation
    height = constrain(height, 0, 8);
    for (int row = 8 - height; row < 8; row++) {
      matrix.setPixel(row, col);
    }
  }
  matrix.writeDisplay();

  delay(50);  // 20 FPS
}
```

### Countdown Timer

```cpp
#include <Wire.h>
#include "Grove_LED_Matrix_Driver_HT16K33.h"

Matrix_8x8 matrix;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  matrix.init();
  matrix.setBrightness(10);
  Serial.println("Countdown Timer: Starting at 10...");
}

void loop() {
  for (int count = 10; count >= 0; count--) {
    matrix.clear();
    matrix.writeNumber(count);
    matrix.writeDisplay();

    Serial.print("Count: ");
    Serial.println(count);

    delay(1000);
  }

  // Flash at zero
  for (int i = 0; i < 5; i++) {
    matrix.clear();
    matrix.writeDisplay();
    delay(200);
    matrix.writeNumber(0);
    matrix.writeDisplay();
    delay(200);
  }

  Serial.println("DONE!");
  delay(3000);
}
```

## Understanding LED Matrix Multiplexing

**How 8×8 Matrix Works:**

- 64 LEDs but only 16 control pins (8 rows + 8 columns)
- LEDs arranged at intersections of row/column lines
- Only one row active at a time (rapid scanning)
- Persistence of vision creates illusion of all LEDs on

**Multiplexing Process:**

1. Activate Row 0, light needed columns
2. Wait 1-2ms
3. Deactivate Row 0, activate Row 1
4. Light needed columns for Row 1
5. Repeat for all 8 rows
6. Complete scan in ~10-20ms (50-100 Hz refresh)

**Why HT16K33 is Needed:**

- Handles multiplexing automatically
- Built-in RAM stores display state
- Arduino only needs to update RAM, not multiplex
- Frees CPU for other tasks

## Creating Custom Graphics

**Bit Pattern Method:**

```cpp
// Each byte = one row (8 bits = 8 LEDs)
// 1 = LED on, 0 = LED off
// MSB (bit 7) = leftmost pixel

// Arrow pointing right
uint8_t arrow[8] = {
  0b00010000,  // Row 0
  0b00110000,  // Row 1
  0b01111111,  // Row 2
  0b11111111,  // Row 3
  0b11111111,  // Row 4
  0b01111111,  // Row 5
  0b00110000,  // Row 6
  0b00010000   // Row 7
};
matrix.writePixels(arrow);
```

**Individual Pixel Method:**

```cpp
// Draw a checkerboard pattern
matrix.clear();
for (int row = 0; row < 8; row++) {
  for (int col = 0; col < 8; col++) {
    if ((row + col) % 2 == 0) {
      matrix.setPixel(row, col);
    }
  }
}
matrix.writeDisplay();
```

## Animation Techniques

**Frame-Based Animation:**

```cpp
// Store animation frames
uint8_t frames[3][8] = {
  // Frame 1: Small circle
  {0b00000000, 0b00011000, 0b00100100, 0b00100100,
   0b00011000, 0b00000000, 0b00000000, 0b00000000},

  // Frame 2: Medium circle
  {0b00111100, 0b01000010, 0b10000001, 0b10000001,
   0b10000001, 0b10000001, 0b01000010, 0b00111100},

  // Frame 3: Large circle
  {0b11111111, 0b10000001, 0b10000001, 0b10000001,
   0b10000001, 0b10000001, 0b10000001, 0b11111111}
};

// Play animation
for (int i = 0; i < 3; i++) {
  matrix.writePixels(frames[i]);
  matrix.writeDisplay();
  delay(300);
}
```

## Power Considerations

**Current Draw:**

- All 64 LEDs on @ max brightness: ~120mA
- Typical usage (50% LEDs on): ~30-60mA
- Brightness level 8 (half): ~15-30mA
- Display off: < 1mA

**Battery Life Estimates:**

- **USB power (500mA):** Unlimited (well within budget)
- **9V battery (500mAh):** 8-16 hours @ medium brightness
- **4× AA batteries (2500mAh):** 40-80 hours @ medium brightness

**Power Saving Tips:**

```cpp
// Lower brightness saves significant power
matrix.setBrightness(5);  // vs. 15 = ~3× less current

// Turn off display when not needed
matrix.clear();
matrix.writeDisplay();

// Sleep HT16K33 (standby mode)
// See HT16K33 datasheet for sleep commands
```

## Integration Examples

See [integration recipes](../../integrations/) for projects combining LED Matrix with:

- Sound sensor (VU meter, music visualizer)
- Temperature sensor (graphical thermometer)
- Accelerometer (tilt-responsive animations)
- Button (game controller, menu navigation)

## Additional Resources

- [HT16K33 Datasheet](https://www.holtek.com/documents/10179/116711/HT16K33v120.pdf)
- [LED Matrix Basics](https://learn.adafruit.com/led-matrices)
- [8×8 Matrix Games](https://www.instructables.com/Arduino-8x8-LED-Matrix-Games/)

---

**Source Verification Date:** 2025-11-18  
**Seeed Wiki Last Checked:** 2025-11-18  
**Library Last Updated:** Check GitHub for latest version
