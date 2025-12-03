/**
 * Serial Sniffer - BOSSA Handshake Diagnostic Tool
 *
 * This sketch receives bytes from the Bridge Arduino (via Pin 0/RX)
 * and displays them on the USB Serial Monitor for analysis.
 *
 * FLOW:
 *   Browser --> Bridge Arduino --> (Pin 3 TX) --> (Pin 0 RX) --> THIS --> Serial Monitor
 *
 * WIRING:
 *   Bridge Arduino          This Sniffer Arduino
 *   --------------          --------------------
 *   Pin 3 (SoftTX)  ------> Pin 0 (RX)
 *   GND             ------> GND
 *
 * USAGE:
 * 1. Upload this sketch to Sniffer Arduino
 * 2. Wire Bridge Pin 3 to Sniffer Pin 0, GND to GND
 * 3. Open Serial Monitor on THIS Arduino at 115200 baud
 * 4. Connect browser to Bridge Arduino
 * 5. Run arduino-bridge upload
 * 6. Watch THIS Serial Monitor for captured bytes!
 *
 * WHAT TO LOOK FOR:
 * - Are N# (0x4E 0x23) and V# (0x56 0x23) arriving correctly?
 * - Is there garbage/noise before the commands?
 * - What baud rate/timing is being used?
 */

// Serial = USB (output to IDE Serial Monitor)
// Serial1 = Hardware UART pins 0/1 (input from Bridge)
#define LOG Serial
#define INPUT_SERIAL Serial1

// Buffer to collect received bytes
#define BUFFER_SIZE 512
uint8_t rxBuffer[BUFFER_SIZE];
volatile uint16_t rxIndex = 0;
volatile uint32_t lastRxTime = 0;
volatile bool newData = false;

// Timing threshold - if no data for this many ms, dump the buffer
#define DUMP_TIMEOUT_MS 100 // Reduced from 500ms for faster feedback

// Track statistics
uint32_t totalBytesReceived = 0;
uint32_t sessionStart = 0;

// LED for visual feedback (no adapter needed)
#define LED_PIN LED_BUILTIN

// Heartbeat timing
uint32_t lastHeartbeat = 0;
#define HEARTBEAT_INTERVAL_MS 2000
uint32_t heartbeatCount = 0;

void setup()
{
    // Initialize USB Serial for OUTPUT to IDE Serial Monitor
    LOG.begin(115200);
    while (!LOG)
    {
        delay(10);
    }

    // Initialize Serial1 (pins 0/1) for INPUT from Bridge Arduino
    INPUT_SERIAL.begin(115200);

    // LED for visual feedback
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    sessionStart = millis();

    LOG.println();
    LOG.println("===========================================");
    LOG.println("  BOSSA Handshake Sniffer");
    LOG.println("===========================================");
    LOG.println();
    LOG.println("INPUT:  Serial1 (Pin 0 RX) <-- from Bridge");
    LOG.println("OUTPUT: USB Serial --> this monitor");
    LOG.println();
    LOG.println("Expected BOSSA commands:");
    LOG.println("  N# (0x4E 0x23) - Set Binary mode");
    LOG.println("  V# (0x56 0x23) - Get Version");
    LOG.println();
    LOG.println("LED will blink when bytes received.");
    LOG.println("-------------------------------------------");
    LOG.println();
}

void loop()
{
    // Check for incoming data on USB Serial
    while (INPUT_SERIAL.available())
    {
        if (rxIndex < BUFFER_SIZE)
        {
            rxBuffer[rxIndex++] = INPUT_SERIAL.read();
            lastRxTime = millis();
            newData = true;
            totalBytesReceived++;

            // Blink LED to show activity
            digitalWrite(LED_PIN, !digitalRead(LED_PIN));
        }
        else
        {
            // Buffer overflow - dump and reset
            INPUT_SERIAL.read(); // Discard
            LOG.println("[OVERFLOW] Buffer full, discarding byte");
        }
    }

    // If we have data and timeout has elapsed, dump it
    if (newData && (millis() - lastRxTime > DUMP_TIMEOUT_MS))
    {
        dumpBuffer();
        newData = false;
    }

    // Send heartbeat every 2 seconds so bridge knows we're alive
    if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL_MS)
    {
        lastHeartbeat = millis();
        heartbeatCount++;
        LOG.print("[HEARTBEAT #");
        LOG.print(heartbeatCount);
        LOG.print("] Sniffer alive, waiting for data... (total rx: ");
        LOG.print(totalBytesReceived);
        LOG.println(" bytes)");
    }
}

void dumpBuffer()
{
    if (rxIndex == 0)
        return;

    uint32_t elapsed = millis() - sessionStart;

    // Turn LED off after dump
    digitalWrite(LED_PIN, LOW);

    LOG.println();
    LOG.print("[");
    LOG.print(elapsed);
    LOG.print("ms] Received ");
    LOG.print(rxIndex);
    LOG.print(" bytes (total: ");
    LOG.print(totalBytesReceived);
    LOG.println(")");

    // Hex dump
    LOG.print("  HEX: ");
    for (uint16_t i = 0; i < rxIndex; i++)
    {
        if (rxBuffer[i] < 0x10)
            LOG.print("0");
        LOG.print(rxBuffer[i], HEX);
        LOG.print(" ");

        // Line break every 16 bytes
        if ((i + 1) % 16 == 0 && i + 1 < rxIndex)
        {
            LOG.println();
            LOG.print("       ");
        }
    }
    LOG.println();

    // ASCII interpretation (printable chars only)
    LOG.print("  ASCII: \"");
    for (uint16_t i = 0; i < rxIndex; i++)
    {
        if (rxBuffer[i] >= 0x20 && rxBuffer[i] <= 0x7E)
        {
            LOG.print((char)rxBuffer[i]);
        }
        else
        {
            LOG.print(".");
        }
    }
    LOG.println("\"");

    // Try to interpret as BOSSA command
    interpretCommand();

    // Reset buffer
    rxIndex = 0;

    LOG.println("-------------------------------------------");
}

void interpretCommand()
{
    if (rxIndex == 0)
        return;

    LOG.print("  INTERPRETATION: ");

    // Check for auto-baud sync (0x80 bytes)
    int syncCount = 0;
    for (uint16_t i = 0; i < rxIndex && rxBuffer[i] == 0x80; i++)
    {
        syncCount++;
    }
    if (syncCount > 0)
    {
        LOG.print("Auto-baud sync (");
        LOG.print(syncCount);
        LOG.print(" x 0x80) ");
    }

    // Look for # terminated commands
    for (uint16_t i = 0; i < rxIndex; i++)
    {
        if (rxBuffer[i] == '#')
        {
            // Found command terminator, look back for command
            if (i >= 1)
            {
                char cmd = rxBuffer[i - 1];
                if (i >= 2 && rxBuffer[i - 2] >= 'A' && rxBuffer[i - 2] <= 'Z')
                {
                    // Two-char command prefix
                    cmd = rxBuffer[i - 2];
                }

                switch (cmd)
                {
                case 'N':
                    LOG.print("[N# = Set Normal/Binary Mode] ");
                    break;
                case 'V':
                    LOG.print("[V# = Get Version] ");
                    break;
                case 'T':
                    LOG.print("[T# = Set Terminal Mode] ");
                    break;
                case 'S':
                    LOG.print("[S...# = Write Binary] ");
                    break;
                case 'R':
                    LOG.print("[R...# = Read Binary] ");
                    break;
                case 'G':
                    LOG.print("[G...# = Go/Jump] ");
                    break;
                case 'O':
                    LOG.print("[O...# = Write Word] ");
                    break;
                case 'o':
                    LOG.print("[o...# = Read Word] ");
                    break;
                case 'H':
                    LOG.print("[H...# = Write Half-Word] ");
                    break;
                case 'h':
                    LOG.print("[h...# = Read Half-Word] ");
                    break;
                case 'W':
                    LOG.print("[W...# = Write Byte] ");
                    break;
                case 'w':
                    LOG.print("[w...# = Read Byte] ");
                    break;
                default:
                    if (rxBuffer[i - 1] == '#' && i >= 1)
                    {
                        // Just '#' alone (part of auto-baud)
                        LOG.print("[# = Auto-baud terminator] ");
                    }
                    else
                    {
                        LOG.print("[Unknown command: ");
                        LOG.print(cmd);
                        LOG.print("#] ");
                    }
                }
            }
        }
    }

    // Check for common issues
    if (rxIndex == 0)
    {
        LOG.print("[NO DATA]");
    }
    else if (rxBuffer[0] == 0x00)
    {
        LOG.print("[WARNING: Starts with NULL - possible framing issue]");
    }
    else if (rxBuffer[0] == 0xFF)
    {
        LOG.print("[WARNING: Starts with 0xFF - possible line noise]");
    }

    LOG.println();
}
