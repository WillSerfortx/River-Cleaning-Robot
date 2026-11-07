import React from 'react';
import { Play, Square, Layers, Sparkles, CheckCircle2 } from 'lucide-react';
import { ConveyorState } from '../types/robot';

interface ConveyorCardProps {
  conveyor: ConveyorState;
  binIsFull: boolean;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
}

export const ConveyorCard: React.FC<ConveyorCardProps> = ({
  conveyor,
  binIsFull,
  disabled = false,
  onStart,
  onStop,
  onSpeedChange,
}) => {
  const isRunning = conveyor.status === 'RUNNING';

  return (
    <div className="bg-[#0b1324] border border-[#1a2d48] rounded-2xl p-4 shadow-lg relative overflow-hidden">
      {/* Background conveyor track gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-950/80 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Trash Conveyor Belt
            </h3>
            <p className="text-[11px] text-slate-400">Floating river debris intake mechanism</p>
          </div>
        </div>

        {/* Status indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${
            isRunning
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900 border-slate-700 text-slate-400'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isRunning ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-slate-500'
            }`}
          />
          <span>{conveyor.status}</span>
        </div>
      </div>

      {/* Animated Conveyor Track Graphic */}
      <div className="bg-[#070e1c] border border-[#15253e] rounded-xl p-3 my-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1.5">
          <span>Intake Grid (Mesh Belt):</span>
          <span className="text-cyan-300 font-bold">{conveyor.speed}% Speed</span>
        </div>

        {/* Moving Belt Animation */}
        <div className="relative h-10 bg-[#040810] rounded-lg border border-cyan-500/20 overflow-hidden flex items-center">
          {/* Animated Slats / Paddles */}
          <div
            className={`absolute inset-0 flex items-center justify-around w-[200%] ${
              isRunning ? 'animate-[marquee_2s_linear_infinite]' : ''
            }`}
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, #132238 0px, #132238 12px, #00e5ff33 13px, #00e5ff33 16px)',
            }}
          />

          {/* Floating plastic bottles icon indicator */}
          <div className="relative z-10 w-full flex items-center justify-between px-3 text-[11px] text-slate-300 font-medium">
            <span className="flex items-center gap-1 text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              River Surface Intake
            </span>
            <span className="font-mono text-slate-400">
              {isRunning ? '⬇ Pulling floating waste into hopper' : '⏹ Idle'}
            </span>
          </div>
        </div>

        {/* Collection Stats Bar */}
        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#122035] text-[11px] font-mono">
          <div className="flex items-center justify-between bg-[#0b1422] px-2.5 py-1.5 rounded-lg border border-slate-800/80">
            <span className="text-slate-400">Items Gathered:</span>
            <span className="text-emerald-300 font-bold">{conveyor.itemsCollected} units</span>
          </div>
          <div className="flex items-center justify-between bg-[#0b1422] px-2.5 py-1.5 rounded-lg border border-slate-800/80">
            <span className="text-slate-400">Debris Weight:</span>
            <span className="text-cyan-300 font-bold">{conveyor.weightCollectedKg.toFixed(2)} kg</span>
          </div>
        </div>
      </div>

      {/* Big Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <button
          disabled={disabled || isRunning || binIsFull}
          onClick={onStart}
          className={`h-13 rounded-xl flex items-center justify-center gap-2 font-bold text-sm tracking-wide transition-all active:scale-95 ${
            binIsFull
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : isRunning
              ? 'bg-emerald-950/40 text-emerald-500 border border-emerald-500/30 cursor-default'
              : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.35)]'
          }`}
        >
          <Play className="w-5 h-5 fill-current" />
          START CONVEYOR
        </button>

        <button
          disabled={disabled || !isRunning}
          onClick={onStop}
          className={`h-13 rounded-xl flex items-center justify-center gap-2 font-bold text-sm tracking-wide transition-all active:scale-95 ${
            !isRunning
              ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-default'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.35)]'
          }`}
        >
          <Square className="w-5 h-5 fill-current" />
          STOP CONVEYOR
        </button>
      </div>
    </div>
  );
};
