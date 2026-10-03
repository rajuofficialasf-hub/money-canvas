import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, ShieldCheck, Copy, Check } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  isRoot?: boolean;
  viewName?: string;
  onNavigateHome?: () => void;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // In production, telemetry or local audit logging can be invoked here
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    });
  };

  handleGoHome = (): void => {
    this.handleReset();
    if (this.props.onNavigateHome) {
      this.props.onNavigateHome();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  handleReload = (): void => {
    if (this.props.isRoot && typeof window !== 'undefined') {
      window.location.reload();
    } else {
      this.handleReset();
    }
  };

  handleCopyDiagnostics = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    const diagnosticText = `Money Canvas Error Report:
Time: ${new Date().toISOString()}
View: ${this.props.viewName || (this.props.isRoot ? 'Root Application' : 'Unknown')}
Error: ${error?.name}: ${error?.message}
Stack:
${error?.stack || 'No stack trace'}
Component Stack:
${errorInfo?.componentStack || 'No component stack'}
`;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(diagnosticText);
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2500);
      }
    } catch (err) {
      console.warn('Failed to copy to clipboard', err);
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { isRoot, viewName } = this.props;
      const { error, errorInfo, showDetails, copied } = this.state;

      const titleBn = isRoot
        ? 'অ্যাপ্লিকেশনে একটি অপ্রত্যাশিত সমস্যা হয়েছে'
        : `${viewName ? `"${viewName}" স্ক্রিনে` : 'এই ভিউতে'} সাময়িক ত্রুটি ঘটেছে`;

      const titleEn = isRoot
        ? 'Application encountered an unexpected error'
        : 'An error occurred while rendering this view';

      return (
        <div
          className={`w-full flex items-center justify-center p-4 sm:p-6 ${
            isRoot ? 'min-h-screen bg-canvas text-ink' : 'min-h-[420px] my-6'
          }`}
        >
          <div className="w-full max-w-2xl rounded-2xl border border-negative/30 bg-gradient-to-b from-surface/95 via-surface/90 to-canvas/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            {/* Header Icon & Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-negative/10 border border-negative/30 flex items-center justify-center shrink-0 shadow-inner">
                <AlertTriangle className="h-7 w-7 text-negative animate-pulse" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-bold text-ink tracking-tight">
                  {titleBn}
                </h2>
                <p className="text-xs text-ink-muted font-medium">
                  {titleEn}
                </p>
              </div>
            </div>

            {/* Reassurance Message - Local-First Guarantee */}
            <div className="rounded-xl border border-accent/30 bg-accent/10 p-4 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-accent-strong shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-emerald-200/90 leading-relaxed">
                <div className="font-semibold text-accent-strong">
                  আপনার ডেটা নিরাপদে সংরক্ষিত আছে (Your data is safe)
                </div>
                <div>
                  মানি ক্যানভাস একটি লোকাল-ফার্স্ট অ্যাপ্লিকেশন। কোনো রেন্ডারিং ত্রুটি হলেও আপনার সংরক্ষিত অ্যাকাউন্টিং লেনদেন ও ফাইন্যান্সিয়াল ডেটার কোনো ক্ষতি হয়নি।
                </div>
              </div>
            </div>

            {/* Error Message Summary */}
            {error && (
              <div className="rounded-xl border border-edge bg-canvas/80 p-3.5 text-xs font-mono text-negative overflow-x-auto">
                <span className="text-ink-faint select-none mr-2">$</span>
                {error.name}: {error.message}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-strong active:scale-95 text-accent-ink font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Home className="h-4 w-4" />
                <span>ড্যাশবোর্ডে ফিরুন (Back to Dashboard)</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-raised hover:bg-raised-2 active:scale-95 text-ink-soft font-semibold text-xs border border-edge-strong transition-all cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 text-sky-400" />
                <span>{isRoot ? 'পৃষ্ঠা রিলোড করুন (Reload Page)' : 'পুনরায় চেষ্টা করুন (Retry)'}</span>
              </button>

              <button
                type="button"
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-ink-muted hover:text-ink-soft text-xs font-medium hover:bg-raised/50 transition-colors"
              >
                <span>{showDetails ? 'বিস্তারিত লুকান' : 'কারিগরি বিবরণ (Details)'}</span>
                {showDetails ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Collapsible Technical Details */}
            {showDetails && (
              <div className="rounded-xl border border-edge/80 bg-canvas p-4 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-wider">
                    Error Diagnostics Stack
                  </span>
                  <button
                    type="button"
                    onClick={this.handleCopyDiagnostics}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-raised hover:bg-raised-2 text-ink-soft text-[11px] font-mono border border-edge-strong transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-accent-strong" />
                        <span className="text-accent-strong">কপি হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-ink-muted" />
                        <span>কপি করুন</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="text-[10px] sm:text-[11px] font-mono text-ink-muted overflow-x-auto max-h-56 p-2 rounded bg-surface/80 border border-edge/60 leading-relaxed whitespace-pre-wrap break-all">
                  {error?.stack || error?.message || 'No stack trace available'}
                  {errorInfo?.componentStack && (
                    <>
                      {'\n\nComponent Stack:'}
                      {errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
