/* 
This version is meant for the black AMN3211 slight motion detector.
The detector can be installed directly onto the proto board with 

GND pin connecting to spark core's D0
OUT pin connecting to D1
VDD pin connecting to D2

We're using digital out pins for power and ground because it's
convenient and doesn't require any wiring.
*/

const bool kDebugLED = false;
// in debug mode the rgb led changes color to show motionState

const int kGnd = D0;
const int kPir = D1;
const int kVcc = D2;

// timer system built to accomodate multiple timers
// though here only have one timer, the debounce timer
// indices for timers
const int PIR_DEBOUNCE_TIMER = 0;

// used by setTimer and isTimeUp functions. Each of these arrays has
// one item for each timer. I.e. lenght of arrays should be same
// as number of timers.
unsigned long tmrState[] = { 0 }; // ms since timer was started
unsigned long tmrLengths[] = { 50 }; // length in ms of different timers

// this is debounced state read by cloud function
int motionState = 0;

// tracks raw reads of PIR sensor before debouncing
int pirRead = 0;
int lastPirRead = 0;

// set (or reset) a timer
void setTimer(int index) {
    tmrState[index] = millis();
}

// has the timer exceeded it's limit?
bool isTimeUp(int index) {
    return (millis() - tmrState[index] >= tmrLengths[index]);
}

void setup() {
    pinMode(kGnd, OUTPUT);
    digitalWrite(kGnd, LOW);
    pinMode(kVcc, OUTPUT);
    digitalWrite(kVcc, HIGH);
    pinMode(kPir, INPUT_PULLDOWN);

    Particle.function("getMotion", getMotion);

    RGB.control(true);
}

void updateDisplay() {
  if (kDebugLED) {
    if (motionState) {
      RGB.color(255, 0, 0);
    } else {
      RGB.color(0, 255, 0);
    }
  } else {
    RGB.color(0, 0, 0);
  }
}

// debounce raw pin input by ensuring pin stays in new state for
// minimum time before settting motionState
void updateMotionState() {
  // pir debounce code
  int pirRead = digitalRead(kPir);

  if(pirRead != lastPirRead) { // pir read changed
    setTimer(PIR_DEBOUNCE_TIMER); // start a timer
  }
  lastPirRead = pirRead;

  if(isTimeUp(PIR_DEBOUNCE_TIMER)) {
    // we have the same readstate for awhile now.
    // only set motionState to 1 if pirState has been 1
    // for awhile. Never set motionState to 0 in this function.
    // Motion state is sticky to 1. 
    // Reading motionState from a cloud function, sets it to 0.
    if (pirRead == 1) {
      motionState = 1;
    }
  }
}

// function to get motion state, exposed to cloud
int getMotion(String unused) {
  int localMotionState = motionState;
  motionState = 0;
  return localMotionState;
}

void loop() {
    updateDisplay();
    updateMotionState();
}