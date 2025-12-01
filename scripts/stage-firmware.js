const fs = require("fs");
const path = require("path");

const sourceHex = process.argv[2];
const destHex = path.join(__dirname, "../arduino-bridge/public/firmware.hex");

if (!sourceHex) {
  console.error("Usage: node scripts/stage-firmware.js <path-to-hex-file>");
  process.exit(1);
}

if (!fs.existsSync(sourceHex)) {
  console.error(`Error: Source file not found: ${sourceHex}`);
  process.exit(1);
}

try {
  // Ensure directory exists
  const dir = path.dirname(destHex);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.copyFileSync(sourceHex, destHex);
  console.log(`Successfully staged firmware to ${destHex}`);
} catch (err) {
  console.error("Error copying file:", err);
  process.exit(1);
}
