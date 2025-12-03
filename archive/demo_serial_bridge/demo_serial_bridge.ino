/**
 * Serial Bridge - Receives from Browser, Forwards to Sniffer
 *
 * This Arduino connects to the browser's Web Serial API.
 * It forwards ALL received bytes to the Sniffer Arduino via pins.
 *
 * FLOW:
 *   Browser (Web Serial) --> Bridge (USB) --> Bridge (Pin 3 TX)
 *                                                    |
 *                                                    v
 *                                             Sniffer (Pin 0 RX)
 *                                                    |
 *                                                    v
 *                                             IDE Serial Monitor
 *
 * WIRING:
 *   Bridge Arduino          Sniffer Arduino
 *   --------------          ----------------
 *   Pin 3 (SoftTX)  ------> Pin 0 (RX)
 *   GND             ------> GND
 *
 * USAGE:
 * 1. Upload this sketch to Bridge Arduino
 * 2. Upload sniffer sketch to Sniffer Arduino
 * 3. Wire Pin 3 (Bridge) to Pin 0 (Sniffer), and GND to GND
 * 4. Open Serial Monitor on SNIFFER Arduino at 115200 baud
 * 5. Connect Browser to BRIDGE Arduino via Web Serial
 * 6. Run arduino-bridge upload
 * 7. Watch Sniffer's Serial Monitor for captured bytes!
 */

#include <SoftwareSerial.h>

// Software serial to SEND to the sniffer
// RX on pin 2 (not used), TX on pin 3 (sends to sniffer)
SoftwareSerial toSniffer(2, 3); // RX=2, TX=3

// Statistics
uint32_t bytesForwarded = 0;
uint32_t lastActivity = 0;

void setup()
{
    // USB Serial - receives from browser Web Serial API
    Serial.begin(115200);

    // Software Serial - sends to sniffer Arduino
    toSniffer.begin(115200);

    // Send startup message to sniffer
    delay(500);
    toSniffer.println();
    toSniffer.println("[BRIDGE] Started - waiting for browser data...");

    // Also blink LED to show we're alive
    pinMode(LED_BUILTIN, OUTPUT);
    digitalWrite(LED_BUILTIN, HIGH);
    delay(200);
    digitalWrite(LED_BUILTIN, LOW);
}

void loop()
{
    // Forward everything from USB (browser) to sniffer
    while (Serial.available())
    {
        uint8_t b = Serial.read();
        toSniffer.write(b);
        bytesForwarded++;
        lastActivity = millis();

        // Blink LED on activity
        digitalWrite(LED_BUILTIN, HIGH);
    }

    // Turn off LED after 50ms of no activity
    if (millis() - lastActivity > 50)
    {
        digitalWrite(LED_BUILTIN, LOW);
    }
}
