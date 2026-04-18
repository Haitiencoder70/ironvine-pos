import { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { TouchButton } from './ui/TouchButton';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In a real app we'd log this to Sentry, DataDog, etc.
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen w-full flex-col items-center justify-center p-6 bg-gray-50 text-center">
          <div className="flex max-w-md flex-col items-center rounded-3xl bg-white p-8 shadow-xl">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 relative overflow-hidden">
              <ExclamationTriangleIcon className="h-10 w-10 text-red-500 relative z-10" />
              <div className="absolute inset-0 bg-red-100 opacity-50 animate-pulse pointer-events-none" />
            </div>
            
            <h1 className="mb-3 text-2xl font-bold text-gray-900">
              Something went wrong
            </h1>
            
            <p className="mb-8 text-sm text-gray-500 leading-relaxed">
              We've encountered an unexpected error. Please try reloading the page, or return to the dashboard to start over.
            </p>

            {this.state.error && (
              <div className="mb-8 w-full rounded-xl bg-gray-50 p-4 text-left border border-gray-200">
                <p className="text-xs font-mono text-gray-700 font-semibold mb-1">
                  Error Details:
                </p>
                <div className="max-h-32 overflow-y-auto">
                  <p className="text-xs font-mono text-gray-600 break-words">
                    {this.state.error.message}
                  </p>
                </div>
              </div>
            )}

            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <TouchButton
                variant="secondary"
                size="lg"
                fullWidth
                onClick={this.handleGoHome}
              >
                Dashboard
              </TouchButton>
              <TouchButton
                variant="primary"
                size="lg"
                fullWidth
                onClick={this.handleReload}
              >
                Reload Page
              </TouchButton>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
