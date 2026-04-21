import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchGAS } from '../utils/gasClient';
import StudentCard from '../components/StudentCard';

import Loading from '../components/Loading';
import Skeleton, { SkeletonStats, SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import PageGuide from '../components/PageGuide';
import { UserPlus, FileUp, Download, FileDown, X, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatPhoneNumber } from '../utils/logic';

export default function MasterSiswa() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const role = user?.role || 'Siswa';
  const canAddStudent = role === 'Wali Kelas';
  const canChangeLocation = true; // Diaktifkan untuk semua agar Wali Kelas bisa mengedit profil lengkap

  const [siswa, setSiswa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [nisn, setNisn] = useState('');
  const [nis, setNis] = useState('');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [tglMasukX, setTglMasukX] = useState('');
  const [tglNaikXI, setTglNaikXI] = useState('');
  const [tglNaikXII, setTglNaikXII] = useState('');
  const [tglTamat, setTglTamat] = useState('');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [wa, setWa] = useState('');
  const [waSiswa, setWaSiswa] = useState('');
  const [wali, setWali] = useState('');
  const [alamat, setAlamat] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [jk, setJk] = useState('L');
  const [jabatan, setJabatan] = useState('Siswa');
  const [statusAktif, setStatusAktif] = useState('Aktif');
  const [keterangan, setKeterangan] = useState('');
  const [error, setError] = useState('');

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [bulkTglMasukX, setBulkTglMasukX] = useState('');
  const [bulkTglNaikXI, setBulkTglNaikXI] = useState('');
  const [bulkTglNaikXII, setBulkTglNaikXII] = useState('');
  const [bulkTglTamat, setBulkTglTamat] = useState('');
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const s = await fetchGAS('GET_ALL', { sheet: 'Master_Siswa' });
        const allStudents = s.data || [];
        setSiswa(allStudents.filter(st => st.Status_Aktif === 'Aktif'));
      } catch (error) {
        console.error('MasterSiswa load error:', error);
        showToast('Gagal memuat data siswa.', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      const headers = [
        ['ID_Siswa', 'NIS', 'NISN', 'Nama_Siswa', 'L/P', 'Email', 'No_WA_Siswa', 'Nama_Wali', 'No_WA_Wali', 'Alamat', 'Jabatan', 'Status_Aktif'],
        ['SISWA001', '12345', '0012345678', 'Nama Lengkap', 'L', 'siswa@email.com', '6281234567890', 'Nama Orang Tua', '6281234567890', 'Alamat Lengkap', 'Siswa/Ketua Kelas/Sekretaris/Bendahara', 'Aktif']
      ];
      const ws = XLSX.utils.aoa_to_sheet(headers);
      XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
      XLSX.writeFile(wb, 'Template_Master_Siswa.xlsx');
      showToast('Template berhasil diunduh.', 'success');
    } catch (e) {
      showToast('Gagal membuat template.', 'error');
    }
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsImporting(true);
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (jsonData.length === 0) throw new Error('File kosong');

        // Map and validate
        const mappedData = jsonData.map(row => ({
          ID_Siswa: row.ID_Siswa || `S${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          NIS: row.NIS?.toString() || '',
          NISN: row.NISN?.toString() || '',
          Nama_Siswa: row.Nama_Siswa || '',
          'L/P': row['L/P'] || row.JK || 'L',
          Email: row.Email || '',
          No_WA_Siswa: formatPhoneNumber(row.No_WA_Siswa),
          Nama_Wali: row.Nama_Wali || '',
          No_WA_Wali: formatPhoneNumber(row.No_WA_Wali),
          Alamat: row.Alamat || '',
          Jabatan: row.Jabatan || 'Siswa',
          Status_Aktif: row.Status_Aktif || 'Aktif',
          Created_At: new Date().toISOString()
        }));

        const res = await fetchGAS('BULK_CREATE', {
          sheet: 'Master_Siswa',
          data: mappedData
        });

        if (res.status === 'success') {
          showToast(`Berhasil mengimpor ${mappedData.length} siswa.`, 'success');
          // Reload
          const s = await fetchGAS('GET_ALL', { sheet: 'Master_Siswa' });
          setSiswa((s.data || []).filter(st => st.Status_Aktif === 'Aktif'));
        }
      } catch (err) {
        console.error('Import error:', err);
        showToast('Gagal mengimpor data. Pastikan format benar.', 'error');
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleExportData = async () => {
    try {
      showToast('Menyiapkan data export...', 'info');
      // Ambil seluruh data dari GAS (termasuk yang tidak aktif untuk export lengkap)
      const res = await fetchGAS('GET_ALL', { sheet: 'Master_Siswa' });
      const allSiswa = res.data || [];

      if (allSiswa.length === 0) {
        showToast('Tidak ada data untuk diekspor.', 'warning');
        return;
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(allSiswa);
      XLSX.utils.book_append_sheet(wb, ws, 'Data Master Siswa');

      const timestamp = new Date().getTime();
      XLSX.writeFile(wb, `Master_Siswa_Lengkap_${timestamp}.xlsx`);

      showToast('Berhasil mengekspor data.', 'success');
    } catch (e) {
      console.error('Export error:', e);
      showToast('Gagal mengekspor data.', 'error');
    }
  };

  const clearForm = () => {
    setEditingStudent(null);
    setIsFormOpen(false);
    setNisn('');
    setNis('');
    setTempatLahir('');
    setTanggalLahir('');
    setTglMasukX('');
    setTglNaikXI('');
    setTglNaikXII('');
    setTglTamat('');
    setNama('');
    setEmail('');
    setWa('');
    setWaSiswa('');
    setWali('');
    setAlamat('');
    setLatitude('');
    setLongitude('');
    setLokasi('');
    setJk('L');
    setJabatan('Siswa');
    setStatusAktif('Aktif');
    setKeterangan('');
    setError('');
  };

  const handleCreateOrUpdateStudent = useCallback(async (e) => {
    e.preventDefault();
    if (!nama) {
      setError('Nama Siswa harus diisi.');
      return;
    }

    const studentData = {
      NISN: nisn,
      NIS: nis,
      Nama_Siswa: nama,
      'L/P': jk,
      Tempat_Lahir: tempatLahir,
      Tanggal_Lahir: tanggalLahir,
      Tanggal_Masuk_X: tglMasukX,
      Tanggal_Naik_XI: tglNaikXI,
      Tanggal_Naik_XII: tglNaikXII,
      Tanggal_Tamat_Sekolah: tglTamat,
      Email: email,
      Jabatan: jabatan,
      No_WA_Siswa: formatPhoneNumber(waSiswa),
      Nama_Wali: wali,
      No_WA_Wali: formatPhoneNumber(wa),
      Alamat: alamat,
      Latitude: latitude,
      Longitude: longitude,
      Lokasi: latitude && longitude ? createMapsLink(latitude, longitude) : lokasi,
      Status_Aktif: statusAktif,
      Keterangan: keterangan
    };

    try {
      if (editingStudent) {
        setSiswa(prev => prev.map(item => item.ID_Siswa === editingStudent.ID_Siswa ? { ...item, ...studentData } : item));
        await fetchGAS('UPDATE', { sheet: 'Master_Siswa', id: editingStudent.ID_Siswa, data: studentData });
        showToast('Data siswa berhasil diperbarui.', 'success');
      } else {
        const newStudent = {
          ID_Siswa: `S${Date.now()}`,
          ...studentData
        };
        setSiswa(prev => [newStudent, ...prev]);
        await fetchGAS('CREATE', { sheet: 'Master_Siswa', data: newStudent });
        showToast('Siswa berhasil ditambahkan.', 'success');
      }
      clearForm();
    } catch (err) {
      console.error('Simpan siswa gagal:', err);
      setError('Gagal menyimpan data siswa. Silakan coba lagi.');
      showToast('Gagal menyimpan data siswa.', 'error');
    }
  }, [nisn, nis, nama, jk, tempatLahir, tanggalLahir, tglMasukX, tglNaikXI, tglNaikXII, tglTamat, email, jabatan, wali, wa, waSiswa, alamat, latitude, longitude, lokasi, statusAktif, keterangan, editingStudent, showToast]);

  const handleDeleteStudent = async (idSiswa) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data siswa ini?')) return;
    try {
      setSiswa(prev => prev.filter(s => s.ID_Siswa !== idSiswa));
      await fetchGAS('DELETE', { sheet: 'Master_Siswa', id: idSiswa });
      showToast('Siswa berhasil dihapus.', 'success');
    } catch (err) {
      showToast('Gagal menghapus siswa.', 'error');
    }
  };

  const handleEditStudent = useCallback((student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
    setNisn(student.NISN || '');
    setNis(student.NIS || '');
    setTempatLahir(student.Tempat_Lahir || '');
    setTanggalLahir(student.Tanggal_Lahir || '');
    setTglMasukX(student.Tanggal_Masuk_X || '');
    setTglNaikXI(student.Tanggal_Naik_XI || '');
    setTglNaikXII(student.Tanggal_Naik_XII || '');
    setTglTamat(student.Tanggal_Tamat_Sekolah || '');
    setNama(student.Nama_Siswa || '');
    setJk(student['L/P'] || 'L');
    setEmail(student.Email || '');
    setWa(student.No_WA_Wali || '');
    setWaSiswa(student.No_WA_Siswa || '');
    setWali(student.Nama_Wali || '');
    setAlamat(student.Alamat || '');
    setLatitude(formatCoordinateInput(student.Latitude || '', true));
    setLongitude(formatCoordinateInput(student.Longitude || '', false));
    setLokasi(student.Lokasi || '');
    setJabatan(student.Jabatan || 'Siswa');
    setStatusAktif(student.Status_Aktif || 'Aktif');
    setKeterangan(student.Keterangan || '');
    setError('');
  }, []);

  const handleWA = useCallback((student) => {
    const message = encodeURIComponent(`Halo Bapak/Ibu ${student.Nama_Wali}, saya wali kelas dari ${student.Nama_Siswa}.`);
    const url = `https://wa.me/${student.No_WA_Wali}?text=${message}`;
    window.open(url, '_blank');
  }, []);

  const handleWASiswa = useCallback((student) => {
    const num = student.No_WA_Siswa || student.No_WA_Wali;
    const message = encodeURIComponent(`Halo ${student.Nama_Siswa}, ini Wali Kelas. Ingin menyapa dan memastikan kabarmu hari ini. Tetap semangat belajarnya ya!`);
    const url = `https://wa.me/${num}?text=${message}`;
    window.open(url, '_blank');
  }, []);

  const normalizeDecimalString = (value) => {
    if (value === undefined || value === null) return '';
    let str = value.toString().trim().replace(/,/g, '.');
    str = str.replace(/[^0-9.\-]/g, '');
    str = str.replace(/(?!^)-/g, '');
    const parts = str.split('.');
    if (parts.length > 2) {
      const last = parts.pop();
      const integerPart = parts.join('');
      str = `${integerPart}.${last}`;
    }
    return str;
  };

  const decimalToDMS = (value, isLatitude) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '';
    const sign = value < 0 ? -1 : 1;
    const absValue = Math.abs(value);
    const degrees = Math.floor(absValue);
    const minutes = Math.floor((absValue - degrees) * 60);
    const seconds = ((absValue - degrees) * 60 - minutes) * 60;
    const direction = isLatitude ? (sign < 0 ? 'S' : 'N') : (sign < 0 ? 'W' : 'E');
    return `${degrees}°${minutes}'${seconds.toFixed(2)}"${direction}`;
  };

  const dmsToDecimal = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const str = value.toString().trim();
    const dmsMatch = str.match(/^(-?\d+(?:\.\d*)?)°\s*(\d+(?:\.\d*)?)'\s*(\d+(?:\.\d*)?)"?\s*([NSEW])?$/i);
    if (dmsMatch) {
      const degrees = Number(dmsMatch[1]);
      const minutes = Number(dmsMatch[2]);
      const seconds = Number(dmsMatch[3]);
      const direction = dmsMatch[4] ? dmsMatch[4].toUpperCase() : null;
      let decimal = Math.abs(degrees) + minutes / 60 + seconds / 3600;
      if (degrees < 0 || direction === 'S' || direction === 'W') decimal *= -1;
      return decimal;
    }
    const normalized = normalizeDecimalString(str);
    return normalized ? Number(normalized) : null;
  };

  const isDMSValue = (value) => typeof value === 'string' && /[°'"NSEW]/i.test(value);

  const formatCoordinateInput = (value, isLatitude) => {
    if (!value && value !== 0) return '';
    const text = value.toString().trim();
    if (isDMSValue(text)) return text;
    const decimal = Number(normalizeDecimalString(text));
    return Number.isFinite(decimal) ? decimalToDMS(decimal, isLatitude) : '';
  };

  const createMapsLink = (lat, lng) => {
    const latDecimal = dmsToDecimal(lat);
    const lngDecimal = dmsToDecimal(lng);
    if (latDecimal === null || lngDecimal === null) return '';
    return `https://www.google.com/maps?q=${latDecimal},${lngDecimal}`;
  };

  const handleGetGPS = useCallback(() => {
    if (!canChangeLocation) {
      setError('Wali Kelas tidak dapat mengubah lokasi.');
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const link = createMapsLink(lat, lng);
          setLatitude(decimalToDMS(lat, true));
          setLongitude(decimalToDMS(lng, false));
          setLokasi(createMapsLink(lat, lng));
          showToast('Lokasi GPS berhasil didapatkan.', 'success');
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Gagal mendapatkan lokasi GPS. Pastikan izin lokasi diaktifkan.');
          showToast('Gagal mendapatkan lokasi GPS.', 'error');
        }
      );
    } else {
      setError('Geolocation tidak didukung oleh browser ini.');
      showToast('Geolocation tidak didukung.', 'error');
    }
  }, [showToast, canChangeLocation]);

  const handleBulkUpdateHistory = async (e) => {
    e.preventDefault();
    if (!bulkTglMasukX && !bulkTglNaikXI && !bulkTglNaikXII && !bulkTglTamat) {
      showToast('Setidaknya satu tanggal harus diisi untuk update massal.', 'error');
      return;
    }

    if (!window.confirm('Apakah Anda yakin ingin menerapkan tanggal ini ke SELURUH siswa yang tampil di daftar?')) {
      return;
    }

    setIsSavingBulk(true);
    const updates = siswa.map(s => ({
      ID_Siswa: s.ID_Siswa,
      NISN: s.NISN,
      ...(bulkTglMasukX && { Tanggal_Masuk_X: bulkTglMasukX }),
      ...(bulkTglNaikXI && { Tanggal_Naik_XI: bulkTglNaikXI }),
      ...(bulkTglNaikXII && { Tanggal_Naik_XII: bulkTglNaikXII }),
      ...(bulkTglTamat && { Tanggal_Tamat_Sekolah: bulkTglTamat })
    }));

    try {
      const res = await fetchGAS('BULK_UPDATE_MASTER_HISTORY', { data: updates });
      if (res.status === 'success') {
        setSiswa(prev => prev.map(s => {
          const up = updates.find(u => u.NISN === s.NISN);
          return up ? { ...s, ...up } : s;
        }));
        showToast('Histori kls berhasil diterapkan ke semua siswa.', 'success');
        setIsBulkOpen(false);
        setBulkTglMasukX('');
        setBulkTglNaikXI('');
        setBulkTglNaikXII('');
        setBulkTglTamat('');
      }
    } catch (err) {
      console.error('Bulk update histori error:', err);
      showToast('Gagal menerapkan update massal.', 'error');
    } finally {
      setIsSavingBulk(false);
    }
  };

  if (loading) return <Loading message="Menyiapkan data induk siswa..." />;


  const getTahunAjarPreview = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    if (month >= 7) return `${year} / [${year + 1}] (Ganjil)`;
    return `[${year - 1}] / ${year} (Genap)`;
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Master Data Siswa</h2>
            <p className="text-sm text-slate-500">Kelola informasi profil dan status keaktifan siswa.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canAddStudent && (
              <>
                <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Unduh Template Excel">
                    <Download className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Template</span>
                  </button>

                  <div className="relative group">
                    <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="absolute inset-0 opacity-0 cursor-pointer z-10" title="Impor Siswa dari Excel" />
                    <button className="flex items-center gap-2 px-3 py-2 text-slate-600 group-hover:text-emerald-600 group-hover:bg-emerald-50 rounded-lg transition-all">
                      <FileUp className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-tight">{isImporting ? 'Memproses...' : 'Impor Siswa'}</span>
                    </button>
                  </div>

                  <button onClick={handleExportData} className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Ekspor Seluruh Data Siswa">
                    <FileDown className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Ekspor</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    const newBulkOpen = !isBulkOpen;
                    setIsBulkOpen(newBulkOpen);
                    if (newBulkOpen) {
                      setIsFormOpen(false);
                      if (siswa.length > 0) {
                        setBulkTglMasukX(siswa[0].Tanggal_Masuk_X || '');
                        setBulkTglNaikXI(siswa[0].Tanggal_Naik_XI || '');
                        setBulkTglNaikXII(siswa[0].Tanggal_Naik_XII || '');
                        setBulkTglTamat(siswa[0].Tanggal_Tamat_Sekolah || '');
                      }
                    }
                  }}
                  className="btn-secondary flex items-center gap-2"
                >
                  {isBulkOpen ? 'Tutup Massal' : 'Update Massal'}
                </button>
              </>
            )}

            <button
              onClick={() => {
                setEditingStudent(null);
                clearForm();
                setIsFormOpen(true);
                setIsBulkOpen(false);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Tambah Siswa
            </button>
          </div>
        </div>

        {canAddStudent && isBulkOpen && (
          <div className="card p-6 border-2 border-emerald-100 bg-emerald-50/30">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Update Massal Histori Kelas</h3>
            <p className="text-xs text-slate-500 mb-4">Pilih tanggal yang ingin diterapkan ke SEMUA siswa saat ini.</p>
            <form onSubmit={handleBulkUpdateHistory} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tgl Masuk X</label>
                  <input type="date" className="input-field" value={bulkTglMasukX} onChange={(e) => setBulkTglMasukX(e.target.value)} />
                  <p className="text-[10px] text-emerald-600 font-bold mt-1 ml-1 tracking-tight">{getTahunAjarPreview(bulkTglMasukX)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tgl Naik XI</label>
                  <input type="date" className="input-field" value={bulkTglNaikXI} onChange={(e) => setBulkTglNaikXI(e.target.value)} />
                  <p className="text-[10px] text-emerald-600 font-bold mt-1 ml-1 tracking-tight">{getTahunAjarPreview(bulkTglNaikXI)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tgl Naik XII</label>
                  <input type="date" className="input-field" value={bulkTglNaikXII} onChange={(e) => setBulkTglNaikXII(e.target.value)} />
                  <p className="text-[10px] text-emerald-600 font-bold mt-1 ml-1 tracking-tight">{getTahunAjarPreview(bulkTglNaikXII)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tgl Tamat Sekolah</label>
                  <input type="date" className="input-field" value={bulkTglTamat} onChange={(e) => setBulkTglTamat(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingBulk}
                  className="btn-primary !bg-emerald-600 hover:!bg-emerald-700 min-w-[150px]"
                >
                  {isSavingBulk ? 'Memproses...' : 'Terapkan ke Semua'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {siswa.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="Belum Ada Siswa"
                description="Daftar siswa Anda masih kosong. Silakan tambahkan siswa baru menggunakan tombol di atas."
                icon={UserPlus}
              />
            </div>
          ) : (
            siswa.map(student => (
              <StudentCard
                key={student.NISN}
                student={student}
                onWaClick={role === 'Wali Kelas' ? handleWA : undefined}
                onWaStudentClick={role === 'Wali Kelas' ? handleWASiswa : undefined}
                onContactClick={role === 'Wali Kelas' ? (s) => navigate('/panggilan', { state: { nisn: s.NISN || s.ID_Siswa } }) : undefined}
                onEdit={canAddStudent ? handleEditStudent : undefined}
                onDelete={canAddStudent ? handleDeleteStudent : undefined}
                canSeeLocation={role === 'Wali Kelas'}
              />
            ))
          )}
        </div>
      </div>

      {canAddStudent && isFormOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop with blur - forced full viewport */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto"
            onClick={clearForm}
          />

          {/* Modal Container */}
          <div className="relative bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-in zoom-in-95 duration-500 z-10 border border-slate-100">
            {/* Top accent bar */}
            <div className="h-1.5 w-full bg-emerald-600 sticky top-0 z-30" />
            
            <div className="sticky top-1.5 z-20 bg-white/95 backdrop-blur-sm px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                    {editingStudent ? 'Edit Profil Siswa' : 'Registrasi Siswa Baru'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">
                    {editingStudent ? 'Perbarui informasi akademik dan personal secara menyeluruh' : 'Lengkapi data identitas untuk pendaftaran siswa baru'}
                  </p>
                </div>
              </div>
              <button 
                onClick={clearForm}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-rose-500 hover:rotate-90 duration-300 focus:outline-none bg-slate-50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl text-sm mb-6 animate-in slide-in-from-top-2">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateOrUpdateStudent} className="space-y-8">
                <div className="grid gap-6">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Identitas Dasar</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">NIS</label>
                        <input className="input-field" value={nis} onChange={(e) => setNis(e.target.value)} placeholder="Contoh: 12345" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">NISN</label>
                        <input className="input-field" value={nisn} onChange={(e) => setNisn(e.target.value)} placeholder="Contoh: 0012345678" />
                      </div>
                      <div className="lg:col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Nama Lengkap</label>
                        <input className="input-field" value={nama} onChange={(e) => setNama(e.target.value)} required placeholder="Masukkan nama sesuai ijazah" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Tempat Lahir</label>
                        <input className="input-field" value={tempatLahir} onChange={(e) => setTempatLahir(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Tanggal Lahir</label>
                        <input type="date" className="input-field" value={tanggalLahir} onChange={(e) => setTanggalLahir(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* Histori Kelas */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-6 bg-blue-500 rounded-full" />
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Histori Kelas & Kelulusan</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Masuk Kls X</label>
                        <input type="date" className="input-field" value={tglMasukX} onChange={(e) => setTglMasukX(e.target.value)} />
                        <p className="text-[9px] text-indigo-500 font-bold mt-1 ml-1">{getTahunAjarPreview(tglMasukX)}</p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Naik Kls XI</label>
                        <input type="date" className="input-field" value={tglNaikXI} onChange={(e) => setTglNaikXI(e.target.value)} />
                        <p className="text-[9px] text-indigo-500 font-bold mt-1 ml-1">{getTahunAjarPreview(tglNaikXI)}</p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Naik Kls XII</label>
                        <input type="date" className="input-field" value={tglNaikXII} onChange={(e) => setTglNaikXII(e.target.value)} />
                        <p className="text-[9px] text-indigo-500 font-bold mt-1 ml-1">{getTahunAjarPreview(tglNaikXII)}</p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Tamat Sekolah</label>
                        <input type="date" className="input-field" value={tglTamat} onChange={(e) => setTglTamat(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* Informasi Akademik */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-6 bg-amber-500 rounded-full" />
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Status & Jabatan</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">L/P</label>
                        <select className="input-field" value={jk} onChange={(e) => setJk(e.target.value)}>
                          <option value="L">Laki-laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Struktur Organisasi</label>
                        <select className="input-field" value={jabatan} onChange={(e) => setJabatan(e.target.value)}>
                          <option value="Siswa">Siswa</option>
                          <option value="Ketua Kelas">Ketua Kelas</option>
                          <option value="Sekretaris">Sekretaris</option>
                          <option value="Bendahara">Bendahara</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Status Keaktifan</label>
                        <select className="input-field" value={statusAktif} onChange={(e) => setStatusAktif(e.target.value)}>
                          <option value="Aktif">Aktif</option>
                          <option value="Keluar">Keluar</option>
                          <option value="Lulus">Lulus</option>
                        </select>
                      </div>
                      {statusAktif === 'Keluar' && (
                        <div className="md:col-span-3 mt-2">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Catatan Alasan Keluar</label>
                          <textarea className="input-field min-h-[80px]" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Jelaskan alasan siswa keluar dari sekolah..." />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kontak & Lokasi */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-6 bg-indigo-500 rounded-full" />
                      <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Kontak & Geotagging</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Email Siswa</label>
                        <input type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Nama Orang Tua/Wali</label>
                        <input className="input-field" value={wali} onChange={(e) => setWali(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">WhatsApp Orang Tua</label>
                        <input className="input-field" value={wa} onChange={(e) => setWa(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">WhatsApp Siswa</label>
                        <input className="input-field" value={waSiswa} onChange={(e) => setWaSiswa(e.target.value)} />
                      </div>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Latitude</label>
                          <input className="input-field" value={latitude} onChange={(e) => {
                            if (!canChangeLocation) return;
                            const formatted = formatCoordinateInput(e.target.value, true);
                            setLatitude(formatted);
                            if (formatted && longitude) setLokasi(createMapsLink(formatted, longitude));
                          }} disabled={!canChangeLocation} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Longitude</label>
                          <input className="input-field" value={longitude} onChange={(e) => {
                            if (!canChangeLocation) return;
                            const formatted = formatCoordinateInput(e.target.value, false);
                            setLongitude(formatted);
                            if (latitude && formatted) setLokasi(createMapsLink(latitude, formatted));
                          }} disabled={!canChangeLocation} />
                        </div>
                        <div className="flex items-end pb-[1px]">
                          <button 
                            type="button" 
                            onClick={handleGetGPS} 
                            className="flex items-center justify-center gap-2 w-full h-[42px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all duration-300 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 disabled:grayscale disabled:opacity-50" 
                          >
                            <MapPin className="w-4 h-4" /> 
                            Sinkronkan GPS
                          </button>
                        </div>
                      </div>

                      {/* Map Preview Logic */}
                      {latitude && longitude && (
                        <div className="mt-6 animate-in fade-in zoom-in-95 duration-500">
                          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 relative">
                            <iframe 
                              title="Map Preview"
                              width="100%" 
                              height="200" 
                              frameBorder="0" 
                              scrolling="no" 
                              marginHeight="0" 
                              marginWidth="0" 
                              src={`https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`}
                              className="filter contrast-[1.1] grayscale-[0.2]"
                            />
                            <div className="absolute top-4 right-4">
                              <a 
                                href={`https://www.google.com/maps?q=${latitude},${longitude}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl text-[10px] font-black text-slate-800 shadow-xl flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all group"
                              >
                                <span className="group-hover:scale-110 transition-transform">📍</span>
                                LIHAT DI GOOGLE MAPS
                              </a>
                            </div>
                          </div>
                          <p className="mt-3 text-[10px] text-slate-400 font-bold flex items-center gap-2 ml-2 italic">
                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                            Lokasi ini akan digunakan untuk fitur zonasi dan pemetaan alamat siswa.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                  <button type="button" onClick={clearForm} className="btn-secondary min-w-[120px]">Batal</button>
                  <button type="submit" className="btn-primary min-w-[200px]">
                    {editingStudent ? 'Simpan Perubahan' : 'Daftarkan Siswa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
