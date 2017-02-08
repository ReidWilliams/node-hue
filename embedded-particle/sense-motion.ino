/* 
This version is meant for the black AMN3211 slight motion detector.
The detector can be installed directly onto the proto board with 

GND pin connecting to spark core's D0
OUT pin connecting to D1
VDD pin connecting to D2

We're using digital out pins for power and ground because it's
convenient and doesn't require any wiring.
*/

const bool kDebugLED = true;
// in debug mode the rgb led changes color to show motionState

const int kGnd = D0;
const int kPir = D1;
const int kVcc = D2;

// tracks how many PIR reads have been high in a row
const int reallyOnThreshold = 180;
// 10 is too sensitive, 20 works ok
const int onThreshold = 15;
int highReads = 0;

// 0 is off, 1 is motion, 2 is waving motion
int motionState = 0;
const int NO_MOTION = 0;
const int MOTION = 1;
const int HIGH_MOTION = 2;

void setup() {
    pinMode(kGnd, OUTPUT);
    digitalWrite(kGnd, LOW);
    pinMode(kVcc, OUTPUT);
    digitalWrite(kVcc, HIGH);
    pinMode(kPir, INPUT_PULLDOWN);

    Particle.function("getMotion", getMotion);
    Particle.function("setMotion", setMotion);

    RGB.control(true);

    Serial.begin(9600);
}

void updateDisplay() {
  if (kDebugLED) {
    if (motionState == HIGH_MOTION) {
      RGB.color(0, 0, 255);
    } else {
      int b = (int) (((float)highReads / (float)reallyOnThreshold) * 255);
      RGB.color(b, 0, 0);
    }
  } else {
    RGB.color(0, 0, 0);
  }
}

void updateMotionState() {
  int read = digitalRead(kPir);
  if (read == HIGH) {
    highReads = min(highReads + 1, reallyOnThreshold);
  } else {
    highReads = max(highReads - 3, 0);
  }

  Serial.println(String(highReads));

  if (highReads >= onThreshold) {
    motionState = MOTION;
    return;
  }

  if (highReads >= reallyOnThreshold) {
    motionState = HIGH_MOTION;
    return;
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

void loop() {
    delay(50);
    updateDisplay();
    updateMotionState();
}