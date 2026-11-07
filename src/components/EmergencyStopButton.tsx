import React, { useState } from 'react';
import { AlertOctagon, ShieldAlert, Unlock, AlertTriangle, ArrowRight } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface EmergencyStopButtonProps {
  isEmergencyStopped: boolean;
  onTriggerStop: () => void;
  onReleaseStop: () => void;
}

export const EmergencyStopButton: React.FC<EmergencyStopButtonProps> = ({
  isEmergencyStopped,
  onTriggerStop,
  onReleaseStop,
}) => {
  const [slideProgress, setSlideProgress] = useState(0);
  const [isSliding, setIsSliding] = useState(false);

  const handlePointerDown = () => {
    setIsSliding(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSliding) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = (x / rect.width) * 100;
    setSlideProgress(percent);

    if (percent > 85) {
      setIsSliding(false);
      setSlideProgress(0);
      onReleaseStop();
    }
  };

  const handlePointerUp = () => {
    setIsSliding(false);
    if (slideProgress <= 85) {
      setSlideProgress(0);
    }
  };

  return (
    <>
      {/* Sticky/Pinned Emergency Stop Button (Always visible on mobile without scrolling) */}
      <div className="w-full">
        {!isEmergencyStopped ? (
          <button
            onClick={() => {
              soundFx.playEmergencyAlarm();
              onTriggerStop();
            }}
            className="w-full h-14 sm:h-16 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-base sm:text-lg tracking-wider shadow-[0_0_25px_rgba(239,68,68,0.45)] border-2 border-red-400/60 flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer"
          >
            <AlertOctagon className="w-6 h-6 animate-pulse" />
            <span>EMERGENCY STOP</span>
          </button>
        ) : (
          <div className="bg-red-950/90 border-2 border-red-500 rounded-2xl p-4 shadow-[0_0_35px_rgba(239,68,68,0.6)] animate-pulse">
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
              <div>
                <h4 className="text-sm font-extrabold text-white tracking-wide">
                  🚨 ROBOT HARDWARE LOCKED IN E-STOP
                </h4>
                <p className="text-xs text-red-200">
                  Propulsion and conveyor cut. Fail-safe engaged on ESP32.
                </p>
              </div>
            </div>

            {/* Slide to Disarm Control (Deliberate Operator Action) */}
            <div className="mt-3">
              <div className="text-[11px] font-mono text-red-200/90 mb-1.5 flex items-center justify-between">
                <span>Deliberate Unlock Required:</span>
                <span className="font-bold">SLIDE TO DISARM →</span>
              </div>

              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="relative h-12 bg-red-900/60 rounded-xl border border-red-500/50 flex items-center p-1 cursor-ew-resize select-none overflow-hidden touch-none"
              >
                {/* Background Slider Progress fill */}
                <div
                  className="absolute inset-y-0 left-0 bg-red-600/50 transition-all duration-75"
                  style={{ width: `${slideProgress}%` }}
                />

                {/* Sliding Thumb Knob */}
                <div
                  style={{
                    transform: `translateX(${slideProgress * 2.8}px)`,
                  }}
                  className="w-10 h-10 rounded-lg bg-white text-red-700 flex items-center justify-center shadow-md relative z-10 font-bold"
                >
                  <Unlock className="w-5 h-5" />
                </div>

                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-red-100 pointer-events-none">
                  Slide right to release safety lock
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
