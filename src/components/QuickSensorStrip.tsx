import React from 'react';
import {
  Radar,
  Droplets,
  Activity,
  Trash2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { RobotState } from '../types/robot';

interface QuickSensorStripProps {
  sensors: RobotState['sensors'];
  onOpenDetails: () => void;
  onEmptyBin: () => void;
}

export const QuickSensorStrip: React.FC<QuickSensorStripProps> = ({
  sensors,
  onOpenDetails,
  onEmptyBin,
}) => {
  const { ultrasonic, pH, turbidity, trashBin, battery } = sensors;

  // Ultrasonic distance evaluation
  const getDistanceBadge = (dist: number) => {
    if (dist < 20) {
      return { label: 'OBSTACLE', color: 'text-rose-400 bg-rose-950/60 border-rose-500/40' };
    } else if (dist < 40) {
      return { label: 'CAUTION', color: 'text-amber-400 bg-amber-950/60 border-amber-500/40' };
    }
    return { label: 'SAFE', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' };
  };

  const frontBadge = getDistanceBadge(ultrasonic.front);

  return (
    <div className="space-y-2.5">
      {/* Warning banner if Trash Bin is Full */}
      {trashBin.isFull && (
        <div className="bg-amber-950/90 border border-amber-500/60 rounded-xl p-3 flex items-center justify-between text-amber-200 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-xs font-bold tracking-wider uppercase font-mono">
                TRASH BIN FULL (≥90%)
              </div>
              <div className="text-[11px] text-amber-300/80">
                Conveyor belt automatically halted to prevent overflow.
              </div>
            </div>
          </div>
          <button
            onClick={onEmptyBin}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold font-mono transition-colors active:scale-95 shrink-0"
          >
            Empty Bin
          </button>
        </div>
      )}

      {/* Front Collision Alert Banner if close */}
      {ultrasonic.front < 20 && (
        <div className="bg-rose-950/80 border border-rose-500/60 rounded-xl p-2.5 flex items-center justify-between text-rose-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
            <span className="text-xs font-mono font-bold">
              FRONT OBSTACLE DETECTED ({ultrasonic.front} cm)
            </span>
          </div>
          <span className="text-[10px] font-mono text-rose-300">Auto-Brake Armed</span>
        </div>
      )}

      {/* 4 Compact Telemetry Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* 1. Ultrasonic Sonar Radar */}
        <div className="bg-[#091220] border border-[#162740] rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1 text-slate-300">
              <Radar className="w-3.5 h-3.5 text-cyan-400" />
              Sonar Radar
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${frontBadge.color}`}>
              {frontBadge.label}
            </span>
          </div>

          <div className="my-1.5 flex items-baseline gap-1">
            <span className="text-xl font-extrabold font-mono text-white tracking-tight">
              {ultrasonic.front}
            </span>
            <span className="text-xs text-slate-400 font-mono">cm front</span>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-[#122035]">
            <span>L: {ultrasonic.left}cm</span>
            <span>R: {ultrasonic.right}cm</span>
          </div>
        </div>

        {/* 2. Water pH Sensor */}
        <div className="bg-[#091220] border border-[#162740] rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1 text-slate-300">
              <Droplets className="w-3.5 h-3.5 text-teal-400" />
              River pH
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                pH.status === 'Neutral'
                  ? 'text-teal-400 bg-teal-950/60 border-teal-500/40'
                  : 'text-amber-400 bg-amber-950/60 border-amber-500/40'
              }`}
            >
              {pH.status}
            </span>
          </div>

          <div className="my-1.5 flex items-baseline gap-1">
            <span className="text-xl font-extrabold font-mono text-white tracking-tight">
              {pH.value.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 font-mono">pH</span>
          </div>

          <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-[#122035]">
            Temp: {pH.temperatureC.toFixed(1)}°C
          </div>
        </div>

        {/* 3. Turbidity Sensor */}
        <div className="bg-[#091220] border border-[#162740] rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1 text-slate-300">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Turbidity
            </span>
            <span className="text-[9px] text-cyan-300 font-semibold truncate max-w-[70px]">
              {turbidity.clarity}
            </span>
          </div>

          <div className="my-1.5 flex items-baseline gap-1">
            <span className="text-xl font-extrabold font-mono text-white tracking-tight">
              {turbidity.ntu.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 font-mono">NTU</span>
          </div>

          <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-[#122035]">
            Sensor: {turbidity.rawVoltage.toFixed(2)}V
          </div>
        </div>

        {/* 4. Trash Bin Fill Progress */}
        <div className="bg-[#091220] border border-[#162740] rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1 text-slate-300">
              <Trash2 className="w-3.5 h-3.5 text-teal-400" />
              Trash Bin
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                trashBin.fillPercent >= 90
                  ? 'text-rose-400 bg-rose-950/60 border-rose-500/40'
                  : 'text-teal-400 bg-teal-950/60 border-teal-500/40'
              }`}
            >
              {trashBin.fillPercent >= 90 ? 'FULL' : `${100 - trashBin.fillPercent}% Free`}
            </span>
          </div>

          <div className="my-1.5">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xl font-extrabold font-mono text-white tracking-tight">
                {trashBin.fillPercent}%
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {trashBin.currentWeightKg.toFixed(1)} / {trashBin.maxWeightKg} kg
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-[#050b14] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  trashBin.fillPercent >= 90
                    ? 'bg-rose-500'
                    : trashBin.fillPercent > 65
                    ? 'bg-amber-400'
                    : 'bg-teal-400'
                }`}
                style={{ width: `${trashBin.fillPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-[#122035]">
            <span>Cap: {trashBin.capacityLitres}L</span>
            <button
              onClick={onOpenDetails}
              className="text-cyan-400 hover:underline flex items-center gap-0.5"
            >
              More <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
