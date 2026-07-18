import React, { useState, useCallback, useEffect } from "react";
import { TelemetryPoint } from "../types/telemetry";

/** Static mock CCTV feed definitions */
const CCTV_FEEDS = [
  {
    id: "cam-01",
    label: "CAM-01 · North Gate",
    zoneKey: "Zone A (North Gate)",
  },
  {
    id: "cam-02",
    label: "CAM-02 · East Concourse",
    zoneKey: "Zone B (East Concourse)",
  },
  {
    id: "cam-03",
    label: "CAM-03 · South Portal",
    zoneKey: "Zone C (South Portal)",
  },
  {
    id: "cam-04",
    label: "CAM-04 · VIP Gate",
    zoneKey: "Zone D (VIP Gate)",
  },
];

/** IoT density badge + volunteer action based on zone telemetry */
function getDensityInfo(point?: TelemetryPoint): {
  badge: string;
  color: string;
  bgColor: string;
  suggestion: string;
} {
  if (!point) {
    return {
      badge: "Offline",
      color: "text-slate-300",
      bgColor: "bg-slate-800/60",
      suggestion: "Sensor data unavailable. Manual inspection recommended.",
    };
  }
  const cap = point.gateCapacityPercentage;
  if (cap > 90) {
    return {
      badge: "Critical ⚠",
      color: "text-red-400",
      bgColor: "bg-red-950/40 border-red-900/40",
      suggestion: `⚠ Crowd density CRITICAL at ${cap}%. Deploy all available volunteers immediately. Activate emergency overflow protocols and contact security command.`,
    };
  }
  if (cap > 75) {
    return {
      badge: "High ↑",
      color: "text-amber-400",
      bgColor: "bg-amber-950/30 border-amber-900/30",
      suggestion: `📊 High crowd density detected (${cap}%). Position 2-3 volunteers at choke points. Monitor for potential surge patterns and prepare overflow routes.`,
    };
  }
  if (cap > 50) {
    return {
      badge: "Moderate",
      color: "text-yellow-400",
      bgColor: "bg-yellow-950/20 border-yellow-900/20",
      suggestion: `📋 Moderate foot traffic (${cap}%). Standard volunteer coverage sufficient. Continue passive monitoring of entry flow rates.`,
    };
  }
  return {
    badge: "Normal ✓",
    color: "text-emerald-400",
    bgColor: "bg-emerald-950/20 border-emerald-900/20",
    suggestion: `✅ Low density zone (${cap}%). Nominal operations. Volunteers may be redeployed to higher-traffic zones if needed.`,
  };
}

interface CCTVGridProps {
  telemetry: TelemetryPoint[] | null;
}

const CCTVGrid: React.FC<CCTVGridProps> = ({ telemetry }) => {
  const [expandedFeed, setExpandedFeed] = useState<string | null>(null);

  // Close expanded view on Escape
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpandedFeed(null);
    },
    []
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const findZoneTelemetry = (zoneKey: string): TelemetryPoint | undefined => {
    return telemetry?.find((t) => t.zoneId === zoneKey);
  };

  const expandedData = expandedFeed
    ? CCTV_FEEDS.find((f) => f.id === expandedFeed)
    : null;

  return (
    <>
      {/* 2×2 Grid */}
      <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              CCTV Surveillance Grid
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">Live</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {CCTV_FEEDS.map((feed) => {
            const zonePt = findZoneTelemetry(feed.zoneKey);
            const density = getDensityInfo(zonePt);

            return (
              <div
                id={`cctv-tile-${feed.id}`}
                key={feed.id}
                className="cctv-tile aspect-video relative group overflow-hidden"
                role="button"
                tabIndex={0}
                aria-label={`Open expanded live feed for ${feed.label}`}
                onClick={() => setExpandedFeed(feed.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setExpandedFeed(feed.id);
                  }
                }}
              >
                <div className="cctv-scanner-container w-full h-full">
                  <div className="cctv-scanner-line" />
                  <div
                    className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 animate-pulse pointer-events-none"
                    style={{ animationDuration: `${2 + Math.random() * 2}s` }}
                  />
                </div>
                {/* Overlay controls */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-2 flex items-end justify-between pointer-events-none">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] text-white font-semibold drop-shadow-lg">{feed.label}</span>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${density.color} ${density.bgColor}`}>
                    {density.badge}
                  </span>
                </div>
                {/* Hover expand hint */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <span className="bg-slate-950/70 backdrop-blur-sm text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg border border-slate-700/50">
                    Click to Expand
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Expanded CCTV Modal ── */}
      {expandedData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 zone-modal-backdrop"
          style={{ backgroundColor: "rgba(2, 6, 23, 0.85)", backdropFilter: "blur(16px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setExpandedFeed(null); }}
          role="dialog"
          aria-labelledby="cctv-modal-title"
        >
          <div className="zone-modal-content w-full max-w-3xl bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                <h3 id="cctv-modal-title" className="text-sm font-bold text-white">{expandedData.label}</h3>
                <span className="text-[10px] text-red-400 font-semibold uppercase">Live Feed</span>
              </div>
              <button
                id="close-cctv-modal-button"
                onClick={() => setExpandedFeed(null)}
                className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
                aria-label="Close expanded view"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Simulated CCTV Feed */}
            <div className="aspect-video w-full relative overflow-hidden bg-black">
              <div className="cctv-scanner-container w-full h-full">
                <div className="cctv-scanner-line" />
                <div
                  className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 animate-pulse"
                  style={{ animationDuration: '3s' }}
                />
              </div>
            </div>

            {/* IoT Suggestion Bar */}
            {(() => {
              const zonePt = findZoneTelemetry(expandedData.zoneKey);
              const density = getDensityInfo(zonePt);
              return (
                <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <svg width="14" height="14" className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-semibold">
                      IoT Crowd Scanner · Volunteer Directive
                    </span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ml-auto ${density.color} ${density.bgColor}`}>
                      {density.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{density.suggestion}</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
};

export default CCTVGrid;
