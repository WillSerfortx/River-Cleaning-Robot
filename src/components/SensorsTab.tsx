import React from 'react';
import {
  Radar,
  Droplets,
  Activity,
  Trash2,
  BatteryCharging,
  Thermometer,
  ShieldAlert,
  Gauge,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { RobotState } from '../types/robot';

interface SensorsTabProps {
  state: RobotState;
  onEmptyTrashBin: () => void;
}

export const SensorsTab: React.FC<SensorsTabProps> = ({ state, onEmptyTrashBin }) => {
  const { ultrasonic, pH, turbidity, trashBin, battery } = state.sensors;

  const getDistanceColor = (dist: number) => {
    if (dist < 20) return 'text-rose-400 border-rose-500/50 bg-rose-950/40';
    if (dist < 40) return 'text-amber-400 border-amber-500/50 bg-amber-950/40';
    return 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40';
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Tab Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-white tracking-wide">
            Detailed Sensor Telemetry
          </h2>
          <p className="text-xs text-slate-400">
            Real-time optical, acoustic, and chemical sensor feeds from ESP32
          </p>
        </div>
        <div className="text-[11px] font-mono text-cyan-400 bg-cyan-950/50 px-2 py-1 rounded-lg border border-cyan-500/30">
          Telemetry: 5 Hz Active
        </div>
      </div>

      {/* 1. ULTRASONIC MULTI-BEAM RADAR VISUALIZER */}
      <div className="bg-[#0b1324] border border-[#1a2d48] rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radar className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              3-Axis Ultrasonic Sonar Proximity
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Model: HC-SR04 x3</span>
        </div>

        {/* Sonar Radar Graphic View */}
        <div className="bg-[#060c18] border border-cyan-500/20 rounded-xl p-4 flex flex-col items-center relative overflow-hidden">
          {/* Concentric radar rings */}
          <div className="w-56 h-32 border-t-2 border-l-2 border-r-2 border-cyan-500/30 rounded-t-full relative flex items-center justify-center">
            <div className="w-40 h-24 border-t border-l border-r border-cyan-500/20 rounded-t-full flex items-center justify-center">
              <div className="w-24 h-14 border-t border-l border-r border-cyan-500/20 rounded-t-full" />
            </div>

            {/* Sweep Beam */}
            <div className="absolute bottom-0 w-28 h-28 bg-gradient-to-tr from-cyan-400/20 via-teal-400/10 to-transparent origin-bottom-center animate-[spin_4s_linear_infinite]" />

            {/* Simulated RiverBot Position at center origin */}
            <div className="absolute bottom-0 w-8 h-8 rounded-t-lg bg-cyan-500/30 border border-cyan-400 flex items-center justify-center text-[9px] font-mono font-bold text-cyan-200 z-10">
              BOT
            </div>

            {/* Front Sensor Ping Indicator */}
            <div
              className={`absolute top-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold border z-10 ${getDistanceColor(
                ultrasonic.front
              )}`}
            >
              FRONT: {ultrasonic.front} cm
            </div>

            {/* Left Sensor Ping */}
            <div
              className={`absolute left-0 bottom-4 px-2 py-0.5 rounded text-[10px] font-mono font-bold border z-10 ${getDistanceColor(
                ultrasonic.left
              )}`}
            >
              LEFT: {ultrasonic.left} cm
            </div>

            {/* Right Sensor Ping */}
            <div
              className={`absolute right-0 bottom-4 px-2 py-0.5 rounded text-[10px] font-mono font-bold border z-10 ${getDistanceColor(
                ultrasonic.right
              )}`}
            >
              RIGHT: {ultrasonic.right} cm
            </div>
          </div>

          <div className="mt-3 text-[11px] font-mono text-slate-400 text-center">
            Safe Threshold: &gt; 40cm · Caution: 20–40cm · Auto-Brake: &lt; 20cm
          </div>
        </div>

        {/* 3 Sonar Cards */}
        <div className="grid grid-cols-3 gap-2.5 mt-3">
          <div className="bg-[#070e1c] p-2.5 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Left Sensor</span>
            <div className="text-lg font-mono font-bold text-white mt-0.5">{ultrasonic.left} cm</div>
            <span
              className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded border ${getDistanceColor(
                ultrasonic.left
              )}`}
            >
              {ultrasonic.left < 20 ? 'Obstacle' : ultrasonic.left < 40 ? 'Caution' : 'Safe'}
            </span>
          </div>

          <div className="bg-[#070e1c] p-2.5 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Front Sensor</span>
            <div className="text-lg font-mono font-bold text-cyan-300 mt-0.5">{ultrasonic.front} cm</div>
            <span
              className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded border ${getDistanceColor(
                ultrasonic.front
              )}`}
            >
              {ultrasonic.front < 20 ? 'Obstacle' : ultrasonic.front < 40 ? 'Caution' : 'Safe'}
            </span>
          </div>

          <div className="bg-[#070e1c] p-2.5 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Right Sensor</span>
            <div className="text-lg font-mono font-bold text-white mt-0.5">{ultrasonic.right} cm</div>
            <span
              className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded border ${getDistanceColor(
                ultrasonic.right
              )}`}
            >
              {ultrasonic.right < 20 ? 'Obstacle' : ultrasonic.right < 40 ? 'Caution' : 'Safe'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. WATER QUALITY SENSORS (pH & TURBIDITY) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* pH Sensor */}
        <div className="bg-[#0b1324] border border-[#1a2d48] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  River pH Sensor
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950 border border-teal-500/30 text-teal-300 font-bold">
                {pH.status}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-extrabold font-mono text-white">
                {pH.value.toFixed(2)}
              </span>
              <span className="text-sm text-slate-400 font-mono">pH units</span>
            </div>

            {/* pH Color Gradient Bar (0 to 14) */}
            <div className="space-y-1.5 my-3">
              <div className="h-3 rounded-full bg-gradient-to-r from-red-500 via-emerald-400 to-indigo-600 relative">
                {/* Marker pointer */}
                <div
                  className="absolute top-[-3px] w-2 h-4.5 bg-white border border-black shadow-md rounded -translate-x-1/2 transition-all duration-300"
                  style={{ left: `${(pH.value / 14) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>0 Acidic</span>
                <span>7.0 Neutral</span>
                <span>14 Alkaline</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#132238] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Water Temperature:</span>
            <span className="text-slate-200 font-semibold">{pH.temperatureC.toFixed(1)}°C</span>
          </div>
        </div>

        {/* Turbidity Sensor */}
        <div className="bg-[#0b1324] border border-[#1a2d48] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Water Turbidity
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-bold">
                {turbidity.clarity}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-extrabold font-mono text-white">
                {turbidity.ntu.toFixed(1)}
              </span>
              <span className="text-sm text-slate-400 font-mono">NTU</span>
            </div>

            {/* Turbidity Gradient Bar */}
            <div className="space-y-1.5 my-3">
              <div className="h-3 rounded-full bg-gradient-to-r from-cyan-400 via-amber-500 to-yellow-950 relative">
                <div
                  className="absolute top-[-3px] w-2 h-4.5 bg-white border border-black shadow-md rounded -translate-x-1/2 transition-all duration-300"
                  style={{ left: `${Math.min(100, (turbidity.ntu / 80) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>&lt; 5 Clear</span>
                <span>25 Murky</span>
                <span>&gt; 50 High Turbidity</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#132238] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Photodiode Voltage:</span>
            <span className="text-slate-200 font-semibold">{turbidity.rawVoltage.toFixed(2)} V</span>
          </div>
        </div>
      </div>

      {/* 3. TRASH BIN CAPACITY CARD */}
      <div className="bg-[#0b1324] border border-[#1a2d48] rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              River Waste Storage Bin
            </h3>
          </div>
          <button
            onClick={onEmptyTrashBin}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#14233a] hover:bg-[#1e3458] text-xs font-mono font-medium text-cyan-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset / Empty Bin
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
          <div className="bg-[#070e1c] p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400">Fill Percentage</span>
            <div className="text-2xl font-mono font-bold text-white mt-1">
              {trashBin.fillPercent}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Status: {trashBin.isFull ? '🚨 FULL' : 'Operational'}
            </span>
          </div>

          <div className="bg-[#070e1c] p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400">Payload Weight</span>
            <div className="text-2xl font-mono font-bold text-teal-300 mt-1">
              {trashBin.currentWeightKg.toFixed(1)} / {trashBin.maxWeightKg} kg
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Remaining: {(trashBin.maxWeightKg - trashBin.currentWeightKg).toFixed(1)} kg
            </span>
          </div>

          <div className="bg-[#070e1c] p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400">Bin Volume Capacity</span>
            <div className="text-2xl font-mono font-bold text-cyan-300 mt-1">
              {trashBin.capacityLitres} Litres
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Cross-flow floating containment
            </span>
          </div>
        </div>

        {/* Large Fill Meter Bar */}
        <div className="mt-3">
          <div className="w-full h-3.5 bg-[#050b14] rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                trashBin.fillPercent >= 90
                  ? 'bg-rose-500'
                  : trashBin.fillPercent > 60
                  ? 'bg-amber-400'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-400'
              }`}
              style={{ width: `${trashBin.fillPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. BATTERY & POWER SUBSYSTEM */}
      <div className="bg-[#0b1324] border border-[#1a2d48] rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Battery & Power Subsystem
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">
            Health: {battery.health}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
          <div className="bg-[#070e1c] p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400">Pack Charge</span>
            <div className="text-xl font-mono font-bold text-emerald-400 mt-1">{battery.percent}%</div>
          </div>

          <div className="bg-[#070e1c] p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400">Terminal Voltage</span>
            <div className="text-xl font-mono font-bold text-white mt-1">{battery.voltage} V</div>
          </div>

          <div className="bg-[#070e1c] p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400">Current Consumption</span>
            <div className="text-xl font-mono font-bold text-cyan-300 mt-1">{battery.currentAmp} A</div>
          </div>

          <div className="bg-[#070e1c] p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400">Pack Temperature</span>
            <div className="text-xl font-mono font-bold text-slate-200 mt-1">{battery.temperatureC}°C</div>
          </div>
        </div>
      </div>
    </div>
  );
};
