# Grove Universal Connectors

**Last Verified:** 2025-11-18  
**Seeed Wiki:** https://wiki.seeedstudio.com/Grove_System/  
**Connection Type:** Standard 4-Pin Cables

## Overview

Grove Universal 4-pin connectors are the backbone of the Grove modular system, providing standardized connections between sensors, actuators, and controller boards. Available in straight and 90° angled versions, these connectors simplify wiring, eliminate breadboarding errors, and enable rapid prototyping. Each cable carries power (VCC, GND) and signals (2 pins) in a keyed connector that prevents reverse insertion.

## Authoritative References

- [Grove System Overview - Seeed Wiki](https://wiki.seeedstudio.com/Grove_System/)
- [Grove Connector Specifications](https://wiki.seeedstudio.com/Grove_System/#interface-of-grove-modules)
- [Grove Universal 4-Pin Connector Product](https://www.seeedstudio.com/Grove-Universal-4-pin-connector.html)
- [Grove 90° Connector Product](https://www.seeedstudio.com/Grove-Universal-4-pin-connector-90-10-PCs.html)

## Hardware Setup

- **Connector Type:** JST PH 2.0mm pitch
- **Pins:** 4 pins (Signal 1, Signal 2, VCC, GND)
- **Wire Gauge:** 26 AWG (0.13mm²)
- **Cable Lengths:** 5cm, 20cm, 30cm, 50cm (common sizes)
- **Voltage Rating:** 250V AC/DC
- **Current Rating:** 2A per contact
- **Contact Material:** Phosphor bronze with tin plating
- **Wire Colors:**
  - **Yellow:** Signal 1 (Primary digital/analog/SDA)
  - **White:** Signal 2 (Secondary digital/SCL)
  - **Red:** VCC (+5V or +3.3V)
  - **Black:** GND (Ground)
- **Keying:** Polarized connector prevents reverse insertion
- **Retention:** Locking mechanism holds connector securely

![Grove Connectors](https://files.seeedstudio.com/wiki/Grove_System/images/2Pin&4Pin.jpg)

## Connector Types

### Standard Straight Connector

- **Use Case:** General connections, breadboard breakout
- **Advantages:** Compact, standard orientation
- **Package:** 10-pack typically

### 90° Angled Connector

- **Use Case:** Tight spaces, panel-mount projects, parallel routing
- **Advantages:** Low profile, easier cable management
- **Package:** 10-pack typically

## Pin Functions by Port Type

### Digital Ports (D2-D13)

- **Yellow (Pin 1):** Primary digital I/O
- **White (Pin 2):** Secondary digital I/O (if used)
- **Red (Pin 3):** VCC (+5V)
- **Black (Pin 4):** GND

### Analog Ports (A0-A5)

- **Yellow (Pin 1):** Analog input (0-5V)
- **White (Pin 2):** Not used (or secondary analog)
- **Red (Pin 3):** VCC (+5V)
- **Black (Pin 4):** GND

### I2C Ports

- **Yellow (Pin 1):** SCL (Serial Clock)
- **White (Pin 2):** SDA (Serial Data)
- **Red (Pin 3):** VCC (+5V or +3.3V)
- **Black (Pin 4):** GND

### UART Ports

- **Yellow (Pin 1):** RX (Receive)
- **White (Pin 2):** TX (Transmit)
- **Red (Pin 3):** VCC (+5V)
- **Black (Pin 4):** GND

## Software Prerequisites

No software required - connectors are passive electrical connections. Use appropriate code for connected sensor/actuator.

## Testing Procedure

1. **Visual Inspection:**
   - Check for bent pins
   - Verify wire colors (Yellow, White, Red, Black)
   - Ensure connector housing intact
2. **Continuity Test (with multimeter):**

   - Test each wire for continuity end-to-end
   - Verify no shorts between adjacent pins
   - Check insulation resistance

3. **Connection Test:**

   - Plug connector into Grove port
   - Should click/lock into place
   - Connector should not fall out when inverted
   - Unplug by pulling on connector body (not wire)

4. **Functional Test:**
   - Connect known-working sensor
   - Upload test sketch
   - Verify sensor responds correctly

## Troubleshooting

| Problem                      | Solution                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Connector won't insert       | Check orientation (keyed connector), don't force, verify correct port type    |
| Loose connection             | Check for bent pins, verify connector fully seated, inspect retention clips   |
| No electrical connection     | Test cable continuity, check for broken wire, inspect connector contacts      |
| Connector falls out          | Press firmly until click, check retention mechanism, replace if damaged       |
| Intermittent connection      | Re-seat connector, clean contacts with isopropyl alcohol, check for corrosion |
| Wire pulled out of connector | Replace cable (not user-serviceable), use strain relief, don't pull on wires  |

## Technical Specifications

**Connector:**

- **Type:** JST PH series (2.0mm pitch)
- **Pins:** 4 pins
- **Contact Pitch:** 2.0mm
- **Contact Material:** Phosphor bronze
- **Contact Plating:** Tin-plated
- **Housing Material:** Glass-filled nylon (UL94V-0)
- **Color:** White housing (standard)

**Electrical:**

- **Voltage Rating:** 250V AC/DC
- **Current Rating:** 2A per contact
- **Contact Resistance:** <20mΩ
- **Insulation Resistance:** >100MΩ
- **Withstand Voltage:** 1000V AC (1 minute)
- **Operating Voltage:** 5V typical (3.3V compatible)

**Cable:**

- **Wire Gauge:** 26 AWG (0.13mm² / 0.4mm diameter)
- **Insulation:** PVC
- **Wire Colors:** Yellow, White, Red, Black
- **Cable Lengths:** 5cm, 20cm, 30cm, 50cm (standard)
- **Flexibility:** Highly flexible for routing

**Mechanical:**

- **Mating Force:** <20N (insertion)
- **Unmating Force:** >5N (extraction)
- **Retention:** Positive lock mechanism
- **Durability:** >50 mating cycles
- **Operating Temperature:** -25°C to 85°C
- **Storage Temperature:** -40°C to 105°C

**Environmental:**

- **Humidity:** 5-95% RH non-condensing
- **Vibration:** Tested to IEC 60068-2-6
- **RoHS Compliant:** Yes

## Common Use Cases

### Sensor Connection

Standard use - connect any Grove sensor to Base Shield.

### Cable Extension

Chain multiple cables for longer distances (not recommended >1m for I2C).

### Custom Sensor Development

Use with screw terminal for prototyping custom Grove modules.

### Panel Mount Projects

Use 90° connectors for clean routing in enclosures.

### Temporary Connections

Quick swap sensors during prototyping without soldering.

## Cable Management Best Practices

### Routing

- Keep cables away from high-voltage wires
- Avoid sharp bends (minimum bend radius: 5mm)
- Use cable ties for organization
- Route I2C cables away from noise sources

### Length Selection

- **5cm:** Inter-board connections on same project
- **20cm:** Standard sensor connections
- **30cm:** Extended reach within project box
- **50cm:** Maximum recommended for I2C (may need pull-ups)

### Strain Relief

- Never pull on wires to disconnect
- Support cable weight with clips or ties
- Use 90° connectors to reduce strain
- Secure cables near connectors

## Connector Pinout Reference

```
Grove 4-Pin Connector (looking at cable end)
┌─────────────────────┐
│  1    2    3    4   │
│  ●    ●    ●    ●   │
└─────────────────────┘
   │    │    │    │
   │    │    │    └─── Pin 4: GND (Black)
   │    │    └──────── Pin 3: VCC (Red)
   │    └───────────── Pin 2: Signal 2 (White)
   └────────────────── Pin 1: Signal 1 (Yellow)
```

## Voltage Compatibility

### 5V Systems (Arduino Uno, Mega, Uno R4)

- VCC pin provides 5V
- Logic levels: 5V HIGH, 0V LOW
- Most Grove sensors are 5V tolerant

### 3.3V Systems (Arduino Due, Zero, Some ESP32)

- VCC pin provides 3.3V
- Logic levels: 3.3V HIGH, 0V LOW
- Check sensor voltage compatibility

### Mixed Voltage

- Use level shifters for 5V↔3.3V logic
- Grove Base Shield handles voltage switching on some boards

## Connector Replacement

**When to Replace:**

- Bent or damaged pins
- Cracked housing
- Intermittent connection after cleaning
- Wire pulled out of connector

**Not User-Serviceable:**

- Connectors are crimped and molded
- Replace entire cable assembly
- Keep spare cables on hand

## Accessories

### Grove Cables

- Available in multiple lengths (5-50cm)
- Standard and 90° versions
- Bulk packs available (5-pack, 10-pack)

### Breakout Boards

- Grove to breadboard adapters
- Grove to pin headers
- Custom PCBs with Grove connectors

### Extensions

- I2C Hub (1 to 6 ports)
- Splitter cables (not standard)
- Screw terminal adapter

## Quality Indicators

### Genuine Grove Cables

- Consistent wire colors (Yellow, White, Red, Black)
- Smooth connector housing
- Proper keying and retention
- Clear markings on connector
- Reliable contact engagement

### Potential Issues with Clones

- Inconsistent wire colors
- Loose fit or too tight
- Poor retention mechanism
- Thin or brittle wires

## Storage and Handling

### Storage

- Keep in anti-static bag if long-term storage
- Avoid extreme temperatures
- Protect from UV light (degrades plastic)
- Store flat or loosely coiled

### Handling

- Don't bend cables sharply at connector
- Pull on connector body, not wire
- Keep pins clean and straight
- Avoid touching contacts (oils cause corrosion)

## Connector Compatibility

### Compatible With

- All Grove modules (sensors, actuators, displays)
- Grove Base Shield
- Grove shields for various Arduino boards
- Custom PCBs with JST PH 2.0mm connectors

### Not Compatible With

- JST XH (2.5mm pitch) - larger
- JST SH (1.0mm pitch) - smaller
- Molex Picoblade (1.25mm pitch)
- Other proprietary connectors

## Environmental Considerations

### Indoor Use

- Standard cables suitable for indoor projects
- Protect from moisture and dust
- Typical lifespan: 5+ years with care

### Outdoor Use

- Not rated for outdoor/waterproof applications
- Use conformal coating on connectors if needed
- Consider IP-rated enclosures
- Check temperature range compatibility

## Signal Integrity

### Maximum Cable Lengths

- **Digital:** Up to 5m (depends on signal speed)
- **Analog:** Up to 1m (minimize noise)
- **I2C:** Up to 1m (may need buffer beyond)
- **UART:** Up to 3m (9600 baud)

### Noise Reduction

- Shorten cables where possible
- Route away from power cables
- Use shielded cables for critical signals
- Add ferrite beads if EMI issues

## Additional Resources

- [Grove System Overview](https://wiki.seeedstudio.com/Grove_System/)
- [JST PH Connector Datasheet](https://www.jst-mfg.com/product/detail_e.php?series=199)
- [Grove Starter Kit Guide](https://wiki.seeedstudio.com/Grove_Starter_Kit_v3/)

---

**Source Verification Date:** 2025-11-18  
**Seeed Wiki Last Checked:** 2025-11-18  
**Tip:** Wire colors: Yellow=Signal1, White=Signal2, Red=VCC, Black=GND. Always pull on connector body, not wires!
