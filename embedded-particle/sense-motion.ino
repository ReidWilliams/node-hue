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
// in debug mode the rgb led changes color with the pir signal

const int kGnd = D0;
const int kPir = D1;
const int kVcc = D2;

//const int kOnboardLed = D7;

// indices for timers
const int PIR_DEBOUNCE_TIMER = 0;
const int PIR_RED_YELLOW_DELAY_TIMER = 1;
const int PIR_YELLOW_GREEN_DELAY_TIMER = 2;
const int POST_TIMER = 3;

bool debugMode = false;
/* when this is true, the RGB led will show the immediate pir state not
the sticky pir state. This can be changed with a cloud exposed function (see below)
*/

// used by setTimer and isTimeUp functions
bool tmrActive[] = {false, false, false, false};
unsigned long tmrState[] = {0, 0, 0, 0};
unsigned long tmrLengths[] = {50, 10*1000, 10*1000, 30*1000}; // length in ms of different timers

int lastPirRead = HIGH; // PIR_DEBOUNCE_TIMER is HIGH when it reads movement

int pirOccupied = LOW; // sticky state of pir sensor
// logic is that pirOccupied is set HIGH whenever pirOccupied now is high. pirOcupied
// only goes LOW when pirLive is low for a pre-determined amount of time.
int pirLive = LOW; // state of pir sensor after debounce delay
int lastPirOccupiedNow = LOW;

const int OccupiedStatusAvailable = 0;
const int OccupiedStatusMaybeAvailable = 1;
const int OccupiedStatusOccupied = 2;
int occupiedState = OccupiedStatusAvailable; // green,


// set (or reset) a timer
void setTimer(int index) {
    tmrState[index] = millis();
    tmrActive[index] = true;
}

void clearTimer(int index) {
  tmrState[index] = 0;
  tmrActive[index] = false;
}

bool isTimerActive(int index) {
  return tmrActive[index];
}

// has the timer exceeded it's limit?
bool isTimeUp(int index) {
    return (millis() - tmrState[index] >= tmrLengths[index]);
}

/* 
if mode is anything other than "", puts the core
into debug mode. Core funtions the same, except
rgb LED is activated and tells the immediate state
of the pir rather than the sticky state.
*/
int setDebugMode(String mode) {
  if(mode != "") {
    debugMode = true;
  } else {
    debugMode = false;
  }
  return 0;
}

void setup() {
    pinMode(kGnd, OUTPUT);
    digitalWrite(kGnd, LOW);
    
    pinMode(kVcc, OUTPUT);
    digitalWrite(kVcc, HIGH);

    pinMode(kPir, INPUT_PULLDOWN);
    //pinMode(kOnboardLed, OUTPUT);
    Particle.variable("pirThere", &occupiedState, INT);
    setTimer(POST_TIMER);
    RGB.control(true);

    Particle.function("setDebugMode", setDebugMode);
}

void updateDisplay() {
  bool showGreen;
  if(debugMode == true) {
    // led shows immediate pir status
    showGreen = (pirLive == LOW);
  } else if (kDebugLED == true) {
    showGreen = (occupiedState == OccupiedStatusAvailable);
  } else {
    RGB.color(0, 0, 0);
  }

  if(kDebugLED || debugMode) {
    if(showGreen) {
      RGB.color(0, 255, 0);
    } else {
      RGB.color(255, 0, 0);
    }
  } else {
    RGB.color(0, 0, 50);
  }
}

void updatePirLive() {
  // pir debounce code
  int pirRead = digitalRead(kPir);

  if(pirRead != lastPirRead) { // pir read changed
      setTimer(PIR_DEBOUNCE_TIMER); // start a timer
  }
  lastPirRead = pirRead;

  if(isTimeUp(PIR_DEBOUNCE_TIMER)) {
      // we have the same readstate for awhile now.
      pirLive = pirRead;
  }
}

void updateOccupiedState() {
  if (pirLive == HIGH) {
    occupiedState = OccupiedStatusOccupied;
    // invalidate timers
    clearTimer(PIR_RED_YELLOW_DELAY_TIMER);
    clearTimer(PIR_YELLOW_GREEN_DELAY_TIMER);
  } else {

    if (pirLive == LOW && occupiedState == OccupiedStatusOccupied) {
      if(!isTimerActive(PIR_RED_YELLOW_DELAY_TIMER)) {
        setTimer(PIR_RED_YELLOW_DELAY_TIMER);
      } else {
        if (isTimeUp(PIR_RED_YELLOW_DELAY_TIMER)) {
          // go from red to yellow
          occupiedState = OccupiedStatusMaybeAvailable;
          clearTimer(PIR_RED_YELLOW_DELAY_TIMER);
          setTimer(PIR_YELLOW_GREEN_DELAY_TIMER);
        }
      }
    } else if (pirLive == LOW && occupiedState == OccupiedStatusMaybeAvailable) {
      if (!isTimerActive(PIR_YELLOW_GREEN_DELAY_TIMER)) {
        setTimer(PIR_YELLOW_GREEN_DELAY_TIMER);
      } else {
        if (isTimeUp(PIR_YELLOW_GREEN_DELAY_TIMER)) {
          // go from yellow to green
          occupiedState = OccupiedStatusAvailable;
          clearTimer(PIR_YELLOW_GREEN_DELAY_TIMER);
        }
      }
    }
  }
}

void publishEvents() {
  // post to api timer
  if (isTimeUp(POST_TIMER)) {
      /*Spark.publish("pirThere", String(pirOccupied));
      Spark.publish("pirThereNow", String(pirLive));*/
      // Spark.publish("occupiedState", String(occupiedState));
      setTimer(POST_TIMER);
  }
}

void loop() {
    updateDisplay();
    updatePirLive(); // debounce pir pin input
    updateOccupiedState();
    publishEvents();
}