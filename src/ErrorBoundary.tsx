import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 🛡️ ErrorBoundary Class Component
 * Catches rendering exceptions in downstream React components, logs failures,
 * and renders a safe, accessible, themed stadium-guardian fallback UI instead of whitescreening.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  /**
   * Catches errors thrown during rendering and updates component state.
   * 
   * @param error The thrown Error object.
   * @returns Updated state mapping.
   */
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * Captures error details for logging and analysis.
   * 
   * @param error The thrown Error object.
   * @param errorInfo React rendering details container.
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[Stadium Guardian Crash]:", error, errorInfo);
  }

  /**
   * Resets the error state to allow the operator to retry loading the main console.
   */
  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-6 font-sans select-none antialiased"
          role="alert"
          aria-live="assertive"
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
            <div className="absolute top-[-10%] left-[10%] w-[350px] h-[350px] rounded-full bg-red-600/10 blur-[80px]" />
          </div>

          <div className="relative w-full max-w-md bg-slate-900 border border-red-900/30 rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center space-y-6">
            <div 
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-amber-600 flex items-center justify-center text-white text-3xl shadow-lg shadow-red-950/20"
              aria-hidden="true"
            >
              ⚠️
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-red-400 font-black tracking-[0.2em] uppercase block">
                Security Core Exception
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Console Rendering Interrupted
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                The operations dashboard encountered an unexpected runtime anomaly while rendering dynamic telemetry. Operations and blockchain checks are still active on background threads.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-left">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-1">
                  Diagnostics Payload
                </span>
                <p className="text-[10px] font-mono text-red-300 break-all leading-normal">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </div>
            )}

            <button
              id="reset-dashboard-button"
              onClick={this.handleReset}
              className="w-full py-2.5 bg-red-900 hover:bg-red-800 active:scale-[0.98] transition rounded-lg text-xs font-bold text-white shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
              aria-label="Reload and restart Operations Console"
            >
              🔄 Restart Console
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
