# Grove Finger-Clip Heart Rate Sensor (MAX30102)

**Last Verified:** 2025-11-17  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove-Finger-clip_Heart_Rate_Sensor/  
**Library Repo:** https://github.com/Seeed-Studio/Grove_MAX30102  
**Connection Type:** I2C

## Overview

The Grove Finger-Clip Heart Rate Sensor uses the MAX30102 integrated pulse oximetry and heart rate monitor chip. Measures heart rate and blood oxygen saturation (SpO2) using optical sensing. Finger clip design for comfortable, accurate readings. Outputs digital data via I2C interface. Ideal for fitness monitoring, health tracking, and biomedical education.

## Authoritative References

- [Grove Finger-Clip Heart Rate Sensor - Seeed Wiki](https://wiki.seeedstudio.com/Grove-Finger-clip_Heart_Rate_Sensor/)
- [MAX30102 Library](https://github.com/Seeed-Studio/Grove_MAX30102)
- [MAX30102 Datasheet](https://datasheets.maximintegrated.com/en/ds/MAX30102.pdf)

## Hardware Setup

- **Connection Type:** I2C
- **Grove Port:** I2C port on Base Shield
- **Sensor Chip:** MAX30102 (pulse oximeter + heart rate)
- **Detection Method:** Optical (red + IR LEDs)
- **Measurements:** Heart rate (BPM), SpO2 (%)
- **Operating Voltage:** 3.3V - 5V
- **I2C Address:** 0x57
- **Cable Length:** ~70cm (finger clip to module)
- **Wiring:** Connect to Grove Base Shield I2C port using 4-pin Grove cable

![Grove Finger Clip Heart Rate](https://files.seeedstudio.com/wiki/Grove-Finger-clip_Heart_Rate_Sensor/img/Grove-Finger-clip_Heart_Rate_Sensor_s.jpg)

## Software Prerequisites

### Required Libraries

```bash
arduino-cli lib install "Grove MAX30102"
```

Or via Arduino IDE: Sketch → Include Library → Manage Libraries → Search "MAX30102"

## Example Code

```cpp
/*
  Purpose: Measure heart rate and SpO2 from finger-clip sensor
  Notes:
    1. Connect to I2C port
    2. Insert finger into clip
    3. Stay still for 10-15 seconds
    4. MAX30102 provides HR and SpO2
  Author: Ben Jones 14/7/23
  Source: https://wiki.seeedstudio.com/Grove-Finger-clip_Heart_Rate_Sensor/
  Library: https://github.com/Seeed-Studio/Grove_MAX30102
*/

#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"

MAX30105 particleSensor;

const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute;
int beatAvg;

void setup() {
  Serial.begin(9600);
  Serial.println("MAX30102 Heart Rate & SpO2 Sensor");

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 not found. Check wiring.");
    while (1);
  }

  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x0A);
  particleSensor.setPulseAmplitudeGreen(0);

  Serial.println("Place finger in clip");
  Serial.println("Stay still...");
}

void loop() {
  long irValue = particleSensor.getIR();

  if (checkForBeat(irValue) == true) {
    long delta = millis() - lastBeat;
    lastBeat = millis();

    beatsPerMinute = 60 / (delta / 1000.0);

    if (beatsPerMinute < 255 && beatsPerMinute > 20) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= RATE_SIZE;

      beatAvg = 0;
      for (byte x = 0; x < RATE_SIZE; x++) {
        beatAvg += rates[x];
      }
      beatAvg /= RATE_SIZE;
    }
  }

  Serial.print("IR=");
  Serial.print(irValue);
  Serial.print(" | BPM=");
  Serial.print(beatsPerMinute);
  Serial.print(" | Avg BPM=");
  Serial.print(beatAvg);

  if (irValue < 50000) {
    Serial.println(" | No finger detected");
  } else {
    Serial.println();
  }

  delay(100);
}
```

### With SpO2 Calculation

```cpp
#include <Wire.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"

MAX30105 particleSensor;

uint32_t irBuffer[100];
uint32_t redBuffer[100];
int32_t bufferLength = 100;
int32_t spo2;
int8_t validSPO2;
int32_t heartRate;
int8_t validHeartRate;

void setup() {
  Serial.begin(9600);

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 not found");
    while (1);
  }

  particleSensor.setup();
  Serial.println("Place finger in clip and wait 10 seconds");
}

void loop() {
  bufferLength = 100;

  // Read first 100 samples
  for (byte i = 0; i < bufferLength; i++) {
    while (particleSensor.available() == false) {
      particleSensor.check();
    }

    redBuffer[i] = particleSensor.getRed();
    irBuffer[i] = particleSensor.getIR();
    particleSensor.nextSample();

    Serial.print(".");
  }

  // Calculate heart rate and SpO2
  maxim_heart_rate_and_oxygen_saturation(
    irBuffer, bufferLength, redBuffer,
    &spo2, &validSPO2, &heartRate, &validHeartRate
  );

  Serial.println();
  Serial.print("Heart Rate: ");
  if (validHeartRate) {
    Serial.print(heartRate);
    Serial.println(" BPM");
  } else {
    Serial.println("Invalid");
  }

  Serial.print("SpO2: ");
  if (validSPO2) {
    Serial.print(spo2);
    Serial.println("%");
  } else {
    Serial.println("Invalid");
  }

  delay(3000);
}
```

**Key Points:**

- Measures both heart rate (BPM) and blood oxygen (SpO2 %)
- Requires finger fully inserted in clip
- Stay still for 10-15 seconds for accurate reading
- IR value indicates finger presence (>50000 = detected)
- Normal SpO2: 95-100%, Heart Rate: 60-100 BPM
- Uses I2C interface (more accurate than pulse-counting sensors)

## Testing Procedure

1. Connect finger-clip sensor to I2C port
2. Install Grove MAX30102 library
3. Upload basic example
4. Open Serial Monitor (9600 baud)
5. **Insert finger into clip:**
   - Fully insert fingertip
   - Keep still and relaxed
6. **Wait for readings (10-15 seconds):**
   - IR value > 50000 indicates finger detected
   - BPM stabilizes after several heartbeats
7. **Expected values (healthy adult at rest):**
   - Heart Rate: 60-100 BPM
   - SpO2: 95-100%

## Troubleshooting

| Problem                  | Solution                                 |
| ------------------------ | ---------------------------------------- |
| "MAX30102 not found"     | Check I2C connection, verify power       |
| "No finger detected"     | Insert finger fully, ensure good contact |
| BPM reading 0 or erratic | Stay still, adjust finger position       |
| SpO2 shows invalid       | Wait longer (30+ seconds), clean sensor  |
| IR value too low         | Finger not inserted or poor circulation  |

## Technical Specifications

- **Sensor:** MAX30102 integrated pulse oximeter + heart rate
- **Measurements:** Heart rate, SpO2 (blood oxygen saturation)
- **Heart Rate Range:** 30-200 BPM
- **SpO2 Range:** 70-100%
- **Resolution:** 0.1 BPM, 1% SpO2
- **LEDs:** Red (660nm) + IR (880nm)
- **Interface:** I2C (address 0x57)
- **Operating Voltage:** 1.8V internal, 3.3-5V supply
- **Operating Current:** < 600µA (LED off), < 50mA (LED on)
- **Sample Rate:** Up to 3200 samples/second
- **Operating Temperature:** -40°C to +85°C

## Common Use Cases

### Health Monitor Dashboard

```cpp
#include <Wire.h>
#include <U8g2lib.h>
#include "MAX30105.h"
#include "heartRate.h"

U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);
MAX30105 particleSensor;

const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute;
int beatAvg;

void setup() {
  u8g2.begin();
  Wire.begin();

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    u8g2.clearBuffer();
    u8g2.setFont(u8g2_font_ncenB08_tr);
    u8g2.drawStr(0, 20, "Sensor Error");
    u8g2.sendBuffer();
    while (1);
  }

  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x0A);
}

void loop() {
  long irValue = particleSensor.getIR();

  if (checkForBeat(irValue) == true) {
    long delta = millis() - lastBeat;
    lastBeat = millis();

    beatsPerMinute = 60 / (delta / 1000.0);

    if (beatsPerMinute < 255 && beatsPerMinute > 20) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= RATE_SIZE;

      beatAvg = 0;
      for (byte x = 0; x < RATE_SIZE; x++) {
        beatAvg += rates[x];
      }
      beatAvg /= RATE_SIZE;
    }
  }

  // Display on OLED
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_ncenB10_tr);
  u8g2.drawStr(0, 15, "Health Monitor");

  if (irValue > 50000) {
    char bpmStr[20];
    sprintf(bpmStr, "HR: %d BPM", beatAvg);
    u8g2.drawStr(0, 35, bpmStr);

    u8g2.setFont(u8g2_font_ncenB08_tr);
    if (beatAvg < 60) {
      u8g2.drawStr(0, 55, "Status: Low");
    } else if (beatAvg <= 100) {
      u8g2.drawStr(0, 55, "Status: Normal");
    } else {
      u8g2.drawStr(0, 55, "Status: Elevated");
    }
  } else {
    u8g2.setFont(u8g2_font_ncenB08_tr);
    u8g2.drawStr(0, 35, "Insert finger");
  }

  u8g2.sendBuffer();
  delay(100);
}
```

### Fitness Zone Tracker

```cpp
const int maxHeartRate = 185;  // 220 - age
const int zone1Min = (int)(maxHeartRate * 0.50);  // 50%
const int zone2Min = (int)(maxHeartRate * 0.60);  // 60%
const int zone3Min = (int)(maxHeartRate * 0.70);  // 70%
const int zone4Min = (int)(maxHeartRate * 0.80);  // 80%

void displayZone(int heartRate) {
  Serial.print("Heart Rate: ");
  Serial.print(heartRate);
  Serial.print(" BPM | Zone: ");

  if (heartRate < zone1Min) {
    Serial.println("Resting");
  } else if (heartRate < zone2Min) {
    Serial.println("1 - Warm Up");
  } else if (heartRate < zone3Min) {
    Serial.println("2 - Fat Burn");
  } else if (heartRate < zone4Min) {
    Serial.println("3 - Cardio");
  } else {
    Serial.println("4 - Peak");
  }
}
```

## SpO2 Interpretation

Blood oxygen saturation levels:

| SpO2 Range | Status   | Action                              |
| ---------- | -------- | ----------------------------------- |
| 95-100%    | Normal   | Healthy range                       |
| 90-94%     | Low      | Monitor, may need medical attention |
| 85-89%     | Very Low | Seek medical attention              |
| < 85%      | Critical | Emergency medical care              |

**Factors Affecting SpO2:**

- Altitude (lower at high elevation)
- Lung conditions (asthma, COPD)
- Anemia
- Poor circulation
- Nail polish (interferes with reading)
- Cold fingers

## Heart Rate Interpretation

| Heart Rate  | Category    | Population                           |
| ----------- | ----------- | ------------------------------------ |
| < 60 BPM    | Bradycardia | Athletes, trained individuals        |
| 60-100 BPM  | Normal      | General population at rest           |
| 100-120 BPM | Elevated    | Light activity, stress               |
| > 120 BPM   | Tachycardia | Exercise, anxiety, medical condition |

## Measurement Tips

**For Accurate Readings:**

- ✅ Insert finger fully into clip
- ✅ Keep hand at heart level
- ✅ Stay still for 10-15 seconds
- ✅ Relax and breathe normally
- ✅ Ensure warm fingers (cold reduces accuracy)
- ✅ Remove nail polish (blocks LEDs)
- ✅ Clean sensor window periodically

**Avoid:**

- ❌ Moving during measurement
- ❌ Talking or coughing
- ❌ Pressing finger too hard
- ❌ Cold or poorly circulated fingers
- ❌ Bright ambient light on sensor
- ❌ Dirty sensor window

## MAX30102 Advantages

Compared to simple photoelectric sensors:

| Feature             | MAX30102                  | Simple Sensors    |
| ------------------- | ------------------------- | ----------------- |
| **Measurements**    | HR + SpO2                 | HR only           |
| **Accuracy**        | High (medical-grade chip) | Moderate          |
| **Interface**       | I2C (digital)             | Analog pulse      |
| **Processing**      | On-chip algorithms        | Software required |
| **Noise rejection** | Excellent                 | Basic             |
| **Cost**            | Higher                    | Lower             |

## Power Management

The MAX30102 has low-power modes:

```cpp
// Put sensor in low-power mode
particleSensor.shutDown();

// Wake up sensor
particleSensor.wakeUp();
```

Typical power consumption:

- Active (LEDs on): ~50mA
- Active (LEDs off): ~600µA
- Shutdown: ~0.7µA

## Safety and Medical Disclaimer

**⚠️ NOT A MEDICAL DEVICE:**

- For educational and hobby use only
- Not FDA approved or clinically validated
- Do not use for medical diagnosis
- Not suitable for clinical decision-making
- Consult healthcare professional for medical concerns

**If experiencing abnormal readings:**

- Chest pain, severe shortness of breath
- Irregular heartbeat, dizziness
- SpO2 persistently < 90%
  → **Seek immediate medical attention**

## Integration Examples

See [integration recipes](../../integrations/) for projects combining finger-clip heart rate sensor with:

- OLED display (health dashboard)
- Buzzer (abnormal reading alarm)
- Data logging (fitness tracking)
- LED (heart rate zone indicator)

## Additional Resources

- [MAX30102 Datasheet](https://datasheets.maximintegrated.com/en/ds/MAX30102.pdf)
- [Pulse Oximetry Guide](https://en.wikipedia.org/wiki/Pulse_oximetry)
- [Target Heart Rate Calculator](https://www.heart.org/en/healthy-living/fitness/fitness-basics/target-heart-rates)

---

**Source Verification Date:** 2025-11-17  
**Seeed Wiki Last Checked:** 2025-11-17  
**⚠️ DISCLAIMER:** Not a medical device - for educational use only!
