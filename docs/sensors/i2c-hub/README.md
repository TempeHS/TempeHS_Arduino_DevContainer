# Grove I2C Hub (6 Port)

**Last Verified:** 2025-11-18  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-I2C-Hub-6Port/  
**Connection Type:** I2C Expansion

## Overview

The Grove I2C Hub expands a single I2C port into 6 independent I2C connections, allowing you to connect multiple I2C devices simultaneously. All devices share the same I2C bus (SCL/SDA lines) but must have unique addresses. Perfect for projects requiring multiple sensors, displays, or I2C modules. No programming required - plug and play expansion with automatic addressing.

## Authoritative References

- [Grove I2C Hub 6 Port - Seeed Wiki](https://wiki.seeedstudio.com/Grove-I2C-Hub-6Port/)
- [I2C Protocol Tutorial](https://learn.sparkfun.com/tutorials/i2c)
- [I2C Address Scanner](https://playground.arduino.cc/Main/I2cScanner/)

## Hardware Setup

- **Connection Type:** I2C pass-through/multiplier
- **Input:** 1× I2C port (connects to Arduino)
- **Output:** 6× I2C ports (connects to I2C devices)
- **Bus Topology:** Parallel connection (all devices share bus)
- **Operating Voltage:** 3.3V - 5V
- **Current:** Transparent pass-through
- **Pull-up Resistors:** Onboard 10kΩ on SCL/SDA
- **Maximum Devices:** Limited by I2C address space (typically 112 unique addresses)
- **Cable Length:** Keep total I2C bus length <1m for reliability
- **Bus Capacitance:** Each device adds ~10-20pF
- **Wiring:** Connect hub input to Arduino I2C port, connect I2C devices to any of 6 output ports

![Grove I2C Hub](https://files.seeedstudio.com/wiki/Grove-I2C_Hub/img/I2C_hub_v1.3.jpg)

## Software Prerequisites

No special libraries required - I2C devices work as if directly connected:

```cpp
#include <Wire.h>
// Then include libraries for your specific I2C devices
```

## Example Code

```cpp
/*
  Purpose: I2C Hub allows multiple I2C devices on one bus
  Notes:
    1. All I2C devices share SCL/SDA lines
    2. Each device must have unique I2C address
    3. No hub-specific code needed
    4. Use I2C scanner to find device addresses
    5. Hub is transparent - devices work as if directly connected
  Author: Ben Jones 18/11/25
  Source: https://wiki.seeedstudio.com/Grove-I2C-Hub-6Port/
*/

#include <Wire.h>

void setup() {
  Serial.begin(9600);
  Wire.begin();

  Serial.println("I2C Device Scanner");
  Serial.println("Scanning for devices...");

  int deviceCount = 0;

  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("Device found at 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
      deviceCount++;
    }
  }

  Serial.print("Total devices found: ");
  Serial.println(deviceCount);
}

void loop() {
  // Scanning done in setup
}
```

### Multiple Sensors Example

```cpp
#include <Wire.h>
#include <Seeed_BME280.h>           // Air pressure sensor (0x76)
#include "Seeed_BMM150.h"           // Compass (0x13)
#include <Seeed_LIS3DHTR.h>         // Accelerometer (0x19)
#include <U8g2lib.h>                // OLED display (0x3C)

BME280 bme280;
BMM150 compass;
LIS3DHTR<TwoWire> accel;
U8G2_SSD1306_128X64_NONAME_F_HW_I2C display(U8G2_R0);

void setup() {
  Serial.begin(9600);
  Wire.begin();

  // Initialize all I2C devices
  bme280.init();
  compass.initialize();
  accel.begin(Wire, 0x19);
  display.begin();

  Serial.println("4 I2C Devices on Hub");
}

void loop() {
  // Read from all devices
  float temp = bme280.getTemperature();
  float pressure = bme280.getPressure() / 100.0;

  bmm150_mag_data compass_data;
  compass.read_mag_data();
  compass_data = compass.get_mag_data();

  float accelX = accel.getAccelerationX();

  // Display on OLED
  display.clearBuffer();
  display.setFont(u8g2_font_ncenB08_tr);
  display.setCursor(0, 10);
  display.print("Temp: ");
  display.print(temp, 1);
  display.print("C");
  display.setCursor(0, 25);
  display.print("Pressure: ");
  display.print(pressure, 0);
  display.print("hPa");
  display.setCursor(0, 40);
  display.print("Compass: ");
  display.print(compass_data.x);
  display.setCursor(0, 55);
  display.print("Accel: ");
  display.print(accelX, 2);
  display.sendBuffer();

  delay(500);
}
```

### Weather Station with Multiple I2C Sensors

```cpp
#include <Wire.h>
#include <Seeed_BME280.h>
#include <Grove_Temperature_And_Humidity_Sensor.h>
#include <U8g2lib.h>

BME280 bme280;                      // 0x76
DHT dht(DHT20);                     // 0x38
U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled(U8G2_R0);  // 0x3C

void setup() {
  Serial.begin(9600);
  Wire.begin();

  bme280.init();
  dht.begin();
  oled.begin();
  oled.setFont(u8g2_font_ncenB08_tr);

  Serial.println("Multi-Sensor Weather Station");
}

void loop() {
  // Read temperature from both sensors
  float tempBME = bme280.getTemperature();
  float tempDHT = dht.readTemperature();
  float humidity = dht.readHumidity();
  float pressure = bme280.getPressure() / 100.0;

  // Average temperature
  float avgTemp = (tempBME + tempDHT) / 2.0;

  // Display on OLED
  oled.clearBuffer();
  oled.setCursor(0, 12);
  oled.print("Weather Station");
  oled.setCursor(0, 28);
  oled.print("Temp: ");
  oled.print(avgTemp, 1);
  oled.print("C");
  oled.setCursor(0, 42);
  oled.print("Humid: ");
  oled.print(humidity, 0);
  oled.print("%");
  oled.setCursor(0, 56);
  oled.print("Press: ");
  oled.print(pressure, 0);
  oled.print("hPa");
  oled.sendBuffer();

  delay(2000);
}
```

### IMU Fusion with Display

```cpp
#include <Wire.h>
#include <Seeed_LIS3DHTR.h>         // Accelerometer 0x19
#include <Seeed_Arduino_LSM6DS3.h>  // Gyro 0x6A
#include <Seeed_BMM150.h>           // Compass 0x13
#include <U8g2lib.h>                // Display 0x3C

LIS3DHTR<TwoWire> accel;
LSM6DS3 imu(I2C_MODE, 0x6A);
BMM150 compass;
U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled(U8G2_R0);

void setup() {
  Serial.begin(9600);
  Wire.begin();

  accel.begin(Wire, 0x19);
  imu.begin();
  compass.initialize();
  oled.begin();

  Serial.println("IMU Sensor Fusion");
}

void loop() {
  // Read from all IMU sensors
  float ax = accel.getAccelerationX();
  float ay = accel.getAccelerationY();
  float az = accel.getAccelerationZ();

  float gx = imu.readFloatGyroX();
  float gy = imu.readFloatGyroY();
  float gz = imu.readFloatGyroZ();

  bmm150_mag_data mag;
  compass.read_mag_data();
  mag = compass.get_mag_data();

  // Display
  oled.clearBuffer();
  oled.setFont(u8g2_font_6x10_tr);
  oled.setCursor(0, 10);
  oled.print("Accel:");
  oled.print(ax, 1);
  oled.print(",");
  oled.print(ay, 1);
  oled.setCursor(0, 25);
  oled.print("Gyro:");
  oled.print(gx, 0);
  oled.print(",");
  oled.print(gy, 0);
  oled.setCursor(0, 40);
  oled.print("Mag:");
  oled.print(mag.x);
  oled.sendBuffer();

  delay(100);
}
```

### Multi-Display Dashboard

```cpp
#include <Wire.h>
#include <U8g2lib.h>
#include <TM1637Display.h>

// Two OLED displays with different addresses
U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled1(U8G2_R0, U8X8_PIN_NONE, 0x3C);
U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled2(U8G2_R0, U8X8_PIN_NONE, 0x3D);

// 4-digit display (if I2C version)
const int CLK = 2;
const int DIO = 3;
TM1637Display tm1637(CLK, DIO);

void setup() {
  Serial.begin(9600);
  Wire.begin();

  oled1.begin();
  oled2.begin();
  tm1637.setBrightness(0x0f);

  Serial.println("Multi-Display Dashboard");
}

void loop() {
  int count = (millis() / 1000) % 10000;

  // Display 1: Counter
  oled1.clearBuffer();
  oled1.setFont(u8g2_font_ncenB14_tr);
  oled1.setCursor(10, 35);
  oled1.print("Count:");
  oled1.setCursor(10, 55);
  oled1.print(count);
  oled1.sendBuffer();

  // Display 2: Status
  oled2.clearBuffer();
  oled2.setFont(u8g2_font_ncenB10_tr);
  oled2.setCursor(10, 25);
  oled2.print("System");
  oled2.setCursor(10, 45);
  oled2.print("Active");
  oled2.sendBuffer();

  // 7-segment display
  tm1637.showNumberDec(count);

  delay(100);
}
```

### I2C Device Address Reference

```cpp
#include <Wire.h>

// Common I2C device addresses
const char* deviceNames[] = {
  "Unknown", "Unknown", "Unknown", "Unknown",
  "Unknown", "Unknown", "Unknown", "Unknown",
  "Unknown", "Unknown", "Unknown", "Unknown",
  "Unknown", "BMM150 Compass",      // 0x13
  "Unknown", "Unknown",
  "Unknown", "Unknown", "Unknown", "LIS3DHTR Accel",  // 0x19
  "Unknown", "Unknown", "Unknown", "Unknown",
  "Unknown", "Unknown", "Unknown", "Unknown",
  "Unknown", "Unknown", "Unknown", "Unknown",
  "Unknown", "Unknown", "Unknown", "Unknown",
  "Unknown", "Unknown", "DHT20 Temp/Humid",  // 0x38
  "Unknown", "Unknown", "Unknown",
  "OLED Display",                   // 0x3C
  "OLED Display Alt",               // 0x3D
  "Unknown", "Unknown",
  "Unknown", "Unknown", "Unknown", "Unknown",
  "Unknown", "Unknown", "Unknown", "Unknown",
  "Unknown", "Unknown", "Unknown", "Unknown",
  "MPR121 Touch",                   // 0x5A
  "Unknown", "Unknown", "Unknown",
  "Unknown", "Unknown", "MLX90621 Thermal", // 0x60
  "Unknown", "Unknown", "Unknown",
  "Unknown", "Unknown", "Unknown", "Unknown",
  "Unknown", "Unknown", "LSM6DS3 IMU",      // 0x6A
  "Unknown", "Unknown", "Unknown",
  "Unknown", "Unknown", "Unknown", "Unknown",
  "Unknown", "Unknown", "Unknown", "BMP280 Pressure"  // 0x76
};

void setup() {
  Serial.begin(9600);
  Wire.begin();

  Serial.println("I2C Device Identifier");
  Serial.println("=====================");

  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print("0x");
      if (addr < 16) Serial.print("0");
      Serial.print(addr, HEX);
      Serial.print(": ");
      if (addr < sizeof(deviceNames)/sizeof(deviceNames[0])) {
        Serial.println(deviceNames[addr]);
      } else {
        Serial.println("Unknown");
      }
    }
  }
}

void loop() {}
```

### I2C Bus Monitor

```cpp
#include <Wire.h>

unsigned long lastScan = 0;
const int scanInterval = 5000;  // Scan every 5 seconds
byte lastDevices[127] = {0};

void setup() {
  Serial.begin(9600);
  Wire.begin();

  Serial.println("I2C Bus Monitor");
  Serial.println("Watching for device changes...");
}

void loop() {
  if (millis() - lastScan >= scanInterval) {
    bool changed = false;

    for (byte addr = 1; addr < 127; addr++) {
      Wire.beginTransmission(addr);
      byte present = (Wire.endTransmission() == 0) ? 1 : 0;

      if (present != lastDevices[addr]) {
        changed = true;
        if (present) {
          Serial.print("+ Device connected at 0x");
          if (addr < 16) Serial.print("0");
          Serial.println(addr, HEX);
        } else {
          Serial.print("- Device disconnected from 0x");
          if (addr < 16) Serial.print("0");
          Serial.println(addr, HEX);
        }
        lastDevices[addr] = present;
      }
    }

    if (!changed) {
      Serial.println("No changes detected");
    }

    lastScan = millis();
  }
}
```

**Key Points:**

- Expands 1 I2C port to 6 ports
- All devices share same I2C bus (SCL/SDA)
- Each device must have unique address
- No programming required - transparent connection
- Onboard pull-up resistors included
- Keep total bus length <1m

## Testing Procedure

1. Connect I2C Hub to Arduino I2C port
2. Connect I2C devices to hub output ports
3. Upload I2C scanner code
4. **Verify addresses:**
   - Each device should appear at its documented address
   - No address conflicts (two devices at same address)
5. **Test multiple devices:**
   - Initialize each device in setup()
   - Read from devices in loop()
   - Verify all devices respond correctly
6. **Check for interference:**
   - All devices should work simultaneously
   - No communication errors

## Troubleshooting

| Problem                    | Solution                                                                       |
| -------------------------- | ------------------------------------------------------------------------------ |
| Scanner finds no devices   | Check hub connected to Arduino, verify device power, check Grove cables        |
| Address conflicts          | Two devices have same address - change address or use different device         |
| Devices not responding     | Check cable lengths (<1m total), verify pull-up resistors, reduce bus speed    |
| Intermittent communication | Shorten cables, add decoupling capacitors, check power supply stability        |
| Only some devices work     | Address conflict, power supply insufficient, check device initialization order |
| Bus hangs/locks up         | One device holding bus low - disconnect devices one by one to identify         |

## Technical Specifications

**Hub Configuration:**

- **Input Ports:** 1× I2C (connects to Arduino)
- **Output Ports:** 6× I2C (connects to devices)
- **Connection Type:** Parallel bus (all ports share SCL/SDA)
- **Bus Topology:** Star topology from hub

**Electrical:**

- **Operating Voltage:** 3.3V - 5V
- **Logic Levels:** 3.3V and 5V compatible
- **Pull-up Resistors:** 10kΩ on SCL and SDA lines
- **Current:** Transparent pass-through (no active components)
- **ESD Protection:** Basic protection on I/O

**I2C Specifications:**

- **Clock Speed:** Up to 400kHz (Fast Mode I2C)
- **Address Range:** 7-bit addressing (0x01-0x7F)
- **Maximum Devices:** Limited by address space (~112 addresses)
- **Bus Capacitance:** ~10-20pF per device
- **Maximum Cable Length:** <1m total for reliability
- **Maximum Bus Capacitance:** 400pF (Fast Mode)

**Environmental:**

- **Operating Temperature:** -25°C to 85°C
- **Storage Temperature:** -40°C to 125°C

**Physical:**

- **PCB Size:** 40mm × 20mm
- **Weight:** ~5g
- **Mounting:** 2× M2 mounting holes
- **Port Spacing:** Adequate for Grove connectors

## Common I2C Device Addresses

| Address | Device         | Notes                   |
| ------- | -------------- | ----------------------- |
| 0x13    | BMM150 Compass | Magnetometer            |
| 0x19    | LIS3DHTR       | 3-axis accelerometer    |
| 0x38    | DHT20          | Temperature & humidity  |
| 0x3C    | SSD1306 OLED   | Primary address         |
| 0x3D    | SSD1306 OLED   | Secondary address       |
| 0x5A    | MPR121         | 12-channel touch sensor |
| 0x60    | MLX90621       | Thermal camera          |
| 0x6A    | LSM6DS3        | 6-axis IMU              |
| 0x76    | BMP280         | Air pressure sensor     |

**Note:** Some devices allow address configuration via jumpers or software.

## Address Conflict Resolution

### Option 1: Use Devices with Configurable Addresses

Many I2C devices have solder jumpers or address pins to change their address.

### Option 2: Use I2C Multiplexer

For multiple devices with same address, use TCA9548A I2C multiplexer.

### Option 3: Use Different Device Models

Choose alternative sensors with different default addresses.

## Best Practices

### Cable Management

- Keep I2C cables short (<1m total)
- Use shielded cables for noisy environments
- Avoid running I2C cables parallel to power cables

### Power Supply

- Ensure adequate current for all devices
- Use separate power supply for high-current devices
- Add bulk capacitors near hub (100µF)

### Software

- Initialize I2C with `Wire.begin()` before device initialization
- Check device addresses with scanner before deploying
- Handle communication errors gracefully
- Use `Wire.setTimeout()` for robust communication

## Integration Examples

See [integration recipes](../../integrations/) for projects combining I2C hub with:

- Multiple displays (OLED + 7-segment + LCD)
- Sensor fusion (accelerometer + gyro + compass)
- Weather station (temp/humidity + pressure + OLED)
- IMU systems (multiple motion sensors)

## Additional Resources

- [I2C Protocol Specification](https://www.nxp.com/docs/en/user-guide/UM10204.pdf)
- [I2C Address List](https://learn.adafruit.com/i2c-addresses/the-list)
- [I2C Troubleshooting Guide](https://learn.sparkfun.com/tutorials/i2c)

---

**Source Verification Date:** 2025-11-18  
**Seeed Wiki Last Checked:** 2025-11-18  
**Tip:** Each I2C device must have a unique address. Use I2C scanner to verify before connecting!
