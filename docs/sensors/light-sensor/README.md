# Grove Light Sensor

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Light_Sensor/  
**Connection Type:** Analog

## Overview

The Grove Light Sensor detects ambient light intensity using a photoresistor (light-dependent resistor). Returns analog values representing relative brightness. Ideal for automatic lighting control, day/night detection, and light-responsive projects.

## Authoritative References

- [Grove Light Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Light_Sensor/)
- No external library required (uses standard Arduino analogRead)

## Hardware Setup

- **Connection Type:** Analog
- **Grove Port:** Any Analog port (A0-A3)
- **Power Requirements:** 3V - 5V
- **Output Range:** 0 - 1023 (10-bit ADC on most Arduino boards)
- **Wiring:** Connect to Grove Base Shield analog port using 4-pin Grove cable

![Grove Light Sensor](https://files.seeedstudio.com/wiki/Grove-Light_Sensor/img/light_sensor.jpg)

**Important:** The Arduino Uno R4 WiFi has 14-bit ADC (0-16383 range) instead of 10-bit.

## Software Prerequisites

### Required Libraries

No external libraries required. Uses built-in Arduino functions:

- `analogRead(pin)`
- `map()` for value conversion

## Example Code

```cpp
/*
  Purpose: Basic example of reading data from the Seeed light sensor
  Notes:
    1. Connect to an analog pin
    2. Typical range: Min Light = 0, Max Light = ~800 (varies by lighting)
    3. The light sensor value reflects relative intensity, NOT exact Lumen measurement
  Author: Ben Jones 14/7/23
  Contact: benjmain.jones21@det.nsw.edu.au
  Source: https://wiki.seeedstudio.com/Grove-Light_Sensor/
*/

static unsigned int lightSensorPIN = A0;

void setup() {
  Serial.begin(9600);
  pinMode(lightSensorPIN, INPUT);
}

void loop() {
  static unsigned int sensorValue = analogRead(lightSensorPIN);

  Serial.print("Light level: ");
  Serial.println(sensorValue);
  delay(200);
}
```

**Key Points:**

- Higher values = more light detected
- Typical indoor range: 0-800 (10-bit ADC)
- Provides relative intensity, not calibrated Lumen values
- Response is logarithmic (similar to human eye perception)
- For Arduino Uno R4 WiFi: Range 0-16383 (14-bit)

## Advanced Example: Automatic LED Brightness

```cpp
/*
  LED brightness automatically adjusts based on ambient light
  Darker environment = Brighter LED
*/

const int lightSensorPin = A0;
const int ledPin = 5;  // PWM-capable pin

void setup() {
  Serial.begin(9600);
  pinMode(lightSensorPin, INPUT);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int lightLevel = analogRead(lightSensorPin);

  // Map light sensor reading to LED brightness (inverted)
  // When dark (low value), LED is bright (high PWM)
  int ledBrightness = map(lightLevel, 0, 800, 255, 0);
  ledBrightness = constrain(ledBrightness, 0, 255);

  analogWrite(ledPin, ledBrightness);

  Serial.print("Light: ");
  Serial.print(lightLevel);
  Serial.print(" | LED Brightness: ");
  Serial.println(ledBrightness);

  delay(100);
}
```

## Testing Procedure

1. Connect Light Sensor to Grove Base Shield analog port (e.g., A0)
2. Upload the example sketch
3. Open Serial Monitor (9600 baud)
4. **Expected output:**
   - Low values (0-100) in darkness
   - Medium values (200-500) in typical room lighting
   - High values (600-800+) in bright light or sunlight
5. Cover sensor with hand to see values decrease
6. Shine flashlight on sensor to see values increase

## Calibration for Your Environment

```cpp
// Run this code to find min/max values in your specific environment
const int lightSensorPin = A0;
int minValue = 1023;
int maxValue = 0;

void setup() {
  Serial.begin(9600);
  Serial.println("Calibrating... vary lighting for 10 seconds");
}

void loop() {
  int reading = analogRead(lightSensorPin);

  if (reading < minValue) minValue = reading;
  if (reading > maxValue) maxValue = reading;

  Serial.print("Current: ");
  Serial.print(reading);
  Serial.print(" | Min: ");
  Serial.print(minValue);
  Serial.print(" | Max: ");
  Serial.println(maxValue);

  delay(100);
}
```

## Troubleshooting

| Problem                  | Solution                                                                     |
| ------------------------ | ---------------------------------------------------------------------------- |
| Always reads 0           | Check Grove cable connection, verify analog port assignment                  |
| No variation in readings | Sensor may be faulty or lighting is too uniform; try different light sources |
| Values exceed 800        | Normal in very bright conditions; adjust map() range accordingly             |
| Erratic readings         | Ensure sensor is not partially covered; check for loose connections          |
| Can't see output         | Verify Serial Monitor baud rate is 9600                                      |

## Technical Specifications

- **Sensor Type:** Photoresistor (Light Dependent Resistor)
- **Operating Voltage:** 3V - 5V
- **Output:** Analog voltage (0-VCC)
- **Light Spectrum:** Visible light
- **Response Time:** 20-30ms
- **Peak Sensitivity:** ~540nm (green light)

## Common Use Cases

- **Automatic lighting:** Turn lights on when dark (Classroom Challenge #1)
- **Day/night detection:** Switch modes based on ambient light
- **Camera exposure control:** Adjust camera settings
- **Plant growth monitoring:** Track sunlight exposure
- **Smart blinds:** Automate window coverings

## Integration Examples

See [integration recipes](../../integrations/) for projects combining Light Sensor with:

- LED (automatic brightness control) – **Challenge #1**
- OLED display (light level visualization)
- Relay (automatic lamp switching)
- Temperature sensor (greenhouse monitoring)

## Additional Resources

- [Arduino analogRead() Reference](https://www.arduino.cc/reference/en/language/functions/analog-io/analogread/)
- [Arduino map() Function](https://www.arduino.cc/reference/en/language/functions/math/map/)
- [Photoresistor Wikipedia](https://en.wikipedia.org/wiki/Photoresistor)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17
