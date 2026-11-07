import React from 'react';
import {
  Wifi,
  WifiOff,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Volume2,
  VolumeX,
  Compass,
  Cpu,
  Eye
} from 'lucide-react';
import { RobotState } from '../types/robot';
import { soundFx } from '../utils/audio';

interface HeaderBarProps {
  state: RobotState;
  onOpenVisualizer: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  state,
  onOpenVisualizer,
  isMuted,
  onToggleMute,
}) => {
  const isConnected = state.connectionStatus === 'connected';
  const isConnecting = state.connectionStatus === 'connecting';
  const batteryPct = state.sensors.battery.percent;
  const batteryVolt = state.sensors.battery.voltage;

  return (
    <header className="sticky top-0 z-30 bg-[#070d18]/90 backdrop-blur-md border-b border-[#132238] px-4 py-2.5">
      <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
        {/* Brand Lockup */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400/20 to-teal-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Compass className="w-5 h-5 animate-[spin_12s_linear_infinite]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['Outfit',sans-serif] text-lg font-extrabold tracking-wider text-white">
                RIVER<span className="text-cyan-400">BOT</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                v2.4
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block font-medium">
              Smart River Cleaning Controller
            </p>
          </div>
        </div>

        {/* Status Indicators & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Top Down River Simulator View Toggle */}
          <button
            onClick={() => {
              soundFx.playClick(500);
              onOpenVisualizer();
            }}
            title="Open Live River Visualizer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e1a2d] hover:bg-[#142642] border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all active:scale-95"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xs:inline">River View</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              onToggleMute();
              soundFx.playClick(600);
            }}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-1.5 rounded-lg bg-[#0e1a2d] hover:bg-[#142642] border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Connection Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              isConnected
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : isConnecting
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-300 animate-pulse'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                <span className="font-mono text-[11px] hidden sm:inline">ESP32</span>
                <span>Connected</span>
              </>
            ) : isConnecting ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-400" />
                <span>Disconnected</span>
              </>
            )}
          </div>

          {/* Battery Status */}
          <div className="flex items-center gap-1.5 bg-[#0e1a2d] px-2.5 py-1 rounded-full border border-slate-800/80 text-xs">
            {batteryPct > 25 ? (
              <Battery className="w-4 h-4 text-emerald-400" />
            ) : (
              <BatteryWarning className="w-4 h-4 text-amber-400 animate-bounce" />
            )}
            <span className="font-mono font-semibold text-slate-200">{batteryPct}%</span>
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
              ({batteryVolt}V)
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
