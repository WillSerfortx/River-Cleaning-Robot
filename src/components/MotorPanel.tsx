import React from 'react';
import { Cpu, RotateCw, RotateCcw, Activity, Disc } from 'lucide-react';
import { MotorState } from '../types/robot';

interface MotorPanelProps {
  leftMotor: MotorState;
  rightMotor: MotorState;
  lastCommand: string;
  lastCommandTime: number;
  overallSpeed: number;
}

export const MotorPanel: React.FC<MotorPanelProps> = ({
  leftMotor,
  rightMotor,
  lastCommand,
  lastCommandTime,
  overallSpeed,
}) => {
  const timeSinceAck = Math.max(0, Math.floor((Date.now() - lastCommandTime) / 1000));

  const renderMotorCard = (title: string, motor: MotorState, isLeft: boolean) => {
    const isSpinning = motor.status !== 'STOPPED';
    const isForward = motor.status === 'FORWARD';

    return (
      <div className="flex-1 bg-[#091220] border border-[#17273f] rounded-xl p-3 flex flex-col justify-between relative overflow-hidden">
        {/* Top Motor Label & Direction */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {title}
            </span>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
              motor.status === 'FORWARD'
                ? 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-300'
                : motor.status === 'REVERSE'
                ? 'bg-amber-950/80 border border-amber-500/30 text-amber-300'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {motor.status}
          </span>
        </div>

        {/* Visual Propeller / Motor Rotor */}
        <div className="flex items-center justify-center my-2 py-1">
          <div className="relative flex items-center justify-center">
            <div
              className={`w-14 h-14 rounded-full border-2 border-dashed ${
                isSpinning
                  ? 'border-cyan-400/80 animate-[spin_1.2s_linear_infinite]'
                  : 'border-slate-700'
              } flex items-center justify-center`}
              style={{
                animationDirection: isForward ? 'normal' : 'reverse',
                animationDuration: motor.pwm > 0 ? `${Math.max(0.3, 2.5 - (motor.pwm / 255) * 2.2)}s` : '1.5s',
              }}
            >
              <Disc className={`w-8 h-8 ${isSpinning ? 'text-cyan-300' : 'text-slate-600'}`} />
            </div>

            {/* Rotation Direction Arrow Indicator */}
            {isSpinning && (
              <div className="absolute -top-1 -right-1 text-cyan-400 bg-[#070e1a] rounded-full p-0.5 border border-cyan-500/40">
                {isForward ? <RotateCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3 animate-spin" />}
              </div>
            )}
          </div>
        </div>

        {/* Telemetry Numbers */}
        <div className="space-y-1.5 pt-2 border-t border-[#132238] font-mono text-[11px]">
          <div className="flex items-center justify-between text-slate-400">
            <span>PWM Power:</span>
            <span className="text-cyan-300 font-semibold">{motor.pwm} / 255</span>
          </div>
          {/* Power Bar */}
          <div className="w-full h-1.5 bg-[#050b14] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-150"
              style={{ width: `${(motor.pwm / 255) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>Est. Current:</span>
            <span className="text-slate-300">{motor.currentDrawA.toFixed(1)} A</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#0b1324] border border-[#1a2d48] rounded-2xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Dual Motor Propulsion Driver
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>Last ACK:</span>
          <span className="text-cyan-300 font-semibold">{lastCommand}</span>
          <span className="text-slate-500">({timeSinceAck}s ago)</span>
        </div>
      </div>

      {/* Side-by-side Left and Right Motor cards */}
      <div className="grid grid-cols-2 gap-3">
        {renderMotorCard('Left Motor', leftMotor, true)}
        {renderMotorCard('Right Motor', rightMotor, false)}
      </div>
    </div>
  );
};
