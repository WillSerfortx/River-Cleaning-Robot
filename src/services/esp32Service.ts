import {
  RobotState,
  RobotMovement,
  OperatingMode,
  ActivityLogItem,
  SessionHistoryItem
} from '../types/robot';
import { soundFx } from '../utils/audio';

// Default initial state
export const initialRobotState: RobotState = {
  connectionStatus: 'connected',
  connectionProtocol: 'simulator',
  ipAddress: '192.168.4.1',
  port: 80,
  wifiSsid: 'RIVERBOT-AP',
  wifiSignalDbm: -56,
  pingMs: 14,

  mode: 'MANUAL',
  isEmergencyStopped: false,
  emergencyStopReason: null,
  speed: 75, // 75% default speed
  movement: 'STOP',

  motors: {
    left: { status: 'STOPPED', pwm: 0, rpm: 0, currentDrawA: 0 },
    right: { status: 'STOPPED', pwm: 0, rpm: 0, currentDrawA: 0 },
    lastAcknowledgedCommand: 'STOP',
    lastAcknowledgedTime: Date.now(),
  },

  conveyor: {
    status: 'STOPPED',
    speed: 80,
    itemsCollected: 14,
    weightCollectedKg: 3.8,
  },

  sensors: {
    ultrasonic: {
      front: 118,
      left: 84,
      right: 92,
    },
    pH: {
      value: 7.3,
      status: 'Neutral',
      temperatureC: 24.2,
    },
    turbidity: {
      ntu: 18.5,
      clarity: 'Slightly Murky',
      rawVoltage: 3.42,
    },
    trashBin: {
      fillPercent: 35,
      capacityLitres: 45,
      currentWeightKg: 3.8,
      maxWeightKg: 15.0,
      isFull: false,
    },
    battery: {
      percent: 88,
      voltage: 12.4,
      currentAmp: 1.4,
      temperatureC: 29.5,
      isLow: false,
      health: 'Good',
    },
  },

  autonomous: {
    state: 'SWEEPING',
    detectedObstacleSide: 'none',
    currentAction: 'River corridor sweep pattern active',
    waypointsCompleted: 6,
  },
};

export const sampleHistory: SessionHistoryItem[] = [
  {
    id: 'sess-001',
    startTime: 'Today, 08:30 AM',
    durationMinutes: 42,
    debrisWeightKg: 6.4,
    itemsCount: 28,
    averagePh: 7.2,
    averageTurbidityNtu: 16.4,
    distanceTraveledMeters: 620,
    batteryUsedPercent: 32,
    modeRatio: { manualPercent: 65, autoPercent: 35 },
  },
  {
    id: 'sess-002',
    startTime: 'Yesterday, 03:15 PM',
    durationMinutes: 58,
    debrisWeightKg: 8.9,
    itemsCount: 41,
    averagePh: 7.4,
    averageTurbidityNtu: 24.1,
    distanceTraveledMeters: 890,
    batteryUsedPercent: 46,
    modeRatio: { manualPercent: 40, autoPercent: 60 },
  },
  {
    id: 'sess-003',
    startTime: 'Nov 05, 10:00 AM',
    durationMinutes: 35,
    debrisWeightKg: 5.1,
    itemsCount: 19,
    averagePh: 6.9,
    averageTurbidityNtu: 14.8,
    distanceTraveledMeters: 450,
    batteryUsedPercent: 27,
    modeRatio: { manualPercent: 80, autoPercent: 20 },
  },
];

type StateListener = (state: RobotState) => void;
type LogListener = (logs: ActivityLogItem[]) => void;

class ESP32Service {
  private state: RobotState = { ...initialRobotState };
  private listeners: StateListener[] = [];
  private logListeners: LogListener[] = [];
  private logs: ActivityLogItem[] = [
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'INFO',
      message: 'RIVERBOT Controller Initialized',
      details: 'Connected to ESP32 telemetry interface',
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 4000).toLocaleTimeString(),
      type: 'SENSOR',
      message: 'Sensors calibrated: pH 7.3, Turbidity 18.5 NTU, Bin 35%',
    },
  ];

  private ws: WebSocket | null = null;
  private simInterval: NodeJS.Timeout | null = null;
  private autoBehaviorInterval: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startSimulationEngine();
  }

  public subscribe(listener: StateListener) {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public subscribeLogs(listener: LogListener) {
    this.logListeners.push(listener);
    listener(this.logs);
    return () => {
      this.logListeners = this.logListeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const cloned = JSON.parse(JSON.stringify(this.state));
    this.listeners.forEach((l) => l(cloned));
  }

  private addLog(type: ActivityLogItem['type'], message: string, details?: string) {
    const item: ActivityLogItem = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      details,
    };
    this.logs = [item, ...this.logs.slice(0, 149)];
    this.logListeners.forEach((l) => l(this.logs));
  }

  public getState(): RobotState {
    return this.state;
  }

  public getLogs(): ActivityLogItem[] {
    return this.logs;
  }

  // Set Connection Protocol
  public setConnectionProtocol(proto: RobotState['connectionProtocol'], ip?: string, port?: number) {
    this.state.connectionProtocol = proto;
    if (ip) this.state.ipAddress = ip;
    if (port) this.state.port = port;

    if (proto === 'simulator') {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      this.state.connectionStatus = 'connected';
      this.addLog('INFO', 'Switched to ESP32 Hardware Simulator mode');
      this.startSimulationEngine();
    } else {
      this.stopSimulationEngine();
      this.connectRealESP32();
    }
    this.notify();
  }

  // Connect to physical ESP32
  public connectRealESP32() {
    if (this.state.connectionProtocol === 'simulator') return;

    this.state.connectionStatus = 'connecting';
    this.notify();
    this.addLog('INFO', `Connecting to ESP32 at ${this.state.ipAddress}:${this.state.port}...`);

    if (this.state.connectionProtocol === 'websocket') {
      try {
        const wsUrl = `ws://${this.state.ipAddress}:${this.state.port}/ws`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.state.connectionStatus = 'connected';
          this.addLog('INFO', `WebSocket connected to ${wsUrl}`);
          this.notify();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleIncomingTelemetry(data);
          } catch {
            // raw string command
          }
        };

        this.ws.onerror = () => {
          this.state.connectionStatus = 'error';
          this.addLog('WARNING', `Connection error reaching ESP32 at ${this.state.ipAddress}`);
          this.notify();
        };

        this.ws.onclose = () => {
          if (this.state.connectionStatus === 'connected') {
            this.state.connectionStatus = 'disconnected';
            this.addLog('WARNING', 'ESP32 Wi-Fi connection lost. Safe stopping motors.');
            this.executeStopSafety();
          }
          this.notify();
        };
      } catch (e) {
        this.state.connectionStatus = 'error';
        this.addLog('WARNING', `Failed to open WebSocket: ${(e as Error).message}`);
        this.notify();
      }
    } else {
      // HTTP mode: ping test
      fetch(`http://${this.state.ipAddress}:${this.state.port}/api/status`, { mode: 'cors' })
        .then((res) => res.json())
        .then((data) => {
          this.state.connectionStatus = 'connected';
          this.handleIncomingTelemetry(data);
          this.addLog('INFO', `HTTP Connected to ESP32 at ${this.state.ipAddress}`);
          this.notify();
        })
        .catch(() => {
          this.state.connectionStatus = 'error';
          this.addLog('WARNING', `HTTP test failed for ${this.state.ipAddress}`);
          this.notify();
        });
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.state.connectionStatus = 'disconnected';
    this.executeStopSafety();
    this.addLog('INFO', 'Disconnected from ESP32');
    this.notify();
  }

  // Handle telemetry packet from real ESP32
  private handleIncomingTelemetry(data: Partial<RobotState>) {
    if (data.sensors) {
      this.state.sensors = { ...this.state.sensors, ...data.sensors };
    }
    if (data.motors) {
      this.state.motors = { ...this.state.motors, ...data.motors };
    }
    if (data.conveyor) {
      this.state.conveyor = { ...this.state.conveyor, ...data.conveyor };
    }
    if (data.mode) {
      this.state.mode = data.mode;
    }
    if (typeof data.isEmergencyStopped === 'boolean') {
      this.state.isEmergencyStopped = data.isEmergencyStopped;
    }
    this.notify();
  }

  // Send raw command to ESP32 or Simulator
  private sendCommand(cmd: string, payload: Record<string, unknown> = {}) {
    const packet = { cmd, payload, timestamp: Date.now() };

    if (this.state.connectionProtocol === 'websocket' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(packet));
    } else if (this.state.connectionProtocol === 'http') {
      fetch(`http://${this.state.ipAddress}:${this.state.port}/api/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packet),
        mode: 'no-cors',
      }).catch(() => {});
    }

    // Update local acknowledged command
    this.state.motors.lastAcknowledgedCommand = cmd;
    this.state.motors.lastAcknowledgedTime = Date.now();
  }

  // 1. JOYSTICK / MOVEMENT COMMANDS
  public move(direction: RobotMovement) {
    if (this.state.isEmergencyStopped) {
      this.addLog('WARNING', 'Movement rejected: Emergency Stop is ACTIVE.');
      return;
    }

    if (this.state.mode === 'AUTONOMOUS' && direction !== 'STOP') {
      this.addLog('WARNING', 'Manual movement ignored: Switch to MANUAL MODE first.');
      return;
    }

    this.state.movement = direction;
    const pwmSpeed = Math.round((this.state.speed / 100) * 255);

    if (direction === 'STOP') {
      this.state.motors.left = { status: 'STOPPED', pwm: 0, rpm: 0, currentDrawA: 0.1 };
      this.state.motors.right = { status: 'STOPPED', pwm: 0, rpm: 0, currentDrawA: 0.1 };
      soundFx.playMotorTone('stop');
      this.sendCommand('STOP');
      this.addLog('COMMAND', 'Motors STOPPED');
    } else if (direction === 'FORWARD') {
      this.state.motors.left = { status: 'FORWARD', pwm: pwmSpeed, rpm: Math.round(this.state.speed * 2.8), currentDrawA: 1.2 };
      this.state.motors.right = { status: 'FORWARD', pwm: pwmSpeed, rpm: Math.round(this.state.speed * 2.8), currentDrawA: 1.2 };
      soundFx.playMotorTone('forward');
      this.sendCommand('MOVE_FORWARD', { speed: this.state.speed });
      this.addLog('COMMAND', `MOVE FORWARD (Speed: ${this.state.speed}%, PWM: ${pwmSpeed})`);
    } else if (direction === 'BACKWARD') {
      this.state.motors.left = { status: 'REVERSE', pwm: pwmSpeed, rpm: Math.round(this.state.speed * 2.5), currentDrawA: 1.3 };
      this.state.motors.right = { status: 'REVERSE', pwm: pwmSpeed, rpm: Math.round(this.state.speed * 2.5), currentDrawA: 1.3 };
      soundFx.playMotorTone('backward');
      this.sendCommand('MOVE_BACKWARD', { speed: this.state.speed });
      this.addLog('COMMAND', `MOVE BACKWARD (Speed: ${this.state.speed}%, PWM: ${pwmSpeed})`);
    } else if (direction === 'LEFT') {
      // Differential steering: left motor reverse or stopped, right forward
      this.state.motors.left = { status: 'REVERSE', pwm: Math.round(pwmSpeed * 0.7), rpm: Math.round(this.state.speed * 1.5), currentDrawA: 1.1 };
      this.state.motors.right = { status: 'FORWARD', pwm: pwmSpeed, rpm: Math.round(this.state.speed * 2.8), currentDrawA: 1.4 };
      soundFx.playMotorTone('turn');
      this.sendCommand('TURN_LEFT', { speed: this.state.speed });
      this.addLog('COMMAND', `TURN LEFT (Differential Pivot)`);
    } else if (direction === 'RIGHT') {
      this.state.motors.left = { status: 'FORWARD', pwm: pwmSpeed, rpm: Math.round(this.state.speed * 2.8), currentDrawA: 1.4 };
      this.state.motors.right = { status: 'REVERSE', pwm: Math.round(pwmSpeed * 0.7), rpm: Math.round(this.state.speed * 1.5), currentDrawA: 1.1 };
      soundFx.playMotorTone('turn');
      this.sendCommand('TURN_RIGHT', { speed: this.state.speed });
      this.addLog('COMMAND', `TURN RIGHT (Differential Pivot)`);
    }

    soundFx.triggerHaptic(15);
    this.notify();
  }

  // 2. SPEED ADJUSTMENT (0 - 100%)
  public setSpeed(newSpeed: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(newSpeed)));
    this.state.speed = clamped;
    this.sendCommand('SET_SPEED', { speed: clamped });
    this.addLog('COMMAND', `Robot Speed set to ${clamped}%`);

    // If already moving, update motor PWM immediately
    if (this.state.movement !== 'STOP') {
      this.move(this.state.movement);
    } else {
      this.notify();
    }
  }

  // 3. CONVEYOR BELT CONTROL
  public startConveyor() {
    if (this.state.isEmergencyStopped) {
      this.addLog('WARNING', 'Cannot start conveyor: Emergency Stop is active');
      return;
    }
    if (this.state.sensors.trashBin.isFull) {
      this.addLog('WARNING', 'Conveyor inhibited: TRASH BIN FULL. Empty bin first!');
      soundFx.playObstacleAlert();
      return;
    }

    this.state.conveyor.status = 'RUNNING';
    soundFx.playConveyorSound(true);
    soundFx.triggerHaptic([30, 40, 30]);
    this.sendCommand('CONVEYOR_START', { speed: this.state.conveyor.speed });
    this.addLog('COMMAND', 'CONVEYOR BELT STARTED — Collecting river debris');
    this.notify();
  }

  public stopConveyor() {
    this.state.conveyor.status = 'STOPPED';
    soundFx.playConveyorSound(false);
    soundFx.triggerHaptic(20);
    this.sendCommand('CONVEYOR_STOP');
    this.addLog('COMMAND', 'CONVEYOR BELT STOPPED');
    this.notify();
  }

  public setConveyorSpeed(speedPercent: number) {
    this.state.conveyor.speed = Math.max(20, Math.min(100, Math.round(speedPercent)));
    this.notify();
  }

  // 4. OPERATING MODE SWITCHING
  public setMode(mode: OperatingMode) {
    if (this.state.isEmergencyStopped) {
      this.addLog('WARNING', 'Mode switch rejected during Emergency Stop');
      return;
    }

    if (this.state.mode === mode) return;

    // Safe stop before changing mode
    this.executeStopSafety();

    this.state.mode = mode;
    soundFx.playModeChange(mode === 'AUTONOMOUS');
    soundFx.triggerHaptic([50, 60, 80]);

    if (mode === 'AUTONOMOUS') {
      this.sendCommand('MODE_AUTONOMOUS');
      this.state.autonomous.state = 'SWEEPING';
      this.state.autonomous.currentAction = 'Ultrasonic obstacle avoidance sweep active';
      this.addLog('COMMAND', 'Switched to AUTONOMOUS MODE — Navigation managed by ESP32 sensors');
    } else {
      this.sendCommand('MODE_MANUAL');
      this.addLog('COMMAND', 'Switched to MANUAL MODE — Direct operator joystick active');
    }
    this.notify();
  }

  // 5. EMERGENCY STOP (E-STOP)
  public triggerEmergencyStop(reason = 'Operator Emergency Stop pressed') {
    this.state.isEmergencyStopped = true;
    this.state.emergencyStopReason = reason;

    // Immediately stop everything
    this.executeStopSafety();
    this.state.conveyor.status = 'STOPPED';

    soundFx.playEmergencyAlarm();
    soundFx.triggerHaptic([100, 50, 100, 50, 150]);

    this.sendCommand('EMERGENCY_STOP', { reason });
    this.addLog('EMERGENCY', `🚨 EMERGENCY STOP ACTIVATED: ${reason}`);
    this.notify();
  }

  public releaseEmergencyStop() {
    this.state.isEmergencyStopped = false;
    this.state.emergencyStopReason = null;
    this.executeStopSafety();

    soundFx.playClick(800, 0.1);
    soundFx.triggerHaptic(40);

    this.sendCommand('RESET_EMERGENCY_STOP');
    this.addLog('INFO', 'Emergency Stop state cleared. Robot in safe stopped state.');
    this.notify();
  }

  // Quick internal safety motor cutoff
  private executeStopSafety() {
    this.state.movement = 'STOP';
    this.state.motors.left = { status: 'STOPPED', pwm: 0, rpm: 0, currentDrawA: 0 };
    this.state.motors.right = { status: 'STOPPED', pwm: 0, rpm: 0, currentDrawA: 0 };
    this.state.motors.lastAcknowledgedCommand = 'STOP';
    this.state.motors.lastAcknowledgedTime = Date.now();
  }

  // Reset trash bin counter
  public emptyTrashBin() {
    this.state.sensors.trashBin.fillPercent = 0;
    this.state.sensors.trashBin.currentWeightKg = 0;
    this.state.sensors.trashBin.isFull = false;
    this.addLog('INFO', 'Trash bin emptied and reset to 0%');
    this.notify();
  }

  // SIMULATION ENGINE (Provides real physical responses in browser)
  private startSimulationEngine() {
    if (this.simInterval) return;

    this.simInterval = setInterval(() => {
      if (this.state.connectionProtocol !== 'simulator') return;

      // Ping jitter
      this.state.pingMs = Math.floor(12 + Math.random() * 8);
      this.state.wifiSignalDbm = -54 + Math.floor(Math.sin(Date.now() / 8000) * 6);

      // Battery slow drain
      const motorLoad = (this.state.motors.left.pwm + this.state.motors.right.pwm) / 510;
      const conveyorLoad = this.state.conveyor.status === 'RUNNING' ? 0.3 : 0.05;
      const totalLoad = 0.8 + motorLoad * 2.2 + conveyorLoad * 1.5;
      this.state.sensors.battery.currentAmp = Number(totalLoad.toFixed(2));

      // Sensors subtle realistic drift
      // pH: gentle water drift around 7.2 - 7.5
      const phDrift = 7.25 + Math.sin(Date.now() / 15000) * 0.18 + (Math.random() - 0.5) * 0.03;
      this.state.sensors.pH.value = Number(phDrift.toFixed(2));
      this.state.sensors.pH.status = phDrift < 6.8 ? 'Acidic' : phDrift > 7.6 ? 'Alkaline' : 'Neutral';

      // Turbidity: 16 - 25 NTU
      const turbDrift = 18.0 + Math.cos(Date.now() / 12000) * 3.5 + (Math.random() - 0.5) * 0.4;
      this.state.sensors.turbidity.ntu = Number(turbDrift.toFixed(1));
      this.state.sensors.turbidity.clarity =
        turbDrift < 10 ? 'Clear' : turbDrift < 25 ? 'Slightly Murky' : turbDrift < 50 ? 'Turbid' : 'Heavily Polluted';

      // Ultrasonic distance simulation
      if (this.state.mode === 'MANUAL') {
        if (this.state.movement === 'FORWARD') {
          // Getting closer to river bank / buoy
          let front = this.state.sensors.ultrasonic.front - 3;
          if (front < 12) {
            front = 120; // reset/passed obstacle
            this.addLog('INFO', 'Cleared river obstacle');
          }
          this.state.sensors.ultrasonic.front = front;
        } else {
          // slight noise
          this.state.sensors.ultrasonic.front = Math.max(20, Math.min(250, Math.round(115 + Math.sin(Date.now() / 3000) * 15)));
        }
        this.state.sensors.ultrasonic.left = Math.max(15, Math.min(200, Math.round(85 + Math.cos(Date.now() / 4000) * 12)));
        this.state.sensors.ultrasonic.right = Math.max(15, Math.min(200, Math.round(95 + Math.sin(Date.now() / 5000) * 14)));
      }

      // Conveyor collection simulation
      if (this.state.conveyor.status === 'RUNNING' && !this.state.sensors.trashBin.isFull) {
        // Occasionally pick up river trash
        if (Math.random() < 0.25) {
          const addedKg = Number((0.15 + Math.random() * 0.25).toFixed(2));
          this.state.conveyor.itemsCollected += 1;
          this.state.conveyor.weightCollectedKg = Number((this.state.conveyor.weightCollectedKg + addedKg).toFixed(2));
          this.state.sensors.trashBin.currentWeightKg = this.state.conveyor.weightCollectedKg;
          
          const newFill = Math.min(100, Math.round((this.state.conveyor.weightCollectedKg / this.state.sensors.trashBin.maxWeightKg) * 100));
          this.state.sensors.trashBin.fillPercent = newFill;

          if (newFill >= 90) {
            this.state.sensors.trashBin.isFull = true;
            this.state.conveyor.status = 'STOPPED';
            this.addLog('WARNING', '⚠️ TRASH BIN FULL (≥90% capacity). Conveyor auto-stopped.');
            soundFx.playObstacleAlert();
          } else {
            this.addLog('INFO', `Conveyor collected river waste (+${addedKg} kg)`);
          }
        }
      }

      // Autonomous mode simulation logic
      if (this.state.mode === 'AUTONOMOUS' && !this.state.isEmergencyStopped) {
        this.runAutonomousLogicTick();
      }

      this.notify();
    }, 1000);
  }

  private runAutonomousLogicTick() {
    // Autonomous navigation simulation
    const front = this.state.sensors.ultrasonic.front;
    const left = this.state.sensors.ultrasonic.left;
    const right = this.state.sensors.ultrasonic.right;

    if (front < 30) {
      // Obstacle ahead! Avoid
      this.state.autonomous.state = 'AVOIDING_OBSTACLE';
      this.state.autonomous.detectedObstacleSide = 'front';
      if (left > right) {
        this.state.autonomous.currentAction = 'Front obstacle <30cm. Turning LEFT away from hazard';
        this.state.movement = 'LEFT';
        this.state.motors.left = { status: 'REVERSE', pwm: 120, rpm: 110, currentDrawA: 1.1 };
        this.state.motors.right = { status: 'FORWARD', pwm: 160, rpm: 150, currentDrawA: 1.3 };
      } else {
        this.state.autonomous.currentAction = 'Front obstacle <30cm. Turning RIGHT away from hazard';
        this.state.movement = 'RIGHT';
        this.state.motors.left = { status: 'FORWARD', pwm: 160, rpm: 150, currentDrawA: 1.3 };
        this.state.motors.right = { status: 'REVERSE', pwm: 120, rpm: 110, currentDrawA: 1.1 };
      }
      this.state.sensors.ultrasonic.front += 35; // simulate turning away
    } else {
      // Clear path, continue river surface sweeping
      this.state.autonomous.state = 'SWEEPING';
      this.state.autonomous.detectedObstacleSide = 'none';
      this.state.autonomous.currentAction = 'Channel corridor clear. Cruising at 50% PWM.';
      this.state.movement = 'FORWARD';
      const autoPwm = 135;
      this.state.motors.left = { status: 'FORWARD', pwm: autoPwm, rpm: 140, currentDrawA: 1.0 };
      this.state.motors.right = { status: 'FORWARD', pwm: autoPwm, rpm: 140, currentDrawA: 1.0 };

      // In auto mode, ensure conveyor runs unless bin full
      if (this.state.conveyor.status === 'STOPPED' && !this.state.sensors.trashBin.isFull) {
        this.state.conveyor.status = 'RUNNING';
      }
    }
  }

  private stopSimulationEngine() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
  }
}

export const esp32 = new ESP32Service();
