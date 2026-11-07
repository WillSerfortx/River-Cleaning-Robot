import React, { useState } from 'react';
import {
  Settings,
  Wifi,
  Cpu,
  Radio,
  FileCode,
  Copy,
  Check,
  Download,
  ShieldAlert,
  Sliders,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { RobotState } from '../types/robot';
import { ESP32_FIRMWARE_INO, FLUTTER_DART_CODE } from '../data/firmwareCode';
import { soundFx } from '../utils/audio';

interface SettingsTabProps {
  state: RobotState;
  onSetProtocol: (proto: RobotState['connectionProtocol'], ip?: string, port?: number) => void;
  onConnectReal: () => void;
  onDisconnect: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  state,
  onSetProtocol,
  onConnectReal,
  onDisconnect,
}) => {
  const [ip, setIp] = useState(state.ipAddress);
  const [port, setPort] = useState(state.port.toString());
  const [selectedProto, setSelectedProto] = useState<RobotState['connectionProtocol']>(
    state.connectionProtocol
  );
  const [copiedIno, setCopiedIno] = useState(false);
  const [copiedDart, setCopiedDart] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'ESP32_INO' | 'FLUTTER_DART'>('ESP32_INO');

  const handleApplyConnection = (proto: RobotState['connectionProtocol']) => {
    soundFx.playClick(600);
    setSelectedProto(proto);
    onSetProtocol(proto, ip, parseInt(port, 10) || 80);
  };

  const handleCopyIno = () => {
    navigator.clipboard.writeText(ESP32_FIRMWARE_INO);
    setCopiedIno(true);
    soundFx.playClick(700);
    setTimeout(() => setCopiedIno(false), 2000);
  };

  const handleDownloadIno = () => {
    const element = document.createElement('a');
    const file = new Blob([ESP32_FIRMWARE_INO], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'RiverBot_ESP32_Firmware.ino';
    document.body.appendChild(element);
    element.click();
    element.remove();
  };

  const handleCopyDart = () => {
    navigator.clipboard.writeText(FLUTTER_DART_CODE);
    setCopiedDart(true);
    soundFx.playClick(700);
    setTimeout(() => setCopiedDart(false), 2000);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-base font-extrabold text-white tracking-wide">
          ESP32 Connectivity & Hardware Config
        </h2>
        <p className="text-xs text-slate-400">
          Configure physical robot Wi-Fi network parameters, firmware code, and watchdog thresholds
        </p>
      </div>

      {/* 1. CONNECTION MODE SELECTION */}
      <div className="bg-[#0b1324] border border-[#1a2d48] rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Wifi className="w-5 h-5 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Microcontroller Link Mode
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Simulator */}
          <button
            onClick={() => handleApplyConnection('simulator')}
            className={`p-3 rounded-xl border text-left transition-all ${
              state.connectionProtocol === 'simulator'
                ? 'bg-[#10233f] border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                : 'bg-[#070e1c] border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-slate-200">Hardware Simulator</span>
              {state.connectionProtocol === 'simulator' && (
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Virtual water physics, floating trash intake, obstacle radar
            </p>
          </button>

          {/* WebSocket */}
          <button
            onClick={() => handleApplyConnection('websocket')}
            className={`p-3 rounded-xl border text-left transition-all ${
              state.connectionProtocol === 'websocket'
                ? 'bg-[#10233f] border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                : 'bg-[#070e1c] border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-slate-200">Real WebSocket (/ws)</span>
              {state.connectionProtocol === 'websocket' && (
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Sub-10ms two-way telemetry streaming over Wi-Fi
            </p>
          </button>

          {/* HTTP REST */}
          <button
            onClick={() => handleApplyConnection('http')}
            className={`p-3 rounded-xl border text-left transition-all ${
              state.connectionProtocol === 'http'
                ? 'bg-[#10233f] border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                : 'bg-[#070e1c] border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-slate-200">HTTP REST (/api)</span>
              {state.connectionProtocol === 'http' && (
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Standard JSON POST requests for simple Wi-Fi setups
            </p>
          </button>
        </div>

        {/* IP and Port Inputs for Real Hardware */}
        {state.connectionProtocol !== 'simulator' && (
          <div className="mt-4 pt-3 border-t border-[#142338] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1">
                  ESP32 IP Address
                </label>
                <input
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder="192.168.4.1"
                  className="w-full bg-[#060c18] border border-cyan-500/30 rounded-xl px-3 py-2 text-sm font-mono text-cyan-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1">
                  Port (Default 80)
                </label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="80"
                  className="w-full bg-[#060c18] border border-cyan-500/30 rounded-xl px-3 py-2 text-sm font-mono text-cyan-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onConnectReal}
                className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono transition-colors shadow-md"
              >
                Connect to ESP32
              </button>
              <button
                onClick={onDisconnect}
                className="px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-500/30 text-rose-300 font-bold text-xs font-mono transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. SAFETY & WATCHDOG FAIL-SAFE SPECIFICATION */}
      <div className="bg-[#0b1324] border border-[#1a2d48] rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Hardware & Firmware Safety Policies
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          RiverBot enforces multi-layer safety mechanisms to protect the robot in river environments:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] font-mono">
          <div className="bg-[#070e1c] p-2.5 rounded-xl border border-slate-800">
            <span className="text-cyan-300 font-bold block mb-0.5">1. Command Watchdog (1500ms)</span>
            <span className="text-slate-400">
              If wireless signal drops for &gt;1.5s, the ESP32 automatically shuts down propulsion motors.
            </span>
          </div>

          <div className="bg-[#070e1c] p-2.5 rounded-xl border border-slate-800">
            <span className="text-teal-300 font-bold block mb-0.5">2. Bin Full Interlock (≥90%)</span>
            <span className="text-slate-400">
              Halts conveyor belt when holding bin hits full threshold to prevent motor jam or sinking.
            </span>
          </div>

          <div className="bg-[#070e1c] p-2.5 rounded-xl border border-slate-800">
            <span className="text-amber-300 font-bold block mb-0.5">3. Ultrasonic Auto-Brake (20cm)</span>
            <span className="text-slate-400">
              In autonomous mode, immediate collision avoidance steering occurs when river obstacles appear &lt;30cm.
            </span>
          </div>

          <div className="bg-[#070e1c] p-2.5 rounded-xl border border-slate-800">
            <span className="text-rose-300 font-bold block mb-0.5">4. Hardware E-Stop ISR</span>
            <span className="text-slate-400">
              Physical pushbutton on GPIO 4 triggers immediate hardware interrupt cutting all motor PWM.
            </span>
          </div>
        </div>
      </div>

      {/* 3. PRODUCTION ESP32 ARDUINO C++ & FLUTTER SOURCE CODE VIEWER */}
      <div className="bg-[#0b1324] border border-[#1a2d48] rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Firmware & Client Source Code
            </h3>
          </div>

          {/* Code Tab Switcher */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveCodeTab('ESP32_INO')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                activeCodeTab === 'ESP32_INO'
                  ? 'bg-cyan-500 text-black font-bold'
                  : 'bg-[#070e1c] text-slate-400 hover:text-white'
              }`}
            >
              ESP32 Arduino (.ino)
            </button>
            <button
              onClick={() => setActiveCodeTab('FLUTTER_DART')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                activeCodeTab === 'FLUTTER_DART'
                  ? 'bg-cyan-500 text-black font-bold'
                  : 'bg-[#070e1c] text-slate-400 hover:text-white'
              }`}
            >
              Flutter Dart (APK)
            </button>
          </div>
        </div>

        {/* Code View Card */}
        <div className="relative">
          <div className="flex items-center justify-between bg-[#060c18] px-3 py-2 rounded-t-xl border border-slate-800 border-b-0 text-xs font-mono text-slate-400">
            <span>
              {activeCodeTab === 'ESP32_INO'
                ? 'RiverBot_ESP32_Firmware.ino (Ready to flash via Arduino IDE / PlatformIO)'
                : 'lib/main.dart (Flutter cross-platform Android mobile app)'}
            </span>
            <div className="flex items-center gap-2">
              {activeCodeTab === 'ESP32_INO' && (
                <button
                  onClick={handleDownloadIno}
                  className="flex items-center gap-1 hover:text-cyan-300 text-slate-300"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .ino</span>
                </button>
              )}
              <button
                onClick={activeCodeTab === 'ESP32_INO' ? handleCopyIno : handleCopyDart}
                className="flex items-center gap-1 hover:text-cyan-300 text-cyan-400 font-semibold"
              >
                {copiedIno || copiedDart ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <pre className="bg-[#040810] border border-slate-800 rounded-b-xl p-3 h-72 overflow-y-auto text-[11px] font-mono text-cyan-200/90 leading-relaxed select-text">
            <code>
              {activeCodeTab === 'ESP32_INO' ? ESP32_FIRMWARE_INO : FLUTTER_DART_CODE}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};
