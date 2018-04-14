/* 
This version is meant for the black AMN3211 slight motion detector.
The detector can be installed directly onto the proto board with 

GND pin connecting to spark core's D0
OUT pin connecting to D1
VDD pin connecting to D2

We're using digital out pins for power and ground because it's
convenient and doesn't require any wiring.

This version also has a pushbutton switch. Pushing once or double
pushing sets variables that are delieved to cloud calling code.
*/

// switch variable declarations
const int kSwitchVcc = D5;
const int kSwitchGnd = D6;
const int kSwitchSense = D7;

const int buttonLongPressDelay = 5000;

int lastButtonPressTime = 0;
// hold on to button state until cleared by cloud function
// int buttonStateForCloud = 0;
bool lastButtonReading = false;

const bool kDebugLED = true;
// in debug mode the rgb led changes color to show motionState

void setup() {
    pinMode(kSwitchGnd, OUTPUT);
    digitalWrite(kSwitchGnd, LOW);
    pinMode(kSwitchVcc, OUTPUT);
    digitalWrite(kSwitchVcc, HIGH);
    pinMode(kSwitchSense, INPUT_PULLDOWN);

    RGB.control(true);

    // Serial.begin(9600);
}

bool getButtonState() {
  return digitalRead(kSwitchSense) == HIGH;
}

void buttonLoop() {
  int buttonReading = getButtonState();

  if (buttonReading != lastButtonReading) {
    // button just pressed or released
    if (buttonReading) {
      // button pressed
      lastButtonPressTime = millis();
      RGB.color(0, 0, 255);
    } else {
      // button released
      if (millis() - lastButtonPressTime < buttonLongPressDelay) {
        // button released after a short time
        RGB.color(0, 255, 0);
      }
    }

    lastButtonReading = buttonReading;
  }

  if (buttonReading) {
    // button is pressed, either just now or before
    if (millis() - lastButtonPressTime > buttonLongPressDelay) {
      RGB.color(255, 0, 255);
    }
  }
}

void loop() {
    delay(50);
    buttonLoop();
}