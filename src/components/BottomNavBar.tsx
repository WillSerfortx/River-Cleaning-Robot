import React from 'react';
import { Gamepad2, Radar, History, Settings } from 'lucide-react';
import { soundFx } from '../utils/audio';

export type NavTab = 'CONTROL' | 'SENSORS' | 'HISTORY' | 'SETTINGS';

interface BottomNavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isEmergencyStopped: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  isEmergencyStopped,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'CONTROL', label: 'CONTROL', icon: Gamepad2 },
    { id: 'SENSORS', label: 'SENSORS', icon: Radar },
    { id: 'HISTORY', label: 'HISTORY', icon: History },
    { id: 'SETTINGS', label: 'SETTINGS', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#070d18]/95 backdrop-blur-md border-t border-[#142338] px-2 pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-4 h-16 items-center">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => {
                soundFx.playClick(isActive ? 400 : 650);
                onTabChange(tab.id);
              }}
              className={`min-h-[48px] flex flex-col items-center justify-center relative transition-all active:scale-95 ${
                isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Active Tab Top Glow Line */}
              {isActive && (
                <div className="absolute top-0 w-10 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.id === 'CONTROL' && isEmergencyStopped && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                )}
              </div>

              <span
                className={`text-[10px] tracking-wider mt-1 font-mono font-bold ${
                  isActive ? 'text-cyan-300 font-extrabold' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
