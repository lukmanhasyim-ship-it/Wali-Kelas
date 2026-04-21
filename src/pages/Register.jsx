import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGAS } from '../utils/gasClient';
import { UserPlus, ArrowLeft, Send, Mail, User } from 'lucide-react';
import appLogo from '../assets/logo.png';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [waliContact, setWaliContact] = useState('6282330295812');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadContact() {
      try {
        const res = await fetchGAS('GET_ALL', { sheet: 'Profil_Wali_Kelas' });
        if (res.data && res.data.length > 0) {
          const c = res.data[0].Kontak;
          if (c) setWaliContact(c.replace(/[^0-9]/g, ''));
        }
      } catch (err) {
        console.error('Register contact fetch error:', err);
      }
    }
    loadContact();
  }, []);

  const handleRegister = (e) => {
    e.preventDefault();
    if (!name || !email) return;

    setLoading(true);
    const message = encodeURIComponent(`Halo Bapak/Ibu Wali Kelas. \n\nPerkenalkan nama saya *${name}*, dan akun Gmail saya adalah *${email}*.\n\nSaya ingin memohon izin untuk didaftarkan ke sistem *Siswa.Hub* agar bisa mengakses laporan dan fitur kelas digital. Terima kasih banyak.`);
    const waUrl = `https://api.whatsapp.com/send?phone=${waliContact}&text=${message}`;

    // Buka WhatsApp di tab baru
    window.open(waUrl, '_blank');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-indigo-400">
          <path fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="10 5" d="M10,0 L10,200 M30,0 L30,200 M50,0 L50,200 M70,0 L70,200 M90,0 L90,200" transform="rotate(45 100 100)" />
        </svg>
      </div>
      <div className="absolute bottom-[-100px] left-[10%] w-[300px] h-[300px] border-[1px] border-emerald-400 rounded-full opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-slate-100 animate-fade-in">
        {/* Top Accent */}
        <div className="h-2 w-full bg-gradient-to-r from-emerald-500 to-blue-500" />

        <div className="p-8 sm:p-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <img src={appLogo} alt="Logo" className="h-12 w-auto" />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">Registrasi Siswa Baru</h1>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-2">Bergabung dengan Ekosistem Siswa.Hub</p>
          </div>

          <form onSubmit={handleRegister} className="w-full space-y-6">
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  <User className="w-3 h-3" /> Nama Lengkap
                </label>
                <input
                  type="text"
                  className="input-field py-3.5"
                  placeholder="Masukkan nama sesuai ijazah"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  <Mail className="w-3 h-3" /> Akun Gmail Pribadi
                </label>
                <input
                  type="email"
                  className="input-field py-3.5"
                  placeholder="contoh@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="mt-3 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                  <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                    <span className="font-bold underline">Penting:</span> Gunakan email Gmail yang aktif. Email ini akan digunakan untuk proses verifikasi masuk (Google Login) setelah didaftarkan oleh Wali Kelas.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-sm font-bold shadow-xl shadow-emerald-100 active:scale-95 transition-all"
              >
                {loading ? 'Memproses...' : (
                  <>
                    <Send className="w-4 h-4" /> Daftar Sekarang
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest transition-colors py-2"
              >
                <ArrowLeft className="w-3 h-3" /> Kembali ke Login
              </button>
            </div>
          </form>
        </div>

        <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
          <div className="flex justify-center gap-4 mb-2">
            <button onClick={() => navigate('/terms')} className="text-[10px] text-blue-500 hover:underline font-bold">Syarat Penggunaan</button>
            <button onClick={() => navigate('/privacy')} className="text-[10px] text-blue-500 hover:underline font-bold">Kebijakan Privasi</button>
          </div>
          <p className="text-[9px] text-slate-400 font-medium">© 2026 Siswa.Hub - Monitoring Presisi, Masa Depan Gemilang</p>
        </div>
      </div>
    </div>
  );
}
