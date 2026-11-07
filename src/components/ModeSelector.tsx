import React from 'react';
import { Gamepad2, Navigation, Radio, ShieldCheck, AlertCircle } from 'lucide-react';
import { OperatingMode, AutonomousTelemetry } from '../types/robot';

interface ModeSelectorProps {
  currentMode: OperatingMode;
  autonomous: AutonomousTelemetry;
  disabled?: boolean;
  onSelectMode: (mode: OperatingMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  autonomous,
  disabled = false,
  onSelectMode,
}) => {
  const isAuto = currentMode === 'AUTONOMOUS';

  return (
    <div className="space-y-3">
      {/* Two Large Mode Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Manual Mode Button */}
        <button
          disabled={disabled}
          onClick={() => onSelectMode('MANUAL')}
          className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-bold transition-all relative overflow-hidden border active:scale-[0.98] ${
            !isAuto
              ? 'bg-gradient-to-br from-[#10223d] to-[#0a1526] border-cyan-400 text-white shadow-[0_0_20px_rgba(0,229,255,0.25)]'
              : 'bg-[#091220] border-[#15253e] text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Gamepad2 className={`w-5 h-5 ${!isAuto ? 'text-cyan-400' : 'text-slate-500'}`} />
            <span className="text-sm tracking-wide">MANUAL MODE</span>
          </div>
          <span className="text-[10px] font-mono font-normal opacity-75">
            Operator Joystick Active
          </span>
          {!isAuto && (
            <div className="absolute top-0 right-0 w-3 h-3 bg-cyan-400 rounded-bl-lg" />
          )}
        </button>

        {/* Autonomous Mode Button */}
        <button
          disabled={disabled}
          onClick={() => onSelectMode('AUTONOMOUS')}
          className={`h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-bold transition-all relative overflow-hidden border active:scale-[0.98] ${
            isAuto
              ? 'bg-gradient-to-br from-[#0c2e28] to-[#061915] border-teal-400 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)]'
              : 'bg-[#091220] border-[#15253e] text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Navigation className={`w-5 h-5 ${isAuto ? 'text-teal-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-sm tracking-wide">AUTONOMOUS</span>
          </div>
          <span className="text-[10px] font-mono font-normal opacity-75">
            Ultrasonic Obstacle AI
          </span>
          {isAuto && (
            <div className="absolute top-0 right-0 w-3 h-3 bg-teal-400 rounded-bl-lg" />
          )}
        </button>
      </div>

      {/* Autonomous Active Banner & Radar Feed */}
      {isAuto && (
        <div className="bg-gradient-to-r from-teal-950/60 via-[#0a2322] to-teal-950/60 border border-teal-500/40 rounded-2xl p-3.5 shadow-lg relative overflow-hidden">
          {/* Pulsing Scan Beam */}
          <div className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-teal-400/20 to-transparent animate-[marquee_2.5s_linear_infinite]" />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500" />
              </span>
              <span className="text-xs font-mono font-bold tracking-wider text-teal-300">
                AUTONOMOUS CLEANING ACTIVE
              </span>
            </div>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-900/60 border border-teal-400/30 text-teal-200">
              State: {autonomous.state}
            </span>
          </div>

          <p className="text-xs text-slate-300 font-mono mb-2 relative z-10 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>{autonomous.currentAction}</span>
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-teal-500/20 text-[11px] font-mono text-teal-200/80 relative z-10">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              Collision Avoidance Engaged
            </span>
            <button
              onClick={() => onSelectMode('MANUAL')}
              className="text-xs underline hover:text-white font-semibold text-teal-300"
            >
              Take Manual Control →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
