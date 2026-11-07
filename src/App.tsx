import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Radar,
  History,
  Settings,
  ShieldAlert,
  Wifi,
  Sparkles,
  Smartphone,
  Monitor,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight
} from 'lucide-react';
import { RobotState, RobotMovement, OperatingMode, ActivityLogItem } from './types/robot';
import { esp32, initialRobotState } from './services/esp32Service';
import { soundFx } from './utils/audio';

// Components
import { HeaderBar } from './components/HeaderBar';
import { VirtualJoystick } from './components/VirtualJoystick';
import { MotorPanel } from './components/MotorPanel';
import { ConveyorCard } from './components/ConveyorCard';
import { ModeSelector } from './components/ModeSelector';
import { EmergencyStopButton } from './components/EmergencyStopButton';
import { QuickSensorStrip } from './components/QuickSensorStrip';
import { SensorsTab } from './components/SensorsTab';
import { HistoryTab } from './components/HistoryTab';
import { SettingsTab } from './components/SettingsTab';
import { RiverVisualizerModal } from './components/RiverVisualizerModal';
import { BottomNavBar, NavTab } from './components/BottomNavBar';

export default function App() {
  const [robotState, setRobotState] = useState<RobotState>(initialRobotState);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [activeTab, setActiveTab] = useState<NavTab>('CONTROL');
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mobileChassisView, setMobileChassisView] = useState(false);

  // Subscribe to ESP32 telemetry & activity logs
  useEffect(() => {
    const unsubState = esp32.subscribe(setRobotState);
    const unsubLogs = esp32.subscribeLogs(setLogs);
    return () => {
      unsubState();
      unsubLogs();
    };
  }, []);

  // Handlers
  const handleMove = (direction: RobotMovement) => {
    esp32.move(direction);
  };

  const handleSpeedChange = (speed: number) => {
    esp32.setSpeed(speed);
  };

  const handleStartConveyor = () => {
    esp32.startConveyor();
  };

  const handleStopConveyor = () => {
    esp32.stopConveyor();
  };

  const handleSelectMode = (mode: OperatingMode) => {
    esp32.setMode(mode);
  };

  const handleTriggerEmergencyStop = () => {
    esp32.triggerEmergencyStop();
  };

  const handleReleaseEmergencyStop = () => {
    esp32.releaseEmergencyStop();
  };

  const handleEmptyTrashBin = () => {
    esp32.emptyTrashBin();
  };

  const handleToggleMute = () => {
    soundFx.isMuted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Application Header Bar */}
      <HeaderBar
        state={robotState}
        onOpenVisualizer={() => setIsVisualizerOpen(true)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-xl mx-auto w-full px-3.5 sm:px-4 py-3 sm:py-4 flex flex-col">
        {/* Device Viewport Toggle on Large Screens */}
        <div className="hidden lg:flex items-center justify-between bg-[#0b1324] border border-[#142338] px-3 py-1.5 rounded-xl mb-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Mobile-First Android Controller Viewport</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Ping: {robotState.pingMs}ms</span>
            <span>·</span>
            <span>RSSI: {robotState.wifiSignalDbm} dBm</span>
            <span>·</span>
            <button
              onClick={() => setIsVisualizerOpen(true)}
              className="text-cyan-300 hover:text-cyan-200 underline flex items-center gap-1 font-semibold"
            >
              <Eye className="w-3.5 h-3.5" />
              Overhead River Radar
            </button>
          </div>
        </div>

        {/* Tab 1: CONTROL (Default Landing Screen) */}
        {activeTab === 'CONTROL' && (
          <div className="space-y-3.5 sm:space-y-4 pb-20">
            {/* Robot Operating Overview Strip */}
            <div className="bg-[#0b1324] border border-[#172942] rounded-2xl p-3 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    robotState.isEmergencyStopped
                      ? 'bg-rose-500 animate-ping'
                      : robotState.connectionStatus === 'connected'
                      ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                      : 'bg-amber-400'
                  }`}
                />
                <div>
                  <div className="text-xs font-bold font-mono text-white flex items-center gap-2">
                    <span>
                      {robotState.isEmergencyStopped
                        ? 'STATUS: E-STOP LOCKED'
                        : robotState.mode === 'AUTONOMOUS'
                        ? 'STATUS: AUTONOMOUS'
                        : 'STATUS: MANUAL READY'}
                    </span>
                    <span className="text-[10px] text-cyan-300 font-normal px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/20">
                      {robotState.wifiSsid}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Motors:{' '}
                    {robotState.movement !== 'STOP'
                      ? `${robotState.movement} (${robotState.speed}%)`
                      : 'STOPPED'}{' '}
                    · Conveyor: {robotState.conveyor.status}
                  </div>
                </div>
              </div>

              {/* Mode indicator pill */}
              <div
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
                  robotState.mode === 'AUTONOMOUS'
                    ? 'bg-teal-950/80 border-teal-400/50 text-teal-300'
                    : 'bg-cyan-950/80 border-cyan-400/50 text-cyan-300'
                }`}
              >
                {robotState.mode}
              </div>
            </div>

            {/* CRITICAL: High-visibility Emergency Stop Button (Accessible without scrolling) */}
            <EmergencyStopButton
              isEmergencyStopped={robotState.isEmergencyStopped}
              onTriggerStop={handleTriggerEmergencyStop}
              onReleaseStop={handleReleaseEmergencyStop}
            />

            {/* Operating Mode Selector (Manual vs Autonomous) */}
            <ModeSelector
              currentMode={robotState.mode}
              autonomous={robotState.autonomous}
              disabled={robotState.isEmergencyStopped}
              onSelectMode={handleSelectMode}
            />

            {/* Main Manual Control — Virtual Joystick */}
            <VirtualJoystick
              currentMovement={robotState.movement}
              speed={robotState.speed}
              disabled={robotState.isEmergencyStopped || robotState.mode === 'AUTONOMOUS'}
              onMove={handleMove}
              onSpeedChange={handleSpeedChange}
            />

            {/* Motor Propulsion Telemetry Panel */}
            <MotorPanel
              leftMotor={robotState.motors.left}
              rightMotor={robotState.motors.right}
              lastCommand={robotState.motors.lastAcknowledgedCommand}
              lastCommandTime={robotState.motors.lastAcknowledgedTime}
              overallSpeed={robotState.speed}
            />

            {/* Trash Collection Conveyor Belt Control Card */}
            <ConveyorCard
              conveyor={robotState.conveyor}
              binIsFull={robotState.sensors.trashBin.isFull}
              disabled={robotState.isEmergencyStopped}
              onStart={handleStartConveyor}
              onStop={handleStopConveyor}
              onSpeedChange={(spd) => esp32.setConveyorSpeed(spd)}
            />

            {/* Live Sensor Quick Overview Strip */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Live Sensor Readings
                </span>
                <button
                  onClick={() => setActiveTab('SENSORS')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-mono font-semibold flex items-center gap-0.5"
                >
                  All Diagnostics <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <QuickSensorStrip
                sensors={robotState.sensors}
                onOpenDetails={() => setActiveTab('SENSORS')}
                onEmptyBin={handleEmptyTrashBin}
              />
            </div>
          </div>
        )}

        {/* Tab 2: SENSORS (Detailed Diagnostics) */}
        {activeTab === 'SENSORS' && (
          <SensorsTab state={robotState} onEmptyTrashBin={handleEmptyTrashBin} />
        )}

        {/* Tab 3: HISTORY (Mission stats & activity log) */}
        {activeTab === 'HISTORY' && <HistoryTab logs={logs} />}

        {/* Tab 4: SETTINGS (Network, Firmware code, Watchdog safety) */}
        {activeTab === 'SETTINGS' && (
          <SettingsTab
            state={robotState}
            onSetProtocol={(proto, ip, port) => esp32.setConnectionProtocol(proto, ip, port)}
            onConnectReal={() => esp32.connectRealESP32()}
            onDisconnect={() => esp32.disconnect()}
          />
        )}
      </main>

      {/* Top-Down Interactive River Visualizer Modal */}
      <RiverVisualizerModal
        isOpen={isVisualizerOpen}
        onClose={() => setIsVisualizerOpen(false)}
        robotState={robotState}
      />

      {/* Fixed Bottom Navigation Bar (Thumb Zone) */}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        isEmergencyStopped={robotState.isEmergencyStopped}
      />
    </div>
  );
}
