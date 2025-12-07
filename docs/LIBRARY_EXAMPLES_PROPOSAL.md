# Library Examples Access Proposal

## The Problem

When students install Arduino libraries through the Library Manager, those libraries often include **example sketches** that demonstrate how to use the library. For example:

- **Servo library** → `examples/Sweep/Sweep.ino`, `examples/Knob/Knob.ino`
- **Accelerometer ADXL335** → `examples/Calibration/Calibration.ino`, `examples/MeasuringAcceleration/MeasuringAcceleration.ino`

These examples are installed to:

```
/home/vscode/Arduino/libraries/<LibraryName>/examples/
```

**Issue**: This location is:

1. Outside the workspace (`/workspaces/TempeHS_Arduino_DevContainer/`)
2. Not visible in the VS Code file explorer
3. Not tracked by Git (so students can't see changes or share modifications)
4. Hidden from students who might not know where to find them

## Current Behavior

When a library is installed via `arduino-cli lib install <name>`:

- Library files go to `/home/vscode/Arduino/libraries/<LibraryName>/`
- Examples are in a subfolder: `.../examples/<ExampleName>/<ExampleName>.ino`
- The `arduino-cli lib list --format json` command provides the full path to examples

Example output from `arduino-cli lib list --format json`:

```json
{
  "library": {
    "name": "Servo",
    "install_dir": "/home/vscode/Arduino/libraries/Servo",
    "examples": [
      "/home/vscode/Arduino/libraries/Servo/examples/Knob",
      "/home/vscode/Arduino/libraries/Servo/examples/Sweep"
    ]
  }
}
```

## Proposed Solutions

### Option 1: Symbolic Links Directory (Recommended)

Create a `library-examples/` folder in the workspace that contains **symlinks** to installed library examples.

**Structure:**

```
/workspaces/TempeHS_Arduino_DevContainer/
├── library-examples/           # Auto-managed symlinks folder
│   ├── .gitignore             # Ignore all symlinks
│   ├── README.md              # Explains this is auto-generated
│   ├── Servo/                 # Symlink → /home/vscode/Arduino/libraries/Servo/examples
│   │   ├── Knob/
│   │   │   └── Knob.ino
│   │   └── Sweep/
│   │       └── Sweep.ino
│   └── Accelerometer_ADXL335/
│       ├── Calibration/
│       └── MeasuringAcceleration/
```

**Implementation:**

1. After library install, create/update symlink in `library-examples/`
2. After library uninstall, remove the symlink
3. Add sync command to refresh all symlinks based on installed libraries

**Pros:**

- ✅ Examples visible in VS Code file explorer
- ✅ No file duplication (symlinks are just pointers)
- ✅ Always up-to-date with installed library version
- ✅ Students can open and read examples directly
- ✅ Can compile and upload examples in place

**Cons:**

- ⚠️ Symlinks need to be recreated if container is rebuilt
- ⚠️ Editing examples modifies the original library files
- ⚠️ Cannot be committed to Git (gitignored)

**API Additions:**

```javascript
// POST /api/libraries/sync-examples
// Scans installed libraries and creates/updates symlinks

// Auto-triggered after:
// - Library install
// - Library upgrade
// - Library uninstall
```

---

### Option 2: Copy Examples to Workspace

Copy example files to the workspace when a library is installed.

**Structure:**

```
/workspaces/TempeHS_Arduino_DevContainer/
├── library-examples/
│   ├── .gitignore
│   ├── Servo/
│   │   └── Sweep/
│   │       └── Sweep.ino    # COPY of the original
```

**Pros:**

- ✅ Students can modify examples without affecting original library
- ✅ Works even if library is uninstalled later
- ✅ Could be committed to Git if desired

**Cons:**

- ⚠️ Duplication of files (storage overhead)
- ⚠️ Won't auto-update if library is upgraded
- ⚠️ Could get out of sync with library version
- ⚠️ More complex logic to detect version changes

---

### Option 3: UI-Based Example Browser (Simplest)

Add an "Examples" section to the Library Manager UI that lets students browse and open examples.

**UI Enhancement:**

```
┌────────────────────────────────────────────────────────┐
│ Library Manager                                         │
├────────────────────────────────────────────────────────┤
│ [Search...] [Category ▼] [□ Show installed]            │
├────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────┐   │
│ │ Servo v1.3.0                        [Installed]  │   │
│ │ Allows Arduino boards to control servo motors    │   │
│ │                                                  │   │
│ │ 📁 Examples:                                     │   │
│ │   ├── Sweep           [Open] [Copy to Workspace] │   │
│ │   └── Knob            [Open] [Copy to Workspace] │   │
│ │                                                  │   │
│ │ [Uninstall]                                      │   │
│ └──────────────────────────────────────────────────┘   │
```

**Actions:**

- **Open**: Opens the example file in VS Code editor (read-only from library dir)
- **Copy to Workspace**: Copies the example folder to workspace root for modification

**Implementation:**

```javascript
// GET /api/libraries/:name/examples
// Returns list of examples for an installed library

// POST /api/libraries/:name/examples/:example/copy
// Copies example to workspace
```

**Pros:**

- ✅ No background symlink management needed
- ✅ Clear user intent (explicit copy action)
- ✅ Students understand what's happening

**Cons:**

- ⚠️ Requires students to know about the UI feature
- ⚠️ Examples not visible in file explorer until copied

---

### Option 4: Virtual Folder in VS Code (Advanced)

Use VS Code's FileSystemProvider API to create a virtual "Library Examples" folder.

**Note**: This would require building a VS Code extension and is beyond the current arduino-bridge scope.

---

## Recommended Implementation: Hybrid Approach

Combine **Option 1 (Symlinks)** with **Option 3 (UI Browser)** for the best experience:

### Phase 1: Symlinks Directory (Quick Win)

1. Create `/workspaces/TempeHS_Arduino_DevContainer/library-examples/` folder
2. Add `.gitignore` to ignore all contents
3. Add `README.md` explaining the folder's purpose
4. After each library operation, refresh symlinks

**Server-side changes (`library-manager.js`):**

```javascript
import { promises as fs } from "fs";
import path from "path";

const WORKSPACE_ROOT = "/workspaces/TempeHS_Arduino_DevContainer";
const EXAMPLES_DIR = path.join(WORKSPACE_ROOT, "library-examples");

/**
 * Sync library example symlinks
 */
export async function syncLibraryExamples() {
  // Ensure examples directory exists
  await fs.mkdir(EXAMPLES_DIR, { recursive: true });

  // Get installed libraries with example paths
  const result = await executeCliCommand(["lib", "list"], { timeout: 15000 });

  if (!result.success)
    return { success: false, error: "Failed to list libraries" };

  const libraries = result.data?.installed_libraries || [];
  const existingLinks = new Set();

  // Create/update symlinks for each library's examples
  for (const item of libraries) {
    const lib = item.library;
    const libName = lib.name.replace(/\s+/g, "_"); // Sanitize name
    const examplesPath = lib.examples?.[0]?.replace(/\/[^/]+$/, ""); // Get examples dir

    if (examplesPath) {
      const linkPath = path.join(EXAMPLES_DIR, libName);
      existingLinks.add(libName);

      try {
        // Remove existing link if present
        await fs.unlink(linkPath).catch(() => {});
        // Create symlink to examples directory
        await fs.symlink(examplesPath, linkPath);
      } catch (err) {
        console.warn(`Failed to create symlink for ${libName}:`, err.message);
      }
    }
  }

  // Clean up stale symlinks
  const currentLinks = await fs.readdir(EXAMPLES_DIR).catch(() => []);
  for (const link of currentLinks) {
    if (link.startsWith(".") || link === "README.md") continue;
    if (!existingLinks.has(link)) {
      await fs.unlink(path.join(EXAMPLES_DIR, link)).catch(() => {});
    }
  }

  return { success: true, synced: existingLinks.size };
}
```

### Phase 2: UI Integration (Enhanced UX)

Add example listing and quick actions to the Library Manager UI:

1. Show examples count badge on installed libraries
2. Expandable section showing example names
3. "Open in Editor" button → Uses VS Code API to open file
4. "Copy to My Projects" button → Copies to workspace with unique name

---

## Files to Create

### `/workspaces/TempeHS_Arduino_DevContainer/library-examples/.gitignore`

```
# Ignore all symlinks to library examples
# These are auto-generated and machine-specific
*
!.gitignore
!README.md
```

### `/workspaces/TempeHS_Arduino_DevContainer/library-examples/README.md`

```markdown
# Library Examples

This folder contains **symbolic links** to example sketches from installed Arduino libraries.

## How it works

When you install a library through the Arduino Library Manager, its examples
automatically appear here as links. You can:

1. **Browse examples** - Open and read example code
2. **Compile & Upload** - Examples work directly from this location
3. **Copy to modify** - Copy an example to your project folder to customize it

## ⚠️ Important Notes

- This folder is **auto-generated** - don't add your own files here
- Links point to `/home/vscode/Arduino/libraries/`
- If you edit an example here, you're editing the original library file
- To customize an example, copy it to your project folder first

## Refreshing Examples

Examples sync automatically when you:

- Install a library
- Upgrade a library
- Uninstall a library

To manually refresh, use the Arduino Bridge: **Library Manager → Refresh Examples**
```

---

## API Endpoints to Add

| Endpoint                                      | Method | Description                          |
| --------------------------------------------- | ------ | ------------------------------------ |
| `/api/libraries/examples/sync`                | POST   | Refresh all example symlinks         |
| `/api/libraries/:name/examples`               | GET    | List examples for a specific library |
| `/api/libraries/:name/examples/:example/open` | POST   | Open example in editor               |
| `/api/libraries/:name/examples/:example/copy` | POST   | Copy example to workspace            |

---

## Container Startup Integration

Add to `.devcontainer/start-bridge.sh`:

```bash
# Sync library examples on startup
sync_library_examples() {
  echo "[Setup] Syncing library examples..."
  curl -s -X POST http://localhost:3000/api/libraries/examples/sync || true
}

# Run after server is ready
(sleep 10 && sync_library_examples) &
```

---

## Summary

| Approach          | Visibility        | Ease of Use     | File Sync         | Recommended |
| ----------------- | ----------------- | --------------- | ----------------- | ----------- |
| Symlinks          | ✅ File explorer  | ✅ Automatic    | ✅ Always current | ✅ Yes      |
| Copy on install   | ✅ File explorer  | ⚠️ May go stale | ❌ Manual         | No          |
| UI browser only   | ❌ Hidden         | ⚠️ Extra steps  | ✅ Always current | Partial     |
| VS Code extension | ✅ Virtual folder | ⚠️ Complex      | ✅ Always current | Future      |

**Recommendation**: Implement **symlinks + UI integration** for the best student experience.
