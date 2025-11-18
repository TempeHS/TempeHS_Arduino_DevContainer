# Grove Ultrasonic Ranger

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Ultrasonic_Ranger/  
**Library Repo:** https://github.com/Seeed-Studio/Seeed_Arduino_UltrasonicRanger  
**Connection Type:** Digital

## Overview

The Grove Ultrasonic Ranger measures distance using ultrasonic sound waves. It sends an ultrasonic pulse and calculates distance based on the time it takes for the echo to return. Accurate for distances from 3cm to 400cm (4 meters).

## Authoritative References

- [Grove Ultrasonic Ranger - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Ultrasonic_Ranger/)
- [Seeed_Arduino_UltrasonicRanger Library](https://github.com/Seeed-Studio/Seeed_Arduino_UltrasonicRanger)

## Hardware Setup

- **Connection Type:** Digital
- **Grove Port:** Any Digital port (D2-D8)
- **Power Requirements:** 5V
- **Measurement Range:** 3cm - 400cm
- **Measurement Angle:** 15 degrees
- **Wiring:** Connect to Grove Base Shield digital port using 4-pin Grove cable

![Grove Ultrasonic Ranger](https://files.seeedstudio.com/wiki/Grove_Ultrasonic_Ranger/img/Ultrasonic.jpg)

## Software Prerequisites

### Required Libraries

```bash
arduino-cli lib install "Grove - Ultrasonic Ranger"
```

Or download manually from: [GitHub Releases](https://github.com/Seeed-Studio/Seeed_Arduino_UltrasonicRanger/releases)

### Installation via Arduino IDE

1. Sketch → Include Library → Manage Libraries
2. Search for "Seeed Ultrasonic Ranger"
3. Click Install

## Example Code

```cpp
/*
  Purpose: Basic example of the Seeed Ultrasonic Ranger module
  Notes: Connect to a digital PIN
  Author: Ben Jones
  Contact: benjmain.jones21@det.nsw.edu.au
  Source: https://wiki.seeedstudio.com/Grove-Ultrasonic_Ranger/
  Library Source: https://github.com/Seeed-Studio/Seeed_Arduino_UltrasonicRanger
*/

// This is a different Ultrasonic Library to the one used with generic 4-pin sensors
// because we are using a Seeed Grove sensor with integrated signal processing
#include "Ultrasonic.h"

Ultrasonic myUltrasonicSensor(5);  // Connected to D5

void setup() {
  Serial.begin(9600);
}

void loop() {
  long RangeInCentimeters;

  RangeInCentimeters = myUltrasonicSensor.MeasureInCentimeters();
  Serial.print(RangeInCentimeters);  // 0~400cm
  Serial.println(" cm");
  delay(250);  // Wait 250ms between measurements
}
```

**Key Points:**

- Create `Ultrasonic` object with digital pin number (e.g., pin 5)
- Use `MeasureInCentimeters()` for metric measurements
- Use `MeasureInInches()` for imperial measurements
- Allow 250ms delay between measurements for accurate readings
- Returns 0 if object is too close (< 3cm) or too far (> 400cm)

## Testing Procedure

1. Connect Ultrasonic Ranger to Grove Base Shield digital port (e.g., D5)
2. Upload the example sketch
3. Open Serial Monitor (9600 baud)
4. Place hand or object in front of sensor
5. **Expected output:**
   - Distance in centimeters updates every 250ms
   - Values between 3 and 400 for objects in range
   - May show 0 or inconsistent readings for objects outside range

## Advanced Example: Distance Alert

```cpp
#include "Ultrasonic.h"

Ultrasonic ultrasonic(5);
const int alertDistance = 20;  // Alert if object within 20cm
const int ledPin = 13;  // Built-in LED

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  long distance = ultrasonic.MeasureInCentimeters();

  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  if (distance > 0 && distance < alertDistance) {
    digitalWrite(ledPin, HIGH);  // Turn on LED if object is close
    Serial.println("WARNING: Object detected!");
  } else {
    digitalWrite(ledPin, LOW);
  }

  delay(250);
}
```

## Troubleshooting

| Problem                 | Solution                                                       |
| ----------------------- | -------------------------------------------------------------- |
| Always returns 0        | Check Grove cable connection, verify 5V power supply           |
| Inconsistent readings   | Ensure object is within 15° angle, not too close (min 3cm)     |
| No serial output        | Check baud rate (9600), verify USB connection                  |
| Inaccurate measurements | Hard surfaces work best; soft/angled surfaces may absorb sound |
| Compilation error       | Install Seeed_Arduino_UltrasonicRanger library                 |
| Wrong pin number        | Verify which digital port you're connected to on Base Shield   |

## Technical Specifications

- **Supply Voltage:** 3.2V - 5.2V
- **Max Range:** 400cm
- **Min Range:** 3cm
- **Resolution:** 1cm
- **Measurement Angle:** 15 degrees
- **Measurement Frequency:** Suggest 50ms minimum interval
- **Dimensions:** 50mm x 25mm x 16mm

## Common Use Cases

- **Obstacle detection:** Robotics, parking assist
- **Liquid level sensing:** Tank monitoring
- **Proximity sensing:** Automatic door openers
- **Distance measurement:** Non-contact measurement projects
- **Boom gates:** Detect vehicle approach (see integrations)

## Integration Examples

See [integration recipes](../../integrations/) for projects combining Ultrasonic Ranger with:

- Button (triggered distance measurement)
- LED (distance-based indication)
- Buzzer (proximity alarm)
- Servo motor (boom gate automation)
- OLED display (distance visualization)

## Additional Resources

- [How Ultrasonic Sensors Work](https://en.wikipedia.org/wiki/Ultrasonic_transducer)
- [Seeed Wiki - Grove System](https://wiki.seeedstudio.com/Grove_System/)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**Library Version:** Check [releases](https://github.com/Seeed-Studio/Seeed_Arduino_UltrasonicRanger/releases)
