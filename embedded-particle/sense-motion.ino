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

const int buttonLongPressDelay = 2500;
int lastButtonPressTime = 0;
// hold on to button state until cleared by cloud function
int buttonStateForCloud = 0;
bool lastButtonReading = false;

const bool kDebugLED = true;
// in debug mode the rgb led changes color to show motionState

// PIR sensor declarations
const int kGnd = D0;
const int kPir = D1;
const int kVcc = D2;

// tracks how many PIR reads have been high in a row
// 10 is too sensitive, 20 works ok
const int onThreshold = 20;
const int maxOn = 180;
int highReads = 0;

int motionState = 0;
const int NO_MOTION = 0;
const int MOTION = 1;

// used to temporarily set LED to a color
int keepLEDColor = 0;

void setup() {
    pinMode(kGnd, OUTPUT);
    digitalWrite(kGnd, LOW);
    pinMode(kVcc, OUTPUT);
    digitalWrite(kVcc, HIGH);
    pinMode(kPir, INPUT_PULLDOWN);

    pinMode(kSwitchGnd, OUTPUT);
    digitalWrite(kSwitchGnd, LOW);
    pinMode(kSwitchVcc, OUTPUT);
    digitalWrite(kSwitchVcc, HIGH);
    pinMode(kSwitchSense, INPUT_PULLDOWN);

    Particle.function("getMotion", getMotion);
    Particle.function("getButton", getButton);
    Particle.function("setMotion", setMotion);

    RGB.control(true);

    // Serial.begin(9600);
}

bool getButtonState() {
  return digitalRead(kSwitchSense) == HIGH;
}

void buttonLoop() {
  int buttonReading = getButtonState();

  if (buttonReading != lastButtonReading) {
    lastButtonReading = buttonReading;

    // button just pressed or released
    if (buttonReading) {
      // button pressed
      lastButtonPressTime = millis();
      RGB.color(0, 0, 255);
      keepLEDColor = 10;
    } else {
      // button released
      if (millis() - lastButtonPressTime < buttonLongPressDelay) {
        // button released after a short time
        RGB.color(0, 0, 255);
        keepLEDColor = 20; // keep color for 20 cycles
        buttonStateForCloud = 1;
      }
    }
  }

  if (buttonReading) {
    // button is pressed, either just now or before
    if (millis() - lastButtonPressTime > buttonLongPressDelay) {
      RGB.color(255, 0, 255);
      keepLEDColor = 20; // keep color for 20 cycles
      buttonStateForCloud = 2;
    } else {
      RGB.color(0, 0, 255);
      keepLEDColor = 10;
    }
  }
}

void updateDisplay() {
  if (keepLEDColor > 0) {
    // keep the LED color the same
    keepLEDColor = keepLEDColor - 1;
  } else {
    if (kDebugLED) {
      if (motionState == MOTION) {
        RGB.color(255, 0, 0);
      } else {
        int b = (int) (((float)highReads / (float)maxOn) * 255);
        RGB.color(b, b, b);
      }
    } else {
      RGB.color(0, 0, 0);
    }
  }
}

void updateMotionState() {
  int read = digitalRead(kPir);
  if (read == HIGH) {
    highReads = min(highReads + 1, maxOn);
  } else {
    highReads = max(highReads - 3, 0);
  }

  // Serial.println(String(highReads));

  if (highReads >= onThreshold) {
    motionState = MOTION;
    highReads = 0;
    return;
  }

  // keep at 0 until cloud reads
  // state.
  if (motionState == MOTION) {
    highReads = 0;
  }
}

// used to remotely turn light on
int setMotion(String unused) {
  motionState = MOTION;
  return 0;
}

// function to get motion state, exposed to cloud
int getMotion(String unused) {
  int localMotionState = motionState;
  motionState = NO_MOTION;
  return localMotionState;
}

int getButton(String unused) {
  int r = buttonStateForCloud;
  buttonStateForCloud = 0;
  return r;
}

void loop() {
    delay(50);
    updateDisplay();
    updateMotionState();
    buttonLoop();
}