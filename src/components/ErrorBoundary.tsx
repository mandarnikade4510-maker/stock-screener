'use client';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logError } from '@/lib/logger';
interface Props { name: string; children: ReactNode }
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { logError(this.props.name, error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (<div role="alert" className="fallback"><p>The {this.props.name} hit a problem and was stopped.</p>
      <button onClick={() => this.setState({ error: null })}>Reload {this.props.name}</button></div>);
  }
}
