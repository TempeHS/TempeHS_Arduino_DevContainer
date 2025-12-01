/*
  Blink

  Toggles a LED at a set period and prints a status to the serial monitor, repeatedly.

  Most Arduinos have an on-board LED you can control. On the UNO, MEGA and ZERO
  it is attached to digital pin 13, on MKR1000 on pin 6. LED_BUILTIN is set to
  the correct LED pin independent of which board is used.
  If you want to know what pin the on-board LED is connected to on your Arduino
  model, check the Technical Specs of your board at:
  https://www.arduino.cc/en/Main/Products

  @author Ben Jones
*/

// the setup function runs once when you press reset or power the board
void setup()
{
  // initialize digital pin LED_BUILTIN as an output.
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(115200);
}

// the loop function runs over and over again forever
void loop()
{
  digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN)); // toggle the LED state
  Serial.println(digitalRead(LED_BUILTIN) ? "LED is ON" : "LED is OFF");
  delay(1500); // wait for a 1.5 seconds
}