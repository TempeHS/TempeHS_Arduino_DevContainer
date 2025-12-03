/**
 * Arduino IDE Upload Sniffer
 *
 * Captures EXACTLY what Arduino IDE sends during upload to R4 WiFi.
 * This helps us understand what Web Serial is doing differently.
 *
 * PHYSICAL SETUP (True MITM):
 * ===========================
 *
 *   PC USB (Arduino IDE)
 *        |
 *        v
 *   [THIS SNIFFER ARDUINO] (Uno/Mega/etc - NOT an R4!)
 *        |
 *        | SoftwareSerial (Pin 2=RX from IDE, Pin 3=TX to R4)
 *        v
 *   [R4 WiFi] (Target board)
 *        |
 *        v
 *   R4's USB (for power only, or disconnected)
 *
 * WIRING:
 *   Sniffer Arduino          R4 WiFi
 *   ----------------          -------
 *   Pin 3 (SoftTX)  -------> Pin 0 (RX) via voltage divider if needed
 *   Pin 2 (SoftRX)  <------- Pin 1 (TX)
 *   GND             <------> GND
 *   5V              -------> VIN (to power R4)
 *
 * HOW IT WORKS:
 * 1. Arduino IDE thinks it's talking to an Arduino on its COM port
 * 2. This sniffer receives ALL bytes from IDE on its USB Serial
 * 3. Forwards them to R4 WiFi via SoftwareSerial
 * 4. Captures R4's responses and forwards back to IDE
 * 5. Logs EVERYTHING to Serial1 (if available) or saves to buffer
 *
 * ALTERNATIVE SIMPLER SETUP (Passive Sniff - TX only):
 * =====================================================
 * If you just want to see what IDE sends (not full MITM):
 *
 *   PC USB -----> R4 WiFi (normal connection)
 *                    |
 *                    | R4's Pin 1 (TX) - what R4 sends back
 *                    v
 *   Sniffer Pin 0 (RX) - capture responses
 *
 * But this won't show you what IDE sends TO the R4.
 * The MITM setup above shows both directions.
 *
 * USAGE:
 * 1. Upload this sketch to Sniffer Arduino (Uno/Mega/Leonardo)
 * 2. Wire as shown above
 * 3. In Arduino IDE, select the SNIFFER's COM port (not R4's)
 * 4. Select "Arduino UNO R4 WiFi" as board (even though sniffer is Uno)
 * 5. Upload demo_blink to "R4" (actually goes through sniffer)
 * 6. After upload attempt, disconnect and connect to sniffer at 115200
 * 7. Type 'D' to dump captured log
 */

#include <SoftwareSerial.h>

// Sniffer Arduino USB Serial = connection to PC/IDE
#define IDE_SERIAL Serial

// SoftwareSerial to R4 WiFi
// Pin 2 = RX (from R4), Pin 3 = TX (to R4)
SoftwareSerial r4Serial(2, 3);

// Capture buffer for logging
#define LOG_SIZE 4096
uint8_t logBuffer[LOG_SIZE];
uint16_t logIndex = 0;

// Direction markers in log
#define DIR_IDE_TO_R4 0xFE // Marker: IDE sent this
#define DIR_R4_TO_IDE 0xFD // Marker: R4 sent this
#define DIR_TIMESTAMP 0xFC // Marker: timestamp follows (4 bytes)

// State tracking
bool inBootloaderMode = false;
uint32_t lastActivityTime = 0;
uint32_t sessionStart = 0;

// Baud rate detection
uint32_t currentBaud = 115200;
bool baudChanged = false;

void setup()
{
    // USB Serial to PC/IDE - start at common baud
    IDE_SERIAL.begin(115200);

    // SoftwareSerial to R4 - match IDE baud
    r4Serial.begin(115200);

    sessionStart = millis();

    // Small delay to let things settle
    delay(100);

    // Don't print anything - IDE might be waiting for bootloader response!
    // We'll store everything in the log buffer instead.

    pinMode(LED_BUILTIN, OUTPUT);
}

void loop()
{
    // Forward IDE -> R4 and log
    while (IDE_SERIAL.available())
    {
        uint8_t b = IDE_SERIAL.read();

        // Log it
        logByte(DIR_IDE_TO_R4, b);

        // Forward to R4
        r4Serial.write(b);

        // Blink LED
        digitalWrite(LED_BUILTIN, HIGH);
        lastActivityTime = millis();

        // Detect 1200 baud touch (IDE closes at 1200 to trigger bootloader)
        // We can't easily detect baud change, but we can watch for patterns
    }

    // Forward R4 -> IDE and log
    while (r4Serial.available())
    {
        uint8_t b = r4Serial.read();

        // Log it
        logByte(DIR_R4_TO_IDE, b);

        // Forward to IDE
        IDE_SERIAL.write(b);

        lastActivityTime = millis();
    }

    // Turn off LED after activity
    if (millis() - lastActivityTime > 50)
    {
        digitalWrite(LED_BUILTIN, LOW);
    }

    // Periodically add timestamp markers
    static uint32_t lastTimestamp = 0;
    if (millis() - lastTimestamp > 1000 && logIndex < LOG_SIZE - 10)
    {
        lastTimestamp = millis();
        logTimestamp();
    }
}

void logByte(uint8_t direction, uint8_t data)
{
    if (logIndex >= LOG_SIZE - 2)
        return; // Buffer full

    logBuffer[logIndex++] = direction;
    logBuffer[logIndex++] = data;
}

void logTimestamp()
{
    if (logIndex >= LOG_SIZE - 6)
        return;

    uint32_t ts = millis() - sessionStart;
    logBuffer[logIndex++] = DIR_TIMESTAMP;
    logBuffer[logIndex++] = (ts >> 24) & 0xFF;
    logBuffer[logIndex++] = (ts >> 16) & 0xFF;
    logBuffer[logIndex++] = (ts >> 8) & 0xFF;
    logBuffer[logIndex++] = ts & 0xFF;
}

/**
 * Call this function to dump the log.
 * After upload attempt, disconnect IDE and reconnect at 115200.
 * Send 'D' to trigger dump.
 */
void dumpLog()
{
    IDE_SERIAL.println();
    IDE_SERIAL.println("========================================");
    IDE_SERIAL.println("  ARDUINO IDE UPLOAD CAPTURE LOG");
    IDE_SERIAL.println("========================================");
    IDE_SERIAL.print("Total bytes logged: ");
    IDE_SERIAL.println(logIndex);
    IDE_SERIAL.println();

    uint32_t currentTimestamp = 0;
    uint8_t lastDirection = 0;
    uint16_t lineBytes = 0;

    for (uint16_t i = 0; i < logIndex;)
    {
        uint8_t marker = logBuffer[i++];

        if (marker == DIR_TIMESTAMP)
        {
            // Read 4-byte timestamp
            if (i + 4 <= logIndex)
            {
                currentTimestamp = ((uint32_t)logBuffer[i] << 24) |
                                   ((uint32_t)logBuffer[i + 1] << 16) |
                                   ((uint32_t)logBuffer[i + 2] << 8) |
                                   logBuffer[i + 3];
                i += 4;

                // Print timestamp on new line
                if (lineBytes > 0)
                {
                    IDE_SERIAL.println();
                    lineBytes = 0;
                }
                IDE_SERIAL.print("\n[");
                IDE_SERIAL.print(currentTimestamp);
                IDE_SERIAL.println("ms]");
            }
        }
        else if (marker == DIR_IDE_TO_R4 || marker == DIR_R4_TO_IDE)
        {
            if (i < logIndex)
            {
                uint8_t data = logBuffer[i++];

                // Direction change? Start new line
                if (marker != lastDirection && lineBytes > 0)
                {
                    IDE_SERIAL.println();
                    lineBytes = 0;
                }

                // Print direction prefix
                if (lineBytes == 0)
                {
                    if (marker == DIR_IDE_TO_R4)
                    {
                        IDE_SERIAL.print("IDE->R4: ");
                    }
                    else
                    {
                        IDE_SERIAL.print("R4->IDE: ");
                    }
                }

                // Print hex byte
                if (data < 0x10)
                    IDE_SERIAL.print("0");
                IDE_SERIAL.print(data, HEX);
                IDE_SERIAL.print(" ");

                // ASCII hint for printable chars
                if (data >= 0x20 && data <= 0x7E)
                {
                    IDE_SERIAL.print("(");
                    IDE_SERIAL.print((char)data);
                    IDE_SERIAL.print(") ");
                }

                lastDirection = marker;
                lineBytes++;

                // Line break every 8 bytes
                if (lineBytes >= 8)
                {
                    IDE_SERIAL.println();
                    lineBytes = 0;
                }
            }
        }
    }

    IDE_SERIAL.println();
    IDE_SERIAL.println("========================================");
    IDE_SERIAL.println("  END OF LOG");
    IDE_SERIAL.println("========================================");
    IDE_SERIAL.println();
    IDE_SERIAL.println("Key patterns to look for:");
    IDE_SERIAL.println("  N# = 4E 23 (Binary mode)");
    IDE_SERIAL.println("  V# = 56 23 (Version query)");
    IDE_SERIAL.println("  S# = 53 23 (Size query)");
    IDE_SERIAL.println("  80 80 80 = Auto-baud sync");
    IDE_SERIAL.println();
}

// Alternative: simpler passive sniffer that just logs what it sees
// Use this if MITM is too complex
void setupPassive()
{
    // Just listen on Pin 0 (RX) and log to USB Serial
    IDE_SERIAL.begin(115200);
    // Serial1.begin(115200);  // If your board has Serial1

    IDE_SERIAL.println("Passive sniffer mode");
    IDE_SERIAL.println("Connect R4's TX (Pin 1) to this Arduino's Pin 0");
    IDE_SERIAL.println("This will show R4's responses only, not IDE's commands");
}

/**
 * SIMPLER ALTERNATIVE: USB Passthrough Mode
 *
 * If the above is too complex, here's a simpler approach:
 *
 * Use a USB-to-Serial adapter (FTDI/CH340) as the sniffer:
 * 1. Connect adapter's RX to R4's TX (to see R4 responses)
 * 2. Connect adapter's TX to R4's RX (to inject test commands)
 * 3. Use IDE on main USB, monitor adapter on separate terminal
 *
 * Or use two USB-Serial adapters for full MITM.
 */

// Check for dump command when idle
void serialEvent()
{
    // This won't work during active forwarding, but useful after
    if (IDE_SERIAL.available())
    {
        char c = IDE_SERIAL.peek();
        if (c == 'D' || c == 'd')
        {
            IDE_SERIAL.read(); // consume
            dumpLog();
        }
        else if (c == 'R' || c == 'r')
        {
            IDE_SERIAL.read();
            logIndex = 0; // Reset log
            IDE_SERIAL.println("Log cleared");
        }
    }
}
