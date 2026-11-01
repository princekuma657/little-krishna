import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[LittleKrishna] Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="boot-screen boot-screen--error" role="alert">
          <div className="boot-screen__mark">Little<span>Krishna</span></div>
          <h1>Something went off the rails.</h1>
          <p>The page hit an unexpected error. You can reload and continue where you left off.</p>
          <p className="boot-screen__detail">{this.state.error.message}</p>
          <button className="btn btn--primary" onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}
