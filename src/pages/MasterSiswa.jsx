import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchGAS } from '../utils/gasClient';
import StudentCard from '../components/StudentCard';

import Loading from '../components/Loading';
import Skeleton, { SkeletonStats, SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { UserPlus } from 'lucide-react';

export default function MasterSiswa() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const role = user?.role || 'Siswa';
  const canAddStudent = role === 'Wali Kelas';
  const canChangeLocation = role !== 'Wali Kelas';

  const [siswa, setSiswa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [nisn, setNisn] = useState('');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [wali, setWali] = useState('');
  const [wa, setWa] = useState('');
  const [alamat, setAlamat] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [jk, setJk] = useState('L');
  const [jabatan, setJabatan] = useState('Siswa');
  const [statusAktif, setStatusAktif] = useState('Aktif');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const s = await fetchGAS('GET_ALL', { sheet: 'Master_Siswa' });
        setSiswa(s.data || []);
      } catch (error) {
        console.error('MasterSiswa load error:', error);
        showToast('Gagal memuat data siswa.', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  const clearForm = () => {
    setEditingStudent(null);
    setIsFormOpen(false);
    setNisn('');
    setNama('');
    setEmail('');
    setWali('');
    setWa('');
    setAlamat('');
    setLatitude('');
    setLongitude('');
    setLokasi('');
    setJk('L');
    setJabatan('Siswa');
    setStatusAktif('Aktif');
    setError('');
  };

  const handleCreateOrUpdateStudent = useCallback(async (e) => {
    e.preventDefault();
    if (!nisn || !nama) {
      setError('NISN dan Nama Siswa harus diisi.');
      return;
    }

    const studentData = {
      NISN: nisn,
      Nama_Siswa: nama,
      'L/P': jk,
      Email: email,
      Jabatan: jabatan,
      No_WA_Siswa: '',
      Nama_Wali: wali,
      No_WA_Wali: wa,
      Alamat: alamat,
      Latitude: latitude,
      Longitude: longitude,
      Lokasi: latitude && longitude ? createMapsLink(latitude, longitude) : lokasi,
      Status_Aktif: statusAktif
    };

    try {
      if (editingStudent) {
        setSiswa(prev => prev.map(item => item.NISN === nisn ? { ...item, ...studentData } : item));
        await fetchGAS('UPDATE', { sheet: 'Master_Siswa', id: nisn, data: studentData });
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
  }, [nisn, nama, email, wali, wa, alamat, latitude, longitude, lokasi, jk, statusAktif, editingStudent, showToast]);

  const handleEditStudent = useCallback((student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
    setNisn(student.NISN || '');
    setNama(student.Nama_Siswa || '');
    setJk(student['L/P'] || 'L');
    setEmail(student.Email || '');
    setWali(student.Nama_Wali || '');
    setWa(student.No_WA_Wali || '');
    setAlamat(student.Alamat || '');
    setLatitude(formatCoordinateInput(student.Latitude || '', true));
    setLongitude(formatCoordinateInput(student.Longitude || '', false));
    setLokasi(student.Lokasi || '');
    setJabatan(student.Jabatan || 'Siswa');
    setStatusAktif(student.Status_Aktif || 'Aktif');
    setError('');
  }, []);

  const handleWA = useCallback((student) => {
    const message = encodeURIComponent(`Halo Bapak/Ibu ${student.Nama_Wali}, saya wali kelas dari ${student.Nama_Siswa}.`);
    const url = `https://wa.me/${student.No_WA_Wali}?text=${message}`;
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
      setError('Role Wali Kelas tidak dapat mengubah lokasi.');
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

  if (loading) return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-[2rem]" />
        ))}
      </div>
    </div>
  );


  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Master Siswa</h2>
          <p className="text-sm text-slate-500">Daftar seluruh siswa di spreadsheet ini.</p>
        </div>
        {canAddStudent && (
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="btn-primary"
          >
            {isFormOpen ? 'Tutup Formulir' : 'Tambah Siswa'}
          </button>
        )}
      </div>

      {canAddStudent && isFormOpen && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            {editingStudent ? 'Edit Data Siswa' : 'Form Tambah Siswa Baru'}
          </h3>
          {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
          <form onSubmit={handleCreateOrUpdateStudent} className="space-y-6">
            <div className="grid gap-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Data Siswa</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">NISN</label>
                    <input
                      className="input-field"
                      value={nisn}
                      onChange={(e) => setNisn(e.target.value)}
                      required
                      disabled={Boolean(editingStudent)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nama Siswa</label>
                    <input
                      className="input-field"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Informasi Akademik</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Kelamin</label>
                    <select className="input-field" value={jk} onChange={(e) => setJk(e.target.value)}>
                      <option value="L">L</option>
                      <option value="P">P</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Jabatan</label>
                    <select className="input-field" value={jabatan} onChange={(e) => setJabatan(e.target.value)}>
                      <option value="Siswa">Siswa</option>
                      <option value="Ketua Kelas">Ketua Kelas</option>
                      <option value="Sekretaris">Sekretaris</option>
                      <option value="Bendahara">Bendahara</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Status Aktif</label>
                    <select className="input-field" value={statusAktif} onChange={(e) => setStatusAktif(e.target.value)}>
                      <option value="Aktif">Aktif</option>
                      <option value="Tidak Aktif">Tidak Aktif</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Kontak & Wali</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="input-field"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nama Wali</label>
                    <input
                      className="input-field"
                      value={wali}
                      onChange={(e) => setWali(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">No WA Wali</label>
                    <input
                      className="input-field"
                      value={wa}
                      onChange={(e) => setWa(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Alamat</label>
                    <input
                      className="input-field"
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Lokasi GPS</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Latitude</label>
                    <input
                      className="input-field"
                      value={latitude}
                      onChange={(e) => {
                        if (!canChangeLocation) return;
                        const formatted = formatCoordinateInput(e.target.value, true);
                        setLatitude(formatted);
                        if (formatted && longitude) {
                          setLokasi(createMapsLink(formatted, longitude));
                        }
                      }}
                      placeholder="-6.2088"
                      disabled={!canChangeLocation}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Longitude</label>
                    <input
                      className="input-field"
                      value={longitude}
                      onChange={(e) => {
                        if (!canChangeLocation) return;
                        const formatted = formatCoordinateInput(e.target.value, false);
                        setLongitude(formatted);
                        if (latitude && formatted) {
                          setLokasi(createMapsLink(latitude, formatted));
                        }
                      }}
                      placeholder="106.8456"
                      disabled={!canChangeLocation}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Link Google Maps</label>
                    <input
                      className="input-field"
                      value={lokasi}
                      readOnly
                      placeholder="Masukan latitude dan longitude untuk membuat link"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={handleGetGPS} className="btn-secondary" disabled={!canChangeLocation}>
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
                {!canChangeLocation && (
                  <p className="text-xs text-slate-500 mt-2">Role Wali Kelas tidak dapat mengubah lokasi.</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-end">
              <button type="submit" className="btn-primary min-w-[160px]">
                {editingStudent ? 'Simpan Perubahan' : 'Simpan Siswa'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              onWaClick={handleWA}
              onEdit={canAddStudent ? handleEditStudent : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
