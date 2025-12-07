#include <Servo.h>

Servo myservo;  // create servo object to control a servo
// twelve servo objects can be created on most boards

int pos = 0;         // variable to store the servo position
int sweepCount = 0;  // count sweep cycles

void setup() {
  Serial.begin(9600);
  Serial.println("=== Servo Demo Starting ===");
  Serial.println("Attaching servo to pin 9...");
  myservo.attach(9);  // attaches the servo on pin 9 to the servo object
  Serial.println("Servo attached. Beginning sweep...");
}

void loop() {
  sweepCount++;
  Serial.print("\n--- Sweep #");
  Serial.print(sweepCount);
  Serial.println(" ---");

  Serial.println("Sweeping 0 -> 180 degrees");
  for (pos = 0; pos <= 180; pos += 1) {  // goes from 0 degrees to 180 degrees
    // in steps of 1 degree
    myservo.write(pos);  // tell servo to go to position in variable 'pos'
    if (pos % 30 == 0) {
      Serial.print("  Position: ");
      Serial.print(pos);
      Serial.println(" deg");
    }
    delay(15);  // waits 15ms for the servo to reach the position
  }

  Serial.println("Sweeping 180 -> 0 degrees");
  for (pos = 180; pos >= 0; pos -= 1) {  // goes from 180 degrees to 0 degrees
    myservo.write(pos);                  // tell servo to go to position in variable 'pos'
    if (pos % 30 == 0) {
      Serial.print("  Position: ");
      Serial.print(pos);
      Serial.println(" deg");
    }
    delay(15);  // waits 15ms for the servo to reach the position
  }

  Serial.print("Sweep #");
  Serial.print(sweepCount);
  Serial.println(" complete");
}