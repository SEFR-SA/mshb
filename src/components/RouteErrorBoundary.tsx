import React from "react";

interface State { hasError: boolean }

class RouteErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error("[RouteErrorBoundary]", err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-foreground">
          <p className="text-base font-semibold">This page crashed</p>
          <p className="text-sm text-muted-foreground">Try going back or reloading.</p>
          <div className="flex gap-2">
            <button
              className="px-4 py-1.5 text-sm rounded-md bg-muted hover:bg-muted/80"
              onClick={() => this.setState({ hasError: false })}
            >
              Back
            </button>
            <button
              className="px-4 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RouteErrorBoundary;
