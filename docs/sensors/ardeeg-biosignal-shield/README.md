# ardEEG Biosignal Shield for Arduino UNO R4 WiFi

**Last Verified:** 2025-11-18  
**Reference:** https://github.com/pieeg-club/ardEEG  
**Product Page:** https://pieeg.com/ardeeg/  
**Connection Type:** SPI (Shield)

## Overview

The ardEEG is an Arduino UNO R4 WiFi shield designed to measure biosignals including EEG (electroencephalography), EMG (electromyography), and ECG (electrocardiography). Features 8-channel biosignal acquisition with 24-bit resolution, wireless data transmission via WiFi, and complete galvanic isolation requirements. Ideal for brain-computer interface research, biosignal education, neurofeedback experiments, and physiological monitoring projects.

## Authoritative References

- [ardEEG GitHub Repository](https://github.com/pieeg-club/ardEEG)
- [PiEEG Official Website](https://pieeg.com/)
- [LinkedIn Updates](https://www.linkedin.com/company/96475004/admin/feed/posts/)
- [Research Paper](https://doi.org/10.20944/preprints202405.1643.v1) - Rakhmatulin, I. "Low-Cost Shield ardEEG to Measure EEG with Arduino Uno R4 WiFi"
- [Video Tutorial](https://youtu.be/s_5mDDUFp6E)
- [Colab Manual](https://colab.research.google.com/drive/1xW6fwzVdLH83zHoorjeWai6SdZoOanfA)

## Hardware Setup

- **Connection Type:** Shield (plugs directly onto Arduino UNO R4 WiFi)
- **Interface:** SPI
- **SPI Pins Used:**
  - MISO (Pin 12)
  - MOSI (Pin 11)
  - SCK (Pin 13)
  - CS (Pin 10)
  - DRDY (Pin 5)
  - Button (Pin 7)
- **Channels:** 8 biosignal input channels
- **Resolution:** 24-bit ADC
- **Sample Rate:** 250 SPS (samples per second)
- **Input Range:** ±4.5V (programmable gain)
- **Input Impedance:** >100 MΩ
- **Operating Voltage:** 5V (BATTERY ONLY - see safety warnings)
- **Current Draw:** ~200mA active
- **Electrode System:** International 10-20 system compatible
- **Wireless:** WiFi (Arduino R4 WiFi integrated)
- **Electrode Types:** Wet gel or dry electrodes supported

![ardEEG Shield](images/ard_EEG_general.png)

![ardEEG Detailed](images/ardeeg.png)

## Safety Warnings

> **⚠️ CRITICAL SAFETY REQUIREMENTS:**
>
> 1. **BATTERY POWER ONLY** - Device MUST operate from 5V battery power ONLY
> 2. **NO MAINS CONNECTION** - Complete galvanic isolation from mains power required
> 3. **NO USB POWER** - Device MUST NOT be connected to USB during biosignal measurement
> 4. **NOT A MEDICAL DEVICE** - Not certified for medical/clinical/diagnostic use
> 5. **USE AT OWN RISK** - You are fully responsible for safe use
> 6. **ENGINEERING USE ONLY** - Designed for development/demonstration/evaluation
> 7. **EXPOSED ELECTRONICS** - Internal components exposed, handle with anti-static precautions
> 8. **NO PATIENT ISOLATION** - No medical-grade patient isolation circuitry

## Device Pinout

The shield connects to Arduino UNO R4 WiFi at the following SPI pins:

![SPI Pinout](images/spi.png)

**Key Connections:**

- **Pin 10:** Chip Select (CS)
- **Pin 11:** MOSI (Master Out Slave In)
- **Pin 12:** MISO (Master In Slave Out)
- **Pin 13:** SCK (Clock)
- **Pin 5:** DRDY (Data Ready)
- **Pin 7:** Button input
- **Power:** 5V and GND from battery

## Electrode Placement

Electrodes should be positioned according to the International 10-20 system:

![Electrode Placement](images/genereal.jpg)

**Common Electrode Positions:**

- **Fz:** Frontal midline (alpha rhythm detection)
- **Cz:** Central midline (motor imagery)
- **Pz:** Parietal midline (visual processing)
- **O1/O2:** Occipital (visual cortex)
- **T3/T4:** Temporal (auditory processing)

![Connection Diagram](images/connections2.bmp)

## Software Prerequisites

The ardEEG uses native SPI communication and WiFi UDP. No additional libraries required beyond standard Arduino libraries.

**Required Libraries (built-in):**

- WiFi.h (Arduino UNO R4 WiFi)
- WiFiUdp.h
- SPI.h

**Python Requirements (for data reception):**

- Python 3.x
- NumPy
- Matplotlib
- SciPy (for filtering)

Install Python dependencies:

```bash
pip install numpy matplotlib scipy
```

## Example Code

### Basic WiFi Data Transmission

```cpp
/*
  Purpose: Transmit 8-channel biosignal data via WiFi UDP
  Notes:
    1. MUST be powered by 5V battery ONLY
    2. NO USB connection during measurement
    3. Configure WiFi SSID and password
    4. Set receiver IP address
    5. Data transmitted via UDP port 13900
  Author: ardEEG Team / PiEEG
  Source: https://github.com/pieeg-club/ardEEG
*/

#include <WiFi.h>
#include <WiFiUdp.h>
#include <SPI.h>

// Pin definitions
const int button_pin = 7;
const int chip_select = 10;
int test_DRDY = 5;
int button_state = 0;
const int size_of_data = 1350;
byte output[size_of_data] = {};

// WiFi configuration - CHANGE THESE
char ssid[] = "YourWiFiName";
char pass[] = "YourPassword";
WiFiUDP udp;

void sendCommand(byte command) {
  SPI.transfer(command);
}

void writeByte(byte registers, byte data) {
  char spi_data = 0x40 | registers;
  char spi_data_array[3];
  spi_data_array[0] = spi_data;
  spi_data_array[1] = 0x00;
  spi_data_array[2] = data;
  SPI.transfer(spi_data_array, 3);
}

void setup() {
  // Configure pins
  pinMode(button_pin, INPUT);
  pinMode(chip_select, OUTPUT);

  // Initialize SPI
  digitalWrite(chip_select, LOW);
  SPI.begin();
  SPI.beginTransaction(SPISettings(600000, MSBFIRST, SPI_MODE1));

  // Wake up and reset ADC
  sendCommand(0x02); // wakeup
  sendCommand(0x0A); // stop
  sendCommand(0x06); // reset
  sendCommand(0x11); // sdatac

  // Configure ADC registers
  writeByte(0x01, 0x96);
  writeByte(0x02, 0xD4);
  writeByte(0x03, 0xFF);
  writeByte(0x04, 0x00);
  writeByte(0x0D, 0x00);
  writeByte(0x0E, 0x00);
  writeByte(0x0F, 0x00);
  writeByte(0x10, 0x00);
  writeByte(0x11, 0x00);
  writeByte(0x15, 0x20);
  writeByte(0x17, 0x00);
  writeByte(0x05, 0x00);
  writeByte(0x06, 0x00);
  writeByte(0x07, 0x00);
  writeByte(0x08, 0x00);
  writeByte(0x09, 0x00);
  writeByte(0x0A, 0x00);
  writeByte(0x0B, 0x00);
  writeByte(0x0C, 0x00);
  writeByte(0x14, 0x80);

  // Start continuous conversion
  sendCommand(0x10);
  sendCommand(0x08);

  // Initialize WiFi
  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  udp.begin(13900);
}

int sc = 0;

void loop() {
  button_state = digitalRead(button_pin);

  if (button_state == HIGH) {
    test_DRDY = 10;
  }

  if (test_DRDY == 10 && button_state == LOW) {
    test_DRDY = 0;

    // Read 27 bytes per sample (8 channels × 3 bytes + status)
    for (int i = 0; i < 27; i++) {
      output[sc] = SPI.transfer(0xFF);
      sc++;
    }

    // Send packet when buffer full
    if (sc == size_of_data) {
      udp.beginPacket("192.168.1.241", 13900); // CHANGE IP
      udp.write(output, sc);
      udp.endPacket();
      sc = 0;
    }
  }
}
```

### Serial Data Output for Testing

```cpp
/*
  Purpose: Output biosignal data to Serial for testing
  Notes:
    1. Use for debugging and verification
    2. MUST use battery power during actual measurements
    3. USB can be used for testing without electrodes
*/

#include <SPI.h>

const int chip_select = 10;
const int button_pin = 7;

void sendCommand(byte command) {
  SPI.transfer(command);
}

void writeByte(byte registers, byte data) {
  char spi_data = 0x40 | registers;
  char spi_data_array[3];
  spi_data_array[0] = spi_data;
  spi_data_array[1] = 0x00;
  spi_data_array[2] = data;
  SPI.transfer(spi_data_array, 3);
}

void setup() {
  Serial.begin(115200);
  pinMode(button_pin, INPUT);
  pinMode(chip_select, OUTPUT);

  digitalWrite(chip_select, LOW);
  SPI.begin();
  SPI.beginTransaction(SPISettings(600000, MSBFIRST, SPI_MODE1));

  // Initialize ADC
  sendCommand(0x02); // wakeup
  sendCommand(0x0A); // stop
  sendCommand(0x06); // reset
  sendCommand(0x11); // sdatac

  // Configure for 8 channels
  writeByte(0x01, 0x96);
  writeByte(0x02, 0xD4);
  writeByte(0x03, 0xFF);

  // Start conversion
  sendCommand(0x10);
  sendCommand(0x08);

  Serial.println("ardEEG Serial Output Ready");
}

void loop() {
  if (digitalRead(button_pin) == LOW) {
    // Read all 8 channels (27 bytes)
    byte data[27];
    for (int i = 0; i < 27; i++) {
      data[i] = SPI.transfer(0xFF);
    }

    // Parse and display channels
    for (int ch = 0; ch < 8; ch++) {
      int offset = ch * 3 + 3; // Skip 3 status bytes
      int32_t value = ((int32_t)data[offset] << 16) |
                      ((int32_t)data[offset + 1] << 8) |
                      data[offset + 2];

      // Sign extend 24-bit to 32-bit
      if (value & 0x800000) {
        value |= 0xFF000000;
      }

      Serial.print("CH");
      Serial.print(ch);
      Serial.print(": ");
      Serial.print(value);
      Serial.print(" | ");
    }
    Serial.println();
    delay(10);
  }
}
```

### Alpha Wave Detection (Eyes Open/Closed)

```cpp
/*
  Purpose: Detect alpha wave changes (8-12 Hz) when eyes close
  Notes:
    1. Place electrode at Fz (frontal midline)
    2. Reference electrode on earlobe
    3. Ground electrode on forehead
    4. Close eyes to increase alpha activity
*/

#include <WiFi.h>
#include <WiFiUdp.h>
#include <SPI.h>

const int button_pin = 7;
const int chip_select = 10;
const int led_pin = LED_BUILTIN;

char ssid[] = "YourWiFi";
char pass[] = "YourPassword";
WiFiUDP udp;

// Simple alpha detection threshold
const int ALPHA_THRESHOLD = 1000;
int alpha_count = 0;

void setup() {
  Serial.begin(115200);
  pinMode(button_pin, INPUT);
  pinMode(chip_select, OUTPUT);
  pinMode(led_pin, OUTPUT);

  // Initialize SPI and ADC (same as previous examples)
  digitalWrite(chip_select, LOW);
  SPI.begin();
  SPI.beginTransaction(SPISettings(600000, MSBFIRST, SPI_MODE1));

  // ADC initialization commands...
  // (use same initialization as WiFi example)

  WiFi.begin(ssid, pass);
  udp.begin(13900);

  Serial.println("Alpha Wave Monitor");
  Serial.println("Close eyes to increase alpha activity");
}

void loop() {
  if (digitalRead(button_pin) == LOW) {
    byte data[27];
    for (int i = 0; i < 27; i++) {
      data[i] = SPI.transfer(0xFF);
    }

    // Get channel 0 value
    int offset = 3;
    int32_t value = ((int32_t)data[offset] << 16) |
                    ((int32_t)data[offset + 1] << 8) |
                    data[offset + 2];

    // Simple amplitude detection
    if (abs(value) > ALPHA_THRESHOLD) {
      alpha_count++;
    } else {
      alpha_count = 0;
    }

    // Light LED when alpha detected
    if (alpha_count > 10) {
      digitalWrite(led_pin, HIGH);
      Serial.println("Alpha activity detected!");
    } else {
      digitalWrite(led_pin, LOW);
    }
  }
}
```

### Artifact Detection (Blink/Chew)

```cpp
/*
  Purpose: Detect eye blinks and chewing artifacts
  Notes:
    1. Artifacts show as large amplitude signals
    2. Useful for signal quality monitoring
    3. Can be used to reject noisy data
*/

#include <SPI.h>

const int chip_select = 10;
const int button_pin = 7;
const int ARTIFACT_THRESHOLD = 5000;

void setup() {
  Serial.begin(115200);
  pinMode(button_pin, INPUT);
  pinMode(chip_select, OUTPUT);

  // Initialize SPI and ADC
  digitalWrite(chip_select, LOW);
  SPI.begin();
  SPI.beginTransaction(SPISettings(600000, MSBFIRST, SPI_MODE1));

  // Standard initialization
  // (same as previous examples)

  Serial.println("Artifact Detection Monitor");
  Serial.println("Blink or chew to test");
}

void loop() {
  if (digitalRead(button_pin) == LOW) {
    byte data[27];
    for (int i = 0; i < 27; i++) {
      data[i] = SPI.transfer(0xFF);
    }

    // Check all channels for artifacts
    bool artifact_detected = false;

    for (int ch = 0; ch < 8; ch++) {
      int offset = ch * 3 + 3;
      int32_t value = ((int32_t)data[offset] << 16) |
                      ((int32_t)data[offset + 1] << 8) |
                      data[offset + 2];

      if (value & 0x800000) {
        value |= 0xFF000000;
      }

      if (abs(value) > ARTIFACT_THRESHOLD) {
        artifact_detected = true;
        Serial.print("ARTIFACT on CH");
        Serial.print(ch);
        Serial.print(": ");
        Serial.println(value);
      }
    }

    if (!artifact_detected) {
      Serial.println("Signal clean");
    }

    delay(100);
  }
}
```

### EMG Muscle Activity Monitor

```cpp
/*
  Purpose: Monitor muscle activity (EMG)
  Notes:
    1. Place electrodes on muscle belly
    2. Reference electrode on nearby bone
    3. Contract muscle to see activity
*/

#include <SPI.h>

const int chip_select = 10;
const int button_pin = 7;
const int EMG_THRESHOLD = 2000;

int emg_count = 0;
const int SAMPLE_WINDOW = 50;
int32_t samples[SAMPLE_WINDOW];
int sample_index = 0;

void setup() {
  Serial.begin(115200);
  pinMode(button_pin, INPUT);
  pinMode(chip_select, OUTPUT);

  // Initialize SPI and ADC
  digitalWrite(chip_select, LOW);
  SPI.begin();
  SPI.beginTransaction(SPISettings(600000, MSBFIRST, SPI_MODE1));

  Serial.println("EMG Activity Monitor");
  Serial.println("Contract muscle to test");
}

void loop() {
  if (digitalRead(button_pin) == LOW) {
    byte data[27];
    for (int i = 0; i < 27; i++) {
      data[i] = SPI.transfer(0xFF);
    }

    // Get channel 0 (EMG electrode)
    int offset = 3;
    int32_t value = ((int32_t)data[offset] << 16) |
                    ((int32_t)data[offset + 1] << 8) |
                    data[offset + 2];

    if (value & 0x800000) {
      value |= 0xFF000000;
    }

    // Store in sample buffer
    samples[sample_index] = abs(value);
    sample_index = (sample_index + 1) % SAMPLE_WINDOW;

    // Calculate RMS (root mean square)
    int64_t sum = 0;
    for (int i = 0; i < SAMPLE_WINDOW; i++) {
      sum += samples[i] * samples[i];
    }
    int32_t rms = sqrt(sum / SAMPLE_WINDOW);

    // Detect muscle contraction
    if (rms > EMG_THRESHOLD) {
      Serial.print("MUSCLE ACTIVE - RMS: ");
      Serial.println(rms);
    } else {
      Serial.print("Relaxed - RMS: ");
      Serial.println(rms);
    }

    delay(50);
  }
}
```

**Key Points:**

- Shield plugs directly onto Arduino UNO R4 WiFi
- MUST use 5V battery power (NO USB/mains during measurement)
- 8 channels, 24-bit resolution, 250 SPS
- Wireless data via WiFi UDP
- International 10-20 electrode placement
- NOT a medical device

## Testing Procedure

1. **Initial Setup:**

   - Connect ardEEG shield to Arduino UNO R4 WiFi
   - Upload test sketch (can use USB temporarily)
   - Verify SPI communication working

2. **Safety Check:**

   - Disconnect USB completely
   - Connect 5V battery pack
   - Verify no mains connection exists
   - Check all connections secure

3. **Electrode Preparation:**

   - Clean skin with alcohol wipe
   - Apply electrode gel (for wet electrodes)
   - Place electrodes per 10-20 system
   - Ensure good contact (impedance check)

4. **Alpha Wave Test:**

   - Place Fz electrode (frontal)
   - Reference on earlobe, ground on forehead
   - Open eyes: Low alpha (8-12 Hz)
   - Close eyes: High alpha activity

5. **Artifact Test:**

   - Blink eyes rapidly: Should see large spikes
   - Chew: Should see rhythmic artifacts
   - Verify artifact detection working

6. **Data Reception:**
   - Run Python receiver script on PC
   - Verify WiFi connection stable
   - Check data packets arriving
   - Monitor signal quality

## Troubleshooting

| Problem              | Solution                                                                          |
| -------------------- | --------------------------------------------------------------------------------- |
| No SPI communication | Check shield seated properly, verify pin connections, check chip_select pin       |
| No WiFi connection   | Verify SSID/password, check WiFi strength, ensure R4 WiFi board used              |
| All channels zero    | Check ADC power, verify SPI initialization, check DRDY pin                        |
| Noisy signals        | Check electrode contact, use electrode gel, ground properly, check battery        |
| No alpha detection   | Relax, close eyes completely, check electrode placement (Fz), increase gain       |
| Artifacts everywhere | Reduce muscle tension, check electrode impedance, move away from electrical noise |
| Python not receiving | Check IP address matches, verify UDP port 13900, check firewall settings          |
| Shield gets hot      | Normal operation, ensure adequate ventilation, check battery voltage (5V)         |

## Technical Specifications

**Biosignal Acquisition:**

- **Channels:** 8 differential inputs
- **Resolution:** 24-bit ADC
- **Sample Rate:** 250 SPS (samples per second)
- **Input Range:** ±4.5V (programmable)
- **Input Impedance:** >100 MΩ
- **CMRR:** >110 dB
- **Gain:** Programmable (1x to 12x typical)

**Signal Types Supported:**

- **EEG:** Electroencephalography (brain waves)
- **EMG:** Electromyography (muscle activity)
- **ECG:** Electrocardiography (heart signals)
- **EOG:** Electrooculography (eye movement)

**EEG Frequency Bands:**

- **Delta:** 0.5-4 Hz (deep sleep)
- **Theta:** 4-8 Hz (drowsiness)
- **Alpha:** 8-12 Hz (relaxation, eyes closed)
- **Beta:** 12-30 Hz (active thinking)
- **Gamma:** >30 Hz (cognitive processing)

**Interface:**

- **SPI:** 600 kHz clock
- **WiFi:** 802.11 b/g/n (via Arduino R4 WiFi)
- **Data Protocol:** UDP packets on port 13900
- **Packet Size:** 1350 bytes (50 samples × 27 bytes)

**Power:**

- **Operating Voltage:** 5V DC (BATTERY ONLY)
- **Current:** ~200mA typical
- **Battery Life:** ~10 hours (2000mAh battery)
- **Power Connector:** Via Arduino shield pins

**Physical:**

- **Form Factor:** Arduino UNO shield
- **Dimensions:** 68mm × 53mm (UNO footprint)
- **Weight:** ~30g
- **Electrode Connectors:** Standard snap connectors (8 channels + ref + ground)

**Environmental:**

- **Operating Temp:** 0°C to 40°C
- **Storage Temp:** -20°C to 60°C
- **Humidity:** 20% to 80% non-condensing

**Electrodes:**

- **Type:** Wet gel or dry electrodes
- **System:** International 10-20 placement
- **Connector:** Standard EEG snap connectors
- **Impedance:** <10 kΩ recommended

## Datasets and Examples

The original repository includes example datasets:

- **Alpha Detection:** [Dataset](https://github.com/Ildaron/ardEEG/tree/main/dataset/alpha) - Eyes open vs. closed
- **Artifact Detection:** [Dataset](https://github.com/Ildaron/ardEEG/tree/main/dataset/artefacts) - Blinks and chewing

Example signal characteristics:

**Alpha Test Results:**

- Eyes open: Low 8-12 Hz activity
- Eyes closed: 2-3× increase in alpha band
- Most prominent at Fz electrode

![Alpha Test](images/aplha.bmp)

**Artifact Test Results:**

- Blink artifacts: 100-200 µV amplitude
- Chew artifacts: Rhythmic 50-100 µV
- Both clearly distinguishable from EEG

![Blink Test](images/blink.bmp)

**8-Channel Example:**

![8 Channel Graph](images/graph.jpg)

## Signal Processing

### Basic Filtering (Python)

```python
import numpy as np
from scipy import signal

def bandpass_filter(data, lowcut, highcut, fs, order=4):
    """
    Apply bandpass filter to EEG data

    Args:
        data: Raw EEG signal
        lowcut: Low frequency cutoff (Hz)
        highcut: High frequency cutoff (Hz)
        fs: Sample rate (250 Hz for ardEEG)
        order: Filter order

    Returns:
        Filtered signal
    """
    nyquist = 0.5 * fs
    low = lowcut / nyquist
    high = highcut / nyquist
    b, a = signal.butter(order, [low, high], btype='band')
    filtered = signal.filtfilt(b, a, data)
    return filtered

# Example: Extract alpha band (8-12 Hz)
fs = 250  # Sample rate
eeg_data = np.array([...])  # Your EEG data
alpha = bandpass_filter(eeg_data, 8, 12, fs)

# Example: Remove 50/60 Hz power line noise
notch_freq = 50  # or 60 for US
Q = 30  # Quality factor
b, a = signal.iirnotch(notch_freq, Q, fs)
clean_data = signal.filtfilt(b, a, eeg_data)
```

### Real-Time Alpha Detection (Python)

```python
import socket
import numpy as np
from scipy import signal
import matplotlib.pyplot as plt

# UDP receiver
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind(('0.0.0.0', 13900))

# Filter setup
fs = 250
alpha_filter = signal.butter(4, [8, 12], btype='band', fs=fs, output='sos')

buffer = []

while True:
    data, addr = sock.recvfrom(2048)

    # Parse 8 channels from packet
    for i in range(0, len(data), 27):
        sample = data[i:i+27]
        if len(sample) == 27:
            # Extract channel 0
            ch0 = int.from_bytes(sample[3:6], 'big', signed=True)
            buffer.append(ch0)

    # Process when buffer full
    if len(buffer) >= 250:  # 1 second of data
        # Apply alpha filter
        alpha = signal.sosfilt(alpha_filter, buffer[-250:])

        # Calculate alpha power
        alpha_power = np.mean(alpha ** 2)

        print(f"Alpha Power: {alpha_power:.2f}")

        if alpha_power > 1000000:
            print("Eyes closed - Alpha detected!")
        else:
            print("Eyes open - Low alpha")
```

## Common Use Cases

### Neurofeedback Training

Train users to control brain wave patterns through real-time feedback (audio/visual cues based on alpha/beta ratio).

### Brain-Computer Interface (BCI)

Control devices using brain signals (motor imagery, P300 event-related potentials, SSVEP).

### Sleep Stage Detection

Monitor delta/theta waves to detect sleep stages and create sleep quality reports.

### Muscle Activity Monitoring

Measure EMG signals for prosthetic control, rehabilitation monitoring, or gesture recognition.

### Cognitive Load Assessment

Measure beta/gamma activity to assess mental workload during tasks or learning.

### Heart Rate Monitoring (ECG)

Measure heart signals for heart rate variability (HRV) analysis and stress assessment.

## Integration Examples

See [integration recipes](../../integrations/) for projects combining ardEEG with:

- OLED display (real-time signal visualization)
- Buzzer (neurofeedback audio cues)
- LED (visual feedback for alpha training)
- WiFi (wireless data streaming to PC)

## Additional Resources

- [Original Repository](https://github.com/pieeg-club/ardEEG) - Full source code and datasets
- [PiEEG Website](https://pieeg.com/) - Product information and updates
- [Research Paper](https://doi.org/10.20944/preprints202405.1643.v1) - Technical validation
- [Video Tutorial](https://youtu.be/s_5mDDUFp6E) - Hardware demonstration
- [Colab Manual](https://colab.research.google.com/drive/1xW6fwzVdLH83zHoorjeWai6SdZoOanfA) - Interactive guide
- [International 10-20 System](<https://en.wikipedia.org/wiki/10%E2%80%9320_system_(EEG)>) - Electrode placement guide

## License

This sensor documentation is based on the [ardEEG project](https://github.com/pieeg-club/ardEEG) which is licensed under the MIT License for software and SDK. Hardware and device usage subject to [PiEEG liability terms](https://pieeg.com/liability-pieeg/).

**Local copies of original materials are stored in:**

- `images/` - Device images and diagrams
- `examples/` - Arduino example sketches
- `ORIGINAL_README.md` - Original repository README
- `license.txt` - Full license and liability information

---

**Source Verification Date:** 2025-11-18  
**Repository Last Checked:** 2025-11-18  
**Safety Reminder:** BATTERY POWER ONLY - Complete galvanic isolation from mains required! This is NOT a medical device!
