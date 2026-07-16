import React, { useEffect, useCallback } from "react";
import { TelemetryPoint } from "../types/telemetry";

interface ZoneDetailModalProps {
  point: TelemetryPoint;
  onClose: () => void;
}

/** IoT crowd-scanning suggestions keyed by capacity severity */
function getIoTSuggestion(point: TelemetryPoint): string {
  const cap = point.gateCapacityPercentage;
  const incidents = point.activeIncidentsCount;

  if (incidents >= 2 && cap > 85) {
    return `🚨 CRITICAL: ${point.zoneId} has ${incidents} active incidents at ${cap}% capacity. Immediately deploy security response team and activate emergency overflow corridors. Suspend concession queues and redirect foot traffic via alternate routes.`;
  }
  if (cap > 90) {
    return `⚠️ HIGH DENSITY: Crowd sensors detect ${cap}% saturation in ${point.zoneId}. Deploy 3 additional volunteers to manage queue overflow. Consider temporarily closing entry gates and redirecting to adjacent zones.`;
  }
  if (cap > 80) {
    return `📊 ELEVATED: ${point.zoneId} approaching bottleneck at ${cap}%. Position 2 volunteers at entry checkpoints to accelerate throughput. Monitor concession wait times (currently ${point.concessionWaitTimeMins}min) for secondary congestion.`;
  }
  if (incidents > 0) {
    return `🔔 ALERT: ${incidents} incident(s) reported in ${point.zoneId}. Crowd density is manageable at ${cap}%. Dispatch nearest available volunteer for assessment. Keep communication channel open for escalation.`;
  }
  return `✅ NOMINAL: ${point.zoneId} operating within normal parameters at ${cap}% capacity. Throughput is healthy at ${point.securityThroughputPerMin}/min. No volunteer redeployment required at this time.`;
}

/**
 * 🛠️ ZoneDetailModal Component
 * Renders detailed metrics, capacities, incident statuses, and strategic directives for a specific zone.
 * Enforces accessibility guidelines and keyboard interactions.
 * 
 * @param props Component properties interface.
 */
const ZoneDetailModal: React.FC<ZoneDetailModalProps> = ({ point, onClose }) => {
  const isBottleneck = point.gateCapacityPercentage > 80;
  const hasIncidents = point.activeIncidentsCount > 0;
  const isCritical = isBottleneck || hasIncidents;

  // Close on Escape key
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const capColor = point.gateCapacityPercentage > 90
    ? "bg-red-500"
    : point.gateCapacityPercentage > 80
    ? "bg-amber-500"
    : point.gateCapacityPercentage > 60
    ? "bg-yellow-500"
    : "bg-emerald-500";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 zone-modal-backdrop"
      style={{ backgroundColor: "rgba(2, 6, 23, 0.82)", backdropFilter: "blur(16px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-labelledby="zone-modal-title"
    >
      <div className="zone-modal-content w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b ${isCritical ? "border-red-900/40 bg-red-950/10" : "border-slate-800 bg-slate-900/40"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${isCritical ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
              <h2 id="zone-modal-title" className="text-lg font-bold text-white">{point.zoneId}</h2>
            </div>
            <button
              id="close-zone-modal-button"
              onClick={onClose}
              className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
              aria-label="Close modal"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <span className={`text-[10px] uppercase tracking-wider font-semibold mt-1 inline-block ${isCritical ? "text-red-400" : "text-emerald-400"}`}>
            {isCritical ? "⚠ Critical Zone" : "✓ Normal Operations"}
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="p-6 space-y-5">
          {/* Capacity Bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Gate Capacity</span>
              <span className={`text-sm font-bold font-mono ${isBottleneck ? "text-red-400" : "text-slate-200"}`}>
                {point.gateCapacityPercentage}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${capColor}`}
                style={{ width: `${Math.min(point.gateCapacityPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Three-column stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Throughput</span>
              <span className="text-lg font-bold font-mono text-indigo-400">{point.securityThroughputPerMin}</span>
              <span className="text-[10px] text-slate-500 block">/min</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Concession Wait</span>
              <span className="text-lg font-bold font-mono text-slate-200">{point.concessionWaitTimeMins}</span>
              <span className="text-[10px] text-slate-500 block">mins</span>
            </div>
            <div className={`rounded-xl p-3 text-center ${hasIncidents ? "bg-amber-950/20 border border-amber-900/40" : "bg-slate-950/60 border border-slate-800"}`}>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Incidents</span>
              <span className={`text-lg font-bold font-mono ${hasIncidents ? "text-amber-400" : "text-slate-200"}`}>
                {point.activeIncidentsCount}
              </span>
              <span className="text-[10px] text-slate-500 block">active</span>
            </div>
          </div>

          {/* IoT Crowd Intelligence Suggestion */}
          <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg width="16" height="16" className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-semibold">
                IoT Crowd Intelligence — Volunteer Action
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {getIoTSuggestion(point)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
          <span className="text-[10px] text-slate-500 font-mono">
            Last updated: {new Date(point.timestamp).toLocaleTimeString()}
          </span>
          <button
            id="close-zone-modal-bottom-button"
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 transition rounded-lg text-xs font-semibold text-white cursor-pointer"
            aria-label="Close details modal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ZoneDetailModal;
