# Seeed Arduino Library Catalog

This catalog documents all Seeed Studio Arduino libraries used with TempeHS sensors, including installation commands, compatibility, and key APIs.

**Last Updated:** 2025-11-17

---

## Quick Installation

Install all common libraries at once:

```bash
arduino-cli lib install "Grove - Ultrasonic Ranger" "DHT sensor library" "Grove - Barometer Sensor BMP280" "Grove - 3-Axis Digital Accelerometer(±16g)"
```

---

## Sensor Libraries

### Grove - Ultrasonic Ranger

- **GitHub:** [Seeed-Studio/Seeed_Arduino_UltrasonicRanger](https://github.com/Seeed-Studio/Seeed_Arduino_UltrasonicRanger)
- **Latest Release:** Check [releases](https://github.com/Seeed-Studio/Seeed_Arduino_UltrasonicRanger/releases)
- **Install:** `arduino-cli lib install "Grove - Ultrasonic Ranger"`
- **Used By:** Ultrasonic Ranger sensor
- **Key APIs:**
  - `Ultrasonic(pin)` - Constructor with digital pin
  - `MeasureInCentimeters()` - Returns distance in cm (3-400 range)
  - `MeasureInInches()` - Returns distance in inches
- **Compatibility:** AVR, SAMD, STM32, Renesas (Uno R4)

**Example:**

```cpp
#include "Ultrasonic.h"
Ultrasonic ultrasonic(5);
long distance = ultrasonic.MeasureInCentimeters();
```

---

### DHT Sensor Library (Temperature & Humidity)

- **GitHub:** [Seeed-Studio/Grove_Temperature_And_Humidity_Sensor](https://github.com/Seeed-Studio/Grove_Temperature_And_Humidity_Sensor)
- **Latest Release:** Check [releases](https://github.com/Seeed-Studio/Grove_Temperature_And_Humidity_Sensor/releases)
- **Install:** `arduino-cli lib install "DHT sensor library"`
- **Used By:** DHT11, DHT20, DHT22 Temperature & Humidity sensors
- **Key APIs:**
  - `DHT(type)` - Constructor with sensor type (DHT11, DHT20, DHT22)
  - `begin()` - Initialize sensor
  - `readTemperature()` - Returns temperature in Celsius
  - `readHumidity()` - Returns relative humidity percentage
- **Compatibility:** I2C-based sensors, works on all Arduino platforms
- **Notes:** DHT20 uses I2C (no pin specification needed for I2C version)

**Example:**

```cpp
#include "DHT.h"
#define DHTTYPE DHT20
DHT dht(DHTTYPE);

void setup() {
  Wire.begin();
  dht.begin();
}

void loop() {
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
}
```

---

### Grove - Barometer Sensor BMP280

- **GitHub:** [Seeed-Studio/Grove_BMP280](https://github.com/Seeed-Studio/Grove_BMP280)
- **Latest Release:** Check [releases](https://github.com/Seeed-Studio/Grove_BMP280/releases)
- **Install:** `arduino-cli lib install "Grove - Barometer Sensor BMP280"`
- **Used By:** BMP280 Air Pressure sensor
- **Key APIs:**
  - `BMP280()` - Constructor
  - `init()` - Initialize sensor
  - `getTemperature()` - Returns temperature in Celsius
  - `getPressure()` - Returns pressure in Pa
  - `calcAltitude(pressure)` - Calculate altitude from pressure
- **Compatibility:** I2C interface, all Arduino platforms
- **Default I2C Address:** 0x77 (can be changed to 0x76)

**Example:**

```cpp
#include "Seeed_BMP280.h"
#include <Wire.h>

BMP280 bmp280;

void setup() {
  if (!bmp280.init()) {
    Serial.println("Device error!");
  }
}

void loop() {
  float temperature = bmp280.getTemperature();
  float pressure = bmp280.getPressure();
  float altitude = bmp280.calcAltitude(pressure);
}
```

---

### Grove - 3-Axis Digital Accelerometer (LIS3DHTR)

- **GitHub:** [Seeed-Studio/Seeed_Arduino_LIS3DHTR](https://github.com/Seeed-Studio/Seeed_Arduino_LIS3DHTR)
- **Latest Release:** Check [releases](https://github.com/Seeed-Studio/Seeed_Arduino_LIS3DHTR/releases)
- **Install:** `arduino-cli lib install "Grove - 3-Axis Digital Accelerometer(±16g)"`
- **Used By:** LIS3DHTR 3-axis accelerometer
- **Key APIs:**
  - `begin(Wire, address)` - Initialize with I2C
  - `getAcceleration(x, y, z)` - Get acceleration on all axes
  - `getAccelerationX()`, `getAccelerationY()`, `getAccelerationZ()` - Individual axes
  - `setOutputDataRate()` - Set sampling rate
  - `setFullScaleRange()` - Set measurement range (±2g, ±4g, ±8g, ±16g)
- **Compatibility:** I2C interface, all Arduino platforms
- **Default I2C Address:** 0x19

**Example:**

```cpp
#include "LIS3DHTR.h"
#include <Wire.h>

LIS3DHTR<TwoWire> lis;

void setup() {
  lis.begin(Wire, 0x19);
  lis.setOutputDataRate(LIS3DHTR_DATARATE_50HZ);
}

void loop() {
  float x = lis.getAccelerationX();
  float y = lis.getAccelerationY();
  float z = lis.getAccelerationZ();
}
```

---

### U8g2 (OLED Display)

- **GitHub:** [olikraus/u8g2](https://github.com/olikraus/u8g2)
- **Wiki:** [u8g2 Reference](https://github.com/olikraus/u8g2/wiki/u8g2reference)
- **Install:** `arduino-cli lib install "U8g2"`
- **Used By:** 0.96" OLED Display (SSD1315, SSD1306)
- **Key APIs:**
  - `U8G2_SSD1306_128X64_NONAME_F_HW_I2C` - Constructor for common OLED
  - `begin()` - Initialize display
  - `clearBuffer()` - Clear the buffer
  - `setFont()` - Set text font
  - `drawStr()` - Draw string
  - `sendBuffer()` - Send buffer to display
- **Compatibility:** I2C and SPI displays, all Arduino platforms
- **Note:** This is a community library, not Seeed-specific, but widely used

**Example:**

```cpp
#include <U8g2lib.h>
#include <Wire.h>

U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

void setup() {
  u8g2.begin();
}

void loop() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_ncenB08_tr);
  u8g2.drawStr(0, 10, "Hello World!");
  u8g2.sendBuffer();
}
```

---

## Standard Arduino Libraries

These built-in libraries don't require installation:

### Servo

- **Documentation:** [Arduino Servo Library](https://www.arduino.cc/reference/en/libraries/servo/)
- **Include:** `#include <Servo.h>`
- **Used By:** Servo motors
- **Key APIs:**
  - `attach(pin)` - Attach servo to pin
  - `write(angle)` - Set angle (0-180°)
  - `writeMicroseconds(us)` - Set pulse width
  - `read()` - Read current angle
  - `detach()` - Detach servo from pin
- **Compatibility:** Built-in, all Arduino boards

**Example:**

```cpp
#include <Servo.h>
Servo myServo;

void setup() {
  myServo.attach(6);
}

void loop() {
  myServo.write(90);  // Move to 90 degrees
}
```

### Wire (I2C Communication)

- **Documentation:** [Arduino Wire Library](https://www.arduino.cc/reference/en/language/functions/communication/wire/)
- **Include:** `#include <Wire.h>`
- **Used By:** All I2C sensors (Temperature, Humidity, Accelerometer, OLED, etc.)
- **Key APIs:**
  - `begin()` - Initialize I2C as master
  - `beginTransmission(address)` - Start I2C transmission
  - `write(data)` - Send data
  - `endTransmission()` - End transmission
  - `requestFrom(address, quantity)` - Request data
- **Compatibility:** Built-in, all Arduino boards
- **Default Pins:** SDA (A4), SCL (A5) on Uno; check board pinout

---

## Library Installation Methods

### Method 1: Arduino CLI (Recommended for DevContainer)

```bash
# Install single library
arduino-cli lib install "Library Name"

# Install multiple libraries
arduino-cli lib install "Library 1" "Library 2" "Library 3"

# Search for libraries
arduino-cli lib search seeed

# List installed libraries
arduino-cli lib list
```

### Method 2: Arduino IDE Library Manager

1. Open Arduino IDE
2. Sketch → Include Library → Manage Libraries
3. Search for library name
4. Click Install

### Method 3: Manual Installation (GitHub)

1. Download ZIP from GitHub repository releases
2. Sketch → Include Library → Add .ZIP Library
3. Select downloaded ZIP file

### Method 4: Git Clone (Development)

```bash
cd ~/Arduino/libraries/
git clone https://github.com/Seeed-Studio/repository-name.git
```

---

## Troubleshooting Library Issues

| Problem                         | Solution                                         |
| ------------------------------- | ------------------------------------------------ |
| "Library not found" error       | Install library using arduino-cli or IDE         |
| Multiple library versions       | Remove duplicates from Arduino/libraries/ folder |
| Compilation errors after update | Check library examples for API changes           |
| I2C sensor not responding       | Verify Wire.begin() is called in setup()         |
| Servo jitters                   | Use external power supply, not USB power         |

---

## Keeping Libraries Updated

### Check for Updates

```bash
# Update library index
arduino-cli lib update-index

# Upgrade all libraries
arduino-cli lib upgrade

# Upgrade specific library
arduino-cli lib upgrade "Library Name"
```

### Monthly Maintenance

1. Run `arduino-cli lib update-index`
2. Check Seeed GitHub repos for new releases
3. Test critical sensors after library updates
4. Document breaking changes in project notes

---

## Biosignal Libraries

### ardEEG (EEG/EMG/ECG Shield)

- **GitHub:** [pieeg-club/ardEEG](https://github.com/pieeg-club/ardEEG)
- **Latest Release:** Check [releases](https://github.com/pieeg-club/ardEEG/releases)
- **Install:** Native SPI and WiFi libraries (built-in, no installation required)
- **Used By:** ardEEG Biosignal Shield
- **Key APIs:**
  - `SPI.begin()` - Initialize SPI communication
  - `SPI.transfer()` - Send/receive data
  - `WiFiUDP` - Wireless data transmission
- **Compatibility:** Arduino UNO R4 WiFi (shield-specific)
- **Local Copy:** `/docs/sensors/ardeeg-biosignal-shield/` (images, examples, docs)

**Example:**

```cpp
#include <WiFi.h>
#include <WiFiUdp.h>
#include <SPI.h>

// Initialize SPI for ardEEG
SPI.begin();
SPI.beginTransaction(SPISettings(600000, MSBFIRST, SPI_MODE1));

// Read biosignal data
byte data = SPI.transfer(0xFF);
```

**Safety Warning:** Device MUST operate from 5V battery only. Complete galvanic isolation from mains required. Not a medical device.

---

## Additional Resources

- [Seeed Studio GitHub](https://github.com/Seeed-Studio/)
- [Arduino Library Specification](https://arduino.github.io/arduino-cli/latest/library-specification/)
- [Arduino CLI Library Commands](https://arduino.github.io/arduino-cli/latest/commands/arduino-cli_lib/)

---

**Need to add a library?** Follow the [Contributing Guide](../CONTRIBUTING.md) and ensure:

- Library is from official Seeed repository or widely trusted source
- Tested with Arduino Uno R4 WiFi
- Installation command verified
- At least one working example provided
