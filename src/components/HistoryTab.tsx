import React, { useState } from 'react';
import {
  History,
  Calendar,
  Clock,
  Trash2,
  Droplet,
  Download,
  Filter,
  Activity,
  AlertTriangle,
  Info
} from 'lucide-react';
import { ActivityLogItem, SessionHistoryItem } from '../types/robot';
import { sampleHistory } from '../services/esp32Service';

interface HistoryTabProps {
  logs: ActivityLogItem[];
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ logs }) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'ALL') return true;
    return log.type === filterType;
  });

  const exportLogsAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `riverbot_telemetry_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-white tracking-wide">
            River Cleaning History & Telemetry Logs
          </h2>
          <p className="text-xs text-slate-400">
            Audit logs, cleaning run logs, and environmental water sampling
          </p>
        </div>
        <button
          onClick={exportLogsAsJson}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e1a2d] hover:bg-[#142642] border border-cyan-500/30 text-cyan-300 text-xs font-mono font-medium transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export JSON
        </button>
      </div>

      {/* Aggregate Lifetime Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#0b1324] border border-[#1a2d48] rounded-xl p-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Total Debris Gathered</span>
          <div className="text-xl font-mono font-bold text-teal-300 mt-1">20.4 kg</div>
          <span className="text-[10px] text-slate-500 font-mono">88 plastic bottles/cans</span>
        </div>

        <div className="bg-[#0b1324] border border-[#1a2d48] rounded-xl p-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Operating Time</span>
          <div className="text-xl font-mono font-bold text-white mt-1">2h 15m</div>
          <span className="text-[10px] text-slate-500 font-mono">Across 3 missions</span>
        </div>

        <div className="bg-[#0b1324] border border-[#1a2d48] rounded-xl p-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Distance Traversed</span>
          <div className="text-xl font-mono font-bold text-cyan-300 mt-1">1.96 km</div>
          <span className="text-[10px] text-slate-500 font-mono">River corridor sweep</span>
        </div>

        <div className="bg-[#0b1324] border border-[#1a2d48] rounded-xl p-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Water Quality Avg</span>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-1">pH 7.2</div>
          <span className="text-[10px] text-slate-500 font-mono">Turbidity: 18.4 NTU</span>
        </div>
      </div>

      {/* Recent Cleaning Missions List */}
      <div className="bg-[#0b1324] border border-[#1a2d48] rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Recent Cleaning Missions
          </h3>
        </div>

        <div className="space-y-2.5">
          {sampleHistory.map((sess) => (
            <div
              key={sess.id}
              className="bg-[#070e1c] border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white font-mono">{sess.id.toUpperCase()}</span>
                  <span className="text-xs text-slate-400 font-mono">· {sess.startTime}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-slate-300">
                  <span className="flex items-center gap-1 text-teal-300">
                    <Trash2 className="w-3 h-3 text-teal-400" />
                    {sess.debrisWeightKg} kg ({sess.itemsCount} items)
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3 h-3" />
                    {sess.durationMinutes} mins
                  </span>
                  <span className="text-slate-400">
                    Water: pH {sess.averagePh} / {sess.averageTurbidityNtu} NTU
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="px-2 py-1 rounded bg-[#0f1d31] border border-cyan-500/20 text-cyan-300">
                  {sess.modeRatio.manualPercent}% Manual / {sess.modeRatio.autoPercent}% Auto
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Activity & Telemetry Audit Log */}
      <div className="bg-[#0b1324] border border-[#1a2d48] rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Live Command & Security Audit Log
            </h3>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-[#070e1c] p-1 rounded-lg border border-slate-800">
            {['ALL', 'COMMAND', 'SENSOR', 'WARNING', 'EMERGENCY'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterType(cat)}
                className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition-colors ${
                  filterType === cat
                    ? 'bg-cyan-400 text-black font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Log Stream */}
        <div className="bg-[#060c18] border border-[#122035] rounded-xl p-2.5 h-64 overflow-y-auto font-mono text-[11px] space-y-1.5">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-slate-500 py-8">No logs match this filter.</div>
          ) : (
            filteredLogs.map((log) => {
              let badgeColor = 'text-slate-400 bg-slate-900 border-slate-700';
              if (log.type === 'COMMAND') badgeColor = 'text-cyan-300 bg-cyan-950/80 border-cyan-500/30';
              if (log.type === 'SENSOR') badgeColor = 'text-teal-300 bg-teal-950/80 border-teal-500/30';
              if (log.type === 'WARNING') badgeColor = 'text-amber-300 bg-amber-950/80 border-amber-500/30';
              if (log.type === 'EMERGENCY') badgeColor = 'text-rose-300 bg-rose-950/80 border-rose-500/30';

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-2 py-1 px-1.5 rounded hover:bg-[#0b1424] transition-colors border-b border-[#0f1b2d] last:border-0"
                >
                  <span className="text-slate-500 text-[10px] shrink-0">{log.timestamp}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 ${badgeColor}`}>
                    {log.type}
                  </span>
                  <div className="flex-1 text-slate-200">
                    <span>{log.message}</span>
                    {log.details && (
                      <span className="text-slate-400 text-[10px] block mt-0.5">{log.details}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
