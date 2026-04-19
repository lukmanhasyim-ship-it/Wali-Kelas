import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchGAS } from '../utils/gasClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';
import Loading from '../components/Loading';
import PageGuide from '../components/PageGuide';

export default function Presensi() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [siswa, setSiswa] = useState([]);
  const [presensi, setPresensi] = useState([]);
  const [originalPresensi, setOriginalPresensi] = useState([]);
  const [keterangan, setKeterangan] = useState({});
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const role = user?.role || 'Siswa';
  const canEdit = ['Wali Kelas', 'Sekretaris'].includes(role);

  useEffect(() => {
    async function load() {
      try {
        const [s, p] = await Promise.all([
          fetchGAS('GET_ALL', { sheet: 'Master_Siswa' }),
          fetchGAS('GET_ALL', { sheet: 'Presensi' })
        ]);
        const allSiswa = s.data || [];
        setSiswa(allSiswa.filter(st => st.Status_Aktif === 'Aktif'));
        setPresensi(p.data || []);
        setOriginalPresensi(p.data || []);
      } catch (error) {
        console.error('Presensi load error:', error);
        showToast('Gagal memuat data presensi.', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  const getStatusKey = (waktu) => (waktu === 'pagi' ? 'Status_Pagi' : 'Status_Siang');

  const buildPresensiId = (dateValue, nisn) => {
    return `P${dateValue.replace(/-/g, '')}_${nisn}`;
  };

  const isPresensiChanged = (current = {}, original = {}) => {
    return (current.Status_Pagi || '') !== (original.Status_Pagi || '') ||
      (current.Status_Siang || '') !== (original.Status_Siang || '');
  };

  const hasChanges = useMemo(() => {
    return siswa.some(student => {
      const current = presensi.find(p => p.Tanggal === date && p.ID_Siswa === student.ID_Siswa);
      const original = originalPresensi.find(p => p.Tanggal === date && p.ID_Siswa === student.ID_Siswa);
      const currentKeterangan = keterangan[student.ID_Siswa] || '';
      const originalKeterangan = original?.Keterangan || '';

      return isPresensiChanged(current, original) || currentKeterangan !== originalKeterangan;
    });
  }, [date, originalPresensi, presensi, siswa, keterangan]);

  const handleStatusChange = useCallback((idSiswa, waktu, newStatus) => {
    if (!canEdit) {
      alert('Hanya Wali Kelas atau Sekretaris yang dapat mencatat absensi.');
      return;
    }

    const key = getStatusKey(waktu);
    setPresensi(prev => {
      const existing = prev.find(p => p.Tanggal === date && p.ID_Siswa === idSiswa);
      if (existing) {
        const finalStatus = existing[key] === newStatus ? '' : newStatus;
        return prev.map(p =>
          p.Tanggal === date && p.ID_Siswa === idSiswa ? { ...p, [key]: finalStatus } : p
        );
      }

      const newRecord = {
        ID_Presensi: buildPresensiId(date, idSiswa),
        Tanggal: date,
        ID_Siswa: idSiswa,
        Status_Pagi: waktu === 'pagi' ? newStatus : '',
        Status_Siang: waktu === 'siang' ? newStatus : '',
        Keterangan: ''
      };
      return [...prev, newRecord];
    });
  }, [canEdit, date]);

  const handleKeteranganChange = useCallback((nisn, value) => {
    setKeterangan(prev => ({
      ...prev,
      [nisn]: value
    }));
  }, []);

  const handleMarkAllPresent = useCallback(() => {
    if (!canEdit) return;

    setPresensi(prev => {
      const nextPresensi = [...prev];
      siswa.forEach(student => {
        const idx = nextPresensi.findIndex(p => p.Tanggal === date && p.ID_Siswa === student.ID_Siswa);
        if (idx >= 0) {
          nextPresensi[idx] = {
            ...nextPresensi[idx],
            Status_Pagi: 'H',
            Status_Siang: 'H'
          };
        } else {
          nextPresensi.push({
            ID_Presensi: buildPresensiId(date, student.ID_Siswa),
            Tanggal: date,
            ID_Siswa: student.ID_Siswa,
            Status_Pagi: 'H',
            Status_Siang: 'H',
            Keterangan: ''
          });
        }
      });
      return nextPresensi;
    });
    showToast('Seluruh siswa ditandai Hadir.', 'success');
  }, [canEdit, date, siswa, showToast]);

  const handleSave = useCallback(async () => {
    if (!canEdit) return;
    setIsSaving(true);
    setSaveMessage('');

    try {
      const originalMap = new Map(
        originalPresensi
          .filter(p => p.Tanggal === date)
          .map(p => [p.ID_Siswa, p])
      );

      const itemsToSave = presensi
        .filter(p => p.Tanggal === date)
        .map(record => {
          const original = originalMap.get(record.ID_Siswa);
          const currentKeterangan = keterangan[record.ID_Siswa] || record.Keterangan || '';
          const hasStatusChanged = isPresensiChanged(record, original);
          const hasKeteranganChanged = currentKeterangan !== (original?.Keterangan || '');

          // Skip jika tidak ada perubahan status dan keterangan
          if (!hasStatusChanged && !hasKeteranganChanged) return null;

          const data = {
            ID_Presensi: original?.ID_Presensi || buildPresensiId(date, record.ID_Siswa),
            Tanggal: date,
            ID_Siswa: record.ID_Siswa,
            Status_Pagi: record.Status_Pagi || '',
            Status_Siang: record.Status_Siang || '',
            Keterangan: currentKeterangan
          };

          return data;
        })
        .filter(Boolean);

      if (itemsToSave.length === 0) {
        setSaveMessage('Tidak ada perubahan untuk disimpan.');
        showToast('Tidak ada perubahan untuk disimpan.', 'info');
        setIsSaving(false);
        return;
      }

      // Send all changes in one bulk request
      await fetchGAS('BULK_UPDATE_PRESENSI', { data: itemsToSave });

      // Update originalPresensi dengan data terbaru untuk tanggal yang sedang dipilih
      setOriginalPresensi(prev => {
        const otherRecords = prev.filter(p => p.Tanggal !== date);
        const todayRecords = presensi
          .filter(p => p.Tanggal === date)
          .map(p => ({
            ...p,
            Keterangan: keterangan[p.NISN] !== undefined ? keterangan[p.NISN] : p.Keterangan || ''
          }));

        // Pastikan tidak ada duplikasi NISN untuk tanggal yang sama
        const uniqueTodayRecords = todayRecords.reduce((acc, record) => {
          const existingIndex = acc.findIndex(r => r.ID_Siswa === record.ID_Siswa);
          if (existingIndex >= 0) {
            acc[existingIndex] = record; // Replace existing record
          } else {
            acc.push(record); // Add new record
          }
          return acc;
        }, []);

        return [...otherRecords, ...uniqueTodayRecords];
      });
      setKeterangan({}); // Reset keterangan state
      setSaveMessage('Absensi berhasil disimpan.');
      showToast('Absensi berhasil disimpan.', 'success');
    } catch (error) {
      console.error('Simpan absensi gagal:', error);
      setSaveMessage('Gagal menyimpan absensi. Silakan coba lagi.');
      showToast('Gagal menyimpan absensi.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [canEdit, presensi, originalPresensi, date, keterangan, showToast]);

  const hasExistingAttendanceToday = useMemo(
    () => presensi.some(p => p.Tanggal === date),
    [presensi, date]
  );

  if (loading) return <Loading message="Memuat data presensi..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Presensi Harian</h2>
          <p className="text-sm text-slate-500">Catat kehadiran kelas (Pagi & Siang)</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {canEdit && (
            <button
              onClick={handleMarkAllPresent}
              className="px-4 py-2 border border-green-500 text-green-600 rounded-2xl hover:bg-green-50 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Sumua Hadir
            </button>
          )}
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="btn-primary min-w-[150px]"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Absensi'}
            </button>
          )}
        </div>
      </div>

      {canEdit && (
        <p className="text-xs text-slate-500">
          Ubah status kehadiran terlebih dahulu, kemudian tekan tombol Simpan Absensi untuk menyimpan perubahan.
          {hasExistingAttendanceToday ? ' Presensi hari ini sudah tercatat, Anda dapat memperbarui status atau keterangan.' : ' Hanya perlu 1 kali absen per hari.'}
        </p>
      )}
      {saveMessage && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {saveMessage}
        </div>
      )}

      {!canEdit && role === 'Ketua Kelas' && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Ketua Kelas hanya dapat melihat data presensi. Untuk mengubah presensi, silakan masuk sebagai Wali Kelas atau Sekretaris.
        </div>
      )}

      <PageGuide 
        title="Cara Pengisian Presensi:"
        steps={[
          'Pilih <span class="font-black">Tanggal</span> absensi menggunakan pemilih tanggal.',
          'Klik tombol status <span class="text-emerald-600 font-bold">H</span> (Hadir), <span class="text-blue-600 font-bold">S</span> (Sakit), <span class="text-amber-600 font-bold">I</span> (Izin), atau <span class="text-red-600 font-bold">A</span> (Alfa) untuk setiap siswa.',
          'Gunakan tombol <span class="font-black italic">Hadir Semua</span> di pojok kanan atas untuk mempercepat pengisian jika mayoritas hadir.',
          'Klik <span class="font-black">Simpan Presensi</span> untuk mengirim data ke database Google Sheets.'
        ]}
      />

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 border-b">Nama Siswa</th>
              <th className="px-4 py-3 border-b text-center border-l bg-blue-50/50">Pagi</th>
              <th className="px-4 py-3 border-b text-center border-l bg-orange-50/50">Siang</th>
              <th className="px-4 py-3 border-b border-l">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {siswa.map(student => {
              const record = presensi.find(p => p.Tanggal === date && p.ID_Siswa === student.ID_Siswa);
              const statusPagi = record ? (record.Status_Pagi || record.Status || '') : '';
              const statusSiang = record ? (record.Status_Siang || '') : '';
              const currentKeterangan = keterangan[student.ID_Siswa] || record?.Keterangan || '';

              const renderButtons = (waktu, currentStatus) => (
                <div className="flex gap-1 justify-center">
                  {['H', 'S', 'I', 'A', 'B'].map(s => {
                    const colors = {
                      'H': 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200',
                      'S': 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200',
                      'I': 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200',
                      'A': 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200',
                      'B': 'bg-slate-200 text-slate-700 hover:bg-slate-300 border-slate-300'
                    };
                    const activeColor = {
                      'H': 'bg-green-500 text-white border-green-500',
                      'S': 'bg-blue-500 text-white border-blue-500',
                      'I': 'bg-yellow-500 text-white border-yellow-500',
                      'A': 'bg-red-500 text-white border-red-500',
                      'B': 'bg-slate-700 text-white border-slate-700'
                    };
                    const isActive = currentStatus === s;

                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(student.ID_Siswa, waktu, s)}
                        disabled={!canEdit}
                        className={`w-7 h-7 rounded flex items-center justify-center font-bold text-[10px] border transition-colors ${isActive ? activeColor[s] : colors[s]} ${!canEdit ? 'opacity-disabled cursor-not-allowed' : ''}`}
                        title={s === 'B' ? 'Bolos' : s}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              );

              return (
                <tr key={student.ID_Siswa} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{student.Nama_Siswa}</td>
                  <td className="px-2 py-3 border-l bg-blue-50/20">
                    {renderButtons('pagi', statusPagi)}
                  </td>
                  <td className="px-2 py-3 border-l bg-orange-50/20">
                    {renderButtons('siang', statusSiang)}
                  </td>
                  <td className="px-4 py-3 border-l">
                    <input
                      type="text"
                      value={currentKeterangan}
                      onChange={(e) => handleKeteranganChange(student.ID_Siswa, e.target.value)}
                      disabled={!canEdit}
                      placeholder="Sakit, izin, dll..."
                      className="w-full px-2 py-1 text-xs rounded border border-slate-300 focus:outline-none focus:border-brand-500 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

