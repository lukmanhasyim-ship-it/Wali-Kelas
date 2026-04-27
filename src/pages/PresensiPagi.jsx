import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchGAS } from '../utils/gasClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Sun, CheckCircle, Save, Info } from 'lucide-react';
import Loading from '../components/Loading';
import Skeleton, { SkeletonStats, SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { Users } from 'lucide-react';

export default function PresensiPagi() {
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
  const canEdit = ['Wali Kelas', 'Ketua Kelas', 'Wakil Ketua Kelas', 'Sekretaris', 'Wakil Sekretaris'].includes(role);

  const normalizeDateString = (value) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return format(parsed, 'yyyy-MM-dd');
  };

  useEffect(() => {
    async function load() {
      try {
        const [s, p] = await Promise.all([
          fetchGAS('GET_ALL', { sheet: 'Master_Siswa' }),
          fetchGAS('GET_ALL', { sheet: 'Presensi' })
        ]);
        const allSiswa = s.data || [];
        setSiswa(allSiswa.filter(st => st.Status_Aktif === 'Aktif'));
        const presensiData = (p.data || []).map(item => ({
          ...item,
          Tanggal: normalizeDateString(item.Tanggal)
        }));
        setPresensi(presensiData);
        setOriginalPresensi(JSON.parse(JSON.stringify(presensiData)));
      } catch (error) {
        console.error('Presensi Pagi load error:', error);
        showToast('Gagal memuat data presensi pagi.', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast, date]);

  const buildPresensiId = (dateValue, idSiswa) => {
    return `P${dateValue.replace(/-/g, '')}_${idSiswa}`;
  };

  const isPresensiChanged = (current = {}, original = {}) => {
    return (current.Status_Pagi || '') !== (original.Status_Pagi || '');
  };

  const hasChanges = useMemo(() => {
    return siswa.some(student => {
      const current = presensi.find(p => p.Tanggal === date && p.ID_Siswa === student.ID_Siswa);
      const original = originalPresensi.find(p => p.Tanggal === date && p.ID_Siswa === student.ID_Siswa);
      const record = presensi.find(p => p.Tanggal === date && p.ID_Siswa === student.ID_Siswa);
      const currentKeterangan = keterangan[student.ID_Siswa] || record?.Keterangan || '';
      const originalKeterangan = original?.Keterangan || '';

      return isPresensiChanged(current, original) || currentKeterangan !== originalKeterangan;
    });
  }, [date, originalPresensi, presensi, siswa, keterangan]);

  const handleStatusChange = useCallback((idSiswa, newStatus) => {
    if (!canEdit) return;

    setPresensi(prev => {
      const existing = prev.find(p => p.Tanggal === date && p.ID_Siswa === idSiswa);
      if (existing) {
        const finalStatus = existing.Status_Pagi === newStatus ? '' : newStatus;
        return prev.map(p =>
          p.Tanggal === date && p.ID_Siswa === idSiswa ? { ...p, Status_Pagi: finalStatus } : p
        );
      }

      const newRecord = {
        ID_Presensi: buildPresensiId(date, idSiswa),
        Tanggal: date,
        ID_Siswa: idSiswa,
        Status_Pagi: newStatus,
        Status_Siang: '',
        Keterangan: ''
      };
      return [...prev, newRecord];
    });
  }, [canEdit, date]);

  const handleKeteranganChange = useCallback((idSiswa, value) => {
    setKeterangan(prev => ({ ...prev, [idSiswa]: value }));
  }, []);

  const handleMarkAllPresent = useCallback(() => {
    if (!canEdit) return;

    setPresensi(prev => {
      const nextPresensi = [...prev];
      siswa.forEach(student => {
        const idx = nextPresensi.findIndex(p => p.Tanggal === date && p.ID_Siswa === student.ID_Siswa);
        if (idx >= 0) {
          nextPresensi[idx] = { ...nextPresensi[idx], Status_Pagi: 'H' };
        } else {
          nextPresensi.push({
            ID_Presensi: buildPresensiId(date, student.ID_Siswa),
            Tanggal: date,
            ID_Siswa: student.ID_Siswa,
            Status_Pagi: 'H',
            Status_Siang: '',
            Keterangan: ''
          });
        }
      });
      return nextPresensi;
    });
    showToast('Seluruh siswa ditandai Hadir Pagi.', 'success');
  }, [canEdit, date, siswa, showToast]);

  const handleSave = useCallback(async () => {
    if (!canEdit) return;
    setIsSaving(true);
    setSaveMessage('');

    try {
      const originalMap = new Map(
        originalPresensi.filter(p => p.Tanggal === date).map(p => [p.ID_Siswa, p])
      );

      const itemsToSave = presensi
        .filter(p => p.Tanggal === date)
        .map(record => {
          const original = originalMap.get(record.ID_Siswa);
          const currentKeterangan = keterangan[record.ID_Siswa] || record.Keterangan || '';
          const hasStatusChanged = isPresensiChanged(record, original);
          const hasKeteranganChanged = currentKeterangan !== (original?.Keterangan || '');

          if (!hasStatusChanged && !hasKeteranganChanged) return null;

          return {
            ID_Presensi: original?.ID_Presensi || buildPresensiId(date, record.ID_Siswa),
            Tanggal: date,
            ID_Siswa: record.ID_Siswa,
            Status_Pagi: record.Status_Pagi || '',
            Status_Siang: record.Status_Siang || '',
            Keterangan: currentKeterangan
          };
        })
        .filter(Boolean);

      if (itemsToSave.length === 0) {
        showToast('Tidak ada perubahan.', 'info');
        setIsSaving(false);
        return;
      }

      await fetchGAS('BULK_UPDATE_PRESENSI', { data: itemsToSave });

      setOriginalPresensi(prev => {
        const otherRecords = prev.filter(p => p.Tanggal !== date);
        const todayRecords = presensi
          .filter(p => p.Tanggal === date)
          .map(p => ({
            ...p,
            Keterangan: keterangan[p.ID_Siswa] !== undefined ? keterangan[p.ID_Siswa] : p.Keterangan || ''
          }));

        const uniqueTodayRecords = todayRecords.reduce((acc, record) => {
          const existingIndex = acc.findIndex(r => r.ID_Siswa === record.ID_Siswa);
          if (existingIndex >= 0) acc[existingIndex] = record;
          else acc.push(record);
          return acc;
        }, []);

        return [...otherRecords, ...uniqueTodayRecords];
      });
      setKeterangan({});
      setSaveMessage('Absensi pagi berhasil diperbarui.');
      showToast('Berhasil disimpan!', 'success');
    } catch (error) {
      console.error('Simpan absensi pagi gagal:', error);
      showToast('Gagal menyimpan data.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [canEdit, presensi, originalPresensi, date, keterangan, showToast]);

  if (loading) return <Loading message="Membuka buku absen pagi..." />;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">
            <Sun className="w-3 h-3" /> Sesi Pagi
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">
            Presensi Pagi {user?.managedClass && `- Kelas ${user.managedClass}`}
          </h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
            {format(new Date(date), 'EEEE, dd MMMM yyyy', { locale: id })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field max-w-[180px] font-bold text-slate-700"
          />
          {canEdit && (
            <>
              <button
                onClick={handleMarkAllPresent}
                className="btn-secondary flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-xs">Hadir Semua</span>
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="btn-primary flex items-center gap-2"
              >
                <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-[#008647] text-white border-0 shadow-lg shadow-emerald-200/50">
          <p className="text-white text-[10px] font-black uppercase tracking-widest">Total Siswa</p>
          <p className="text-4xl font-black mt-1">{siswa.length}</p>
        </div>
        <div className="card bg-emerald-500 text-white border-0 shadow-lg shadow-emerald-200/50">
          <p className="text-white text-[10px] font-black uppercase tracking-widest">Hadir Pagi</p>
          <p className="text-4xl font-black mt-1">
            {presensi.filter(p => p.Tanggal === date && p.Status_Pagi === 'H').length}
          </p>
        </div>
        <div className="card bg-white border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
            <Info className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Status Terakhir</p>
            <p className="text-slate-700 font-black text-sm">{saveMessage || 'Belum ada perubahan'}</p>
          </div>
        </div>
      </div>

      <div className="table-container shadow-2xl shadow-emerald-100/20">
        <table className="modern-table min-w-[600px] md:min-w-full">
          <thead>
            <tr>
              <th className="w-16 text-center">No</th>
              <th>Nama Lengkap</th>
              <th className="text-center">Status Kehadiran</th>
              <th>Catatan / Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {siswa.length === 0 ? (
              <tr>
                <td colSpan="4">
                  <EmptyState
                    title="Data Siswa Belum Ada"
                    description="Hubungi wali kelas atau admin untuk mengisi master data siswa terlebih dahulu."
                    icon={Users}
                  />
                </td>
              </tr>
            ) : siswa.map((student, idx) => {
              const record = presensi.find(p => p.Tanggal === date && p.ID_Siswa === student.ID_Siswa);
              const statusPagi = record ? (record.Status_Pagi || '') : '';
              const currentKeterangan = keterangan[student.ID_Siswa] || record?.Keterangan || '';

              return (
                <tr key={student.ID_Siswa} className="group transition-colors">
                  <td className="text-center font-bold text-slate-300 group-hover:text-indigo-600 transition-colors">{idx + 1}</td>
                  <td>
                    <p className="font-black text-slate-800 tracking-tight">{student.Nama_Siswa}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{student.ID_Siswa} | {student.NISN || '-'}</p>
                  </td>
                  <td>
                    <div className="flex gap-1 justify-center">
                      {['H', 'S', 'I', 'A', 'B'].map(s => {
                        const colors = {
                          'H': 'hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 text-slate-400 border-slate-100',
                          'S': 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-slate-400 border-slate-100',
                          'I': 'hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 text-slate-400 border-slate-100',
                          'A': 'hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-400 border-slate-100',
                          'B': 'hover:bg-slate-100 hover:text-slate-900 hover:border-slate-200 text-slate-400 border-slate-100'
                        };
                        const activeStyles = {
                          'H': 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100 scale-110 z-10',
                          'S': 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-100 scale-110 z-10',
                          'I': 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-100 scale-110 z-10',
                          'A': 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-100 scale-110 z-10',
                          'B': 'bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-200 scale-110 z-10'
                        };
                        const isActive = statusPagi === s;

                        return (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(student.ID_Siswa, s)}
                            disabled={!canEdit}
                            className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center font-black text-[10px] md:text-xs border transition-all duration-300 ${isActive ? activeStyles[s] : colors[s]} ${!canEdit ? 'opacity-30 cursor-not-allowed' : 'hover:-translate-y-1'}`}
                            title={s === 'B' ? 'Bolos' : s}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={currentKeterangan}
                      onChange={(e) => handleKeteranganChange(student.ID_Siswa, e.target.value)}
                      disabled={!canEdit}
                      placeholder="Tambahkan catatan khusus..."
                      className="w-full px-4 py-2 text-xs font-semibold rounded-xl bg-slate-50 border-transparent border focus:bg-white focus:border-indigo-100 focus:ring-0 outline-none transition-all placeholder:text-slate-300"
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
