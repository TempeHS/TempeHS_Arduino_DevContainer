import fs from "fs";
import path from "path";
import os from "os";

const homeDir = os.homedir();
// Check both remote and server locations
const extensionsDirs = [
  path.join(homeDir, ".vscode-remote/extensions"),
  path.join(homeDir, ".vscode-server/extensions"),
];

function findExtensionPath() {
  for (const extDir of extensionsDirs) {
    if (fs.existsSync(extDir)) {
      const entries = fs.readdirSync(extDir);
      // Find directory starting with the extension ID
      const arduinoExt = entries.find((e) =>
        e.startsWith("vscode-arduino.vscode-arduino-community")
      );
      if (arduinoExt) {
        return path.join(extDir, arduinoExt);
      }
    }
  }
  return null;
}

const extPath = findExtensionPath();

if (!extPath) {
  console.log("Arduino extension not found. Skipping patch.");
  process.exit(0);
}

const targetFile = path.join(
  extPath,
  "out/src/arduino/arduinoContentProvider.js"
);

if (!fs.existsSync(targetFile)) {
  console.log(`Target file not found at ${targetFile}. Skipping patch.`);
  process.exit(0);
}

try {
  const content = fs.readFileSync(targetFile, "utf8");

  // The string to replace (exact match required)
  const oldLine =
    'var url = "${(yield vscode.env.asExternalUri(this._webserver.getEndpointUri(type))).toString()}?" +';

  const newLine =
    'var baseUrl = "${(yield vscode.env.asExternalUri(this._webserver.getEndpointUri(""))).toString()}"; if (baseUrl.slice(-1) !== "/") baseUrl += "/"; var url = baseUrl + "${type}?" +';

  if (content.includes(oldLine)) {
    const newContent = content.replace(oldLine, newLine);
    fs.writeFileSync(targetFile, newContent, "utf8");
    console.log("Successfully patched arduinoContentProvider.js");
  } else if (
    content.includes(
      'var baseUrl = "${(yield vscode.env.asExternalUri(this._webserver.getEndpointUri(""))).toString()}";'
    )
  ) {
    console.log("arduinoContentProvider.js is already patched.");
  } else {
    console.log(
      "Could not find target string to replace in arduinoContentProvider.js. It might have changed in a new version."
    );
    // Debug: print the relevant section of the file to help identify the change
    const startMarker = "window.onload = function() {";
    const endMarker = "document.getElementById('frame').src = url;";
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);
    if (startIndex !== -1 && endIndex !== -1) {
      console.log("Relevant section in file:");
      console.log(content.substring(startIndex, endIndex + endMarker.length));
    }
  }
} catch (err) {
  console.error("Error patching file:", err);
}
