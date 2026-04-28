import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { fetchGAS } from '../utils/gasClient';
import { calculateDisciplineStatus, formatIDR, formatDateIndo } from '../utils/logic';
import StudentCard from '../components/StudentCard';
import { Users, Wallet, AlertTriangle, CheckCircle2, Bell, ChevronRight, Calendar, Info } from 'lucide-react';
import Loading from '../components/Loading';
import Skeleton, { SkeletonStats, SkeletonDashboard } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { id } from 'date-fns/locale';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({
    siswa: [],
    presensi: [],
    keuangan: [],
    archiveKeuangan: [],
    piket: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Fetch all data in parallel using Promise.all
        const [s, p, k, rk, ar, ad, pg, pk] = await Promise.all([
          fetchGAS('GET_ALL', { sheet: 'Master_Siswa' }),
          fetchGAS('GET_ALL', { sheet: 'Presensi' }),
          fetchGAS('GET_ALL', { sheet: 'Keuangan' }),
          fetchGAS('GET_ALL', { sheet: 'Archive_Rekap_Keuangan' }),
          fetchGAS('GET_ALL', { sheet: 'Archive_Rekap_Absensi' }),
          fetchGAS('GET_ALL', { sheet: 'Archive_Detail_Absensi' }),
          fetchGAS('GET_ALL', { sheet: 'Log_Panggilan' }),
          fetchGAS('GET_ALL', { sheet: 'Piket' })
        ]);

        // Trigger daily piket notifications once per day
        const today = format(new Date(), 'yyyy-MM-dd');
        const lastNotif = localStorage.getItem('last_piket_notif');
        if (lastNotif !== today) {
          fetchGAS('SEND_PIKET_NOTIFICATIONS');
          localStorage.setItem('last_piket_notif', today);
        }

        setData({
          siswa: (s.data || []).filter(st => st.Status_Aktif === 'Aktif'),
          presensi: p.data || [],
          keuangan: k.data || [],
          archiveKeuangan: rk.data || [],
          archiveAbsensi: ar.data || [],
          archiveDetail: ad.data || [],
          panggilan: pg.data || [],
          piket: (typeof pk !== 'undefined' ? pk.data : []) || []
        });
      } catch (error) {
        console.error('Dashboard load error:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Update Last_Active ketika siswa membuka dashboard
  useEffect(() => {
    if (user?.role === 'Siswa' && user?.idSiswa) {
      const updateLastActive = async () => {
        try {
          await fetchGAS('UPDATE', {
            sheet: 'Master_Siswa',
            id: user.idSiswa,
            data: {
              Last_Active: new Date().toISOString()
            }
          });
        } catch (err) {
          console.error('Failed to update Last_Active:', err);
        }
      };

      // Update saat component mount dengan debounce
      const timer = setTimeout(updateLastActive, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

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

    // Count students monitored today (Last_Active is today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const terpantauHariIni = data.siswa.filter(s => {
      if (!s.Last_Active) return false;
      try {
        const lastActive = new Date(s.Last_Active);
        return lastActive >= todayStart;
      } catch {
        return false;
      }
    }).length;

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

    // Data for Attendance Pie Chart
    const statusCounts = todayPresensi.reduce((acc, curr) => {
      const status = getEffectiveStatus(curr);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const pieData = [
      { name: 'Hadir', value: statusCounts['H'] || 0, color: '#10b981' },
      { name: 'Ijin', value: statusCounts['I'] || 0, color: '#f59e0b' },
      { name: 'Sakit', value: statusCounts['S'] || 0, color: '#3b82f6' },
      { name: 'Alfa', value: statusCounts['A'] || 0, color: '#ef4444' },
      { name: 'Bolos', value: statusCounts['B'] || 0, color: '#000000' },
    ].filter(d => d.value > 0);

    // If no presence today, show "No Data" or empty
    if (pieData.length === 0 && totalSiswa > 0) {
      pieData.push({ name: 'Belum Absen', value: totalSiswa, color: '#e2e8f0' });
    }

    // Data for Financial Trend (Last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return format(d, 'yyyy-MM-dd');
    });

    const financialTrendData = last7Days.map(date => {
      const dayData = data.keuangan.filter(k => k.Tanggal === date);
      const masuk = dayData.filter(k => k.Tipe === 'Masuk').reduce((sum, k) => sum + Number(k.Jumlah), 0);
      const keluar = dayData.filter(k => k.Tipe === 'Keluar').reduce((sum, k) => sum + Number(k.Jumlah), 0);
      return {
        date: format(parseISO(date), 'dd MMM', { locale: id }),
        Masuk: masuk,
        Keluar: keluar
      };
    });

    return {
      hadirHariIni,
      totalSiswa,
      percentageHadir,
      terpantauHariIni,
      totalKas: archivedBalance + activeKas,
      saldoMingguIni: kasWeekNet,
      kasWeekMasuk,
      kasWeekKeluar,
      pieData,
      financialTrendData,
      piketHariIni: data.piket.filter(p => p.Hari === ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()])
    };
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

  if (loading) return <SkeletonDashboard />;

  const firstName = user?.name ? user.name.split(' ')[0] : 'User';
  const isTeacher = user.role === 'Wali Kelas';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* Card Saldo Kas */}
        <div className="card bg-gradient-to-br from-emerald-800 to-emerald-950 text-white border-none shadow-lg shadow-emerald-900/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Saldo Kas</p>
              <h3 className="text-3xl font-bold mt-2 text-white">{formatIDR(stats.saldoMingguIni)}</h3>
              <p className="text-sm text-emerald-100/80 mt-1">
                +{formatIDR(stats.kasWeekMasuk)} / -{formatIDR(stats.kasWeekKeluar)}
              </p>
            </div>
            <div className="bg-white/10 p-3 rounded-full">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Card Terpantau Hari Ini - Only for Wali Kelas */}
        {isTeacher && (
          <div className="card border-l-4 border-l-emerald-500 hover:shadow-lg transition-all duration-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">Terpantau Hari Ini</h3>
                <p className="text-[10px] text-slate-500 font-medium">Siswa cek data</p>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold text-emerald-600 leading-none">{stats.terpantauHariIni}</div>
              <div>
                <p className="text-[10px] text-slate-600 font-medium">dari {stats.totalSiswa} Siswa</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Piket Hari Ini - Full Width Below Stats */}
      {isTeacher && (
        <div className="card border-l-4 border-l-emerald-500 mt-4">
           <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                   <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight">Piket Hari Ini</h3>
                  <p className="text-[10px] text-slate-500 font-medium">{format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id })}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/piket')}
                className="flex items-center gap-1 text-[9px] font-black text-emerald-800 uppercase tracking-widest hover:gap-2 transition-all"
              >
                Kelola <ChevronRight className="w-2.5 h-2.5" />
              </button>
           </div>

           <div className="flex flex-wrap gap-2">
              {stats.piketHariIni.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belum ada jadwal piket hari ini</p>
                </div>
              ) : (
                stats.piketHariIni.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl hover:shadow-md transition-all">
                    <div className="w-6 h-6 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-[10px] font-black">
                       {m.Nama_Siswa.charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-emerald-700">{m.Nama_Siswa}</span>
                  </div>
                ))
              )}
           </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-emerald-500 rounded-full" />
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Komposisi Presensi</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-blue-500 rounded-full" />
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Tren Kas (7 Hari)</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.financialTrendData}>
                <defs>
                  <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(value) => `Rp${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => formatIDR(value)}
                />
                <Area type="monotone" dataKey="Masuk" stroke="#10b981" fillOpacity={1} fill="url(#colorMasuk)" strokeWidth={2} />
                <Area type="monotone" dataKey="Keluar" stroke="#ef4444" fillOpacity={1} fill="url(#colorKeluar)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alert Section */}
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-50 text-red-600 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 tracking-tight">
              {isTeacher ? 'Alert Kedisiplinan Siswa' : 'Status Kedisiplinanmu'}
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">{isTeacher ? 'Pantau siswa yang membutuhkan perhatian khusus' : 'Pastikan kehadiranmu tetap terjaga dengan baik'}</p>
          </div>
        </div>
        {alerts.length === 0 ? (
          <div className="card p-6 text-center border-emerald-100 bg-emerald-50/50">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-black text-emerald-700">Semua Aman!</h4>
            <p className="text-[10px] text-emerald-600 mt-1">Tidak ada siswa dalam zona merah hari ini</p>
          </div>
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
