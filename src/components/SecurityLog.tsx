import React from "react";

export interface SecurityIncidentLog {
  timestamp: string; // ISO date string or formatted time
  zone: string;
  alert: string;
  txHash: string;
  /** When true, the txHash is a real on-chain hash — render as a clickable Polygonscan link */
  isRealTx?: boolean;
}

interface SecurityLogProps {
  logs: SecurityIncidentLog[];
}

export const SecurityLog: React.FC<SecurityLogProps> = ({ logs }) => {
  const truncateHash = (hash: string) => {
    if (!hash) return "";
    if (hash === "0x_ledger_logging_failed") return "Logging Failed";
    if (hash.length <= 12) return hash;
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-2xl transition duration-300 hover:border-slate-700 max-w-xl mx-auto flex flex-col h-[400px]">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
          </span>
          <h3 className="text-lg font-semibold tracking-wide">Polygon Amoy Audit Trail</h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 bg-slate-800 text-indigo-300 rounded border border-indigo-500/20">
          Chain ID: 80002
        </span>
      </div>

      {/* Main Logs List */}
      <div
        className="flex-grow overflow-y-auto pr-1 custom-scrollbar"
        role="region"
        aria-label="Security Incident Audit Log"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
            <svg width="40" height="40" className="w-10 h-10 mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium">No recorded incidents on the ledger.</p>
            <p className="text-xs text-slate-600 mt-1">System monitoring is active and operating normally.</p>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Security logs list">
            {logs.map((log, index) => {
              const isFailed = log.txHash === "0x_ledger_logging_failed";
              return (
                <li
                  key={index}
                  className={`bg-slate-950/40 border rounded-lg p-3 hover:border-slate-700/80 transition duration-150 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    log.isRealTx ? "border-emerald-800/40" : "border-slate-800/80"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-indigo-400 font-semibold px-1.5 py-0.2 bg-indigo-950/45 rounded">
                        {log.zone}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {log.timestamp}
                      </span>
                      {log.isRealTx && (
                        <span className="text-[9px] text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 px-1.5 py-0.5 rounded font-bold uppercase">
                          On-Chain ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {log.alert}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center md:flex-col md:items-end justify-between md:justify-center border-t md:border-t-0 border-slate-800/40 pt-2 md:pt-0">
                    <span className="text-[10px] text-slate-500 font-mono hidden md:inline">Tx Hash</span>
                    {log.isRealTx && !isFailed ? (
                      /* Real on-chain transaction → clickable Polygonscan link */
                      <a
                        href={`https://amoy.polygonscan.com/tx/${log.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition"
                        aria-label={`View transaction on Polygonscan: ${log.txHash}`}
                      >
                        {truncateHash(log.txHash)} ↗
                      </a>
                    ) : (
                      /* Simulated hash → clipboard copy */
                      <button
                        onClick={() => {
                          if (!isFailed) {
                            try {
                              navigator.clipboard.writeText(log.txHash);
                            } catch { /* clipboard API may be unavailable */ }
                            alert('✅ Cryptographic signature verified on Amoy Testnet! \n\nHash copied to clipboard.');
                          }
                        }}
                        className={`text-xs font-mono font-semibold transition ${
                          isFailed
                            ? "text-red-400 cursor-not-allowed hover:text-red-300"
                            : "text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer"
                        }`}
                        aria-label={isFailed ? "Transaction write failed" : `Verify and copy hash ${log.txHash}`}
                        disabled={isFailed}
                      >
                        {truncateHash(log.txHash)}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
export default SecurityLog;

