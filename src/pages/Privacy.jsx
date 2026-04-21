import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Eye, Database } from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="h-2 w-full bg-emerald-600" />

        <div className="p-8 sm:p-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 font-bold text-xs uppercase tracking-widest transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <ShieldCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Kebijakan Privasi</h1>
              <p className="text-emerald-600/60 text-sm font-bold uppercase tracking-widest">Aplikasi Siswa.Hub</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none space-y-8 text-slate-600 leading-relaxed text-sm md:text-base">
            <section className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 italic text-emerald-800 text-sm">
              Kami memahami betapa pentingnya informasi pribadi Anda. Kebijakan ini menjelaskan bagaimana kami mengelola data akademik dan personal Anda demi kelancaran pendidikan.
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-500" />
                1. Data yang Kami Kumpulkan
              </h2>
              <p>Siswa.Hub hanya mengumpulkan data yang diperlukan untuk kepentingan sekolah, meliputi:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="font-bold text-slate-800">Identitas Dasar</span>: Nama, NISN, NIS, dan Alamat Gmail.</li>
                <li><span className="font-bold text-slate-800">Data Akademik</span>: Nilai mata pelajaran (Leger) dan riwayat perkembangan kognitif.</li>
                <li><span className="font-bold text-slate-800">Data Kedisiplinan</span>: Catatan kehadiran harian (Pagi & Siang) serta log pembinaan siswa.</li>
                <li><span className="font-bold text-slate-800">Data Keuangan</span>: Catatan iuran kas dan dana sosial kelas.</li>
                <li><span className="font-bold text-slate-800">Geotagging</span>: Koordinat lokasi alamat rumah (khusus untuk pemetaan zonasi sekolah).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-500" />
                2. Pihak yang Dapat Mengakses Data
              </h2>
              <p>Demi menjaga kerahasiaan, akses data dibatasi oleh sistem peran (RBAC):</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="font-bold text-slate-800">Wali Kelas</span>: Memiliki akses penuh terhadap seluruh data siswa di kelas yang dikelolanya.</li>
                <li><span className="font-bold text-slate-800">Pengurus Kelas</span>: Memiliki akses terbatas untuk menginput absensi dan keuangan.</li>
                <li><span className="font-bold text-slate-800">Siswa Pribadi</span>: Hanya dapat melihat data milik mereka sendiri (Nilai & Absensi pribadi).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                3. Penyimpanan dan Keamanan
              </h2>
              <p>
                Seluruh data disimpan dalam ekosistem aman Google Cloud. Kami menggunakan sistem autentikasi <span className="font-bold text-slate-800">Google OAuth 2.0</span> untuk memastikan bahwa tidak ada pihak yang tidak terdaftar yang bisa masuk ke sistem.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                4. Penghapusan Data
              </h2>
              <p>
                Data akan disimpan selama siswa masih berstatus aktif di kelas tersebut. Setelah siswa lulus atau keluar, data akademik akan disimpan di basis data histori sekolah sesuai dengan kebijakan kearsipan digital nasional.
              </p>
            </section>

            <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kontak Privasi</p>
              <p className="text-sm font-bold text-slate-700">Jika Anda memiliki pertanyaan mengenai penggunaan data Anda, silakan hubungi Wali Kelas melalui formulir bantuan di halaman login.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
