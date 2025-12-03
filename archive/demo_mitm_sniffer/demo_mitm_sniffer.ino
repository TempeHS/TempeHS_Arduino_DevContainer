/**
 * Man-in-the-Middle Serial Sniffer
 *
 * This sketch sits BETWEEN the Arduino IDE and the UNO R4 WiFi,
 * capturing traffic in BOTH directions to see what a successful
 * upload looks like.
 *
 * FLOW:
 *   Arduino IDE (PC) <--USB--> This Arduino <--Pins--> UNO R4 WiFi
 *
 * This Arduino acts as a transparent bridge, logging all bytes
 * that pass through in either direction.
 *
 * WIRING:
 *   This Arduino          UNO R4 WiFi
 *   --------------        -----------
 *   Pin 2 (SoftRX) <----- TX (Pin 1)   [R4 sends TO us]
 *   Pin 3 (SoftTX) -----> RX (Pin 0)   [We send TO R4]
 *   GND            -----> GND
 *
 * IMPORTANT: The R4 must NOT have USB connected during this test!
 *            Only this Arduino connects to the PC.
 *
 * USAGE:
 * 1. Upload this sketch to a standard Arduino (Uno, Nano, Mega)
 * 2. Wire this Arduino to R4 as shown above
 * 3. Put R4 into bootloader mode (double-tap reset, LED pulses)
 * 4. Do NOT connect R4's USB - only this Arduino connects to PC
 * 5. In Arduino IDE, select THIS Arduino's port
 * 6. Open Serial Monitor at 115200 to see traffic log
 * 7. In a second IDE window, try to upload to "R4" (actually goes through us)
 *
 * NOTE: This won't actually work for uploading (timing too slow),
 *       but it will show us what the IDE sends!
 *
 * ALTERNATIVE SIMPLER TEST:
 * Just put R4 in bootloader mode and manually send N# V# via
 * Serial Monitor to see if it responds.
 */

#include <SoftwareSerial.h>

// Software serial to communicate with R4
// Pin 2 = RX (receives from R4's TX)
// Pin 3 = TX (sends to R4's RX)
SoftwareSerial toR4(2, 3);

// Buffers for logging
#define BUFFER_SIZE 64
uint8_t pcBuffer[BUFFER_SIZE];
uint8_t r4Buffer[BUFFER_SIZE];
uint8_t pcIndex = 0;
uint8_t r4Index = 0;
uint32_t lastPcTime = 0;
uint32_t lastR4Time = 0;

#define DUMP_TIMEOUT_MS 50

uint32_t totalFromPC = 0;
uint32_t totalFromR4 = 0;

void setup()
{
    // USB Serial - connects to PC (Arduino IDE)
    Serial.begin(1200); // Start at 1200 for touch detection

    // Software Serial - connects to R4
    toR4.begin(115200);

    pinMode(LED_BUILTIN, OUTPUT);

    // Blink to show we're ready
    for (int i = 0; i < 3; i++)
    {
        digitalWrite(LED_BUILTIN, HIGH);
        delay(100);
        digitalWrite(LED_BUILTIN, LOW);
        delay(100);
    }
}

void loop()
{
    // Forward PC -> R4 and log
    while (Serial.available())
    {
        uint8_t b = Serial.read();
        toR4.write(b);
        totalFromPC++;

        if (pcIndex < BUFFER_SIZE)
        {
            pcBuffer[pcIndex++] = b;
        }
        lastPcTime = millis();
        digitalWrite(LED_BUILTIN, HIGH);
    }

    // Forward R4 -> PC and log
    while (toR4.available())
    {
        uint8_t b = toR4.read();
        Serial.write(b);
        totalFromR4++;

        if (r4Index < BUFFER_SIZE)
        {
            r4Buffer[r4Index++] = b;
        }
        lastR4Time = millis();
        digitalWrite(LED_BUILTIN, HIGH);
    }

    // Dump PC buffer after timeout
    if (pcIndex > 0 && millis() - lastPcTime > DUMP_TIMEOUT_MS)
    {
        dumpBuffer("PC->R4", pcBuffer, pcIndex, totalFromPC);
        pcIndex = 0;
    }

    // Dump R4 buffer after timeout
    if (r4Index > 0 && millis() - lastR4Time > DUMP_TIMEOUT_MS)
    {
        dumpBuffer("R4->PC", r4Buffer, r4Index, totalFromR4);
        r4Index = 0;
    }

    // Turn off LED when idle
    if (millis() - lastPcTime > 100 && millis() - lastR4Time > 100)
    {
        digitalWrite(LED_BUILTIN, LOW);
    }
}

void dumpBuffer(const char *direction, uint8_t *buf, uint8_t len, uint32_t total)
{
    // Note: This actually prints to the same serial that IDE uses,
    // which would corrupt the data stream. See alternative below.

    // For real MITM, we'd need a third serial (like Serial1 on Mega)
    // or store and dump later.

    // For now, this sketch is mainly conceptual - see simpler test below
}
