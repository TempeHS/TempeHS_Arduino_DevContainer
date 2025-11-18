# Knowledge Base Changelog

Track updates to Seeed documentation, library versions, and knowledge base content.

---

## 2025-11-17 - Initial Knowledge Base Migration

### Added

- **Core Documentation Structure**
  - `docs/README.md` - Main knowledge base navigation
  - `docs/CONTRIBUTING.md` - Contribution guidelines
  - `docs/howto/copilot-questions.md` - Student guide for effective questions
- **Sensor Guides**

  - `docs/sensors/button/` - Grove Button complete guide
  - `docs/sensors/ultrasonic-ranger/` - Grove Ultrasonic Ranger guide
  - `docs/sensors/light-sensor/` - Grove Light Sensor guide

- **Integration Recipes**

  - `docs/integrations/challenge-01-auto-led.md` - Auto brightness LED
  - `docs/integrations/challenge-05-boom-gate.md` - Distance-triggered gate

- **Library Documentation**

  - `docs/libraries/index.md` - Complete library catalog with install commands

- **Resources**
  - `docs/resources/sensor-inventory.md` - Full sensor inventory and status
  - `docs/resources/dead-links.md` - Link validation tracking

### Scripts

- `scripts/update-seeed.sh` - Link validation checker (first iteration)

### Link Validation Results

- Scanned OLD DOCS for dead links
- Found 7 problematic URLs:
  - 3 resolved (already correct in main README)
  - 4 flagged for instructor review (301 redirects, 406 errors)

### Next Steps

- Complete remaining base kit sensor guides (9 sensors pending)
- Add more integration recipes for classroom challenges #2-#8
- Implement submodule support in update script
- Add automated changelog generation

---

## Upcoming Changes

### Planned for December 2025

- [ ] Complete all base kit sensor documentation
- [ ] Add 5 more integration recipes
- [ ] Set up Git submodules for Seeed wiki-documents
- [ ] Automate monthly link checks
- [ ] Create video tutorials for common projects

### Future Enhancements

- [ ] Interactive wiring diagrams
- [ ] Troubleshooting decision trees
- [ ] Student project showcase
- [ ] Library version compatibility matrix
- [ ] Automated code testing for examples

---

## Version History

### v1.0.0 - 2025-11-17

Initial knowledge base release with:

- 3 sensor guides (button, ultrasonic, light sensor)
- 2 integration recipes (challenges #1 and #5)
- Complete library catalog
- Student how-to guides
- Contribution workflow
- Link validation system

---

## Maintenance Log

| Date       | Action                   | Result                                    |
| ---------- | ------------------------ | ----------------------------------------- |
| 2025-11-17 | Initial link validation  | 84 links checked, 7 issues found          |
| 2025-11-17 | Knowledge base migration | OLD DOCS preserved, new structure created |

---

## Library Updates

Track Seeed library version changes that may affect code examples:

| Library                   | Previous | Current | Date Updated | Breaking Changes |
| ------------------------- | -------- | ------- | ------------ | ---------------- |
| Grove - Ultrasonic Ranger | N/A      | Latest  | 2025-11-17   | N/A (initial)    |
| DHT sensor library        | N/A      | Latest  | 2025-11-17   | N/A (initial)    |

---

## Seeed Wiki Changes

Track significant Seeed wiki updates:

| Wiki Page               | Change       | Date Noted | Action Taken |
| ----------------------- | ------------ | ---------- | ------------ |
| Grove Button            | URL verified | 2025-11-17 | None needed  |
| Grove Ultrasonic Ranger | URL verified | 2025-11-17 | None needed  |
| Grove Light Sensor      | URL verified | 2025-11-17 | None needed  |

---

## Dead Link Resolutions

| Original URL                      | Status | Resolution                | Date       |
| --------------------------------- | ------ | ------------------------- | ---------- |
| https://github.com/Ildaron/ardEEG | 301    | Awaiting instructor input | 2025-11-17 |
| elecrow.com links (2)             | 406    | Awaiting instructor input | 2025-11-17 |

---

**Next Scheduled Review:** 2025-12-17  
**Maintained by:** TempeHS Arduino Team
