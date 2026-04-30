import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchGAS } from '../utils/gasClient';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import PageGuide from '../components/PageGuide';
import { Users, Printer, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

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

  const handleExportToExcel = () => {
    try {
      const dataToExport = siswa.map((s, index) => ({
        'No': index + 1,
        'NIS': s.NIS || '-',
        'NISN': s.NISN || '-',
        'Nama Siswa': s.Nama_Siswa || '-',
        'L/P': s['L/P'] || '-',
        'Tempat Lahir': s.Tempat_Lahir || '-',
        'Tanggal Lahir': s.Tanggal_Lahir ? format(new Date(s.Tanggal_Lahir), 'dd MMMM yyyy') : '-',
        'Orang Tua/Wali': s.Nama_Wali || '-',
        'Thn Masuk X': s.Tanggal_Masuk_X ? new Date(s.Tanggal_Masuk_X).getFullYear() : '-',
        'Thn Naik XI': s.Tanggal_Naik_XI ? new Date(s.Tanggal_Naik_XI).getFullYear() : '-',
        'Thn Naik XII': s.Tanggal_Naik_XII ? new Date(s.Tanggal_Naik_XII).getFullYear() : '-',
        'Tgl Tamat/Mutasi': s.Tanggal_Tamat_Sekolah ? format(new Date(s.Tanggal_Tamat_Sekolah), 'dd MMMM yyyy') : '-',
        'Status': s.Status_Aktif || 'Aktif',
        'Keterangan': s.Keterangan || '-'
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Buku Klaper');

      // Style adjustments (optional but good for visibility)
      const fileName = `Buku_Klaper_Kelas_${user?.managedClass || 'General'}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      showToast('Berhasil mengekspor data ke Excel.', 'success');
    } catch (error) {
      console.error('Export Excel error:', error);
      showToast('Gagal mengekspor data ke Excel.', 'error');
    }
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
            margin: 10mm; 
          }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            background-color: white !important; 
          }
          .card { 
            border: none !important; 
            box-shadow: none !important; 
            padding: 0 !important; 
            width: 100% !important; 
            overflow: visible !important; 
            margin: 0 !important;
          }
          .table-container { 
            overflow: visible !important; 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            box-shadow: none !important;
          }
          table { 
            width: 100% !important; 
            border-collapse: collapse !important; 
            table-layout: fixed !important; 
            font-size: 7pt !important; 
          }
          th, td { 
            border: 0.5pt solid #000 !important; 
            padding: 4px 2px !important; 
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            white-space: normal !important;
            vertical-align: top !important; 
            text-align: center !important;
            line-height: 1.3 !important;
          }
          .text-left { text-align: left !important; }
          thead th { 
            background-color: #f1f5f9 !important; 
            -webkit-print-color-adjust: exact; 
            font-weight: bold !important; 
            font-size: 6.5pt !important;
          }
          .bg-slate-100, .bg-slate-50, .bg-slate-200 { background-color: white !important; }
          .line-through { text-decoration: line-through !important; }
          .print-hidden { display: none !important; }
          
          .print-hidden { display: none !important; }
        }
      `}} />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Buku Klaper</h2>
          <p className="text-sm text-slate-500">Daftar Induk Siswa Terurut Alfabetis.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExportToExcel} className="btn-secondary flex justify-center items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Export to Excel
          </button>
          <button onClick={handlePrint} className="btn-primary flex justify-center items-center gap-2">
            <Printer className="w-4 h-4" /> Cetak Buku Klaper
          </button>
        </div>
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
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 md:px-6 py-4 border-b border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0">Daftar Induk Siswa</p>
            </div>
            <div className="table-container pt-0 shadow-xl print:pt-0">
              <table className="modern-table min-w-full print:min-w-0 text-[10px]">
              <colgroup>
                <col style={{ width: '3%' }} />
                <col style={{ width: '5%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '3%' }} />
                <col style={{ width: '6%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '5%' }} />
                <col style={{ width: '5%' }} />
                <col style={{ width: '5%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '5%' }} />
                <col style={{ width: '9%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th colSpan={3} className="bg-slate-100 text-center align-middle border-slate-300 font-bold">NOMOR</th>
                  <th rowSpan={2} className="bg-slate-100 text-center align-middle min-w-[150px] print:min-w-0 border-slate-300 font-bold">NAMA SISWA</th>
                  <th rowSpan={2} className="bg-slate-100 text-center align-middle w-8 border-slate-300 font-bold">L/P</th>
                  <th colSpan={2} className="bg-slate-100 text-center align-middle border-slate-300 font-bold">KELAHIRAN</th>
                  <th rowSpan={2} className="bg-slate-100 text-center align-middle min-w-[120px] print:min-w-0 border-slate-300 font-bold">NAMA ORANG TUA / WALI</th>
                  <th colSpan={3} className="bg-slate-100 text-center align-middle border-slate-300 font-bold text-[9px]">THN AJAR MASUK / NAIK KELAS</th>
                  <th rowSpan={2} className="bg-slate-100 text-center align-middle w-32 print:w-auto leading-tight border-slate-300 font-bold text-[9px]">TGL TAMAT / MUTASI</th>
                  <th rowSpan={2} className="bg-slate-100 text-center align-middle w-32 print:w-auto border-slate-300 font-bold">STATUS</th>
                  <th rowSpan={2} className="bg-slate-100 text-center align-middle min-w-[150px] print:min-w-0 border-slate-300 font-bold text-[10px]">KETERANGAN</th>
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
        </div>
        )}
      </div>
    </div>
  );
}
