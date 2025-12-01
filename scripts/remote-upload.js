const fs = require("fs");
const path = require("path");
const http = require("http");

// Usage: node scripts/remote-upload.js <hex_file_path> [board_fqbn]

const hexPath = process.argv[2];
const boardFqbn = process.argv[3] || "arduino:avr:uno";

if (!hexPath) {
  console.error(
    "Usage: node scripts/remote-upload.js <hex_file_path> [board_fqbn]"
  );
  process.exit(1);
}

if (!fs.existsSync(hexPath)) {
  console.error(`Error: Hex file not found at ${hexPath}`);
  process.exit(1);
}

const hexContent = fs.readFileSync(hexPath, "utf8");

const postData = JSON.stringify({
  hex: hexContent,
  board: boardFqbn,
});

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/upload-hex",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(postData),
  },
};

console.log(`Sending ${hexPath} to Bridge Server...`);

const req = http.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => {
    if (res.statusCode === 200) {
      console.log("Upload Successful!");
      process.exit(0);
    } else {
      console.error(`Upload Failed (Status ${res.statusCode}): ${data}`);
      process.exit(1);
    }
  });
});

req.on("error", (e) => {
  console.error(`Problem with request: ${e.message}`);
  process.exit(1);
});

req.write(postData);
req.end();
