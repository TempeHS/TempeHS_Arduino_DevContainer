# Challenge #1: LED That Gets Brighter as it Gets Darker

**Classroom Challenge:** Automatic LED brightness control  
**Difficulty:** Beginner  
**Concepts:** Analog input, PWM output, inverse mapping

## Overview

Create an automatic lighting system where an LED becomes brighter as ambient light decreases. This mimics real-world applications like automatic nightlights, street lamps, and smartphone screen brightness adjustment.

**Learning Outcomes:**

- Read analog sensor values
- Use PWM for LED brightness control
- Apply inverse mapping (darker → brighter)
- Understand map() and constrain() functions

## Required Components

- [Light Sensor](../sensors/light-sensor/) – Quantity: 1
- [LED (Red LED module)](../sensors/led/) – Quantity: 1
- Arduino Uno R4 WiFi
- Grove Base Shield
- Grove cables (2x 4-pin)

## Wiring Diagram

**Connections:**

- Light Sensor → Analog Port A0
- LED Module → Digital PWM Port D5 (or D3, D6, D9, D10, D11)

```
[Arduino Uno R4 WiFi]
       |
[Grove Base Shield]
       |
       +--- A0 -----> [Light Sensor]
       |
       +--- D5 -----> [LED Module]
```

**Note:** LEDs require PWM-capable pins for brightness control. On Arduino Uno R4 WiFi, digital pins 3, 5, 6, 9, 10, and 11 support PWM.

## Step-by-Step Build

### 1. Hardware Setup

1. Mount Grove Base Shield on Arduino Uno R4 WiFi
2. Connect Light Sensor to analog port A0 using Grove cable
3. Connect LED module to digital port D5 using Grove cable
4. Connect Arduino to computer via USB-C cable

### 2. Library Installation

No external libraries required for this project.

### 3. Code Implementation

```cpp
/*
  Challenge #1: LED That Gets Brighter as it Gets Darker

  Description: LED brightness automatically adjusts based on ambient light.
  As the environment gets darker, the LED becomes brighter.

  Hardware:
  - Light Sensor on A0
  - LED on D5 (PWM pin)

  References:
  - Light Sensor: https://wiki.seeedstudio.com/Grove-Light_Sensor/
  - LED: https://wiki.seeedstudio.com/Grove-Red_LED/
*/

const int lightSensorPin = A0;
const int ledPin = 5;  // Must be PWM-capable pin

// Calibration values - adjust based on your environment
const int minLight = 0;    // Darkest reading
const int maxLight = 800;  // Brightest reading (may need adjustment)

void setup() {
  Serial.begin(9600);
  pinMode(lightSensorPin, INPUT);
  pinMode(ledPin, OUTPUT);

  Serial.println("Automatic LED Brightness Control");
  Serial.println("Cover sensor to make LED brighter");
  Serial.println("---");
}

void loop() {
  // Read light sensor value
  int lightLevel = analogRead(lightSensorPin);

  // Map light sensor to LED brightness (inverted)
  // Low light (0) maps to high brightness (255)
  // High light (800) maps to low brightness (0)
  int ledBrightness = map(lightLevel, minLight, maxLight, 255, 0);

  // Ensure value stays within valid PWM range
  ledBrightness = constrain(ledBrightness, 0, 255);

  // Set LED brightness
  analogWrite(ledPin, ledBrightness);

  // Display values for debugging
  Serial.print("Light: ");
  Serial.print(lightLevel);
  Serial.print(" | LED Brightness: ");
  Serial.print(ledBrightness);
  Serial.print(" (");
  Serial.print(map(ledBrightness, 0, 255, 0, 100));
  Serial.println("%)");

  delay(100);  // Small delay for stability
}
```

**Key Code Sections:**

**Reading the Light Sensor:**

```cpp
int lightLevel = analogRead(lightSensorPin);
```

Returns 0-1023 on standard Arduinos, 0-16383 on Uno R4 WiFi (14-bit ADC).

**Inverse Mapping:**

```cpp
int ledBrightness = map(lightLevel, 0, 800, 255, 0);
```

Note the reversed output range: 255 to 0 creates the inverse relationship.

**PWM Output:**

```cpp
analogWrite(ledPin, ledBrightness);
```

Controls LED brightness (0 = off, 255 = full brightness).

### 4. Testing

1. Upload the code to your Arduino
2. Open Serial Monitor (9600 baud)
3. Observe LED and Serial Monitor output
4. **Expected behavior:**
   - In normal room lighting: LED glows dimly
   - Cover light sensor with hand: LED brightens
   - Shine flashlight on sensor: LED dims or turns off
   - Serial Monitor shows light level and LED brightness values

### 5. Calibration

If LED is too bright/dim in your environment, calibrate the range:

```cpp
// Add this calibration code temporarily
void calibrate() {
  Serial.println("Calibrating - vary lighting for 10 seconds...");
  int minReading = 1023;
  int maxReading = 0;

  unsigned long startTime = millis();
  while (millis() - startTime < 10000) {
    int reading = analogRead(lightSensorPin);
    if (reading < minReading) minReading = reading;
    if (reading > maxReading) maxReading = reading;
    delay(100);
  }

  Serial.print("Use these values - Min: ");
  Serial.print(minReading);
  Serial.print(", Max: ");
  Serial.println(maxReading);
}
```

## Common Issues

| Problem                              | Cause                             | Solution                           |
| ------------------------------------ | --------------------------------- | ---------------------------------- |
| LED always at full brightness        | maxLight calibration too low      | Increase maxLight value (try 1000) |
| LED barely lights up                 | minLight/maxLight range incorrect | Run calibration code above         |
| LED doesn't respond to light changes | Wrong pin or sensor not connected | Verify connections and pin numbers |
| Flickering LED                       | No delay in loop                  | Add delay(100) or smooth readings  |
| Compilation error                    | LED on non-PWM pin                | Use pins 3, 5, 6, 9, 10, or 11     |

## Extensions & Modifications

### Beginner Extensions

1. **Add threshold:** LED only turns on when light drops below certain level
2. **Change response curve:** Use exponential mapping for more natural feel
3. **Add status messages:** Print "Day" or "Night" based on light level

### Intermediate Extensions

1. **Smooth transitions:** Use averaging or exponential smoothing
2. **Multiple LEDs:** Create color-changing effect with RGB LED
3. **Hysteresis:** Prevent rapid on/off switching at threshold

### Advanced Extensions

1. **Data logging:** Record light levels and LED states over time
2. **OLED display:** Show light graph and LED percentage
3. **Time-based control:** Different brightness curves for different times of day

## Example: With Smoothing

```cpp
const int numReadings = 10;
int readings[numReadings];
int readIndex = 0;
int total = 0;

void loop() {
  // Remove oldest reading
  total = total - readings[readIndex];
  // Read new value
  readings[readIndex] = analogRead(lightSensorPin);
  // Add to total
  total = total + readings[readIndex];
  // Advance to next position
  readIndex = (readIndex + 1) % numReadings;

  // Calculate average
  int average = total / numReadings;

  // Use averaged value for smooth LED control
  int ledBrightness = map(average, 0, 800, 255, 0);
  ledBrightness = constrain(ledBrightness, 0, 255);
  analogWrite(ledPin, ledBrightness);

  delay(50);
}
```

## Real-World Applications

- **Automatic nightlights:** Home lighting automation
- **Street lamps:** Municipal lighting control
- **Camera flash:** Automatic exposure compensation
- **Display backlighting:** Smartphone/laptop screens
- **Energy efficiency:** Reduce power consumption during daylight

## References

- [Light Sensor Guide](../sensors/light-sensor/)
- [LED Guide](../sensors/led/)
- [Arduino PWM](https://www.arduino.cc/en/Tutorial/PWM)
- [Arduino analogWrite()](https://www.arduino.cc/reference/en/language/functions/analog-io/analogwrite/)
- [Arduino map()](https://www.arduino.cc/reference/en/language/functions/math/map/)

---

**Last Updated:** 2025-11-17  
**Tested On:** Arduino Uno R4 WiFi  
**Estimated Time:** 20-30 minutes
