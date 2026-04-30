import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, ShieldCheck, MessageSquare } from 'lucide-react';
import { fetchGAS } from '../utils/gasClient';
import { formatPhoneNumber } from '../utils/logic';

export default function Register() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [namaSiswa, setNamaSiswa] = useState('');
  const [emailSiswa, setEmailSiswa] = useState('');
  const [waliContact, setWaliContact] = useState('');
  const [waliKelas, setWaliKelas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleHubungiAdmin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchGAS('GET_ALL', { sheet: 'Profil_Wali_Kelas' });
      if (res.data && res.data.length > 0) {
        const wali = res.data[0];
        const kontak = wali.Kontak;
        if (kontak) {
          setWaliContact(kontak.replace(/[^0-9]/g, ''));
          setWaliKelas(wali.Kelas || '-');
          setShowForm(true);
        } else {
          setError('Kontak Wali Kelas tidak ditemukan.');
        }
      } else {
        setError('Data Wali Kelas tidak ditemukan.');
      }
    } catch (err) {
      setError('Gagal mengambil data Wali Kelas.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    if (!namaSiswa.trim() || !emailSiswa.trim()) {
      setError('Nama Siswa dan Email Aktif harus diisi.');
      return;
    }
    const message = `Assalamualaikum, Wr.Wb. perkenalkan saya ${namaSiswa.trim()} ingin mendaftarkan diri ke aplikasi Siswa.Hub. Berikut Email saya ${emailSiswa.trim()}. terimakasih atas perhariannya. Wassalamualaikum, Wr.Wb`;
    const encodedMessage = encodeURIComponent(message);
    const formattedPhone = formatPhoneNumber(waliContact);
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(waUrl, '_blank');
    setNamaSiswa('');
    setEmailSiswa('');
    setShowForm(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] py-12 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="h-2 w-full bg-emerald-600" />
        
        <div className="p-8 sm:p-10">
          <button 
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-xs uppercase tracking-widest transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Login
          </button>

          <div className="flex flex-col items-center text-center mb-8">
            <div className="p-4 bg-emerald-50 rounded-2xl mb-4">
              <UserPlus className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Pendaftaran Akun</h1>
            <p className="text-emerald-600/60 text-[10px] font-bold uppercase tracking-widest mt-1">Siswa.Hub Digital Ecosystem</p>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">Sistem Keanggotaan Tertutup</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Siswa.Hub menggunakan sistem manajemen tertutup untuk menjaga keamanan data siswa. Akun tidak dapat dibuat secara mandiri oleh pengguna.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Cara Mendaftar:
              </h3>
              <ol className="space-y-3 px-2">
                <li className="flex gap-3 items-start text-xs text-slate-600">
                  <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-[10px]">1</span>
                  <span>Siapkan alamat <span className="font-bold text-slate-800">Email Utama (Gmail)</span> Anda yang aktif.</span>
                </li>
                <li className="flex gap-3 items-start text-xs text-slate-600">
                  <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-[10px]">2</span>
                  <span>Hubungi <span className="font-bold text-slate-800">Wali Kelas</span> atau Admin Kelas Anda.</span>
                </li>
                <li className="flex gap-3 items-start text-xs text-slate-600">
                  <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-[10px]">3</span>
                  <span>Berikan data NIS dan Email Anda untuk diinput ke dalam sistem <span className="italic">Master Siswa</span>.</span>
                </li>
              </ol>
            </div>

            {error && <p className="text-xs text-red-500 text-center">{error}</p>}

            <div className="pt-6 border-t border-slate-100">
              {!showForm ? (
                <button
                  onClick={handleHubungiAdmin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl py-3 text-xs font-bold hover:bg-emerald-700 transition-all active:scale-95 disabled:bg-emerald-400"
                >
                  {loading ? 'Memuat...' : <><MessageSquare className="w-4 h-4" /> Hubungi Administrator</>}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800 block">Nama Siswa</label>
                    <input
                      type="text"
                      value={namaSiswa}
                      onChange={(e) => setNamaSiswa(e.target.value)}
                      className="w-full px-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Masukkan Nama Siswa"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800 block">Email Aktif</label>
                    <input
                      type="email"
                      value={emailSiswa}
                      onChange={(e) => setEmailSiswa(e.target.value)}
                      className="w-full px-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Masukkan Email Aktif"
                    />
                  </div>
                  <div className="flex gap-2">
                      <button
                        onClick={handleRegister}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl py-3 text-xs font-bold hover:bg-emerald-700 transition-all active:scale-95"
                      >
                      <MessageSquare className="w-4 h-4" /> Register
                    </button>
                    <button
                      onClick={() => {
                        setShowForm(false);
                        setNamaSiswa('');
                        setEmailSiswa('');
                        setError('');
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-800 rounded-xl py-3 text-xs font-bold hover:bg-slate-200 transition-all active:scale-95"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="mt-8 text-center text-[10px] text-slate-400 font-medium italic">
            "Keamanan data Anda adalah prioritas utama kami."
          </p>
        </div>
      </div>
    </div>
  );
}
