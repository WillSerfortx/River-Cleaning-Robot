export const ESP32_FIRMWARE_INO = `/*
 * =====================================================================
 * RIVERBOT - ESP32 SMART RIVER CLEANING ROBOT FIRMWARE (PRO VERSION)
 * Microcontroller: ESP32 DevKit V1 (Dual Core 240MHz, Wi-Fi 802.11 b/g/n)
 * Communication: WebSocket Server (ws://<IP>:80/ws) + HTTP REST (/api/command)
 * Safety: Hardware E-Stop ISR + FreeRTOS 1500ms Command Timeout Watchdog
 * =====================================================================
 */

#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>

// ----------------- WI-FI CONFIGURATION -----------------
const char* WIFI_SSID_AP   = "RIVERBOT-AP";     // Access Point SSID
const char* WIFI_PASS_AP   = "riverclean123";  // AP Password
IPAddress local_IP(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

// ----------------- MOTOR PIN ASSIGNMENTS (L298N / TB6612) -----------------
// Left Motor (Propulsion / Rudder)
#define PIN_LEFT_IN1      18
#define PIN_LEFT_IN2      19
#define PIN_LEFT_PWM      5    // LEDC PWM Channel 0

// Right Motor (Propulsion / Rudder)
#define PIN_RIGHT_IN3     21
#define PIN_RIGHT_IN4     22
#define PIN_RIGHT_PWM     23   // LEDC PWM Channel 1

// Conveyor Belt Motor (Relay or High-Current MOSFET / Driver)
#define PIN_CONVEYOR_RELAY 25  // Active HIGH or PWM Channel 2
#define PIN_CONVEYOR_PWM   26

// ----------------- SENSOR PIN ASSIGNMENTS -----------------
// HC-SR04 Ultrasonic Sensors (Front, Left, Right)
#define PIN_TRIG_FRONT     13
#define PIN_ECHO_FRONT     12
#define PIN_TRIG_LEFT      14
#define PIN_ECHO_LEFT      27
#define PIN_TRIG_RIGHT     32
#define PIN_ECHO_RIGHT     33

// Water Quality & Health Sensors (Analog ADC1 pins)
#define PIN_PH_SENSOR      34  // Analog pH probe interface (ADC1)
#define PIN_TURBIDITY      35  // Analog Optical Turbidity (ADC1)
#define PIN_BATTERY_VOLT   36  // Resistor Divider (e.g. 100k / 22k for 12V LiPo)
#define PIN_BIN_FULL_FLOAT 39  // Trash Bin Limit Switch or IR Sensor

// Hardware Emergency Stop Pushbutton
#define PIN_HW_ESTOP       4   // Pullup with Debounce Interrupt

// ----------------- PWM SETTINGS -----------------
const int PWM_FREQ        = 5000;
const int PWM_RESOLUTION  = 8; // 8-bit (0 - 255)
const int PWM_CHAN_LEFT   = 0;
const int PWM_CHAN_RIGHT  = 1;
const int PWM_CHAN_CONV   = 2;

// ----------------- ROBOT RUNTIME STATE -----------------
enum RobotMode { MODE_MANUAL, MODE_AUTONOMOUS };
enum RobotDirection { DIR_STOP, DIR_FORWARD, DIR_BACKWARD, DIR_LEFT, DIR_RIGHT };

volatile bool isEmergencyStop = false;
volatile unsigned long lastCommandTimestamp = 0;
const unsigned long COMMAND_TIMEOUT_MS = 1500; // Watchdog failsafe

RobotMode currentMode = MODE_MANUAL;
RobotDirection currentDir = DIR_STOP;
int robotSpeedPercent = 75; // 0 - 100
bool conveyorRunning = false;
int conveyorSpeedPercent = 80;

// Sensor Readings Cache
float frontDistanceCm = 100.0;
float leftDistanceCm  = 100.0;
float rightDistanceCm = 100.0;
float phValue = 7.2;
float turbidityNtu = 15.0;
float batteryVoltage = 12.4;
int batteryPercent = 90;
int binFillPercent = 20;

// Web Server & WebSocket
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// ----------------- INTERRUPT SERVICE ROUTINES -----------------
void IRAM_ATTR handleEmergencyStopISR() {
  isEmergencyStop = true;
  digitalWrite(PIN_LEFT_IN1, LOW);
  digitalWrite(PIN_LEFT_IN2, LOW);
  digitalWrite(PIN_RIGHT_IN3, LOW);
  digitalWrite(PIN_RIGHT_IN4, LOW);
  digitalWrite(PIN_CONVEYOR_RELAY, LOW);
  ledcWrite(PWM_CHAN_LEFT, 0);
  ledcWrite(PWM_CHAN_RIGHT, 0);
  ledcWrite(PWM_CHAN_CONV, 0);
}

// ----------------- MOTOR ACTUATION LOGIC -----------------
void setMotors(int leftDir, int leftPwm, int rightDir, int rightPwm) {
  if (isEmergencyStop) {
    ledcWrite(PWM_CHAN_LEFT, 0);
    ledcWrite(PWM_CHAN_RIGHT, 0);
    return;
  }

  // Left Motor Control: 1 = Forward, -1 = Reverse, 0 = Stop
  if (leftDir > 0) {
    digitalWrite(PIN_LEFT_IN1, HIGH);
    digitalWrite(PIN_LEFT_IN2, LOW);
  } else if (leftDir < 0) {
    digitalWrite(PIN_LEFT_IN1, LOW);
    digitalWrite(PIN_LEFT_IN2, HIGH);
  } else {
    digitalWrite(PIN_LEFT_IN1, LOW);
    digitalWrite(PIN_LEFT_IN2, LOW);
  }
  ledcWrite(PWM_CHAN_LEFT, constrain(leftPwm, 0, 255));

  // Right Motor Control
  if (rightDir > 0) {
    digitalWrite(PIN_RIGHT_IN3, HIGH);
    digitalWrite(PIN_RIGHT_IN4, LOW);
  } else if (rightDir < 0) {
    digitalWrite(PIN_RIGHT_IN3, LOW);
    digitalWrite(PIN_RIGHT_IN4, HIGH);
  } else {
    digitalWrite(PIN_RIGHT_IN3, LOW);
    digitalWrite(PIN_RIGHT_IN4, LOW);
  }
  ledcWrite(PWM_CHAN_RIGHT, constrain(rightPwm, 0, 255));
}

void applyMovement(RobotDirection dir, int speedPct) {
  if (isEmergencyStop) return;
  int pwmVal = map(constrain(speedPct, 0, 100), 0, 100, 0, 255);

  switch (dir) {
    case DIR_FORWARD:
      setMotors(1, pwmVal, 1, pwmVal);
      break;
    case DIR_BACKWARD:
      setMotors(-1, pwmVal, -1, pwmVal);
      break;
    case DIR_LEFT:
      setMotors(-1, (int)(pwmVal * 0.7), 1, pwmVal); // Differential spin
      break;
    case DIR_RIGHT:
      setMotors(1, pwmVal, -1, (int)(pwmVal * 0.7));
      break;
    case DIR_STOP:
    default:
      setMotors(0, 0, 0, 0);
      break;
  }
}

void setConveyor(bool enable, int speedPct = 80) {
  if (isEmergencyStop) {
    conveyorRunning = false;
    digitalWrite(PIN_CONVEYOR_RELAY, LOW);
    ledcWrite(PWM_CHAN_CONV, 0);
    return;
  }
  conveyorRunning = enable;
  digitalWrite(PIN_CONVEYOR_RELAY, enable ? HIGH : LOW);
  int convPwm = enable ? map(speedPct, 0, 100, 0, 255) : 0;
  ledcWrite(PWM_CHAN_CONV, convPwm);
}

// ----------------- SENSOR ACQUISITION -----------------
float readDistanceCm(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH, 25000); // 25ms timeout (~4m)
  if (duration == 0) return 300.0; // Out of range or clear
  return duration * 0.034 / 2.0;
}

void readAllSensors() {
  frontDistanceCm = readDistanceCm(PIN_TRIG_FRONT, PIN_ECHO_FRONT);
  leftDistanceCm  = readDistanceCm(PIN_TRIG_LEFT, PIN_ECHO_LEFT);
  rightDistanceCm = readDistanceCm(PIN_TRIG_RIGHT, PIN_ECHO_RIGHT);

  // pH probe calibration curve (standard 4.0 - 7.0 buffer)
  int phRaw = analogRead(PIN_PH_SENSOR);
  float phVoltage = phRaw * (3.3 / 4095.0);
  phValue = 7.0 + ((2.5 - phVoltage) * 3.5);
  phValue = constrain(phValue, 0.0, 14.0);

  // Optical Turbidity sensor
  int turbRaw = analogRead(PIN_TURBIDITY);
  float turbVolt = turbRaw * (3.3 / 4095.0);
  turbidityNtu = map(turbVolt * 100, 50, 330, 80, 5);
  turbidityNtu = constrain(turbidityNtu, 0.0, 100.0);

  // Battery Voltage Divider (12.6V 3S LiPo = ~3.0V at ADC)
  int batRaw = analogRead(PIN_BATTERY_VOLT);
  batteryVoltage = (batRaw * (3.3 / 4095.0)) * 4.2; 
  batteryPercent = map(batteryVoltage * 100, 1050, 1260, 0, 100);
  batteryPercent = constrain(batteryPercent, 0, 100);
}

// ----------------- COMMAND DISPATCHER -----------------
void processCommand(const String& cmd, JsonObject payload) {
  lastCommandTimestamp = millis(); // Refresh watchdog timer

  if (cmd == "EMERGENCY_STOP") {
    isEmergencyStop = true;
    applyMovement(DIR_STOP, 0);
    setConveyor(false);
    return;
  }

  if (cmd == "RESET_EMERGENCY_STOP") {
    isEmergencyStop = false;
    applyMovement(DIR_STOP, 0);
    return;
  }

  if (isEmergencyStop) return; // Ignore movement when locked

  if (cmd == "MOVE_FORWARD") {
    if (payload.containsKey("speed")) robotSpeedPercent = payload["speed"];
    currentDir = DIR_FORWARD;
    applyMovement(DIR_FORWARD, robotSpeedPercent);
  } else if (cmd == "MOVE_BACKWARD") {
    if (payload.containsKey("speed")) robotSpeedPercent = payload["speed"];
    currentDir = DIR_BACKWARD;
    applyMovement(DIR_BACKWARD, robotSpeedPercent);
  } else if (cmd == "TURN_LEFT") {
    currentDir = DIR_LEFT;
    applyMovement(DIR_LEFT, robotSpeedPercent);
  } else if (cmd == "TURN_RIGHT") {
    currentDir = DIR_RIGHT;
    applyMovement(DIR_RIGHT, robotSpeedPercent);
  } else if (cmd == "STOP") {
    currentDir = DIR_STOP;
    applyMovement(DIR_STOP, 0);
  } else if (cmd == "SET_SPEED") {
    robotSpeedPercent = payload["speed"];
    if (currentDir != DIR_STOP) applyMovement(currentDir, robotSpeedPercent);
  } else if (cmd == "CONVEYOR_START") {
    int spd = payload.containsKey("speed") ? (int)payload["speed"] : 80;
    setConveyor(true, spd);
  } else if (cmd == "CONVEYOR_STOP") {
    setConveyor(false);
  } else if (cmd == "MODE_MANUAL") {
    currentMode = MODE_MANUAL;
    applyMovement(DIR_STOP, 0);
  } else if (cmd == "MODE_AUTONOMOUS") {
    currentMode = MODE_AUTONOMOUS;
    applyMovement(DIR_STOP, 0);
  }
}

// ----------------- WEBSOCKET HANDLER -----------------
void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client,
               AwsEventType type, void *arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_CONNECT) {
    Serial.printf("Client connected: #%u\\n", client->id());
  } else if (type == WS_EVT_DISCONNECT) {
    Serial.printf("Client disconnected: #%u\\n", client->id());
    applyMovement(DIR_STOP, 0); // Fail-safe stop
  } else if (type == WS_EVT_DATA) {
    AwsFrameInfo *info = (AwsFrameInfo*)arg;
    if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
      data[len] = 0;
      DynamicJsonDocument doc(512);
      DeserializationError err = deserializeJson(doc, (char*)data);
      if (!err) {
        String cmd = doc["cmd"].as<String>();
        JsonObject payload = doc["payload"].as<JsonObject>();
        processCommand(cmd, payload);
      }
    }
  }
}

// Broadcast JSON Telemetry packet every 200ms
void broadcastTelemetry() {
  if (ws.count() == 0) return;
  DynamicJsonDocument doc(1024);
  doc["mode"] = currentMode == MODE_AUTONOMOUS ? "AUTONOMOUS" : "MANUAL";
  doc["isEmergencyStopped"] = isEmergencyStop;
  doc["speed"] = robotSpeedPercent;

  JsonObject s = doc.createNestedObject("sensors");
  JsonObject u = s.createNestedObject("ultrasonic");
  u["front"] = (int)frontDistanceCm;
  u["left"]  = (int)leftDistanceCm;
  u["right"] = (int)rightDistanceCm;

  JsonObject ph = s.createNestedObject("pH");
  ph["value"] = serialized(String(phValue, 2));
  ph["status"] = phValue < 6.8 ? "Acidic" : (phValue > 7.6 ? "Alkaline" : "Neutral");

  JsonObject turb = s.createNestedObject("turbidity");
  turb["ntu"] = (int)turbidityNtu;

  JsonObject bat = s.createNestedObject("battery");
  bat["percent"] = batteryPercent;
  bat["voltage"] = serialized(String(batteryVoltage, 2));

  String out;
  serializeJson(doc, out);
  ws.textAll(out);
}

// ----------------- SETUP & MAIN LOOP -----------------
void setup() {
  Serial.begin(115200);

  // Setup motor pins
  pinMode(PIN_LEFT_IN1, OUTPUT);
  pinMode(PIN_LEFT_IN2, OUTPUT);
  pinMode(PIN_RIGHT_IN3, OUTPUT);
  pinMode(PIN_RIGHT_IN4, OUTPUT);
  pinMode(PIN_CONVEYOR_RELAY, OUTPUT);

  // Ultrasonic pins
  pinMode(PIN_TRIG_FRONT, OUTPUT);
  pinMode(PIN_ECHO_FRONT, INPUT);
  pinMode(PIN_TRIG_LEFT, OUTPUT);
  pinMode(PIN_ECHO_LEFT, INPUT);
  pinMode(PIN_TRIG_RIGHT, OUTPUT);
  pinMode(PIN_ECHO_RIGHT, INPUT);

  // Hardware E-stop button
  pinMode(PIN_HW_ESTOP, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_HW_ESTOP), handleEmergencyStopISR, FALLING);

  // Configure PWM channels
  ledcSetup(PWM_CHAN_LEFT, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(PIN_LEFT_PWM, PWM_CHAN_LEFT);
  ledcSetup(PWM_CHAN_RIGHT, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(PIN_RIGHT_PWM, PWM_CHAN_RIGHT);
  ledcSetup(PWM_CHAN_CONV, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(PIN_CONVEYOR_PWM, PWM_CHAN_CONV);

  // Safe initial motor state
  applyMovement(DIR_STOP, 0);
  setConveyor(false);

  // Initialize Wi-Fi SoftAP
  WiFi.softAPConfig(local_IP, gateway, subnet);
  WiFi.softAP(WIFI_SSID_AP, WIFI_PASS_AP);
  Serial.print("RiverBot AP Started at: ");
  Serial.println(WiFi.softAPIP());

  // WebSocket Server
  ws.onEvent(onWsEvent);
  server.addHandler(&ws);

  // REST API Endpoint
  server.on("/api/command", HTTP_POST, [](AsyncWebServerRequest *request){}, NULL,
    [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
      DynamicJsonDocument doc(512);
      deserializeJson(doc, (char*)data);
      String cmd = doc["cmd"].as<String>();
      JsonObject payload = doc["payload"].as<JsonObject>();
      processCommand(cmd, payload);
      request->send(200, "application/json", "{\\"status\\":\\"ACK\\"}");
    });

  server.begin();
  lastCommandTimestamp = millis();
}

void loop() {
  ws.cleanupClients();

  // 1. WATCHDOG: Fail-safe stop if command timeout in Manual mode
  if (currentMode == MODE_MANUAL && currentDir != DIR_STOP && !isEmergencyStop) {
    if (millis() - lastCommandTimestamp > COMMAND_TIMEOUT_MS) {
      currentDir = DIR_STOP;
      applyMovement(DIR_STOP, 0);
      Serial.println("[WATCHDOG] Communication timeout! Fail-safe stopped motors.");
    }
  }

  // 2. AUTONOMOUS CLEANING LOGIC (Ultrasonic obstacle avoidance)
  if (currentMode == MODE_AUTONOMOUS && !isEmergencyStop) {
    readAllSensors();
    if (frontDistanceCm < 25.0) { // Obstacle ahead!
      if (leftDistanceCm > rightDistanceCm) {
        applyMovement(DIR_LEFT, 60); // Steer left
      } else {
        applyMovement(DIR_RIGHT, 60); // Steer right
      }
    } else {
      applyMovement(DIR_FORWARD, 50); // Steady river cruising
      if (!conveyorRunning && binFillPercent < 90) setConveyor(true, 75);
    }
    delay(50);
  } else {
    // Regular sensor reading interval
    static unsigned long lastSensorTick = 0;
    if (millis() - lastSensorTick > 250) {
      lastSensorTick = millis();
      readAllSensors();
      broadcastTelemetry();
    }
  }
}
`;

export const FLUTTER_DART_CODE = `// RIVERBOT Flutter Mobile Controller (Android/iOS)
// lib/main.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

void main() => runApp(RiverBotApp());

class RiverBotApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RIVERBOT',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: Color(0xFF070D18),
        colorScheme: ColorScheme.dark(
          primary: Color(0xFF00E5FF),
          secondary: Color(0xFF00F0B5),
        ),
      ),
      home: RiverBotControlScreen(),
    );
  }
}

class RiverBotControlScreen extends StatefulWidget {
  @override
  _RiverBotControlScreenState createState() => _RiverBotControlScreenState();
}

class _RiverBotControlScreenState extends State<RiverBotControlScreen> {
  WebSocketChannel? channel;
  bool isConnected = false;
  String mode = 'MANUAL';
  bool isEmergencyStopped = false;
  bool conveyorRunning = false;
  double speed = 75.0;

  @override
  void initState() {
    super.initState();
    connectWebSocket();
  }

  void connectWebSocket() {
    try {
      channel = WebSocketChannel.connect(Uri.parse('ws://192.168.4.1/ws'));
      setState(() => isConnected = true);
      channel!.stream.listen((message) {
        // Handle incoming ESP32 sensor telemetry
      }, onDone: () {
        setState(() => isConnected = false);
      });
    } catch (e) {
      setState(() => isConnected = false);
    }
  }

  void sendCommand(String cmd, [Map<String, dynamic>? payload]) {
    if (channel != null && isConnected) {
      channel!.sink.add(jsonEncode({'cmd': cmd, 'payload': payload ?? {}}));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('RIVERBOT', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.5)),
        backgroundColor: Color(0xFF0B1324),
        actions: [
          Padding(
            padding: EdgeInsets.only(right: 16),
            child: Row(children: [
              Icon(Icons.wifi, color: isConnected ? Colors.greenAccent : Colors.redAccent),
              SizedBox(width: 6),
              Text(isConnected ? 'Connected' : 'Offline', style: TextStyle(fontSize: 12)),
            ]),
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            // Mode Selectors
            Row(children: [
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: mode == 'MANUAL' ? Color(0xFF00E5FF) : Color(0xFF132238)),
                  onPressed: () {
                    setState(() => mode = 'MANUAL');
                    sendCommand('MODE_MANUAL');
                  },
                  child: Text('MANUAL MODE', style: TextStyle(color: mode == 'MANUAL' ? Colors.black : Colors.white)),
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: mode == 'AUTONOMOUS' ? Color(0xFF00F0B5) : Color(0xFF132238)),
                  onPressed: () {
                    setState(() => mode = 'AUTONOMOUS');
                    sendCommand('MODE_AUTONOMOUS');
                  },
                  child: Text('AUTONOMOUS', style: TextStyle(color: mode == 'AUTONOMOUS' ? Colors.black : Colors.white)),
                ),
              ),
            ]),
            SizedBox(height: 20),

            // Emergency Stop Button
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.redAccent,
                minimumSize: Size(double.infinity, 56),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: () => sendCommand('EMERGENCY_STOP'),
              child: Text('🚨 EMERGENCY STOP', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
            ),
            SizedBox(height: 20),

            // Conveyor Control
            Card(
              color: Color(0xFF101B2E),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text('CONVEYOR BELT', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                            onPressed: () {
                              setState(() => conveyorRunning = true);
                              sendCommand('CONVEYOR_START', {'speed': 80});
                            },
                            child: Text('START CONVEYOR'),
                          ),
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                            onPressed: () {
                              setState(() => conveyorRunning = false);
                              sendCommand('CONVEYOR_STOP');
                            },
                            child: Text('STOP CONVEYOR'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
`;
