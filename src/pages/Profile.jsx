import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchGAS } from '../utils/gasClient';
import Loading from '../components/Loading';
import { formatPhoneNumber } from '../utils/logic';
import Skeleton from '../components/Skeleton';
import PageGuide from '../components/PageGuide';
import UpdateCheck from '../components/UpdateCheck';
import * as XLSX from 'xlsx';
import { Download, Database, AlertTriangle, HardDrive } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [gayaAjar, setGayaAjar] = useState('');
  const [kontak, setKontak] = useState('');
  const [alamat, setAlamat] = useState('');
  const [namaWali, setNamaWali] = useState('');
  const [noWaWali, setNoWaWali] = useState('');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [nominalIuran, setNominalIuran] = useState('');
  const [kelas, setKelas] = useState('');
  const [noWaSiswa, setNoWaSiswa] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [exporting, setExporting] = useState(false);

  const role = user?.role || 'Siswa';
  const isWaliKelas = role === 'Wali Kelas';
  const isSiswaRole = ['Siswa', 'Ketua Kelas', 'Wakil Ketua Kelas', 'Sekretaris', 'Wakil Sekretaris', 'Bendahara', 'Wakil Bendahara'].includes(role);
  const sheetName = isSiswaRole ? 'Master_Siswa' : 'Profil_Wali_Kelas';
  const idField = isSiswaRole ? 'ID_Siswa' : 'Id_Wali';

  useEffect(() => {
    async function loadProfile() {
      if (!user?.email) return;

      try {
        const response = await fetchGAS('GET_ALL', { sheet: sheetName });
        const rows = response.data || [];
        const row = rows.find((item) => item.Email && item.Email.toString().toLowerCase() === user.email.toLowerCase());

        if (!row) {
          setError('Profil tidak ditemukan. Silakan hubungi admin jika data belum terdaftar.');
          return;
        }

        setProfile(row);
        setName(isSiswaRole ? row.Nama_Siswa || user.name : row.Nama || user.name);
        setEmail(row.Email || user.email);
        setBio(row.Bio || '');
        setGayaAjar(row.Gaya_Ajar || '');
        setKontak(row.Kontak || '');
        setAlamat(row.Alamat || '');
        setNamaWali(row.Nama_Wali || '');
        setNoWaWali(row.No_WA_Wali || '');
        setNoWaSiswa(row.No_WA_Siswa || '');
        setTempatLahir(row.Tempat_Lahir || '');
        setTanggalLahir(row.Tanggal_Lahir || '');
        setLatitude(formatCoordinateInput(row.Latitude || '', true));
        setLongitude(formatCoordinateInput(row.Longitude || '', false));
        setLokasi(row.Lokasi || '');
        setNominalIuran(row.Nominal_Iuran || '');
        setKelas(row.Kelas || '');
      } catch (err) {
        console.error('Load profile error:', err);
        setError('Gagal memuat profil.');
        showToast('Gagal memuat profil.', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user, sheetName, isSiswaRole, showToast]);

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
        (err) => {
          console.error('Error getting location:', err);
          setError('Gagal mendapatkan lokasi GPS. Pastikan izin lokasi diaktifkan.');
          showToast('Gagal mendapatkan lokasi GPS.', 'error');
        }
      );
    } else {
      setError('Geolocation tidak didukung oleh browser ini.');
      showToast('Geolocation tidak didukung.', 'error');
    }
  }, [showToast]);

  const expectedColumns = {
    'Master_Siswa': ['ID_Siswa', 'NIS', 'NISN', 'Nama_Siswa', 'L/P', 'Email', 'Jabatan', 'Tempat_Lahir', 'Tanggal_Lahir', 'No_WA_Siswa', 'Nama_Wali', 'No_WA_Wali', 'Alamat'],
    'Presensi': ['ID_Presensi', 'Tanggal', 'ID_Siswa', 'NISN', 'Status_Pagi', 'Timestamp_Pagi', 'Status_Siang', 'Timestamp_Siang', 'Keterangan'],
    'Keuangan': ['ID_Transaksi', 'Tanggal', 'ID_Siswa', 'NISN', 'Tipe', 'Jumlah', 'Keterangan'],
    'Daftar_Nilai': ['ID_Nilai', 'ID_Siswa', 'NISN', 'Jenjang', 'Semester', 'Kategori_Mapel', 'Nama_Mapel', 'Topik', 'Nilai', 'Timestamp'],
    'Log_Panggilan': ['ID_Panggilan', 'Tanggal', 'ID_Siswa', 'NISN', 'Kategori', 'Alasan', 'Tanggal_Pemanggilan', 'Waktu_Diskusi', 'Hasil_Pertemuan', 'Status_Selesai', 'Bukti_File_URL'],
    'Piket': ['ID_Piket', 'Hari', 'ID_Siswa', 'Nama_Siswa', 'Email'],
    'Notifikasi': ['ID', 'Message', 'Type', 'Target_Email', 'Is_Read', 'Timestamp', 'Target_Role', 'Role', 'Email'],
    'Archive_Rekap_Absensi': ['ID_Siswa', 'Bulan', 'H', 'I', 'S', 'A', 'B'],
    'Archive_Rekap_Keuangan': ['Bulan', 'Saldo_Awal', 'Total_Masuk', 'Total_Keluar', 'Saldo_Akhir'],
    'Archive_Detail_Absensi': ['ID_Presensi', 'Tanggal', 'ID_Siswa', 'NISN', 'Status_Pagi', 'Timestamp_Pagi', 'Status_Siang', 'Timestamp_Siang', 'Keterangan'],
    'Profil_Wali_Kelas': ['Id_Wali', 'Nama', 'Email', 'Bio', 'Gaya_Ajar', 'Kontak', 'Created_At', 'Nominal_Iuran', 'Kelas']
  };

  const generateSQLDump = (data) => {
    const tableMap = {
      'Master_Siswa': 'master_siswa',
      'Presensi': 'presensi',
      'Keuangan': 'keuangan',
      'Daftar_Nilai': 'daftar_nilai',
      'Log_Panggilan': 'log_panggilan',
      'Piket': 'piket',
      'Notifikasi': 'notifikasi',
      'Archive_Rekap_Absensi': 'archive_rekap_absensi',
      'Archive_Rekap_Keuangan': 'archive_rekap_keuangan',
      'Archive_Detail_Absensi': 'archive_detail_absensi',
      'Profil_Wali_Kelas': 'profil_wali_kelas',
      'Lokasi': 'lokasi'
    };

    let sql = '-- ============================================\n';
    sql += '-- Backup Database Siswa.Hub\n';
    sql += `-- Generated: ${new Date().toISOString()}\n`;
    sql += `-- Wali Kelas: ${user?.name || 'Unknown'}\n`;
    sql += `-- Email: ${user?.email || 'Unknown'}\n`;
    sql += '-- Format: MySQL Compatible\n';
    sql += '-- ============================================\n\n';

    sql += 'SET NAMES utf8mb4;\n';
    sql += 'SET FOREIGN_KEY_CHECKS = 0;\n\n';

    for (const [sheet, rows] of Object.entries(data)) {
      const tableName = tableMap[sheet] || sheet.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      sql += `-- ============================================\n`;
      sql += `-- Tabel: ${tableName} (${rows.length} records)\n`;
      sql += `-- ============================================\n\n`;

      const columns = rows.length > 0 
        ? Object.keys(rows[0]) 
        : (expectedColumns[sheet] || []);
      
      if (columns.length === 0) {
        sql += `-- Tabel ${tableName} tidak memiliki struktur kolom yang diketahui\n\n`;
        continue;
      }
      
      sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      sql += `CREATE TABLE \`${tableName}\` (\n`;
      sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
      sql += columns.map(col => `  \`${col.replace(/[^a-zA-Z0-9_]/g, '_')}\` TEXT DEFAULT NULL`).join(',\n');
      sql += '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';

      if (rows.length === 0) {
        sql += `-- Tabel ${tableName} kosong, tidak ada data untuk di-insert\n\n`;
        continue;
      }

      sql += `LOCK TABLES \`${tableName}\` WRITE;\n`;
      sql += `/*!40000 ALTER TABLE \`${tableName}\` DISABLE KEYS */;\n\n`;

      rows.forEach((row, idx) => {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return String(val);
          return `'${String(val).replace(/'/g, "\\'").replace(/\\/g, '\\\\')}'`;
        });
        const prefix = idx === 0 ? `INSERT INTO \`${tableName}\` VALUES ` : ', ';
        sql += `${prefix}(${values.join(', ')})`;
        if (idx === rows.length - 1) sql += ';';
        sql += '\n';
      });

      sql += `\n/*!40000 ALTER TABLE \`${tableName}\` ENABLE KEYS */;\n`;
      sql += `UNLOCK TABLES;\n\n`;
    }

    sql += 'SET FOREIGN_KEY_CHECKS = 1;\n';
    sql += `\n-- ============================================\n`;
    sql += `-- Backup selesai: ${new Date().toISOString()}\n`;
    sql += `-- Total tabel: ${Object.keys(data).length}\n`;
    sql += `-- Total records: ${Object.values(data).reduce((sum, rows) => sum + rows.length, 0)}\n`;
    sql += '-- ============================================\n';

    return sql;
  };

  const handleExportDatabase = async () => {
    if (!isWaliKelas) {
      showToast('Hanya wali kelas yang dapat melakukan backup.', 'error');
      return;
    }

    setExporting(true);
    showToast('Memulai backup database...', 'info');

    try {
      const sheetsToExport = [
        'Master_Siswa',
        'Presensi',
        'Keuangan',
        'Daftar_Nilai',
        'Log_Panggilan',
        'Piket',
        'Notifikasi',
        'Archive_Rekap_Absensi',
        'Archive_Rekap_Keuangan',
        'Archive_Detail_Absensi',
        'Profil_Wali_Kelas'
      ];

      const allData = {};
      let totalRecords = 0;

      for (const sheet of sheetsToExport) {
        const res = await fetchGAS('GET_ALL', { sheet });
        const data = res.data || [];
        allData[sheet] = data;
        totalRecords += data.length;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const timestamp = new Date().getTime();

      // 1. Export sebagai XLSX (multi-sheet workbook)
      const wb = XLSX.utils.book_new();
      
      sheetsToExport.forEach(sheet => {
        const data = allData[sheet];
        let ws;
        
        if (data.length > 0) {
          ws = XLSX.utils.json_to_sheet(data);
          
          const colWidths = Object.keys(data[0]).map(key => {
            const maxLen = Math.max(
              key.length,
              ...data.map(row => String(row[key] || '').length)
            );
            return { wch: Math.min(maxLen + 2, 50) };
          });
          ws['!cols'] = colWidths;
        } else {
          // Sheet kosong: buat dengan header row saja
          const columns = expectedColumns[sheet] || [];
          ws = XLSX.utils.aoa_to_sheet([columns]);
          ws['!cols'] = columns.map(() => ({ wch: 15 }));
        }
        
        XLSX.utils.book_append_sheet(wb, ws, sheet.substring(0, 31));
      });

      const xlsxFileName = `SiswaHub_Backup_${dateStr}_${timestamp}.xlsx`;
      XLSX.writeFile(wb, xlsxFileName);

      // 2. Export sebagai SQL (MySQL format)
      const sqlContent = generateSQLDump(allData);
      const sqlBlob = new Blob([sqlContent], { type: 'text/sql;charset=utf-8' });
      const sqlUrl = URL.createObjectURL(sqlBlob);
      const sqlLink = document.createElement('a');
      sqlLink.href = sqlUrl;
      sqlLink.download = `SiswaHub_Backup_${dateStr}_${timestamp}.sql`;
      document.body.appendChild(sqlLink);
      sqlLink.click();
      document.body.removeChild(sqlLink);
      URL.revokeObjectURL(sqlUrl);

      showToast(`Backup berhasil! ${sheetsToExport.length} tabel, ${totalRecords} record. File XLSX dan SQL telah diunduh.`, 'success');
    } catch (err) {
      console.error('Export database error:', err);
      showToast('Gagal melakukan backup database. Periksa koneksi internet Anda.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError('');

    const updateData = isSiswaRole
      ? {
        Nama_Siswa: name,
        Alamat: alamat,
        Nama_Wali: namaWali,
        No_WA_Wali: formatPhoneNumber(noWaWali),
        No_WA_Siswa: formatPhoneNumber(noWaSiswa),
        Tempat_Lahir: tempatLahir,
        Tanggal_Lahir: tanggalLahir,
        Latitude: latitude,
        Longitude: longitude,
        Lokasi: latitude && longitude ? createMapsLink(latitude, longitude) : lokasi
      }
      : {
        Nama: name,
        Bio: bio,
        Gaya_Ajar: gayaAjar,
        Kontak: kontak,
        Alamat: alamat,
        Latitude: latitude,
        Longitude: longitude,
        Lokasi: latitude && longitude ? createMapsLink(latitude, longitude) : lokasi,
        Nominal_Iuran: nominalIuran,
        Kelas: kelas
      };

    try {
      await fetchGAS('UPDATE', {
        sheet: sheetName,
        id: profile[idField],
        data: updateData
      });
      showToast('Profil berhasil disimpan.', 'success');
      // Update local storage and auth context if managedClass changed
      if (isWaliKelas) {
        const updatedUser = { ...user, managedClass: kelas };
        localStorage.setItem('wali_kelas_user', JSON.stringify(updatedUser));
        window.location.reload(); // Quickest way to sync
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Save profile error:', err);
      setError('Gagal menyimpan profil. Silakan coba lagi.');
      showToast('Gagal menyimpan profil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDatabase = () => {
    setShowResetModal(true);
    setConfirmInput('');
  };

  const confirmReset = async () => {
    if (confirmInput !== 'RESET') {
      showToast("Teks konfirmasi tidak sesuai.", "error");
      return;
    }

    setShowResetModal(false);
    setResetting(true);
    try {
      const response = await fetchGAS('RESET_DATABASE', { email: user.email });
      showToast(response.data || 'Database berhasil direset.', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('Reset database error:', err);
      showToast('Gagal mereset database.', 'error');
      setResetting(false);
    }
  };

  if (loading) return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Edit Profil</h2>
          <p className="text-sm text-slate-500">Perbarui data profil Anda.</p>
          <p className="text-xs text-slate-500 mt-1">Role: <strong>{role}</strong></p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
        >
          Kembali ke Dashboard
        </button>
      </div>

      {isWaliKelas && <UpdateCheck />}

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
              <input
                className="input-field"
                value={email}
                readOnly
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nama</label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          {isSiswaRole ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Alamat</label>
                <input
                  className="input-field"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Orang Tua</label>
                <input
                  className="input-field"
                  value={namaWali}
                  onChange={(e) => setNamaWali(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">No WA Wali</label>
                <input
                  className="input-field"
                  value={noWaWali}
                  onChange={(e) => setNoWaWali(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">No WA Siswa</label>
                <input
                  className="input-field"
                  value={noWaSiswa}
                  onChange={(e) => setNoWaSiswa(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tempat Lahir</label>
                <input
                  className="input-field"
                  value={tempatLahir}
                  onChange={(e) => setTempatLahir(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  className="input-field"
                  value={tanggalLahir}
                  onChange={(e) => setTanggalLahir(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Bio</label>
                <textarea
                  className="input-field min-h-[120px]"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Gaya Ajar</label>
                <input
                  className="input-field"
                  value={gayaAjar}
                  onChange={(e) => setGayaAjar(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kontak</label>
                <input
                  className="input-field"
                  value={kontak}
                  onChange={(e) => setKontak(e.target.value)}
                />
              </div>
              {isWaliKelas && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nominal Iuran Kelas (Rp)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={nominalIuran}
                    onChange={(e) => setNominalIuran(e.target.value)}
                    placeholder="Contoh: 50000"
                    min="0"
                  />
                </div>
              )}
              {isWaliKelas && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kelas yang Dikelola</label>
                  <input
                    className="input-field"
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    placeholder="Contoh: 10 IPA 1"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium italic">
                    * Mengubah kelas akan merubah data siswa yang tampil di dashboard.
                  </p>
                </div>
              )}
            </div>
          )}


          {isSiswaRole && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">Lokasi GPS</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Latitude</label>
                  <input
                    className="input-field"
                    value={latitude}
                    onChange={(e) => {
                      const formatted = formatCoordinateInput(e.target.value, true);
                      setLatitude(formatted);
                      if (formatted && longitude) {
                        setLokasi(createMapsLink(formatted, longitude));
                      }
                    }}
                    placeholder="-6.2088"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Longitude</label>
                  <input
                    className="input-field"
                    value={longitude}
                    onChange={(e) => {
                      const formatted = formatCoordinateInput(e.target.value, false);
                      setLongitude(formatted);
                      if (latitude && formatted) {
                        setLokasi(createMapsLink(latitude, formatted));
                      }
                    }}
                    placeholder="106.8456"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Link Google Maps</label>
                  <input
                    className="input-field"
                    value={lokasi}
                    readOnly
                    placeholder="Latitude dan longitude akan membuat link otomatis"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={handleGetGPS} className="btn-secondary">
                  Dapatkan Lokasi GPS
                </button>
                {latitude && longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                  >
                    Lihat di Google Maps
                  </a>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-3 justify-end">
            <button type="submit" className="btn-primary min-w-[160px]" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </div>
        </form>
      </div>

      {isWaliKelas && (
        <>
          {/* Safe Zone: Backup Database */}
          <div className="card p-6 border-emerald-200 bg-emerald-50/50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-emerald-600" />
                  Safe Zone: Backup Database
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Backup seluruh database sebelum melakukan reset atau perubahan besar. 
                  File backup tersedia dalam dua format untuk keamanan maksimal.
                </p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/60 rounded-lg p-2">
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span><strong>Format XLSX:</strong> Multi-sheet workbook, bisa dibuka di Excel/Google Sheets</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/60 rounded-lg p-2">
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    <span><strong>Format SQL:</strong> Compatible dengan MySQL/MariaDB untuk restore</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportDatabase}
                disabled={exporting}
                className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${
                  exporting 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200 active:scale-95'
                }`}
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Membuat Backup...' : 'Backup Database'}
              </button>
            </div>
          </div>

          {/* Zona Bahaya: Reset Database */}
          <div className="card p-6 border-red-100 bg-red-50/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Zona Bahaya: Reset Database
                </h3>
                <p className="text-sm text-slate-600">
                  Menghapus seluruh data siswa, transaksi, dan laporan. Gunakan hanya saat pergantian tahun ajaran atau ingin memulai dari awal.
                </p>
                <p className="text-xs text-red-500 font-medium italic">
                  * Disarankan melakukan backup terlebih dahulu sebelum reset.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetDatabase}
                disabled={resetting}
                className={`px-6 py-2.5 rounded-xl font-bold transition-all duration-200 ${
                  resetting 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200 active:scale-95'
                }`}
              >
                {resetting ? 'Mereset...' : 'Reset Semua Data'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal Konfirmasi Reset */}
      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Hapus Seluruh Data?</h3>
              <p className="text-slate-500 mb-6 text-sm leading-relaxed">
                Tindakan ini akan menghapus **seluruh data siswa, transaksi, absensi, dan arsip**. Hanya akun Wali Kelas Anda yang akan tersisa. Tindakan ini <span className="text-red-600 font-bold underline">TIDAK DAPAT DIBATALKAN</span>.
              </p>
              
              <div className="mb-8">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ketik "RESET" untuk konfirmasi</label>
                <input 
                  type="text" 
                  className="input-field text-center font-bold tracking-[0.5em] focus:border-red-500 focus:ring-red-500/20"
                  placeholder="RESET"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowResetModal(false)}
                  className="btn-secondary py-3 rounded-2xl"
                >
                  Batal
                </button>
                <button 
                  type="button" 
                  disabled={confirmInput !== 'RESET'}
                  onClick={confirmReset}
                  className={`py-3 rounded-2xl font-bold transition-all shadow-lg ${
                    confirmInput === 'RESET' 
                      ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200 active:scale-95' 
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                  }`}
                >
                  Ya, Reset Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
