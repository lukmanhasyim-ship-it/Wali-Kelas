import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ScrollText } from 'lucide-react';

export default function Terms() {
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
              <ScrollText className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Syarat Penggunaan</h1>
              <p className="text-emerald-600/60 text-sm font-bold uppercase tracking-widest">Aplikasi Siswa.Hub</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none space-y-8 text-slate-600 leading-relaxed text-sm md:text-base">
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                1. Penerimaan Ketentuan
              </h2>
              <p>
                Dengan mengakses dan menggunakan aplikasi <span className="font-bold text-slate-800">Siswa.Hub</span>, Anda dianggap telah membaca, memahami, dan menyetujui untuk terikat oleh seluruh syarat dan ketentuan yang ditetapkan oleh sekolah. Aplikasi ini disediakan khusus untuk memfasilitasi administrasi kelas yang transparan dan akuntabel.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                2. Akun dan Keamanan
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Akses login hanya diperbolehkan menggunakan <span className="font-bold text-slate-800">Gmail</span> yang telah didaftarkan secara resmi oleh Wali Kelas.</li>
                <li>Setiap pengguna (Siswa, Pengurus, Wali Kelas) bertanggung jawab penuh atas keamanan akun pribadi masing-masing.</li>
                <li>Dilarang keras meminjamkan akun atau memberikan akses kepada pihak luar yang tidak berkepentingan dengan kelas.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                3. Etika Input Data (Khusus Pengurus Kelas)
              </h2>
              <p>
                Bagi siswa yang diberikan hak akses sebagai pengurus (<span className="font-bold text-slate-800">Ketua, Sekretaris, Bendahara</span>), wajib menjunjung tinggi integritas dengan cara:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Menginput data absensi sesuai dengan fakta di lapangan tanpa manipulasi.</li>
                <li>Mencatat transaksi keuangan kas secara jujur dan tepat waktu.</li>
                <li>Penyalahgunaan hak akses untuk mengubah data demi keuntungan pribadi atau merugikan siswa lain akan dikenakan sanksi sesuai <span className="font-bold text-slate-800">Peraturan Disiplin Sekolah</span>.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                4. Larangan Penggunaan
              </h2>
              <p>Pengguna dilarang keras melakukan tindakan berikut:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Mencoba melakukan peretasan, serangan <span className="italic">cross-site scripting</span>, atau sabotase terhadap database sistem.</li>
                <li>Mengambil tangkapan layar data pribadi siswa lain untuk disebarluaskan secara tidak bertanggung jawab di media sosial.</li>
              </ul>
            </section>

            <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pembaruan Terakhir</p>
              <p className="text-sm font-bold text-slate-700">21 April 2026 - Administrasi Utama Siswa.Hub</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
