# TempeHS Arduino Knowledge Base

Welcome to the TempeHS Arduino Grove Sensor Knowledge Base. This documentation provides authoritative, classroom-ready guidance for working with Seeed Studio Grove sensors and Arduino development.

## 📚 Structure

- **[sensors/](sensors/)** – Individual sensor guides with wiring, code examples, and troubleshooting
- **[integrations/](integrations/)** – Multi-sensor project recipes aligned with classroom challenges
- **[libraries/](libraries/)** – Seeed Arduino library catalog with installation instructions
- **[howto/](howto/)** – Arduino workflows, debugging tips, and Copilot usage guides
- **[resources/](resources/)** – External links index, changelog, and maintenance records

## 🎯 Using This Knowledge Base

### For Students

When working on Arduino projects:

1. **Find your sensor** in the `sensors/` directory
2. **Check integration recipes** in `integrations/` for multi-sensor projects
3. **Ask targeted questions** – See [howto/copilot-questions.md](howto/copilot-questions.md) for tips

### Asking Effective Copilot Questions

Always include:

- Sensor names (e.g., "button", "ultrasonic ranger")
- Board type (Arduino Uno R4 WiFi)
- Desired behavior or outcome
- Connection type (Grove connector, port type)

**Good example:**

> "Help me integrate a Grove button with a Grove ultrasonic ranger on Arduino Uno R4 WiFi. I want the button to trigger distance measurement and display the result on the serial monitor."

**Instead of:**

> "How do I use a button and sensor together?"

### Source Authority

All guidance in this knowledge base cites:

- **Seeed Studio Wiki**: https://wiki.seeedstudio.com/
- **Seeed GitHub Libraries**: https://github.com/Seeed-Studio/
- **Arduino Official Docs**: https://docs.arduino.cc/

When Copilot provides answers, it references these authoritative sources from the local knowledge base.

## 🔧 Quick Start

### Required Hardware

- Arduino Uno R4 WiFi (or compatible board)
- Seeed Grove Base Shield or individual Grove connectors
- Grove sensors from the TempeHS collection

### Software Setup

The devcontainer includes:

- Arduino CLI for library management
- C/C++ IntelliSense for code completion
- All recommended VS Code extensions

### Installing Libraries

See [libraries/index.md](libraries/index.md) for the complete catalog and installation commands.

## 📖 Classroom Challenges

Integration recipes in `integrations/` align with these challenges:

1. LED that gets brighter as it gets darker
2. OLED display weather station
3. Thunderstorm warning station alarm
4. Clap on/off LED lamp
5. Boom gate that opens as car approaches
6. Bin that opens when you wave your hand
7. Fridge door left open alarm
8. Metronome with BPM control and display

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on updating documentation, verifying links, and maintaining quality standards.

## 📋 Base Sensor Kit Contents

The following sensors are marked with \* in the old catalog and represent the core kit:

- Button, Rotary Potentiometer, LED, Buzzer
- Light Sensor, Sound Sensor, Temperature & Humidity, Air Pressure
- Ultrasonic Ranger, 3-Axis Accelerometer, Line Finder
- 0.96" OLED Display, Servo Motor

Full inventory available in [resources/sensor-inventory.md](resources/sensor-inventory.md)

## 🔗 External Resources

- [Seeed Studio Wiki](https://wiki.seeedstudio.com/)
- [Seeed Studio GitHub](https://github.com/Seeed-Studio/)
- [Arduino Documentation](https://docs.arduino.cc/)
- [Grove System Overview](https://wiki.seeedstudio.com/Grove_System/)

---

**Last Updated:** November 18, 2025  
**Maintained by:** TempeHS Arduino Development Team  
**Latest Addition:** ardEEG Biosignal Shield (EEG/EMG/ECG) - See [sensors/ardeeg-biosignal-shield/](sensors/ardeeg-biosignal-shield/)
