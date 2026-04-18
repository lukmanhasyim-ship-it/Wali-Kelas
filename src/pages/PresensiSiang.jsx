import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchGAS } from '../utils/gasClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';
import { Moon, CheckCircle, Save, Info, AlertCircle, Copy } from 'lucide-react';
import Loading from '../components/Loading';
import Skeleton, { SkeletonStats, SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { Users } from 'lucide-react';

export default function PresensiSiang() {
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
        setSiswa(s.data || []);
        const presensiData = (p.data || []).map(item => ({
          ...item,
          Tanggal: normalizeDateString(item.Tanggal)
        }));
        setPresensi(presensiData);
        setOriginalPresensi(JSON.parse(JSON.stringify(presensiData)));
      } catch (error) {
        console.error('Presensi Siang load error:', error);
        showToast('Gagal memuat data presensi siang.', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast, date]);

  const buildPresensiId = (dateValue, nisn) => {
    return `P${dateValue.replace(/-/g, '')}_${nisn}`;
  };

  const isPresensiChanged = (current = {}, original = {}) => {
    return (current.Status_Siang || '') !== (original.Status_Siang || '');
  };

  const hasChanges = useMemo(() => {
    return siswa.some(student => {
      const current = presensi.find(p => p.Tanggal === date && p.NISN === student.NISN);
      const original = originalPresensi.find(p => p.Tanggal === date && p.NISN === student.NISN);
      const record = presensi.find(p => p.Tanggal === date && p.NISN === student.NISN);
      const currentKeterangan = keterangan[student.NISN] || record?.Keterangan || '';
      const originalKeterangan = original?.Keterangan || '';

      return isPresensiChanged(current, original) || currentKeterangan !== originalKeterangan;
    });
  }, [date, originalPresensi, presensi, siswa, keterangan]);

  const handleStatusChange = useCallback((nisn, newStatus) => {
    if (!canEdit) return;

    setPresensi(prev => {
      const existing = prev.find(p => p.Tanggal === date && p.NISN === nisn);
      if (existing) {
        const finalStatus = existing.Status_Siang === newStatus ? '' : newStatus;
        return prev.map(p =>
          p.Tanggal === date && p.NISN === nisn ? { ...p, Status_Siang: finalStatus } : p
        );
      }

      const newRecord = {
        ID_Presensi: buildPresensiId(date, nisn),
        Tanggal: date,
        NISN: nisn,
        Status_Pagi: '',
        Status_Siang: newStatus,
        Keterangan: ''
      };
      return [...prev, newRecord];
    });
  }, [canEdit, date]);

  const handleKeteranganChange = useCallback((nisn, value) => {
    setKeterangan(prev => ({ ...prev, [nisn]: value }));
  }, []);

  const handleCopyMorningAttendance = useCallback(() => {
    if (!canEdit) return;

    setPresensi(prev => {
      const nextPresensi = [...prev];
      siswa.forEach(student => {
        const idx = nextPresensi.findIndex(p => p.Tanggal === date && p.NISN === student.NISN);
        if (idx >= 0) {
          // Salin status pagi ke siang, jika kosong default ke 'H'
          nextPresensi[idx] = {
            ...nextPresensi[idx],
            Status_Siang: nextPresensi[idx].Status_Pagi || 'H'
          };
        } else {
          nextPresensi.push({
            ID_Presensi: buildPresensiId(date, student.NISN),
            Tanggal: date,
            NISN: student.NISN,
            Status_Pagi: '',
            Status_Siang: 'H',
            Keterangan: ''
          });
        }
      });
      return nextPresensi;
    });
    showToast('Berhasil menyalin absensi pagi ke siang.', 'success');
  }, [canEdit, date, siswa, showToast]);

  const handleSave = useCallback(async () => {
    if (!canEdit) return;
    setIsSaving(true);
    setSaveMessage('');

    try {
      const originalMap = new Map(
        originalPresensi.filter(p => p.Tanggal === date).map(p => [p.NISN, p])
      );

      const itemsToSave = presensi
        .filter(p => p.Tanggal === date)
        .map(record => {
          const original = originalMap.get(record.NISN);
          const currentKeterangan = keterangan[record.NISN] || record.Keterangan || '';
          const hasStatusChanged = isPresensiChanged(record, original);
          const hasKeteranganChanged = currentKeterangan !== (original?.Keterangan || '');

          if (!hasStatusChanged && !hasKeteranganChanged) return null;

          return {
            ID_Presensi: original?.ID_Presensi || buildPresensiId(date, record.NISN),
            Tanggal: date,
            NISN: record.NISN,
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
            Keterangan: keterangan[p.NISN] !== undefined ? keterangan[p.NISN] : p.Keterangan || ''
          }));

        const uniqueTodayRecords = todayRecords.reduce((acc, record) => {
          const existingIndex = acc.findIndex(r => r.NISN === record.NISN);
          if (existingIndex >= 0) acc[existingIndex] = record;
          else acc.push(record);
          return acc;
        }, []);

        return [...otherRecords, ...uniqueTodayRecords];
      });
      setKeterangan({});
      setSaveMessage('Absensi siang berhasil diperbarui.');
      showToast('Berhasil disimpan!', 'success');
    } catch (error) {
      console.error('Simpan absensi siang gagal:', error);
      showToast('Gagal menyimpan data.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [canEdit, presensi, originalPresensi, date, keterangan, showToast]);

  const getStatusColor = (s) => {
    const colors = {
      'H': 'bg-emerald-100 text-emerald-700',
      'S': 'bg-blue-100 text-blue-700',
      'I': 'bg-amber-100 text-amber-700',
      'A': 'bg-rose-100 text-rose-700',
      'B': 'bg-slate-200 text-slate-700'
    };
    return colors[s] || 'bg-slate-50 text-slate-400';
  };

  if (loading) return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-12 w-40 rounded-2xl" />
          <Skeleton className="h-12 w-32 rounded-2xl" />
          <Skeleton className="h-12 w-40 rounded-2xl" />
        </div>
      </div>
      <SkeletonStats />
      <SkeletonTable rows={10} />
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-[#008647] rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
            <Moon className="w-3 h-3" /> Sesi Siang
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">
            Presensi Siang {user?.managedClass && `- Kelas ${user.managedClass}`}
          </h2>
          <p className="text-slate-500 font-medium">Pastikan semua siswa tetap semangat hingga akhir pelajaran.</p>
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
              <button onClick={handleCopyMorningAttendance} className="btn-secondary flex items-center gap-2">
                <Copy className="w-4 h-4 text-[#008647]" />
                <span className="text-xs">Salin Absen Pagi</span>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-[#008647] text-white border-0">
          <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest opacity-80">Total Siswa</p>
          <p className="text-4xl font-black mt-1">{siswa.length}</p>
        </div>
        <div className="card bg-white border border-slate-100">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Hadir</p>
          <p className="text-4xl font-black mt-1 text-slate-900 tracking-tight">
            {presensi.filter(p => p.Tanggal === date && p.Status_Siang === 'H').length}
          </p>
        </div>
        <div className="card bg-white border border-slate-100">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest text-rose-500">Ketidakhadiran</p>
          <p className="text-4xl font-black mt-1 text-rose-500 tracking-tight">
            {presensi.filter(p => p.Tanggal === date && ['S', 'I', 'A', 'B'].includes(p.Status_Siang)).length}
          </p>
        </div>
        <div className="card bg-slate-900 text-white border-0 flex items-center gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <Info className="w-5 h-5 text-emerald-300" />
          </div>
          <p className="text-xs font-bold leading-tight opacity-80 truncate">{saveMessage || 'Silakan update presensi siang'}</p>
        </div>
      </div>

      <div className="table-container shadow-2xl shadow-emerald-100/20">
        <table className="modern-table min-w-[700px] md:min-w-full">
          <thead>
            <tr>
              <th className="w-16 text-center">No</th>
              <th>Informasi Siswa</th>
              <th className="text-center w-32">Status Pagi</th>
              <th className="text-center">Input Siang</th>
              <th className="hidden md:table-cell">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {siswa.length === 0 ? (
              <tr>
                <td colSpan="5">
                  <EmptyState
                    title="Data Siswa Belum Ada"
                    description="Hubungi wali kelas atau admin untuk mengisi master data siswa terlebih dahulu."
                    icon={Users}
                  />
                </td>
              </tr>
            ) : siswa.map((student, idx) => {
              const record = presensi.find(p => p.Tanggal === date && p.NISN === student.NISN);
              const statusPagi = record ? (record.Status_Pagi || '') : '';
              const statusSiang = record ? (record.Status_Siang || '') : '';
              const currentKeterangan = keterangan[student.NISN] || record?.Keterangan || '';

              return (
                <tr key={student.NISN} className="group hover:bg-slate-50/50 transition-all">
                  <td className="text-center font-bold text-slate-300 group-hover:text-indigo-600">{idx + 1}</td>
                  <td>
                    <p className="font-black text-slate-800 tracking-tight">{student.Nama_Siswa}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{student.NISN}</p>
                  </td>
                  <td className="text-center">
                    <span className={`inline-flex w-7 h-7 items-center justify-center rounded-lg text-[10px] font-black border ${getStatusColor(statusPagi)}`}>
                      {statusPagi || '-'}
                    </span>
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
                          'H': 'bg-[#008647] text-white border-[#008647] shadow-lg shadow-emerald-100 scale-110 z-10',
                          'S': 'bg-[#008647] text-white border-[#008647] shadow-lg shadow-emerald-100 scale-110 z-10',
                          'I': 'bg-[#008647] text-white border-[#008647] shadow-lg shadow-emerald-100 scale-110 z-10',
                          'A': 'bg-[#008647] text-white border-[#008647] shadow-lg shadow-emerald-100 scale-110 z-10',
                          'B': 'bg-[#008647] text-white border-[#008647] shadow-lg shadow-emerald-100 scale-110 z-10'
                        };
                        const isActive = statusSiang === s;

                        return (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(student.NISN, s)}
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
                  <td className="hidden md:table-cell">
                    <input
                      type="text"
                      value={currentKeterangan}
                      onChange={(e) => handleKeteranganChange(student.NISN, e.target.value)}
                      disabled={!canEdit}
                      placeholder="Catatan..."
                      className="w-full px-4 py-2 text-xs font-semibold rounded-xl bg-slate-50 border-transparent border focus:bg-white focus:border-indigo-100 focus:ring-0 outline-none transition-all"
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