# Knowledge Base Refactor Plan

**Last Updated:** 2025-11-18  
**Status:** IN PROGRESS - 49/101 sensors documented (48.5%)

## 1. Goals and Constraints

- Provide students with accurate, Seeed-authoritative Arduino Grove sensor guidance.
- Ensure every helper response cites the latest Seeed wiki and GitHub library sources.
- Keep material classroom friendly: wiring, code, troubleshooting, and integration recipes.
- Maintain a living knowledge base: detect dead links quickly, request replacements from instructor, and schedule refreshes.

**Achievement Status:**

- ✅ DevContainer setup complete (Ubuntu 24.04, Arduino CLI, VS Code extensions)
- ✅ Documentation structure established (docs/, sensors/, integrations/, libraries/, howto/, resources/)
- ✅ Sensor guide template standardized (~300-400 lines, 6-7 examples per guide)
- 🔄 Systematic sensor documentation in progress (49/101 complete)
- ✅ All guides cite Seeed wiki with verification dates
- ✅ Link validation system in place (dead-links.md)

## 2. Repository Restructure ✅ COMPLETE

1. ✅ Created top-level `docs/` directory
2. ✅ Created subdirectories:
   - `docs/README.md`: Overview, usage, Copilot integration ✅
   - `docs/sensors/`: 49 sensor folders with comprehensive guides ✅
   - `docs/integrations/`: 2 recipes (challenge-01-auto-led, challenge-05-boom-gate) ✅
   - `docs/libraries/`: index.md with 25+ Seeed libraries documented ✅
   - `docs/howto/`: copilot-questions.md workflow guide ✅
   - `docs/resources/`: sensor-inventory.md (101 sensors), dead-links.md, CHANGELOG.md ✅
3. ✅ Preserved `OLD DOCS/` with \_MOVED_TO_DOCS.md redirect

## 3. Source Acquisition

1. Mirror the latest Seeed docs into the repo (read-only snapshot):
   - Add Git submodules or scheduled pull scripts for `https://github.com/Seeed-Studio/wiki-documents` (docs) and the relevant sensor library repos under `https://github.com/Seeed-Studio`.
   - Store fetched content under `external/seeed/` (e.g., `external/seeed/wiki-documents`).
2. Automate updates with a script:
   - `scripts/update-seeed.sh` to `git pull` each submodule and record the commit hash in `docs/resources/CHANGELOG.md`.
   - Run script monthly or when Seeed announces updates.
3. During each update run, scan for removed or changed URLs; when a link 404s, flag it in `docs/resources/dead-links.md` and ask the instructor for the correct link before publishing changes.

## 4. Sensor Guide Template ✅ STANDARDIZED

**Template Structure (300-400 lines per guide):**

1. ✅ Header with verification date and Seeed wiki/library links
2. ✅ Overview and use cases
3. ✅ "Authoritative References" section with Seeed wiki, GitHub, datasheet links
4. ✅ Hardware setup: Grove port type, IC specifications, power requirements, wiring
5. ✅ Software prerequisites: Library installation (Arduino CLI + manual methods)
6. ✅ 6-7 complete working code examples with comprehensive comments
7. ✅ Testing procedure (step-by-step validation)
8. ✅ Troubleshooting table (problem/solution format)
9. ✅ Technical specifications (detailed IC specs, electrical, environmental)
10. ✅ Common use cases with code snippets
11. ✅ Integration examples (cross-references to other sensors)
12. ✅ Additional resources (datasheets, tutorials)

**Quality Standards:**

- All guides verified against Seeed wiki as of 2025-11-18
- Every guide includes safety warnings where applicable (high voltage, lasers, medical disclaimers)
- Code examples tested for Arduino Uno R4 WiFi (14-bit ADC, 5V logic)
- Troubleshooting tables address common student issues
- Technical specs include power consumption analysis

**Completed Sensor Categories:**

1. ✅ **Base Kit (13/13):** button, rotary-potentiometer, led, buzzer, light-sensor, sound-sensor, temperature-humidity (DHT20), air-pressure (BMP280), ultrasonic-ranger, 3-axis-accelerometer (LIS3DHTR), line-finder, oled-display, servo

2. ✅ **Challenge-Critical (3/3):** relay, gesture (PAJ7620), magnetic-switch

3. ✅ **Environmental (7/7):** infrared-temperature (MLX90615), air-quality (TP-401A), water-sensor, gas-sensor-mq9, dust-sensor (PPD42NS), flame-sensor (YG1006), soil-moisture

4. ✅ **Biomedical (5/5):** ear-clip-heart-rate, finger-heart-rate (MAX30102), gsr-sensor, 3-axis-digital-accelerometer-bma400, alcohol-sensor-mq3

5. ✅ **Motion/Space (9/9):** mini-pir-motion, adjustable-pir-motion, collision-sensor, time-of-flight-vl53l0x, 6-axis-accelerometer-gyroscope (LSM6DS3), 3-axis-compass (BMM150), vibration-sensor (SW-420)

6. ✅ **Output Devices - Display Systems (4/4):** 4-digit-display (TM1637), led-bar-v2 (MY9221), led-matrix-8x8 (HT16K33), lcd-16x2 (I2C RGB backlight)

7. ✅ **Output Devices - Actuators (4/4):** vibration-motor, speaker, rgb-led-strip-ws2813, led-strip-driver

8. ✅ **Input Sensors - User Interface (5/5):** loudness-sensor (electret mic), i2c-color-sensor (TCS3414CS), joystick, 12-channel-touch-mpr121, thermal-camera-mlx90621 (16×4 IR array)

**Remaining Categories (52 sensors):**

- Electrical Components: electromagnet, electricity-sensor, I2C hub, screw terminal, connectors
- Additional sensors from inventory (see docs/resources/sensor-inventory.md)

## 5. Integration Recipes 🔄 IN PROGRESS (2/8)

**Completed Recipes:**

1. ✅ **challenge-01-auto-led:** Light sensor + LED (automatic street light)
2. ✅ **challenge-05-boom-gate:** Ultrasonic ranger + Servo (automatic boom gate)

**Pending Recipes (all sensors documented and ready):** 3. ⏳ **challenge-02-weather-station:** Temperature/humidity + Air pressure + OLED display 4. ⏳ **challenge-03-thunderstorm-alarm:** Temperature/humidity + Air pressure + Buzzer + LED 5. ⏳ **challenge-04-clap-lamp:** Loudness sensor + Relay + LED 6. ⏳ **challenge-06-auto-bin:** Gesture sensor + Servo (touchless trash can) 7. ⏳ **challenge-07-door-alarm:** Magnetic switch + Buzzer + LED (security system) 8. ⏳ **challenge-08-metronome:** Button + Rotary potentiometer + Buzzer + OLED

**Recipe Template:**

- Scenario description aligned with curriculum challenge
- Required modules + links to their sensor guides
- Wiring connections (Grove ports specified)
- Step-by-step build instructions
- Complete working code with comments
- Testing steps and troubleshooting
- Extensions/challenges for advanced students

## 6. Library Catalog ✅ COMPLETE

**Status:** `docs/libraries/index.md` documents 25+ Seeed Arduino libraries

**Libraries Documented:**

- Grove_Temperature_And_Humidity_Sensor (DHT20)
- Grove_BMP280 (air pressure)
- Seeed_Arduino_Ultrasonic_Ranger
- Seeed_Arduino_LIS3DHTR (3-axis accelerometer)
- U8g2 (OLED displays)
- Servo (standard Arduino)
- Adafruit_MLX90615 (infrared temperature)
- Grove_Air_Quality_Sensor_Library (TP-401A)
- Seeed_Arduino_LSM6DS3 (6-axis IMU)
- Seeed_Arduino_BMM150 (compass)
- Sparkfun_VL53L0X (time-of-flight)
- RevEng_PAJ7620 (gesture sensor)
- DFRobot_Heartrate (MAX30102)
- Grove_4Digital_Display (TM1637)
- Grove_LED_Bar (MY9221)
- Adafruit_GFX, Adafruit_LEDBackpack (8×8 matrix)
- LiquidCrystal_I2C (16×2 LCD)
- FastLED (WS2813 addressable LEDs)
- GroveColorSensor (TCS3414CS)
- Adafruit_MPR121 (12-channel touch)
- Seeed_Thermal_Camera_MLX9064x (thermal imaging)

**Each Entry Includes:**

- GitHub repository link
- Installation commands (Arduino CLI + manual)
- Key classes and methods
- Compatibility notes
- Dependencies
- Example usage

## 7. Student-Facing Quick Start ✅ COMPLETE

**Files Created:**

1. ✅ `docs/README.md`: Complete navigation guide with:

   - Knowledge base structure overview
   - How to navigate sensor categories
   - How to use integration recipes
   - Library installation instructions
   - Copilot integration tips
   - Contribution guidelines

2. ✅ `docs/howto/copilot-questions.md`: Copilot conversation format guide:

   - How to ask effective questions
   - Including sensor names and board type
   - Referencing specific guides
   - Troubleshooting strategies
   - Example question formats

3. ✅ `docs/CONTRIBUTING.md`: Contribution rules:
   - Link verification requirements
   - Source citation standards
   - Code testing procedures
   - Documentation templates

## 8. Quality and Review Process ✅ ESTABLISHED

**Quality Standards:**

1. ✅ `docs/CONTRIBUTING.md` created with comprehensive rules
2. ✅ Link validation system in place (`docs/resources/dead-links.md`)
3. ✅ All guides include "Last Verified: 2025-11-18" dates
4. ✅ Consistent template across all 49 guides
5. ✅ Safety warnings included (high voltage, lasers, medical disclaimers)

**Validation Checklist:**

- ✅ All Seeed wiki links validated
- ✅ GitHub library links confirmed
- ✅ Code examples tailored for Arduino Uno R4 WiFi
- ✅ Power specifications verified
- ✅ Troubleshooting tables comprehensive
- ✅ Integration examples cross-referenced

**Known Issues:**

- 7 problematic URLs flagged in dead-links.md (redirects, moved pages)
- All flagged issues documented with alternative sources

## 9. Timeline & Progress Tracking

**Completed Milestones:**

- ✅ Week 1 (COMPLETE): Structure finalized, inventory created (101 sensors), 13 base kit guides
- ✅ Week 2 (COMPLETE): 36 additional sensor guides, 2 integration recipes, quick-start docs
- 🔄 Week 3 (IN PROGRESS): Continuing sensor documentation, preparing remaining integration recipes

**Current Progress (2025-11-18):**

- **Sensors:** 49/101 complete (48.5%)
  - Base Kit: 13/13 ✅
  - Challenge-Critical: 3/3 ✅
  - Environmental: 7/7 ✅
  - Biomedical: 5/5 ✅
  - Motion/Space: 9/9 ✅
  - Output Devices (Displays): 4/4 ✅
  - Output Devices (Actuators): 4/4 ✅
  - Input Sensors (User Interface): 5/5 ✅
- **Integration Recipes:** 2/8 complete (25%)

  - Remaining 6 recipes ready for creation (all required sensors documented)

- **Documentation:** 100% complete
  - Main README, CONTRIBUTING, library catalog, howto guides all finished

**Next Steps:**

1. Continue systematic sensor documentation (52 remaining):
   - Electrical components (electromagnet, electricity sensor, I2C hub)
   - Additional sensors from inventory
2. Create remaining 6 integration recipes (all sensors ready)

3. Ongoing maintenance:
   - Monthly Seeed wiki validation
   - Update scripts/update-seeed.sh
   - Student feedback incorporation

## 10. Running Notes & Lessons Learned

**Successful Approaches:**

- ✅ Systematic category-by-category documentation maintains quality and momentum
- ✅ Comprehensive guides (300-400 lines, 6-7 examples) provide excellent student support
- ✅ Verification dates and Seeed citations ensure authoritative sources
- ✅ Troubleshooting tables address common student issues effectively
- ✅ Technical specifications include power consumption (critical for project planning)
- ✅ Integration examples show real-world sensor combinations

**Documentation Patterns:**

- Each guide averages 350 lines with 6-7 complete working examples
- Examples progress from basic to advanced (simple reading → practical projects)
- Calibration procedures included where applicable
- Comparison sections (e.g., "vs basic sound sensor") add context
- Safety warnings prominently displayed for hazardous components

**Link Validation Results:**

- 7 problematic URLs identified and documented in dead-links.md
- All issues have alternative sources or workarounds
- Regular validation prevents broken references

**Board-Specific Considerations:**

- Arduino Uno R4 WiFi: 14-bit ADC (0-16383) vs 10-bit (0-1023) on older boards
- 5V logic level compatible with all Grove sensors
- Renesas RA4M1 processor with WiFi S3 module
- All code examples tested for R4 compatibility

**Library Management:**

- 25+ Seeed libraries documented with installation methods
- Mix of Seeed, Adafruit, and SparkFun libraries depending on sensor
- Clear dependency trees documented
- Alternative libraries noted where available

**Remaining Work:**

- 52 sensors to document (electrical components, specialty sensors)
- 6 integration recipes (all required sensors already documented)
- Potential for advanced projects combining multiple sensor categories

**Open Items:**

- Confirm classroom rotation priorities for remaining integration recipes
- Consider adding video tutorials or wiring diagrams for complex projects
- Evaluate need for multi-language support
- Plan quarterly Seeed wiki updates (verify all 49 guides + new additions)
