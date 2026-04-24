import React, { useEffect, useState } from 'react';
import { checkForUpdate, getCurrentVersion } from '../utils/version';

export default function UpdateCheck() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const result = await checkForUpdate();
      setStatus(result);
      setLoading(false);
    }
    check();
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const openGitHub = () => {
    if (status?.releaseUrl) {
      window.open(status.releaseUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (status?.error && !status.latestVersion) {
    return (
      <div className="card p-6 border-amber-200 bg-amber-50/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-800">Update Sistem</h3>
            <p className="text-sm text-slate-500">
              Versi saat ini: <span className="font-mono font-medium">{status.currentVersion}</span>
            </p>
            <p className="text-xs text-amber-600 mt-1">
              {status.error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status.hasUpdate) {
    return (
      <div className="card p-6 border-green-200 bg-green-50/30">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-green-800">Update Tersedia!</h3>
              <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded-full">
                v{status.latestVersion}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Versi saat ini: <span className="font-mono font-medium text-slate-500">{status.currentVersion}</span>
              {' → '}
              <span className="font-mono font-medium text-green-600">{status.latestVersion}</span>
            </p>
            {status.releaseNotes && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-green-100 max-h-48 overflow-y-auto">
                <p className="text-sm text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">
                  {status.releaseNotes}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={handleRefresh}
                className="btn-primary"
              >
                Muat Ulang Halaman
              </button>
              <button
                type="button"
                onClick={openGitHub}
                className="btn-secondary"
              >
                Lihat di GitHub
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 border-slate-200 bg-slate-50/30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-0.5">
          <h3 className="font-semibold text-slate-700">Sistem Terbaru</h3>
          <p className="text-sm text-slate-500">
            Versi: <span className="font-mono font-medium">{status.currentVersion}</span> - Sudah yang terbaru
          </p>
        </div>
      </div>
    </div>
  );
}