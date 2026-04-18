import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-8 space-y-6 border-red-200 bg-red-50">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <h1 className="text-2xl font-bold text-red-900">Terjadi Kesalahan</h1>
            </div>
            <div className="space-y-2">
              <p className="text-red-700 font-medium">Error Details:</p>
              <pre className="bg-white p-3 rounded text-xs text-red-600 overflow-auto max-h-40 border border-red-200">
                {this.state.error?.toString()}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Refresh Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
