import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { fetchGAS } from '../utils/gasClient';
import { calculateDisciplineStatus, formatIDR } from '../utils/logic';
import StudentCard from '../components/StudentCard';
import { Users, Wallet, AlertTriangle, CheckCircle2, Bell, ChevronRight } from 'lucide-react';
import Loading from '../components/Loading';
import Skeleton, { SkeletonStats } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({
    siswa: [],
    presensi: [],
    keuangan: [],
    archiveKeuangan: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Fetch all data in parallel using Promise.all
        const [s, p, k, rk, ar, ad, pg] = await Promise.all([
          fetchGAS('GET_ALL', { sheet: 'Master_Siswa' }),
          fetchGAS('GET_ALL', { sheet: 'Presensi' }),
          fetchGAS('GET_ALL', { sheet: 'Keuangan' }),
          fetchGAS('GET_ALL', { sheet: 'Archive_Rekap_Keuangan' }),
          fetchGAS('GET_ALL', { sheet: 'Archive_Rekap_Absensi' }),
          fetchGAS('GET_ALL', { sheet: 'Archive_Detail_Absensi' }),
          fetchGAS('GET_ALL', { sheet: 'Log_Panggilan' })
        ]);
  
        setData({
          siswa: (s.data || []).filter(st => st.Status_Aktif === 'Aktif'),
          presensi: p.data || [],
          keuangan: k.data || [],
          archiveKeuangan: rk.data || [],
          archiveAbsensi: ar.data || [],
          archiveDetail: ad.data || [],
          panggilan: pg.data || []
        });
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

    const activeKas = data.keuangan.reduce((acc, curr) => {
      return curr.Tipe === 'Masuk' ? acc + Number(curr.Jumlah) : acc - Number(curr.Jumlah);
    }, 0);

    let archivedBalance = 0;
    if (data.archiveKeuangan.length > 0) {
      archivedBalance = Number(data.archiveKeuangan[data.archiveKeuangan.length - 1].Saldo_Akhir) || 0;
    }

    // Saldo kas minggu ini (net transaksi minggu ini dari sheet Keuangan)
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    let kasWeekMasuk = 0;
    let kasWeekKeluar = 0;
    data.keuangan.forEach(k => {
      try {
        const d = parseISO(k.Tanggal);
        if (d >= weekStart && d <= weekEnd) {
          const val = Number(k.Jumlah) || 0;
          if (k.Tipe === 'Masuk') kasWeekMasuk += val;
          else if (k.Tipe === 'Keluar') kasWeekKeluar += val;
        }
      } catch { }
    });
    const kasWeekNet = kasWeekMasuk - kasWeekKeluar;

    return { hadirHariIni, totalSiswa, percentageHadir, totalKas: archivedBalance + activeKas, saldoMingguIni: kasWeekNet, kasWeekMasuk, kasWeekKeluar };
  }, [data, getEffectiveStatus]);

  // Alerts - memoized
  const alerts = useMemo(() => {
    const result = [];
    data.siswa.forEach(student => {
      // 1. Cari riwayat panggilan terbaru
      const studentPanggilan = (data.panggilan || [])
        .filter(pg => String(pg.NISN) === String(student.NISN) || String(pg.NISN) === String(student.ID_Siswa))
        .sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));
      
      const latestPg = studentPanggilan[0];
      const cutOffDate = (latestPg && latestPg.Status_Selesai === 'Selesai') ? new Date(latestPg.Tanggal) : null;

      // 2. Kumpulkan record presensi (hanya yang setelah cutOffDate)
      const allHistory = [...data.presensi, ...(data.archiveDetail || [])]
        .filter(p => p.ID_Siswa === student.ID_Siswa)
        .filter(p => {
          if (!cutOffDate) return true;
          return new Date(p.Tanggal) > cutOffDate;
        });

      const statuses = allHistory.map(r => getEffectiveStatus(r));
      const totalAlfas = statuses.filter(s => s === 'A').length;
      const totalBolos = statuses.filter(s => s === 'B').length;

      const disciplineStatus = calculateDisciplineStatus(statuses, totalBolos);

      if (disciplineStatus) {
        let reason = "Masalah Kedisiplinan";
        if (totalBolos >= 6) {
          reason = `Ketidakdisiplinan (Bolos) telah mencapai batas maksimal ${totalBolos} kali.`;
        } else if (totalAlfas >= 5) {
          reason = `Akumulasi ketidakhadiran tanpa keterangan (Alfa) mencapai ${totalAlfas} kali.`;
        } else if (totalAlfas >= 3) {
          reason = `Terdapat ${totalAlfas} kali ketidakhadiran tanpa keterangan (Alfa).`;
        }

        // Tentukan label proses (jika ada panggilan pending)
        const isProcessed = latestPg && latestPg.Status_Selesai !== 'Selesai';

        // Filter personal: Jika role bukan Wali Kelas, hanya tampilkan alert MILIK SENDIRI
        const isSelf = String(student.Email).toLowerCase() === String(user.email).toLowerCase();
        
        if (user.role === 'Wali Kelas' || isSelf) {
          result.push({ 
            student, 
            discipline: isProcessed ? 'Sudah Dipanggil' : disciplineStatus, 
            detailReason: reason,
            isProcessed
          });
        }
      }
    });
    return result;
  }, [data.siswa, data.presensi, data.archiveDetail, data.panggilan, getEffectiveStatus, user.email, user.role]);

  const handleDirectCall = useCallback((student, discipline, detailReason) => {
    navigate('/panggilan', { 
      state: { 
        nisn: student.NISN || student.ID_Siswa,
        alasan: detailReason
      } 
    });
  }, [navigate]);

  const handleWA = useCallback((student, discipline) => {
    const message = encodeURIComponent(`Halo Bapak/Ibu ${student.Nama_Wali}, saya wali kelas dari ${student.Nama_Siswa}. Ingin menginfokan bahwa putra/putri Bapak/Ibu telah mencapai batas ketidakhadiran (${discipline}). Kami mengundang Bapak/Ibu ke sekolah untuk mendiskusikan hal ini.`);
    const url = `https://wa.me/${student.No_WA_Wali}?text=${message}`;
    window.open(url, '_blank');
  }, []);

  const handleWaStudent = useCallback((student, detailReason) => {
    const message = encodeURIComponent(`Halo ${student.Nama_Siswa}, ini Wali Kelas. Yuk, lebih semangat lagi sekolahnya! Ada catatan kecil terkait ${detailReason}. Mari kita ngobrol santai besok di sekolah ya, Bapak/Ibu guru peduli dengan masa depanmu!`);
    const whatsappNumber = student.No_WA_Siswa || student.No_WA_Wali; // Fallback ke wali jika no siswa kosong
    const url = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(url, '_blank');
  }, []);

  if (loading) return <Loading message="Menyiapkan ringkasan dashboard..." />;

  const firstName = user?.name ? user.name.split(' ')[0] : 'User';
  const isTeacher = user.role === 'Wali Kelas';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Halo, {firstName}! 👋</h2>
          <p className="text-sm text-slate-500 font-medium">
            {isTeacher 
              ? `Berikut ringkasan perkembangan Kelas ${user.managedClass} hari ini.` 
              : `Tetap semangat belajar dan jaga kesehatan ya! Berikut statusmu hari ini.`
            }
          </p>
        </div>
        {user.role === 'Wali Kelas' && (
           <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-black uppercase tracking-widest border border-emerald-100">
             Wali Kelas {user.managedClass}
           </div>
        )}
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

        {/* Card Saldo Minggu Ini */}
        <div className="card bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-none">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Saldo Kas</p>
              <h3 className="text-3xl font-bold mt-2">{formatIDR(stats.saldoMingguIni)}</h3>
              <p className="text-sm text-indigo-100 mt-1">
                +{formatIDR(stats.kasWeekMasuk)} / -{formatIDR(stats.kasWeekKeluar)}
              </p>
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
          <div className="p-2 bg-red-100 text-red-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              {isTeacher ? 'Alert Kedisiplinan Siswa' : 'Status Kedisiplinanmu'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">{isTeacher ? 'Pantau siswa yang membutuhkan perhatian khusus' : 'Pastikan kehadiranmu tetap terjaga dengan baik'}</p>
          </div>
        </div>
        {alerts.length === 0 ? (
          <EmptyState
            title="Semua Aman!"
            description="Tidak ada siswa yang berada dalam zona merah kedisiplinan hari ini."
            icon={CheckCircle2}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {alerts.map((alert, idx) => (
              <StudentCard
                key={idx}
                student={alert.student}
                disciplineStatus={alert.discipline}
                onContactClick={user.role === 'Wali Kelas' ? (stu) => handleDirectCall(stu, alert.discipline, alert.detailReason) : undefined}
                onWaStudentClick={user.role === 'Wali Kelas' ? (stu) => handleWaStudent(stu, alert.detailReason) : undefined}
                onWaClick={user.role === 'Wali Kelas' ? (stu) => handleWA(stu, alert.discipline) : undefined}
                canSeeLocation={user.role === 'Wali Kelas'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
