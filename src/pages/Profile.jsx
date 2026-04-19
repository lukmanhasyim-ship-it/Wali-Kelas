import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchGAS } from '../utils/gasClient';
import Loading from '../components/Loading';
import Skeleton from '../components/Skeleton';
import PageGuide from '../components/PageGuide';

export default function Profile() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [gayaAjar, setGayaAjar] = useState('');
  const [kontak, setKontak] = useState('');
  const [alamat, setAlamat] = useState('');
  const [namaWali, setNamaWali] = useState('');
  const [noWaWali, setNoWaWali] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [nominalIuran, setNominalIuran] = useState('');
  const [kelas, setKelas] = useState('');

  const role = user?.role || 'Siswa';
  const isWaliKelas = role === 'Wali Kelas';
  const isSiswaRole = ['Siswa', 'Ketua Kelas', 'Sekretaris', 'Bendahara'].includes(role);
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
        No_WA_Wali: noWaWali,
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
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
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
    </div>
  );
}
