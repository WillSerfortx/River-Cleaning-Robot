import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Square,
  Gauge,
  Zap,
  RotateCcw
} from 'lucide-react';
import { RobotMovement } from '../types/robot';
import { soundFx } from '../utils/audio';

interface VirtualJoystickProps {
  currentMovement: RobotMovement;
  speed: number;
  disabled?: boolean;
  onMove: (direction: RobotMovement) => void;
  onSpeedChange: (speed: number) => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  currentMovement,
  speed,
  disabled = false,
  onMove,
  onSpeedChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPosition, setKnobPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeDirection, setActiveDirection] = useState<RobotMovement>('STOP');

  const JOYSTICK_RADIUS = 76; // Max deflection radius in pixels
  const DEAD_ZONE = 18;       // Neutral deadzone radius in pixels

  // Compute direction from normalized drag vector (x, y)
  const computeDirection = useCallback((x: number, y: number): RobotMovement => {
    const distance = Math.hypot(x, y);
    if (distance < DEAD_ZONE) return 'STOP';

    const angle = Math.atan2(y, x) * (180 / Math.PI); // -180 to 180

    // Angle mapping:
    // Up: -135 to -45
    // Right: -45 to 45
    // Down: 45 to 135
    // Left: > 135 or < -135
    if (angle >= -135 && angle <= -45) {
      return 'FORWARD';
    } else if (angle >= 45 && angle <= 135) {
      return 'BACKWARD';
    } else if (angle > -45 && angle < 45) {
      return 'RIGHT';
    } else {
      return 'LEFT';
    }
  }, []);

  const handlePointerStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deltaX = e.clientX - centerX;
    let deltaY = e.clientY - centerY;

    const distance = Math.hypot(deltaX, deltaY);

    // Clamp to outer radius
    if (distance > JOYSTICK_RADIUS) {
      const angle = Math.atan2(deltaY, deltaX);
      deltaX = Math.cos(angle) * JOYSTICK_RADIUS;
      deltaY = Math.sin(angle) * JOYSTICK_RADIUS;
    }

    setKnobPosition({ x: deltaX, y: deltaY });

    const newDirection = computeDirection(deltaX, deltaY);
    if (newDirection !== activeDirection) {
      setActiveDirection(newDirection);
      onMove(newDirection);
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
    setIsDragging(false);
    setKnobPosition({ x: 0, y: 0 });

    if (activeDirection !== 'STOP') {
      setActiveDirection('STOP');
      onMove('STOP');
    }
  };

  // Keyboard navigation support (Arrow keys or WASD)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        if (currentMovement !== 'FORWARD') onMove('FORWARD');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        if (currentMovement !== 'BACKWARD') onMove('BACKWARD');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        if (currentMovement !== 'LEFT') onMove('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        if (currentMovement !== 'RIGHT') onMove('RIGHT');
      } else if (['Space', 'Escape'].includes(e.code)) {
        onMove('STOP');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS', 'ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'].includes(e.code)) {
        onMove('STOP');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [disabled, currentMovement, onMove]);

  return (
    <div className="bg-[#0b1324] border border-[#1a2d48] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
      {/* Background cyber grid accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#00e5ff_1px,transparent_1px)] [background-size:24px_24px] opacity-5 pointer-events-none" />

      {/* Header with Title and Current Direction Readout */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Manual Thrust & Steering
          </h2>
          <p className="text-[11px] text-slate-400">One-handed virtual joystick with auto-neutral stop</p>
        </div>

        {/* Live Vector Feedback Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#070e1c] border border-cyan-500/30 text-cyan-300 font-mono text-xs font-semibold">
          {currentMovement === 'STOP' && <Square className="w-3.5 h-3.5 text-slate-400" />}
          {currentMovement === 'FORWARD' && <ArrowUp className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />}
          {currentMovement === 'BACKWARD' && <ArrowDown className="w-3.5 h-3.5 text-amber-400 animate-bounce" />}
          {currentMovement === 'LEFT' && <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />}
          {currentMovement === 'RIGHT' && <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />}
          <span>{currentMovement}</span>
        </div>
      </div>

      {/* Main Joystick & D-Pad Container */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-2 relative z-10">
        {/* Physical-style Virtual Joystick */}
        <div className="flex flex-col items-center">
          <div
            ref={containerRef}
            onPointerDown={handlePointerStart}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            className={`w-48 h-48 sm:w-52 sm:h-52 rounded-full bg-gradient-to-b from-[#0a1426] to-[#040810] border-2 ${
              disabled
                ? 'border-slate-800 opacity-60 cursor-not-allowed'
                : 'border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_25px_rgba(0,229,255,0.15)] cursor-grab active:cursor-grabbing'
            } relative flex items-center justify-center select-none touch-none transition-colors`}
          >
            {/* Degree & Coordinate Ring Markings */}
            <div className="absolute inset-2 rounded-full border border-dashed border-cyan-500/20 pointer-events-none" />
            <div className="absolute inset-8 rounded-full border border-cyan-500/10 pointer-events-none" />
            
            {/* Crosshair Guidelines */}
            <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent pointer-events-none" />
            <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent pointer-events-none" />

            {/* Direction Labels on Ring */}
            <span className="absolute top-2 text-[10px] font-mono font-bold text-cyan-400/80">FWD</span>
            <span className="absolute bottom-2 text-[10px] font-mono font-bold text-cyan-400/80">REV</span>
            <span className="absolute left-2 text-[10px] font-mono font-bold text-cyan-400/80">LFT</span>
            <span className="absolute right-2 text-[10px] font-mono font-bold text-cyan-400/80">RGT</span>

            {/* Central Neutral Target Ring */}
            <div className="w-10 h-10 rounded-full border border-cyan-400/30 bg-cyan-950/20 pointer-events-none flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-cyan-400/60" />
            </div>

            {/* Floating Joystick Thumb Knob */}
            <div
              style={{
                transform: `translate3d(${knobPosition.x}px, ${knobPosition.y}px, 0)`,
                transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className={`w-16 h-16 rounded-full bg-gradient-to-b from-[#183153] to-[#0c1a2e] border-2 ${
                currentMovement !== 'STOP'
                  ? 'border-cyan-300 shadow-[0_0_20px_#00e5ff]'
                  : 'border-cyan-500/60 shadow-[0_4px_12px_rgba(0,0,0,0.6)]'
              } flex items-center justify-center pointer-events-none z-20`}
            >
              <div className="w-8 h-8 rounded-full bg-[#0a1524] border border-cyan-400/50 flex items-center justify-center">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    currentMovement !== 'STOP' ? 'bg-cyan-300 animate-ping' : 'bg-cyan-500/70'
                  }`}
                />
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-2">
            Touch and drag to steer · Release to stop
          </span>
        </div>

        {/* Directional Pad Quick Buttons (Alternative tactile tap controls) */}
        <div className="flex flex-col items-center">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
            Direct Tap Pad
          </div>
          <div className="grid grid-cols-3 gap-2 w-44">
            <div />
            <button
              disabled={disabled}
              onPointerDown={() => onMove('FORWARD')}
              onPointerUp={() => onMove('STOP')}
              onPointerLeave={() => currentMovement === 'FORWARD' && onMove('STOP')}
              className={`h-12 rounded-xl flex items-center justify-center font-bold transition-all active:scale-95 ${
                currentMovement === 'FORWARD'
                  ? 'bg-emerald-500 text-black shadow-[0_0_15px_#10b981]'
                  : 'bg-[#12223a] text-slate-200 hover:bg-[#1a3153] border border-cyan-500/20'
              }`}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <div />

            <button
              disabled={disabled}
              onPointerDown={() => onMove('LEFT')}
              onPointerUp={() => onMove('STOP')}
              onPointerLeave={() => currentMovement === 'LEFT' && onMove('STOP')}
              className={`h-12 rounded-xl flex items-center justify-center font-bold transition-all active:scale-95 ${
                currentMovement === 'LEFT'
                  ? 'bg-cyan-400 text-black shadow-[0_0_15px_#00e5ff]'
                  : 'bg-[#12223a] text-slate-200 hover:bg-[#1a3153] border border-cyan-500/20'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button
              disabled={disabled}
              onClick={() => onMove('STOP')}
              className={`h-12 rounded-xl flex items-center justify-center font-bold transition-all active:scale-95 ${
                currentMovement === 'STOP'
                  ? 'bg-slate-700 text-cyan-300 border border-cyan-500/50'
                  : 'bg-rose-950/80 text-rose-300 hover:bg-rose-900 border border-rose-500/30'
              }`}
            >
              <Square className="w-4 h-4 fill-current" />
            </button>

            <button
              disabled={disabled}
              onPointerDown={() => onMove('RIGHT')}
              onPointerUp={() => onMove('STOP')}
              onPointerLeave={() => currentMovement === 'RIGHT' && onMove('STOP')}
              className={`h-12 rounded-xl flex items-center justify-center font-bold transition-all active:scale-95 ${
                currentMovement === 'RIGHT'
                  ? 'bg-cyan-400 text-black shadow-[0_0_15px_#00e5ff]'
                  : 'bg-[#12223a] text-slate-200 hover:bg-[#1a3153] border border-cyan-500/20'
              }`}
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            <div />
            <button
              disabled={disabled}
              onPointerDown={() => onMove('BACKWARD')}
              onPointerUp={() => onMove('STOP')}
              onPointerLeave={() => currentMovement === 'BACKWARD' && onMove('STOP')}
              className={`h-12 rounded-xl flex items-center justify-center font-bold transition-all active:scale-95 ${
                currentMovement === 'BACKWARD'
                  ? 'bg-amber-500 text-black shadow-[0_0_15px_#f59e0b]'
                  : 'bg-[#12223a] text-slate-200 hover:bg-[#1a3153] border border-cyan-500/20'
              }`}
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <div />
          </div>
        </div>
      </div>

      {/* Speed Adjustment Slider (0 - 100%) */}
      <div className="mt-4 pt-4 border-t border-[#15253e]">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
            <Gauge className="w-4 h-4 text-cyan-400" />
            ROBOT SPEED: <span className="text-cyan-300 font-bold">{speed}%</span>
            <span className="text-[10px] text-slate-400 font-normal">
              (PWM: {Math.round((speed / 100) * 255)}/255)
            </span>
          </label>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1">
            {[30, 50, 75, 100].map((preset) => (
              <button
                key={preset}
                disabled={disabled}
                onClick={() => {
                  soundFx.playClick(400 + preset * 3);
                  onSpeedChange(preset);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
                  speed === preset
                    ? 'bg-cyan-400 text-black font-bold'
                    : 'bg-[#12223a] text-slate-300 hover:text-white hover:bg-[#1c3558]'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex items-center">
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={speed}
            disabled={disabled}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="w-full h-2.5 bg-[#070e1c] rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none border border-cyan-500/20"
          />
        </div>
      </div>
    </div>
  );
};
