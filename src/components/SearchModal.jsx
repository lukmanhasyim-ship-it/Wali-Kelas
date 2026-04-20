import React, { useState, useEffect } from 'react';
import { Search, User, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SearchModal({ isOpen, onClose, students }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle with Ctrl+K
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onClose();
      }
      // Close with ESC
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setQuery(''); // Reset search when opened
    }
    
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredStudents = query.trim() === '' 
    ? [] 
    : students.filter(s => 
        s.Nama_Siswa?.toLowerCase().includes(query.toLowerCase()) ||
        s.NISN?.toString().includes(query)
      ).slice(0, 5);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-scale-in">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            autoFocus
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-slate-800 font-medium placeholder:text-slate-400"
            placeholder="Cari nama siswa atau NISN... (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim() !== '' && filteredStudents.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-slate-500 font-medium">Tidak ada siswa ditemukan.</p>
            </div>
          )}

          {filteredStudents.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa Ditemukan</p>
              {filteredStudents.map((s) => (
                <button
                  key={s.NISN || s.ID_Siswa}
                  onClick={() => {
                    navigate('/master-siswa', { state: { highlight: s.NISN || s.ID_Siswa } });
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-emerald-50 text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{s.Nama_Siswa}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{s.NISN} • Kelas {s.Kelas}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </button>
              ))}
            </div>
          )}

          {query.trim() === '' && (
            <div className="p-4 grid grid-cols-2 gap-2">
              <p className="col-span-2 px-1 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Navigasi Cepat</p>
              {[
                { label: 'Presensi Pagi', path: '/presensi-pagi' },
                { label: 'KAS Kelas', path: '/keuangan' },
                { label: 'Laporan Akhir', path: '/laporan' },
                { label: 'Profil Saya', path: '/profile' },
              ].map(link => (
                <button
                  key={link.path}
                  onClick={() => { navigate(link.path); onClose(); }}
                  className="p-3 bg-slate-50 rounded-2xl text-left hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100"
                >
                  <p className="text-xs font-bold text-slate-700">{link.label}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <kbd className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-500 shadow-sm">ESC</kbd>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tutup</span>
            </div>
            <div className="flex items-center gap-2">
                <kbd className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-500 shadow-sm">↵</kbd>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pilih</span>
            </div>
        </div>
      </div>
    </div>
  );
}
