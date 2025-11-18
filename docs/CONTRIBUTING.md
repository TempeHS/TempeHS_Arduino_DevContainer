# Contributing to the Knowledge Base

Thank you for helping maintain the TempeHS Arduino Knowledge Base. This guide ensures documentation remains accurate, authoritative, and classroom-ready.

## 🎯 Core Principles

1. **Cite authoritative sources** – Every technical claim must reference Seeed wiki or GitHub
2. **Verify before publishing** – All links must return HTTP 200, all code must compile
3. **Maintain currency** – Run update scripts monthly and flag dead links immediately
4. **Prioritize clarity** – Write for students learning Arduino, not experts

## 📝 Making Changes

### Before You Start

1. Run the link checker:
   ```bash
   bash scripts/update-seeed.sh
   ```
2. Check for open issues flagging outdated content
3. Review related sensor guides or integration recipes

### Adding a New Sensor Guide

Create `docs/sensors/<sensor-name>/README.md` using this template:

```markdown
# [Sensor Name]

**Last Verified:** YYYY-MM-DD  
**Seeed Wiki:** [Link to official page]  
**Library Repo:** [GitHub link if applicable]

## Overview

Brief description and use cases (2-3 sentences).

## Authoritative References

- [Seeed Wiki Page Title](URL) – Commit/Date
- [Library Repository](GitHub URL) – Version/Tag
- [Additional Reference](URL) – If needed

## Hardware Setup

- **Connection Type:** Analog / Digital / IIC / Digital Pulse
- **Grove Port:** A0-A3 / D2-D8 / I2C / etc.
- **Power Requirements:** 3.3V / 5V
- **Wiring:** ![Diagram](seeed-wiki-image-url) or describe connections

## Software Prerequisites

### Required Libraries

\`\`\`bash
arduino-cli lib install "Library Name"
\`\`\`

Or manual installation from: [GitHub releases](URL)

## Example Code

\`\`\`cpp
// Minimal example demonstrating core functionality
// Source: [Seeed Wiki Example](URL) or [GitHub](URL)

// Include your example here
\`\`\`

**Key Points:**

- Explain critical setup steps
- Note pin assignments
- Describe expected behavior

## Testing Procedure

1. Connect sensor to correct Grove port
2. Upload example sketch
3. Open Serial Monitor (9600 baud)
4. Expected output: [describe what should appear]

## Troubleshooting

| Problem                     | Solution                                          |
| --------------------------- | ------------------------------------------------- |
| No output on Serial Monitor | Verify baud rate, check connections               |
| Incorrect readings          | Check power supply, verify library version        |
| Compilation errors          | Install required libraries, check board selection |

## Integration Examples

See [integration recipes](../../integrations/) for multi-sensor projects using this component.

---

**Source Verification Date:** YYYY-MM-DD  
**Seeed Wiki Commit:** [hash or date]
```

### Adding an Integration Recipe

Create `docs/integrations/<project-name>.md`:

```markdown
# [Project Name]

**Classroom Challenge:** [Reference from Sensor_Kit/Readme.md if applicable]  
**Difficulty:** Beginner / Intermediate / Advanced

## Overview

Brief description of what the project does and learning outcomes.

## Required Components

- [Sensor 1](../sensors/sensor-1/) – Quantity
- [Sensor 2](../sensors/sensor-2/) – Quantity
- Arduino Uno R4 WiFi
- Grove Base Shield
- USB-C cable

## Wiring Diagram

![Diagram](seeed-reference-or-local-image)

Or describe connections:

- Sensor 1 → Port A0
- Sensor 2 → Port D3

## Step-by-Step Build

### 1. Hardware Setup

Detailed physical assembly instructions.

### 2. Library Installation

\`\`\`bash
arduino-cli lib install "Library 1" "Library 2"
\`\`\`

### 3. Code Implementation

\`\`\`cpp
// Complete working example
// Cite source for each sensor's code section
\`\`\`

### 4. Testing

- Expected behavior description
- How to verify each feature works

## Common Issues

| Problem | Cause      | Solution           |
| ------- | ---------- | ------------------ |
| Example | Root cause | Fix with reference |

## Extensions & Modifications

Suggestions for students to enhance the project.

## References

- [Sensor 1 Seeed Wiki](URL)
- [Sensor 2 Seeed Wiki](URL)
- [Related Tutorial](URL)
```

### Updating Library Catalog

Add entries to `docs/libraries/index.md`:

```markdown
### Library Name

- **GitHub:** [Seeed-Studio/repo](URL)
- **Latest Release:** v1.2.3 (2025-11-01)
- **Install:** `arduino-cli lib install "Library Name"`
- **Used By:** [List sensors that depend on this]
- **Key APIs:** BriefClass::method() description
- **Compatibility:** AVR, SAMD, Renesas (Uno R4)
```

## ✅ Pre-Commit Checklist

Before submitting changes:

- [ ] All external links validated with `scripts/update-seeed.sh`
- [ ] Code examples compile without errors
- [ ] Seeed wiki/GitHub references include dates or commit hashes
- [ ] Images hosted on Seeed wiki or properly licensed
- [ ] Tested on Arduino Uno R4 WiFi (or noted if untested)
- [ ] Spelling and grammar checked
- [ ] Follows existing documentation style

## 🔄 Maintenance Tasks

### Monthly Update Cycle

1. Run `scripts/update-seeed.sh` to check all external links
2. Review Seeed GitHub repos for new library releases
3. Update `docs/resources/CHANGELOG.md` with any changes
4. Flag dead links in `docs/resources/dead-links.md` for instructor review

### Reporting Dead Links

If you find a broken Seeed wiki or GitHub link:

1. Add entry to `docs/resources/dead-links.md`:
   ```markdown
   - **Dead:** https://old-url.com
   - **Found In:** docs/sensors/sensor-name/README.md
   - **Date Reported:** 2025-11-17
   - **Suggested Replacement:** [If known]
   ```
2. Tag instructor for replacement URL
3. Do NOT remove the reference until replacement is confirmed

## 🚫 What Not to Do

- ❌ Copy large code blocks without attribution
- ❌ Link to unofficial third-party tutorials as primary source
- ❌ Include untested code examples
- ❌ Use vague language like "should work" or "might need"
- ❌ Add sensors not in TempeHS inventory without instructor approval

## 📞 Getting Help

- Questions about sensor behavior → Test with simple example first
- Unclear Seeed documentation → Check GitHub issues on library repo
- Need replacement link → Ask instructor via dead-links.md
- Code won't compile → Verify Arduino board selection and library versions

---

**Remember:** Students rely on this documentation. Accuracy and clarity matter more than speed.
