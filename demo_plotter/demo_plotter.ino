/*
  Serial Plotter Test Sketch

  This Arduino sketch sends different waveforms (sine, square, triangle, and random)
  to the Arduino IDE's Serial Plotter, demonstrating how multiple variables
  can be visualized in real-time.

  WARNING: random() is broken on Uno R4 WiFi - use demo_r4wifi_plotter instead

  @author Ben Jones
*/

const int sampleRate = 50; // Hz
const float freq = 1.0;    // Hz
unsigned long lastMillis = 0;
float time = 0.0;

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

    // Generate signals
    float sineVal = sin(2 * PI * freq * time);
    float squareVal = (sineVal >= 0) ? 1.0 : -1.0;
    float triVal = 2.0 * abs(2.0 * (time * freq - floor(time * freq + 0.5))) - 1.0;
    float randomVal = random(-100, 100) / 100.0;

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