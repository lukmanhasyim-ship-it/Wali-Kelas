import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { fetchGAS } from '../utils/gasClient';
import { Navigate } from 'react-router-dom';
import { ShieldAlert, Loader2 } from 'lucide-react';
import loginIllustration from '../assets/login_illustration.png';
import appLogo from '../assets/logo.png';
import googleLogo from '../assets/logo google.png';

export default function Login() {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        }).then(res => res.json());

        const response = await fetchGAS('GET_ALL', { sheet: 'Master_Siswa' });
        const allSiswa = response.data || [];

        const matchingUser = allSiswa.find(s =>
          s.Email && s.Email.toLowerCase() === userInfo.email.toLowerCase()
        );

        if (matchingUser) {
          // If student, try to get class info from Profil_Wali_Kelas sheet
          let studentClass = '';
          try {
            const allWaliRes = await fetchGAS('GET_ALL', { sheet: 'Profil_Wali_Kelas' });
            if (allWaliRes.data && allWaliRes.data.length > 0) {
              studentClass = allWaliRes.data[0].Kelas || '';
            }
          } catch (e) {
            console.error('Failed to fetch class for student:', e);
          }

          login({
            token: tokenResponse.access_token,
            name: userInfo.name,
            email: userInfo.email,
            picture: userInfo.picture,
            managedClass: studentClass
          }, matchingUser.Jabatan || 'Siswa');
          return;
        }

        try {
          const waliResponse = await fetchGAS('LOGIN_WALI', { email: userInfo.email });
          const waliProfile = waliResponse.data;
          login({
            token: tokenResponse.access_token,
            name: waliProfile.Nama || userInfo.name,
            email: userInfo.email,
            picture: userInfo.picture,
            managedClass: waliProfile.Kelas || ''
          }, waliProfile.Jabatan || 'Wali Kelas');
        } catch (waliError) {
          console.error('Login Wali Kelas Error:', waliError);
          setError(`Email ${userInfo.email} tidak terdaftar. Silakan hubungi Admin.`);
        }
      } catch (err) {
        console.error('Login Error:', err);
        setError('Gagal memverifikasi akun. Pastikan koneksi internet aktif.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Login Google Gagal. Silakan coba lagi.'),
    prompt: 'select_account'
  });

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative lines matching reference */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-20 pointer-events-none">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-indigo-400">
          <path fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="10 5" d="M10,0 L10,200 M30,0 L30,200 M50,0 L50,200 M70,0 L70,200 M90,0 L90,200" transform="rotate(45 100 100)" />
        </svg>
      </div>

      <div className="absolute bottom-[-100px] right-[10%] w-[300px] h-[300px] border-[1px] border-orange-400 rounded-full opacity-30 pointer-events-none"></div>
      <div className="absolute bottom-[50px] right-[15%] w-6 h-6 bg-blue-600 rounded-full opacity-90 pointer-events-none"></div>

      <div className="w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden relative z-10 md:min-h-[600px]">

        {/* Left Section - Illustration */}
        <div className="hidden md:flex md:w-[45%] bg-[#E8F2FB] flex-col items-center justify-center p-6 relative overflow-hidden">
          <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply opacity-50 blur-xl"></div>

          <div className="text-center z-10 w-full mb-4 px-4">
            <h2 className="text-[1.5rem] lg:text-[1.8rem] font-bold text-slate-800 leading-tight">
              Sistem<span className="text-[#fdb813]"> Cerdas</span> dan <span className="text-[#008647]">Canggih</span> Untuk Monitoring Siswa yang Lebih Presisi.
            </h2>
          </div>

          <div className="relative w-full mt-2 flex items-center justify-center z-10 px-4">
            <img
              src={loginIllustration}
              alt="Classroom Management Illustration"
              className="w-full h-auto max-w-[450px] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:-translate-y-2 transition-transform duration-500"
            />
          </div>
        </div>

        {/* Right Section - Form */}
        <div className="w-full md:w-[55%] p-6 sm:p-10 md:p-12 lg:p-16 flex flex-col justify-center items-center bg-white relative z-10">
          <div className="w-full max-w-sm">

            <div className="flex items-center justify-center mb-8 md:mb-10 scale-90 sm:scale-100">
              <img src={appLogo} alt="Logo Aplikasi" className="h-16 md:h-20 w-auto object-contain drop-shadow-sm" />
            </div>

            <div className="text-center mb-8 md:mb-10">
              <h1 className="text-[1.3rem] md:text-[1.5rem] font-bold text-slate-800 mb-2">Hai, selamat datang kembali</h1>
              <p className="text-[11px] md:text-[12px] text-slate-500">
                Baru di Wali Kelas App? <a href="https://api.whatsapp.com/send?phone=6282330295812&text=Hallo%2C%20Saya%20tertarik%20untuk%20menggunakan%20aplikasi%20Wali%20Kelas%20yang%20sudah%20anda%20buat.%20Mohon%20bantu%20saya%20untuk%20konfigurasi%20lebih%20lanjut.%20Terimakasih" className="text-blue-500 hover:underline">Hubungi Admin</a>
              </p>
            </div>

            <div className="space-y-5 w-full">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={() => handleGoogleLogin()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 md:py-3.5 text-xs md:text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed group active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                ) : (
                  <>
                    <img src={googleLogo} alt="Google Logo" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
                    <span className="group-hover:scale-[1.01] transition-transform font-bold">Masuk dengan Google Workspace</span>
                  </>
                )}
              </button>

              <div className="flex items-center mt-6">
                <input type="checkbox" id="remember" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mr-2" defaultChecked />
                <label htmlFor="remember" className="text-xs text-slate-600">Ingat perangkat ini</label>
              </div>

              <p className="text-left text-[11px] text-slate-400 mt-6 pt-4 border-t border-slate-100 leading-relaxed">
                Dengan melanjutkan, kamu menerima <a href="#" className="text-blue-500 hover:underline">Syarat Penggunaan</a> dan <a href="#" className="text-blue-500 hover:underline">Kebijakan Privasi</a> kami.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

