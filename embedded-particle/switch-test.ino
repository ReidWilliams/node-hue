const int kSwitchVcc = D5;
const int kSwitchGnd = D6;
const int kSwitchSense = D7;

const int debounceDelay = 50;
const int doubleClickDelay = 300;

int lastButtonStateChangeTime = 0;
int lastButtonReleaseTime = 0;
int buttonPresses = 0;
bool lastButtonReading = false;
bool buttonState = false;

void setup() {
  pinMode(kSwitchGnd, OUTPUT);
  digitalWrite(kSwitchGnd, LOW);
  pinMode(kSwitchVcc, OUTPUT);
  digitalWrite(kSwitchVcc, HIGH);
  pinMode(kSwitchSense, INPUT_PULLDOWN);

  RGB.control(true);
  RGB.color(255, 255, 255);
}

bool getButtonState() {
  return digitalRead(kSwitchSense) == LOW;
}

void setLED(int clicks) {
  if (clicks == 1) {
    RGB.color(0, 0, 255);
  } else if(clicks == 2) {
    RGB.color(255, 0, 0);
  }
}

void loop() {
  int buttonReading = getButtonState();

  // reset timer
  if (buttonReading != lastButtonReading) {
    lastButtonStateChangeTime = millis();
  }
  lastButtonReading = buttonReading;


  if ((millis() - lastButtonStateChangeTime) > debounceDelay) {
    // It's been debounceDelay and no button state changes
    if (buttonReading != buttonState) {
      // real (not bouncy) change to button state
      buttonState = buttonReading;
      if (!buttonReading) {
        // button is off, so increase number of button presses by 1
        // and set time of last button press
        buttonPresses = buttonPresses + 1;
        lastButtonReleaseTime = millis();
      } 
    }
  }

  if ((millis() - lastButtonReleaseTime) > doubleClickDelay) {
    // time to wait for a second click is up
    setLED(buttonPresses);
    buttonPresses = 0;
  }
}