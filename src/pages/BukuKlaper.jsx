import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchGAS } from '../utils/gasClient';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import PageGuide from '../components/PageGuide';
import { Users, Printer } from 'lucide-react';

export default function BukuKlaper() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [siswa, setSiswa] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const s = await fetchGAS('GET_ALL', { sheet: 'Master_Siswa' });
        const sortedSiswa = (s.data || []).sort((a, b) =>
          (a.Nama_Siswa || '').localeCompare(b.Nama_Siswa || '')
        );
        setSiswa(sortedSiswa);
      } catch (error) {
        console.error('BukuKlaper load error:', error);
        showToast('Gagal memuat data Buku Klaper.', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  const handlePrint = () => {
    window.print();
  };

  const handleUpdateField = async (idSiswa, field, value) => {
    try {
      const student = siswa.find(s => s.ID_Siswa === idSiswa);
      if (!student) return;

      const updatedSiswa = siswa.map(s => s.ID_Siswa === idSiswa ? { ...s, [field]: value } : s);
      setSiswa(updatedSiswa);

      await fetchGAS('UPDATE', {
        sheet: 'Master_Siswa',
        id: idSiswa,
        data: { [field]: value }
      });
      showToast('Perubahan berhasil disimpan.', 'success');
    } catch (err) {
      console.error('BukuKlaper update error:', err);
      showToast('Gagal menyimpan perubahan.', 'error');
    }
  };

  if (loading) return <Loading message="Memuat Buku Klaper..." />;

  const formatTanggal = (tanggal) => {
    if (!tanggal) return '-';
    try {
      const d = new Date(tanggal);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('id-ID', {
          day: '2-digit', month: 'long', year: 'numeric'
        }).format(d);
      }
    } catch (e) { }
    return tanggal;
  };

  const formatTahunAjar = (tanggal) => {
    if (!tanggal) return '-';
    try {
      const d = new Date(tanggal);
      if (isNaN(d.getTime())) return '-';

      const year = d.getFullYear();
      const month = d.getMonth() + 1; // 1-12

      // Semester Ganjil: Juli - Des (7-12)
      // Semester Genap: Jan - Juni (1-6)
      if (month >= 7) {
        // Ganjil: 2025 / ~~2026~~
        return (
          <span className="text-[10px] whitespace-nowrap">
            {year} / <span className="line-through border-slate-400 opacity-40">{year + 1}</span>
          </span>
        );
      } else {
        // Genap: ~~2024~~ / 2025
        return (
          <span className="text-[10px] whitespace-nowrap">
            <span className="line-through border-slate-400 opacity-40">{year - 1}</span> / {year}
          </span>
        );
      }
    } catch (e) { return '-'; }
  };

  return (
    <div className="space-y-6 animate-fade-in print:space-y-4">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { 
            size: landscape; 
            margin-top: 1.5cm; 
            margin-bottom: 0.5cm; 
            margin-left: 0.5cm; 
            margin-right: 0.5cm; 
          }
          body { -webkit-print-color-adjust: exact; background-color: white !important; }
          .card { border: none !important; box-shadow: none !important; padding: 0 !important; width: 100% !important; overflow: visible !important; }
          .table-container { overflow: visible !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          table { width: 100% !important; border-collapse: collapse !important; table-layout: auto !important; font-size: 8pt !important; }
          th, td { border: 1px solid black !important; padding: 2px 4px !important; word-break: break-word; vertical-align: middle; }
          thead th { background-color: #d6ffe4ff !important; -webkit-print-color-adjust: exact; font-weight: bold; }
          .line-through { text-decoration: line-through !important; }
          .print-hidden { display: none !important; }
        }
      `}} />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Buku Klaper</h2>
          <p className="text-sm text-slate-500">Daftar Induk Siswa Terurut Alfabetis.</p>
        </div>
        <button onClick={handlePrint} className="btn-primary flex justify-center items-center gap-2">
          <Printer className="w-4 h-4" /> Cetak Buku Klaper
        </button>
      </div>

      <div className="hidden print:block text-center mb-6">
        <h1 className="text-xl font-bold uppercase underline">Buku Klaper</h1>
        <p className="text-sm">Wali Kelas: {user?.name || '-'}</p>
      </div>

      <PageGuide
        title="Panduan Buku Klaper:"
        steps={[
          'Lengkapi data mutasi, ijazah, dan keterangan tanggal masuk/tamat siswa.',
          'Format <span class="font-black italic">Tahun Ajar</span> akan otomatis menyesuaikan Semester Ganjil/Genap.',
          'Orientasi kertas akan otomatis diatur menjadi <span class="font-black italic">Landscape</span> saat dicetak.',
          'Klik tombol <span class="font-black italic">Cetak Buku Klaper</span> untuk mencetak dokumen fisik.'
        ]}
      />

      <div className="card p-0 md:p-6 print:p-0 overflow-hidden print:shadow-none print:border-none">
        {siswa.length === 0 ? (
          <EmptyState
            title="Belum Ada Siswa"
            description="Tidak ada data siswa untuk ditampilkan di Buku Klaper."
            icon={Users}
          />
        ) : (
          <div className="table-container pt-8 shadow-xl">
            <table className="modern-table min-w-full text-[10px]">
              <thead>
                <tr>
                  <th colSpan={3} className="bg-slate-100 text-center align-middle border-slate-300 font-bold">NOMOR</th>
                  <th rowSpan={2} className="bg-slate-100 text-center align-middle min-w-[150px] border-slate-300 font-bold">NAMA SISWA</th>
                  <th rowSpan={2} className="bg-slate-100 text-center align-middle w-8 border-slate-300 font-bold">L/P</th>
                  <th colSpan={2} className="bg-slate-100 text-center align-middle border-slate-300 font-bold">KELAHIRAN</th>
                  <th rowSpan={2} className="bg-slate-100 text-center align-middle min-w-[120px] border-slate-300 font-bold">NAMA ORANG TUA / WALI</th>
                  <th colSpan={3} className="bg-slate-100 text-center align-middle border-slate-300 font-bold text-[9px]">THN AJAR MASUK / NAIK KELAS</th>
                  <th rowSpan={2} className="bg-slate-100 text-center align-middle w-32 leading-tight border-slate-300 font-bold text-[9px]">TGL TAMAT / MUTASI</th>
                  <th rowSpan={2} className="bg-slate-100 text-center align-middle w-32 border-slate-300 font-bold">STATUS</th>
                  <th rowSpan={2} className="bg-slate-100 text-center align-middle min-w-[150px] border-slate-300 font-bold">KETERANGAN</th>
                </tr>
                <tr>
                  <th className="bg-slate-50 text-center align-middle w-8 border-slate-300 text-slate-500 font-normal">Urut</th>
                  <th className="bg-slate-50 text-center align-middle w-16 border-slate-300 text-slate-500 font-normal">Induk</th>
                  <th className="bg-slate-50 text-center align-middle w-20 border-slate-300 text-slate-500 font-normal">NISN</th>
                  <th className="bg-slate-50 text-center align-middle w-20 border-slate-300 text-slate-500 font-normal">Tempat</th>
                  <th className="bg-slate-50 text-center align-middle w-20 border-slate-300 text-slate-500 font-normal">Tanggal</th>
                  <th className="bg-slate-50 text-center align-middle w-16 border-slate-300 text-slate-500 font-normal">X</th>
                  <th className="bg-slate-50 text-center align-middle w-16 border-slate-300 text-slate-500 font-normal">XI</th>
                  <th className="bg-slate-50 text-center align-middle w-16 border-slate-300 text-slate-500 font-normal">XII</th>
                </tr>
                {/* Column Numbering Standard */}
                <tr className="bg-slate-100/50">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(num => (
                    <th key={num} className="py-0.5 text-center align-middle text-[8px] font-bold border-slate-300 text-slate-400 print:text-black">{num}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {siswa.map((item, index) => (
                  <tr key={item.ID_Siswa || index} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-1 border border-slate-200 text-center text-slate-500 italic">{index + 1}</td>
                    <td className="p-1 border border-slate-300 text-center font-bold text-slate-700">{item.NIS || '-'}</td>
                    <td className="p-1 border border-slate-300 text-center text-slate-600">{item.NISN || '-'}</td>
                    <td className="p-1 border border-slate-300 font-bold text-slate-800 uppercase tracking-tight group-hover:text-emerald-700">{item.Nama_Siswa}</td>
                    <td className="p-1 border border-slate-300 text-center text-slate-600">{item['L/P']}</td>
                    <td className="p-1 border border-slate-300 text-slate-700">{item.Tempat_Lahir || '-'}</td>
                    <td className="p-1 border border-slate-300 text-center text-slate-600">{formatTanggal(item.Tanggal_Lahir)}</td>
                    <td className="p-1 border border-slate-300 text-slate-700">{item.Nama_Wali || '-'}</td>
                    <td className="p-1 border border-slate-300 text-center">{formatTahunAjar(item.Tanggal_Masuk_X)}</td>
                    <td className="p-1 border border-slate-300 text-center">{formatTahunAjar(item.Tanggal_Naik_XI)}</td>
                    <td className="p-1 border border-slate-300 text-center">{formatTahunAjar(item.Tanggal_Naik_XII)}</td>
                    <td className="p-1 border border-slate-300 text-center whitespace-nowrap text-slate-600">{formatTanggal(item.Tanggal_Tamat_Sekolah)}</td>
                    <td className="p-1 border border-slate-300 text-center">
                      <div className="flex items-center justify-center">
                        <select
                          className="bg-transparent border-none focus:ring-0 text-center w-full print:appearance-none cursor-pointer text-[10px] font-semibold text-slate-700"
                          value={item.Status_Aktif || 'Aktif'}
                          onChange={(e) => handleUpdateField(item.ID_Siswa, 'Status_Aktif', e.target.value)}
                        >
                          <option value="Aktif">Aktif</option>
                          <option value="Keluar">Keluar</option>
                          <option value="Lulus">Lulus</option>
                        </select>
                      </div>
                    </td>
                    <td className="p-1 border border-slate-300">
                      <input
                        className={`w-full px-2 py-0.5 rounded text-[10px] transition-all outline-none border focus:ring-1 focus:ring-emerald-500 ${item.Status_Aktif === 'Keluar'
                          ? 'bg-white border-emerald-100 shadow-sm text-emerald-700'
                          : 'bg-transparent border-transparent cursor-not-allowed opacity-50 text-slate-400 italic'
                          }`}
                        value={item.Keterangan || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updatedSiswa = siswa.map(s => s.ID_Siswa === item.ID_Siswa ? { ...s, Keterangan: val } : s);
                          setSiswa(updatedSiswa);
                        }}
                        onBlur={(e) => handleUpdateField(item.ID_Siswa, 'Keterangan', e.target.value)}
                        placeholder={item.Status_Aktif === 'Keluar' ? "Isi alasan..." : ""}
                        disabled={item.Status_Aktif !== 'Keluar'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
