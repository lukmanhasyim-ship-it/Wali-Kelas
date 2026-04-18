import React from 'react';

const Loading = ({ message = 'Memuat data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in duration-700">
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-emerald-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
        
        {/* Main Spinner */}
        <div className="relative w-16 h-16 pointer-events-none">
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin" />
          
          {/* Inner circle */}
          <div className="absolute inset-3 border-2 border-slate-50 rounded-full" />
          <div className="absolute inset-3 border-2 border-emerald-400 rounded-full border-b-transparent animate-spin-slow rotate-45" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-emerald-900 font-black text-lg tracking-tight uppercase">{message}</h3>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] animate-pulse">Sistem Wali Kelas Digital</p>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(45deg); }
          to { transform: rotate(405deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Loading;
