import React, { useRef, useCallback } from "react";
import { TelemetryPoint } from "../types/telemetry";

interface ZoneCardProps {
  point: TelemetryPoint;
  /** Previous tick's capacity value — used to show trend arrows */
  prevCapacity?: number;
  onClick: () => void;
  onDeployVolunteer?: (zoneId: string) => void;
  deployingZoneId?: string | null;
}

const ZoneCard: React.FC<ZoneCardProps> = ({
  point,
  prevCapacity,
  onClick,
  onDeployVolunteer,
  deployingZoneId,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const isBottleneck = point.gateCapacityPercentage > 80;
  const hasIncidents = point.activeIncidentsCount > 0;
  const isCritical = isBottleneck || hasIncidents;
  const isCurrentlyDeploying = deployingZoneId === point.zoneId;
  const hasMetaMask = typeof window !== "undefined" && !!(window as any).ethereum;

  // Compute trend direction
  const trend =
    prevCapacity === undefined
      ? null
      : point.gateCapacityPercentage > prevCapacity
      ? "up"
      : point.gateCapacityPercentage < prevCapacity
      ? "down"
      : null;

  // ── Mouse-tracking glow handler ──
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--mx", `${x}%`);
    card.style.setProperty("--my", `${y}%`);
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      className={`glass-card p-4 flex flex-col justify-between cursor-pointer group ${
        isCritical ? "glass-card--critical shadow-lg shadow-red-950/10" : ""
      }`}
    >
      {/* Mouse-tracking glow overlay */}
      <div className="glass-glow" />

      <div>
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            {point.zoneId}
            {isCritical && (
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </h4>
          <span className="text-[10px] text-slate-500 font-mono">
            Throughput: {point.securityThroughputPerMin}/min
          </span>
        </div>

        {/* Metric tiles */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {/* Capacity */}
          <div
            className={`p-2 rounded-lg text-center ${
              isBottleneck
                ? "bg-red-950/20 border border-red-900/35"
                : "bg-slate-950/40 border border-slate-900"
            }`}
          >
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Capacity
            </span>
            <span
              className={`text-sm font-bold font-mono inline-flex items-center gap-1 ${
                isBottleneck ? "text-red-400" : "text-slate-200"
              }`}
            >
              {point.gateCapacityPercentage}%
              {trend === "up" && <span className="trend-up text-[10px]">▲</span>}
              {trend === "down" && (
                <span className="trend-down text-[10px]">▼</span>
              )}
            </span>
          </div>

          {/* Concessions */}
          <div className="bg-slate-950/40 border border-slate-900 p-2 rounded-lg text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Concessions
            </span>
            <span className="text-sm font-bold font-mono text-slate-200">
              {point.concessionWaitTimeMins}m
            </span>
          </div>

          {/* Incidents */}
          <div
            className={`p-2 rounded-lg text-center ${
              hasIncidents
                ? "bg-amber-950/20 border border-amber-900/35"
                : "bg-slate-950/40 border border-slate-900"
            }`}
          >
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Incidents
            </span>
            <span
              className={`text-sm font-bold font-mono ${
                hasIncidents ? "text-amber-400" : "text-slate-200"
              }`}
            >
              {point.activeIncidentsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Deploy Volunteer Actions */}
      <div className="mt-3.5 z-10 relative">
        {isCurrentlyDeploying ? (
          <div className="text-[10px] text-amber-400 bg-amber-950/20 border border-amber-900/30 px-2.5 py-1.5 rounded-lg flex items-center gap-2 animate-pulse leading-snug">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
            <span>Volunteer dispatch active... resolving congestion via Edge AI verification</span>
          </div>
        ) : (
          isCritical && onDeployVolunteer && (
            <div className="flex flex-col gap-2">
              <button
                disabled={!hasMetaMask}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeployVolunteer(point.zoneId);
                }}
                className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold transition duration-200 flex items-center justify-center gap-1.5 ${
                  hasMetaMask
                    ? "bg-indigo-950/50 hover:bg-indigo-900 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-400 hover:text-white cursor-pointer"
                    : "bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed opacity-50"
                }`}
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Deploy Volunteer to Resolve
              </button>
              {!hasMetaMask && (
                <span className="text-[10px] text-yellow-500 font-medium text-center block mt-1 leading-snug">
                  ⚠️ MetaMask extension required to interact with blockchain features.
                </span>
              )}
            </div>
          )
        )}
      </div>

      {/* Interactive hover reveal */}
      {!isCurrentlyDeploying && !isCritical && (
        <div className="mt-3 overflow-hidden max-h-0 group-hover:max-h-8 transition-all duration-300 opacity-0 group-hover:opacity-100">
          <span className="text-[11px] text-indigo-400 font-medium tracking-wide flex items-center gap-1">
            View Zone Details
            <svg
              width="14"
              height="14"
              className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </span>
        </div>
      )}
    </div>
  );
};

export default ZoneCard;
