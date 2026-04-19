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
          day: '2-digit', month: 'short', year: 'numeric'
        }).format(d);
      }
    } catch (e) { }
    return tanggal;
  };

  return (
    <div className="space-y-6 animate-fade-in print:space-y-4">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { size: landscape; margin: 1cm; }
          body { -webkit-print-color-adjust: exact; }
          .card { border: none !important; box-shadow: none !important; padding: 0 !important; }
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
        <h1 className="text-xl font-bold uppercase underline">Buku Klaper Kelas {user?.managedClass || ''}</h1>
        <p className="text-sm">Wali Kelas: {user?.name || '-'}</p>
      </div>

      <PageGuide
        title="Panduan Buku Klaper:"
        steps={[
          'Lengkapi data mutasi, ijazah, dan keterangan tanggal masuk/tamat siswa.',
          'Orientasi kertas akan otomatis diatur menjadi <span class="font-black italic">Landscape</span> saat dicetak agar tabel tidak terpotong.',
          'Data di halaman ini mencakup seluruh riwayat siswa kelas Anda (baik yang masih Aktif maupun Alumni).',
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
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse text-[11px] print:text-[10px]">
              <thead>
                <tr className="bg-emerald-50 text-emerald-900 print:bg-white print:text-black text-center">
                  <th colSpan={3} className="p-2 border border-slate-300 print:border-black font-semibold">Nomor</th>
                  <th rowSpan={2} className="p-2 border border-slate-300 print:border-black font-semibold align-middle min-w-[120px]">Nama Siswa</th>
                  <th rowSpan={2} className="p-2 border border-slate-300 print:border-black font-semibold align-middle w-8">L/P</th>
                  <th colSpan={2} className="p-2 border border-slate-300 print:border-black font-semibold">Kelahiran</th>
                  <th rowSpan={2} className="p-2 border border-slate-300 print:border-black font-semibold align-middle min-w-[120px]">Nama Orang Tua Kandung</th>
                  <th colSpan={3} className="p-2 border border-slate-300 print:border-black font-semibold">Tanggal Naik / Masuk Kelas</th>
                  <th rowSpan={2} className="p-2 border border-slate-300 print:border-black font-semibold align-middle w-20">Tanggal Tamat Sekolah / Mutasi Keluar</th>
                  <th rowSpan={2} className="p-2 border border-slate-300 print:border-black font-semibold align-middle w-24">Status</th>
                  <th rowSpan={2} className="p-2 border border-slate-300 print:border-black font-semibold align-middle min-w-[150px]">Keterangan</th>
                </tr>
                <tr className="bg-emerald-50 text-emerald-900 print:bg-white print:text-black text-center">
                  <th className="p-2 border border-slate-300 print:border-black font-semibold w-8">Urut</th>
                  <th className="p-2 border border-slate-300 print:border-black font-semibold w-16">Induk(NIS)</th>
                  <th className="p-2 border border-slate-300 print:border-black font-semibold w-20">NISN</th>
                  <th className="p-2 border border-slate-300 print:border-black font-semibold w-20">Tempat</th>
                  <th className="p-2 border border-slate-300 print:border-black font-semibold w-20">Tanggal</th>
                  <th className="p-2 border border-slate-300 print:border-black font-semibold w-10">X</th>
                  <th className="p-2 border border-slate-300 print:border-black font-semibold w-10">XI</th>
                  <th className="p-2 border border-slate-300 print:border-black font-semibold w-10">XII</th>
                </tr>
              </thead>
              <tbody>
                {siswa.map((item, index) => (
                  <tr key={item.ID_Siswa || index} className="hover:bg-slate-50 print:hover:bg-transparent">
                    <td className="p-2 border border-slate-300 print:border-black text-center">{index + 1}</td>
                    <td className="p-2 border border-slate-300 print:border-black text-center">{item.NIS || ''}</td>
                    <td className="p-2 border border-slate-300 print:border-black text-center">{item.NISN || ''}</td>
                    <td className="p-2 border border-slate-300 print:border-black font-medium">{item.Nama_Siswa}</td>
                    <td className="p-2 border border-slate-300 print:border-black text-center">{item['L/P']}</td>
                    <td className="p-2 border border-slate-300 print:border-black">{item.Tempat_Lahir || ''}</td>
                    <td className="p-2 border border-slate-300 print:border-black text-center">{formatTanggal(item.Tanggal_Lahir)}</td>
                    <td className="p-2 border border-slate-300 print:border-black">{item.Nama_Wali || ''}</td>
                    <td className="p-2 border border-slate-300 print:border-black text-center">{formatTanggal(item.Tanggal_Masuk_X)}</td>
                    <td className="p-2 border border-slate-300 print:border-black text-center">{formatTanggal(item.Tanggal_Naik_XI)}</td>
                    <td className="p-2 border border-slate-300 print:border-black text-center">{formatTanggal(item.Tanggal_Naik_XII)}</td>
                    <td className="p-2 border border-slate-300 print:border-black text-center">{formatTanggal(item.Tanggal_Tamat_Sekolah)}</td>
                    <td className="p-2 border border-slate-300 print:border-black text-center">
                      <select
                        className="bg-transparent border-none focus:ring-0 text-center w-full print:appearance-none cursor-pointer"
                        value={item.Status_Aktif || 'Aktif'}
                        onChange={(e) => handleUpdateField(item.ID_Siswa, 'Status_Aktif', e.target.value)}
                      >
                        <option value="Aktif">Aktif</option>
                        <option value="Keluar">Keluar</option>
                        <option value="Lulus">Lulus</option>
                      </select>
                    </td>
                    <td className="p-2 border border-slate-300 print:border-black">
                      <input
                        className={`w-full px-2 py-1 rounded text-xs transition-all outline-none border focus:ring-1 focus:ring-emerald-500 ${item.Status_Aktif === 'Keluar'
                          ? 'bg-white border-slate-200 shadow-sm'
                          : 'bg-transparent border-transparent cursor-not-allowed opacity-50'
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
