/*
  Serial Plotter Test Sketch (R4 WiFi Compatible)

  This Arduino sketch sends different waveforms (sine, square, triangle, and random)
  to the Arduino IDE's Serial Plotter, demonstrating how multiple variables
  can be visualized in real-time.

  NOTE: Uses LCG pseudo-random instead of random() which crashes on Uno R4 WiFi

  @author Ben Jones
*/

const int sampleRate = 50; // Hz
const float freq = 1.0;    // Hz
unsigned long lastMillis = 0;
float time = 0.0;
int loopCounter = 0;

void setup()
{
    pinMode(LED_BUILTIN, OUTPUT);
    digitalWrite(LED_BUILTIN, HIGH);

    Serial.begin(115200);
    Serial.println("Sine\tSquare\tTri\tRandom");
}

void loop()
{
    if (millis() - lastMillis >= 1000 / sampleRate)
    {
        lastMillis = millis();
        time += 1.0 / sampleRate;
        loopCounter++;

        // Generate signals
        float sineVal = sin(2 * PI * freq * time);
        float squareVal = (sineVal >= 0) ? 1.0 : -1.0;
        float triVal = 2.0 * abs(2.0 * (time * freq - floor(time * freq + 0.5))) - 1.0;

        // LCG pseudo-random - avoids broken random() on R4 WiFi
        float randomVal = (float)((loopCounter * 1103515245 + 12345) % 201 - 100) / 100.0;

        // Print in tab-separated format for Serial Plotter
        Serial.print(sineVal, 3);
        Serial.print("\t");
        Serial.print(squareVal, 3);
        Serial.print("\t");
        Serial.print(triVal, 3);
        Serial.print("\t");
        Serial.println(randomVal, 3);
    }
}
