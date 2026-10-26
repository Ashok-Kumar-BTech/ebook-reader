/**
 * Error Boundary - Catches React render errors and logs them
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { logManager } from '../utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private logger = logManager.getLogger('ErrorBoundary');
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });
    
    this.logger.error('REACT_RENDER_ERROR', {
      errorName: error.name,
      errorMessage: error.message,
      componentStack: errorInfo.componentStack,
    }, error);
    
    this.props.onError?.(error, errorInfo);
  }
  
  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
            padding: '24px',
            textAlign: 'center',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            margin: '16px',
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}
          >
            <path d="M12 9v4M12 17h.01M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2 style={{ margin: '0 0 8px', color: 'var(--color-text)' }}>Something went wrong</h2>
          <p style={{ margin: '0 0 16px', color: 'var(--color-text-muted)' }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <details style={{ textAlign: 'left', maxWidth: '600px', width: '100%' }}>
            <summary style={{ cursor: 'pointer', color: 'var(--color-text-muted)' }}>
              Error Details
            </summary>
            <pre
              style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: 'var(--color-background)',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px',
                color: 'var(--color-text)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error?.message}
              {this.state.errorInfo?.componentStack && (
                <>
                  {'\n\nComponent Stack:'}
                  {this.state.errorInfo.componentStack}
                </>
              )}
            </pre>
          </details>
        </div>
      );
    }
    
    return this.props.children;
  }
}
