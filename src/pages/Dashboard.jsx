import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { fetchGAS } from '../utils/gasClient';
import { calculateDisciplineStatus, formatIDR } from '../utils/logic';
import StudentCard from '../components/StudentCard';
import { Users, Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Loading from '../components/Loading';
import Skeleton, { SkeletonStats } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({
    siswa: [],
    presensi: [],
    keuangan: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Fetch all data in parallel using Promise.all
        const [s, p, k] = await Promise.all([
          fetchGAS('GET_ALL', { sheet: 'Master_Siswa' }),
          fetchGAS('GET_ALL', { sheet: 'Presensi' }),
          fetchGAS('GET_ALL', { sheet: 'Keuangan' })
        ]);

        setData({ siswa: s.data || [], presensi: p.data || [], keuangan: k.data || [] });
      } catch (error) {
        console.error('Dashboard load error:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getEffectiveStatus = useCallback((p) => {
    if (p.Status_Siang && p.Status_Siang !== '') return p.Status_Siang;
    return p.Status_Pagi || p.Status || '';
  }, []);

  // Stats Calculations - memoized
  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayPresensi = data.presensi.filter(p => p.Tanggal === today);
    const totalSiswa = data.siswa.length;

    const hadirHariIni = todayPresensi.filter(p => getEffectiveStatus(p) === 'H').length;
    const percentageHadir = totalSiswa ? Math.round((hadirHariIni / totalSiswa) * 100) : 0;

    const totalKas = data.keuangan.reduce((acc, curr) => {
      return curr.Tipe === 'Masuk' ? acc + Number(curr.Jumlah) : acc - Number(curr.Jumlah);
    }, 0);

    return { hadirHariIni, totalSiswa, percentageHadir, totalKas };
  }, [data, getEffectiveStatus]);

  // Alerts - memoized
  const alerts = useMemo(() => {
    const result = [];
    data.siswa.forEach(student => {
      const studentRecords = data.presensi
        .filter(p => p.NISN === student.NISN)
        .sort((a, b) => new Date(a.Tanggal) - new Date(b.Tanggal));

      const statusArray = studentRecords.map(r => getEffectiveStatus(r));
      const bolosCount = statusArray.filter(s => s === 'B').length;

      const discipline = calculateDisciplineStatus(statusArray, bolosCount);

      if (discipline) {
        result.push({ student, discipline });
      }
    });
    return result;
  }, [data.siswa, data.presensi, getEffectiveStatus]);

  const handleWA = useCallback((student, discipline) => {
    const message = encodeURIComponent(`Halo Bapak/Ibu ${student.Nama_Wali}, saya wali kelas dari ${student.Nama_Siswa}. Ingin menginfokan bahwa putra/putri Bapak/Ibu telah mencapai batas ketidakhadiran (${discipline}). Kami mengundang Bapak/Ibu ke sekolah untuk mendiskusikan hal ini.`);
    const url = `https://wa.me/${student.No_WA_Wali}?text=${message}`;
    window.open(url, '_blank');
  }, []);

  if (loading) return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-32 rounded-[2rem]" />
        <Skeleton className="h-32 rounded-[2rem]" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 rounded-[2rem] w-full" />
        <Skeleton className="h-24 rounded-[2rem] w-full" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard {user?.managedClass && `- Kelas ${user.managedClass}`}</h2>
        <p className="text-sm text-slate-500">Ringkasan kelas {user?.managedClass || 'Anda'} hari ini</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Kehadiran */}
        <div className="card bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-none">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Kehadiran Hari Ini</p>
              <h3 className="text-4xl font-bold mt-2">{stats.percentageHadir}%</h3>
              <p className="text-sm text-emerald-100 mt-1">{stats.hadirHariIni} dari {stats.totalSiswa} Siswa</p>
            </div>
            <div className="bg-white/20 p-3 rounded-full">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Card Keuangan */}
        <div className="card bg-gradient-to-br from-emerald-700 to-emerald-900 text-white border-none">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Saldo Kas Kelas</p>
              <h3 className="text-3xl font-bold mt-2">{formatIDR(stats.totalKas)}</h3>
              <p className="text-sm text-emerald-100 mt-1">Sisa saldo saat ini</p>
            </div>
            <div className="bg-white/10 p-3 rounded-full">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Alert Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-bold text-slate-800">Alert Kedisiplinan {user?.managedClass && `- Kelas ${user.managedClass}`}</h3>
        </div>
        {alerts.length === 0 ? (
          <EmptyState
            title="Semua Aman!"
            description="Tidak ada siswa yang berada dalam zona merah kedisiplinan hari ini."
            icon={CheckCircle2}
          />
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <StudentCard
                key={idx}
                student={alert.student}
                disciplineStatus={alert.discipline}
                onWaClick={(stu) => handleWA(stu, alert.discipline)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
