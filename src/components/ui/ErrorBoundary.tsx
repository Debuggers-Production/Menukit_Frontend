import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, RotateCcw, Home, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    this.props.onReset?.();
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleCopyError = () => {
    const errorText = [
      `Error: ${this.state.error?.name || 'Error'}: ${this.state.error?.message || ''}`,
      this.state.error?.stack || '',
      this.state.errorInfo?.componentStack || '',
    ]
      .filter(Boolean)
      .join('\n\n');

    navigator.clipboard.writeText(errorText);
    this.setState({ copied: true });
    setTimeout(() => {
      this.setState({ copied: false });
    }, 2000);
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || String(this.state.error || 'Unknown error');
      const errorName = this.state.error?.name || 'Application Error';

      return (
        <div className="min-h-screen w-full bg-slate-50/80 flex items-center justify-center p-4 sm:p-6 antialiased">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Top Icon Badge */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 mb-5 shadow-inner">
                <AlertCircle className="w-8 h-8" strokeWidth={2.2} />
              </div>

              {/* Title & Description */}
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
                Something went wrong
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed max-w-md mb-6">
                An unexpected issue occurred while rendering this page. You can try refreshing or return to the dashboard.
              </p>
            </div>

            {/* Structured Error Information Card */}
            {this.state.error && (
              <div className="mb-6 rounded-2xl bg-slate-50 border border-slate-200/90 overflow-hidden text-left transition-all">
                <div className="px-4 py-3 flex items-center justify-between bg-slate-100/70 border-b border-slate-200/70">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-100/80 text-orange-700 shrink-0">
                      {errorName}
                    </span>
                    <span className="text-xs font-medium text-slate-600 truncate">
                      {errorMessage}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={this.handleCopyError}
                      title="Copy error details"
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    >
                      {this.state.copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                      className="p-1 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      title={this.state.showDetails ? 'Hide stack trace' : 'View stack trace'}
                    >
                      {this.state.showDetails ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Collapsible Stack Details */}
                {this.state.showDetails && (
                  <div className="p-3.5 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-48 whitespace-pre-wrap break-all bg-slate-950 text-slate-200 rounded-b-2xl">
                    <div className="text-rose-400 font-semibold mb-1">
                      {errorName}: {errorMessage}
                    </div>
                    {this.state.error.stack && (
                      <div className="text-slate-400 text-[10px] mt-1.5">
                        {this.state.error.stack}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Structured Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
              >
                <Home className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
