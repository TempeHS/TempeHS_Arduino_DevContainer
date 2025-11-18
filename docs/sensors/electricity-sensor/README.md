# Grove Electricity Sensor (CT - Current Transformer)

**Last Verified:** 2025-11-18  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Electricity_Sensor/  
**Connection Type:** Analog

## Overview

The Grove Electricity Sensor measures AC current up to 5A using a non-invasive current transformer (CT). Clamps around a single wire without cutting or stripping - perfect for monitoring appliances, detecting power usage, energy monitoring systems, and electrical safety projects. Outputs analog voltage proportional to current flow. Safe, isolated measurement without direct electrical connection.

## Authoritative References

- [Grove Electricity Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Electricity_Sensor/)
- [Current Transformer Basics](https://en.wikipedia.org/wiki/Current_transformer)
- [Non-Invasive Current Sensor Tutorial](https://learn.openenergymonitor.org/electricity-monitoring/ct-sensors/introduction)

## Hardware Setup

- **Connection Type:** Analog
- **Grove Port:** A0-A3 (any analog port)
- **Sensor Type:** Current Transformer (CT)
- **Measurement Range:** 0-5A AC
- **Measurement Method:** Non-invasive (clamp-on)
- **Output:** Analog voltage (0-5V)
- **Accuracy:** ±1% (with calibration)
- **Frequency:** 50Hz/60Hz AC mains
- **Isolation:** Transformer-isolated (electrically safe)
- **CT Core:** Ferrite toroid
- **CT Ratio:** Typically 1000:1 (depends on model)
- **Burden Resistor:** Onboard (converts current to voltage)
- **Operating Voltage:** 5V
- **Wiring:** Connect to Grove Base Shield analog port using 4-pin Grove cable
- **Wire Clamp:** Single wire only (not entire cable) for accurate reading

![Grove Electricity Sensor](https://files.seeedstudio.com/wiki/Grove-Electricity_Sensor/img/Electricity_sensor.jpg)

## Software Prerequisites

No additional libraries required - uses standard Arduino `analogRead()`:

```cpp
// Built-in functions only
analogRead(pin);
```

**For Arduino Uno R4 WiFi:**

- ADC resolution: 14-bit (0-16383)
- Reference voltage: 5V
- Resolution: 5V / 16383 = 0.305mV per step

## Example Code

```cpp
/*
  Purpose: Measure AC current using CT sensor
  Notes:
    1. Connect to analog port (A0-A3)
    2. Clamp sensor around SINGLE wire (not entire cable)
    3. ADC reading represents current amplitude
    4. For AC, need to sample and calculate RMS
    5. Calibration required for accurate readings
  Author: Ben Jones 18/11/25
  Source: https://wiki.seeedstudio.com/Grove-Electricity_Sensor/
*/

const int sensorPin = A0;
const float vRef = 5.0;           // Reference voltage
const float adcMax = 16383.0;     // 14-bit ADC on Uno R4
const float sensitivity = 1.0;     // Amps per volt (calibrate this)

void setup() {
  Serial.begin(9600);
  pinMode(sensorPin, INPUT);

  Serial.println("AC Current Sensor");
  Serial.println("Clamp around single wire");
}

void loop() {
  // Read sensor
  int rawValue = analogRead(sensorPin);

  // Convert to voltage
  float voltage = (rawValue * vRef) / adcMax;

  // Convert to current (needs calibration)
  float current = voltage * sensitivity;

  Serial.print("Raw: ");
  Serial.print(rawValue);
  Serial.print(" | Voltage: ");
  Serial.print(voltage, 3);
  Serial.print("V | Current: ");
  Serial.print(current, 3);
  Serial.println("A");

  delay(500);
}
```

### RMS Current Measurement

```cpp
const int sensorPin = A0;
const int numSamples = 1000;
const float vRef = 5.0;
const float adcMax = 16383.0;
const float ctRatio = 1000.0;     // CT turns ratio
const float burden = 200.0;        // Burden resistor (ohms)

void setup() {
  Serial.begin(9600);
  pinMode(sensorPin, INPUT);

  Serial.println("RMS Current Measurement");
}

void loop() {
  float sumSquares = 0;

  // Sample over multiple AC cycles
  for (int i = 0; i < numSamples; i++) {
    int rawValue = analogRead(sensorPin);
    float voltage = (rawValue * vRef) / adcMax;

    // Remove DC bias (assume centered at vRef/2)
    float acVoltage = voltage - (vRef / 2.0);

    sumSquares += acVoltage * acVoltage;
    delayMicroseconds(200);  // ~5kHz sampling for 50/60Hz AC
  }

  // Calculate RMS voltage
  float rmsVoltage = sqrt(sumSquares / numSamples);

  // Convert to RMS current
  float rmsCurrent = (rmsVoltage / burden) * ctRatio;

  Serial.print("RMS Current: ");
  Serial.print(rmsCurrent, 3);
  Serial.println(" A");

  delay(1000);
}
```

### Power Monitor with Watts Calculation

```cpp
const int sensorPin = A0;
const float vRef = 5.0;
const float adcMax = 16383.0;
const float mainsVoltage = 230.0;  // Change to 120V for US
const float calibration = 30.0;     // Calibration factor (adjust)

void setup() {
  Serial.begin(9600);
  Serial.println("AC Power Monitor");
}

void loop() {
  // Measure RMS current
  float rmsCurrent = measureRMSCurrent();

  // Calculate power (assuming resistive load, power factor ≈ 1)
  float power = mainsVoltage * rmsCurrent;

  // Calculate energy over time (Wh)
  static float energyWh = 0;
  static unsigned long lastTime = millis();
  unsigned long currentTime = millis();
  float hours = (currentTime - lastTime) / 3600000.0;
  energyWh += power * hours;
  lastTime = currentTime;

  // Display
  Serial.print("Current: ");
  Serial.print(rmsCurrent, 3);
  Serial.print(" A | Power: ");
  Serial.print(power, 1);
  Serial.print(" W | Energy: ");
  Serial.print(energyWh, 2);
  Serial.println(" Wh");

  delay(1000);
}

float measureRMSCurrent() {
  const int samples = 1000;
  float sumSquares = 0;

  for (int i = 0; i < samples; i++) {
    int raw = analogRead(sensorPin);
    float v = ((raw * vRef) / adcMax) - (vRef / 2.0);
    sumSquares += v * v;
    delayMicroseconds(200);
  }

  float rmsVoltage = sqrt(sumSquares / samples);
  return rmsVoltage * calibration;
}
```

### Appliance Detection System

```cpp
const int sensorPin = A0;
const float threshold = 0.5;  // 0.5A threshold for "appliance ON"

void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);

  Serial.println("Appliance Detection");
}

void loop() {
  float current = measureCurrent();

  if (current > threshold) {
    Serial.print("APPLIANCE ON - ");
    Serial.print(current, 2);
    Serial.println(" A");
    digitalWrite(LED_BUILTIN, HIGH);
  } else {
    Serial.println("Appliance off");
    digitalWrite(LED_BUILTIN, LOW);
  }

  delay(500);
}

float measureCurrent() {
  const int samples = 500;
  float sumSquares = 0;
  const float vRef = 5.0;
  const float adcMax = 16383.0;
  const float calibration = 30.0;

  for (int i = 0; i < samples; i++) {
    int raw = analogRead(sensorPin);
    float v = ((raw * vRef) / adcMax) - (vRef / 2.0);
    sumSquares += v * v;
    delayMicroseconds(200);
  }

  return sqrt(sumSquares / samples) * calibration;
}
```

### Energy Cost Calculator

```cpp
const int sensorPin = A0;
const float mainsVoltage = 230.0;
const float costPerKWh = 0.15;  // $0.15 per kWh (adjust for your rate)

float totalKWh = 0;
unsigned long startTime;

void setup() {
  Serial.begin(9600);
  startTime = millis();

  Serial.println("Energy Cost Calculator");
  Serial.print("Rate: $");
  Serial.print(costPerKWh, 2);
  Serial.println(" per kWh");
}

void loop() {
  float current = measureCurrent();
  float power = mainsVoltage * current;  // Watts

  // Accumulate energy (kWh)
  static unsigned long lastTime = millis();
  unsigned long now = millis();
  float hours = (now - lastTime) / 3600000.0;
  totalKWh += (power / 1000.0) * hours;
  lastTime = now;

  float totalCost = totalKWh * costPerKWh;

  // Display
  Serial.print("Power: ");
  Serial.print(power, 1);
  Serial.print(" W | Energy: ");
  Serial.print(totalKWh, 3);
  Serial.print(" kWh | Cost: $");
  Serial.println(totalCost, 2);

  delay(1000);
}

float measureCurrent() {
  // Same as previous example
  const int samples = 500;
  float sumSquares = 0;
  const float vRef = 5.0;
  const float adcMax = 16383.0;
  const float calibration = 30.0;

  for (int i = 0; i < samples; i++) {
    int raw = analogRead(sensorPin);
    float v = ((raw * vRef) / adcMax) - (vRef / 2.0);
    sumSquares += v * v;
    delayMicroseconds(200);
  }

  return sqrt(sumSquares / samples) * calibration;
}
```

### Current Limit Alarm

```cpp
const int sensorPin = A0;
const int buzzerPin = 2;
const float maxCurrent = 4.0;  // 4A maximum

void setup() {
  Serial.begin(9600);
  pinMode(buzzerPin, OUTPUT);

  Serial.println("Current Limit Alarm");
  Serial.print("Maximum: ");
  Serial.print(maxCurrent);
  Serial.println(" A");
}

void loop() {
  float current = measureCurrent();

  Serial.print("Current: ");
  Serial.print(current, 2);
  Serial.print(" A");

  if (current > maxCurrent) {
    Serial.println(" ⚠ OVER LIMIT!");
    // Sound alarm
    tone(buzzerPin, 1000, 200);
    delay(200);
  } else {
    Serial.println(" [OK]");
    noTone(buzzerPin);
  }

  delay(500);
}

float measureCurrent() {
  const int samples = 500;
  float sumSquares = 0;
  const float vRef = 5.0;
  const float adcMax = 16383.0;
  const float calibration = 30.0;

  for (int i = 0; i < samples; i++) {
    int raw = analogRead(sensorPin);
    float v = ((raw * vRef) / adcMax) - (vRef / 2.0);
    sumSquares += v * v;
    delayMicroseconds(200);
  }

  return sqrt(sumSquares / samples) * calibration;
}
```

### Data Logger for OLED Display

```cpp
#include <Wire.h>
#include <U8g2lib.h>

const int sensorPin = A0;
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0);

void setup() {
  Serial.begin(9600);
  u8g2.begin();
  u8g2.setFont(u8g2_font_ncenB08_tr);

  Serial.println("Current Monitor with Display");
}

void loop() {
  float current = measureCurrent();
  float power = 230.0 * current;

  // Display on OLED
  u8g2.clearBuffer();
  u8g2.setCursor(0, 15);
  u8g2.print("AC Current Monitor");
  u8g2.setCursor(0, 35);
  u8g2.print("Current: ");
  u8g2.print(current, 2);
  u8g2.print(" A");
  u8g2.setCursor(0, 50);
  u8g2.print("Power: ");
  u8g2.print(power, 1);
  u8g2.print(" W");
  u8g2.sendBuffer();

  delay(500);
}

float measureCurrent() {
  const int samples = 500;
  float sumSquares = 0;
  const float vRef = 5.0;
  const float adcMax = 16383.0;
  const float calibration = 30.0;

  for (int i = 0; i < samples; i++) {
    int raw = analogRead(sensorPin);
    float v = ((raw * vRef) / adcMax) - (vRef / 2.0);
    sumSquares += v * v;
    delayMicroseconds(200);
  }

  return sqrt(sumSquares / samples) * calibration;
}
```

**Key Points:**

- Non-invasive current measurement (clamp-on)
- 0-5A AC current range
- Must clamp around single wire only
- RMS calculation required for AC
- Calibration necessary for accuracy
- Safe, isolated measurement

## Testing Procedure

1. Connect electricity sensor to analog port (A0-A3)
2. Upload basic current reading example
3. **Safety first:** Ensure AC circuit is properly rated and safe
4. **Clamp sensor correctly:**
   - Open CT clamp
   - Place around ONE wire only (not entire cable)
   - Close CT clamp securely
   - Arrow on CT should point toward load
5. **Test with known load:**
   - Use appliance with known power rating (e.g., 100W light bulb)
   - Calculate expected current: I = P / V (e.g., 100W / 230V = 0.43A)
   - Compare with sensor reading
6. **Calibrate:**
   - Adjust calibration factor to match known load
   - Test with multiple loads to verify

## Troubleshooting

| Problem                 | Solution                                                                          |
| ----------------------- | --------------------------------------------------------------------------------- |
| No reading              | Check CT clamp closed, verify wire passes through center, check Grove cable       |
| Inaccurate readings     | Calibrate with known load, ensure single wire only, check CT orientation          |
| Reading always zero     | Verify AC circuit is energized, check load is turned on, test CT with multimeter  |
| Noisy/unstable readings | Increase sample count, add filtering, check for interference from nearby AC wires |
| Reading too high        | Reduce calibration factor, verify CT ratio, check for multiple wires in clamp     |
| Reading too low         | Increase calibration factor, ensure CT fully closed, check burden resistor        |

## Technical Specifications

**Current Transformer:**

- **Measurement Range:** 0-5A AC
- **Measurement Method:** Non-invasive clamp-on
- **Accuracy:** ±1% (with calibration)
- **Frequency Range:** 50Hz / 60Hz (mains frequency)
- **Core Type:** Ferrite toroid
- **Core Diameter:** ~13mm internal
- **Wire Compatibility:** Up to 10mm diameter single wire

**Electrical:**

- **Operating Voltage:** 5V DC (module power)
- **Output Type:** Analog voltage (0-5V)
- **Output Impedance:** Low (buffered)
- **Isolation:** Transformer-isolated (safe)
- **CT Ratio:** Typically 1000:1 or 2000:1
- **Burden Resistor:** Onboard (typically 100-200Ω)

**Sensor Performance:**

- **Resolution:** Limited by ADC (14-bit = 16384 steps)
- **Response Time:** <100ms
- **Linearity:** ±2%
- **Temperature Coefficient:** <0.1%/°C

**Environmental:**

- **Operating Temperature:** -10°C to 60°C
- **Storage Temperature:** -20°C to 80°C
- **Humidity:** 20-80% RH non-condensing

**Physical:**

- **Module Size:** 40mm × 20mm (PCB)
- **CT Clamp Size:** 13mm × 13mm × 7mm
- **Cable Length:** ~1m from CT to module
- **Weight:** ~20g
- **Mounting:** 2× M2 mounting holes on PCB

## Calibration Procedure

```cpp
// Calibration with known load
const int sensorPin = A0;

void setup() {
  Serial.begin(9600);
  Serial.println("Calibration Mode");
  Serial.println("Connect known load (e.g., 100W bulb)");
}

void loop() {
  float rmsVoltage = measureRMSVoltage();

  Serial.print("RMS Voltage from sensor: ");
  Serial.print(rmsVoltage, 4);
  Serial.println(" V");

  // If known current is 0.43A (100W @ 230V):
  // calibration = 0.43 / rmsVoltage
  Serial.println("Calculate: actualCurrent / measuredVoltage = calibration");

  delay(2000);
}

float measureRMSVoltage() {
  const int samples = 1000;
  float sumSquares = 0;
  const float vRef = 5.0;
  const float adcMax = 16383.0;

  for (int i = 0; i < samples; i++) {
    int raw = analogRead(sensorPin);
    float v = ((raw * vRef) / adcMax) - (vRef / 2.0);
    sumSquares += v * v;
    delayMicroseconds(200);
  }

  return sqrt(sumSquares / samples);
}
```

## Common Use Cases

### Home Energy Monitor

Monitor total household power consumption in real-time. Track daily/monthly energy usage.

### Appliance Energy Audit

Measure individual appliance power consumption to identify energy hogs.

### Smart Plug Alternative

Create DIY smart power monitoring without expensive smart plugs.

### Overload Protection

Detect excessive current draw and trigger safety shutoff.

## Safety Considerations

**Electrical Safety:**

- ⚠️ **DANGER:** Working with mains AC voltage (120V/230V) can be lethal
- Only qualified persons should work with mains wiring
- Ensure circuit breakers are properly rated
- Never open CT clamp while circuit is energized
- Follow local electrical codes and regulations

**Installation Safety:**

- Turn off power before installing CT sensor
- Ensure CT clamp is around single wire only
- Verify CT is fully closed after installation
- Keep CT away from heat sources
- Do not exceed 5A rating

**Measurement Safety:**

- Sensor provides isolation, but exercise caution
- Do not touch exposed conductors
- Ensure proper grounding
- Use appropriate fuses/breakers

## Integration Examples

See [integration recipes](../../integrations/) for projects combining electricity sensor with:

- OLED display (power monitor dashboard)
- Relay (automatic load control)
- WiFi module (cloud energy monitoring)
- Buzzer (overcurrent alarm)

## Additional Resources

- [Current Transformer Tutorial](https://learn.openenergymonitor.org/electricity-monitoring/ct-sensors/introduction)
- [RMS Calculation Explained](https://en.wikipedia.org/wiki/Root_mean_square)
- [AC Power Measurement](https://www.maximintegrated.com/en/design/technical-documents/app-notes/3/3997.html)

---

**Source Verification Date:** 2025-11-18  
**Seeed Wiki Last Checked:** 2025-11-18  
**Tip:** Always clamp around SINGLE wire only for accurate readings. Calibrate with known load!
