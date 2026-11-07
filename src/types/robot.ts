export type RobotMovement = 'STOP' | 'FORWARD' | 'BACKWARD' | 'LEFT' | 'RIGHT';

export type OperatingMode = 'MANUAL' | 'AUTONOMOUS';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export type ConnectionProtocol = 'simulator' | 'websocket' | 'http';

export interface MotorState {
  status: 'STOPPED' | 'FORWARD' | 'REVERSE';
  pwm: number; // 0 - 255
  rpm: number;
  currentDrawA: number;
}

export interface ConveyorState {
  status: 'RUNNING' | 'STOPPED';
  speed: number; // 0 - 100%
  itemsCollected: number;
  weightCollectedKg: number;
}

export interface UltrasonicReadings {
  front: number; // distance in cm
  left: number;  // distance in cm
  right: number; // distance in cm
}

export interface PHSensorReading {
  value: number; // e.g. 7.2
  status: 'Acidic' | 'Neutral' | 'Alkaline';
  temperatureC: number;
}

export interface TurbidityReading {
  ntu: number; // Nephelometric Turbidity Units
  clarity: 'Clear' | 'Slightly Murky' | 'Turbid' | 'Heavily Polluted';
  rawVoltage: number;
}

export interface TrashBinState {
  fillPercent: number; // 0 - 100
  capacityLitres: number;
  currentWeightKg: number;
  maxWeightKg: number;
  isFull: boolean;
}

export interface BatteryState {
  percent: number; // 0 - 100
  voltage: number; // e.g. 12.4V
  currentAmp: number;
  temperatureC: number;
  isLow: boolean;
  health: 'Good' | 'Fair' | 'Replace';
}

export interface AutonomousTelemetry {
  state: 'SEARCHING' | 'SWEEPING' | 'AVOIDING_OBSTACLE' | 'APPROACHING_DEBRIS' | 'REVERSING';
  detectedObstacleSide: 'none' | 'front' | 'left' | 'right';
  currentAction: string;
  waypointsCompleted: number;
}

export interface RobotState {
  connectionStatus: ConnectionStatus;
  connectionProtocol: ConnectionProtocol;
  ipAddress: string;
  port: number;
  wifiSsid: string;
  wifiSignalDbm: number; // e.g. -62 dBm
  pingMs: number;
  
  mode: OperatingMode;
  isEmergencyStopped: boolean;
  emergencyStopReason: string | null;
  speed: number; // 0 - 100%
  movement: RobotMovement;
  
  motors: {
    left: MotorState;
    right: MotorState;
    lastAcknowledgedCommand: string;
    lastAcknowledgedTime: number;
  };
  
  conveyor: ConveyorState;
  sensors: {
    ultrasonic: UltrasonicReadings;
    pH: PHSensorReading;
    turbidity: TurbidityReading;
    trashBin: TrashBinState;
    battery: BatteryState;
  };
  
  autonomous: AutonomousTelemetry;
}

export interface SessionHistoryItem {
  id: string;
  startTime: string;
  durationMinutes: number;
  debrisWeightKg: number;
  itemsCount: number;
  averagePh: number;
  averageTurbidityNtu: number;
  distanceTraveledMeters: number;
  batteryUsedPercent: number;
  modeRatio: { manualPercent: number; autoPercent: number };
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  type: 'INFO' | 'COMMAND' | 'WARNING' | 'EMERGENCY' | 'SENSOR';
  message: string;
  details?: string;
}
