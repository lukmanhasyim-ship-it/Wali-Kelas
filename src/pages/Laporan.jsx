import React, { useState, useMemo, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  addMonths,
  startOfYear,
  subYears,
  getWeek,
  eachWeekOfInterval,
  isSameMonth
} from 'date-fns';
import { id } from 'date-fns/locale';
import { fetchGAS } from '../utils/gasClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line
} from 'recharts';
import {
  Calendar,
  FileText,
  Download,
  TrendingUp,
  Users,
  AlertCircle,
  Wallet,
  ChevronRight,
  Filter,
  CalendarDays,
  FileDown,
  AlertTriangle,
  UserCheck,
  DollarSign
} from 'lucide-react';
import Loading from '../components/Loading';
import Skeleton, { SkeletonStats, SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import PageGuide from '../components/PageGuide';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#64748b'];

export default function Laporan() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [siswa, setSiswa] = useState([]);
  const [presensi, setPresensi] = useState([]);
  const [keuangan, setKeuangan] = useState([]);
  const [panggilan, setPanggilan] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterType, setFilterType] = useState('month'); // 'month' or 'week'
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedWeek, setSelectedWeek] = useState(''); // Stores start date of week
  const reportRef = useRef(null);

  // Load Data
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [s, p, k, pg] = await Promise.all([
          fetchGAS('GET_ALL', { sheet: 'Master_Siswa' }),
          fetchGAS('GET_ALL', { sheet: 'Presensi' }),
          fetchGAS('GET_ALL', { sheet: 'Keuangan' }),
          fetchGAS('GET_ALL', { sheet: 'Log_Panggilan' })
        ]);

        const allSiswa = s.data || [];
        setSiswa(allSiswa.filter(st => st.Status_Aktif === 'Aktif'));
        setPresensi(p.data || []);
        setKeuangan(k.data || []);
        setPanggilan(pg.data || []);
      } catch (error) {
        console.error('Laporan load error:', error);
        showToast('Gagal memuat data laporan.', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  // Academic Calendar Logic (Starting July)
  const academicMonths = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Academic year starts July
    let startYear = currentMonth >= 6 ? currentYear : currentYear - 1;

    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(startYear, 6 + i, 1);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: id })
      });
    }
    return months;
  }, []);

  // Weekly Options for selected month
  const weekOptions = useMemo(() => {
    if (!selectedMonth) return [];
    const start = startOfMonth(parseISO(selectedMonth + '-01'));
    const end = endOfMonth(start);
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

    return weeks.map((w, idx) => ({
      value: format(w, 'yyyy-MM-dd'),
      label: `Minggu ${idx + 1} (${format(w, 'dd MMM', { locale: id })} - ${format(endOfWeek(w, { weekStartsOn: 1 }), 'dd MMM', { locale: id })})`
    }));
  }, [selectedMonth]);

  // Update selected week when month changes
  useEffect(() => {
    if (weekOptions.length > 0 && !selectedWeek) {
      setSelectedWeek(weekOptions[0].value);
    }
  }, [weekOptions, selectedWeek]);

  // Derived Filtered Data
  const dateRange = useMemo(() => {
    if (filterType === 'month') {
      const start = startOfMonth(parseISO(selectedMonth + '-01'));
      return { start, end: endOfMonth(start) };
    } else {
      const start = parseISO(selectedWeek);
      return { start, end: endOfWeek(start, { weekStartsOn: 1 }) };
    }
  }, [filterType, selectedMonth, selectedWeek]);

  const filteredPresensi = useMemo(() => {
    return presensi.filter(p => {
      const d = parseISO(p.Tanggal);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [presensi, dateRange]);

  const filteredKeuangan = useMemo(() => {
    return keuangan.filter(k => {
      const d = parseISO(k.Tanggal);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [keuangan, dateRange]);

  const filteredPanggilan = useMemo(() => {
    return panggilan.filter(pg => {
      const d = parseISO(pg.Tanggal);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [panggilan, dateRange]);

  // 1. General Attendance Stats (Daily unique status logic)
  const generalStats = useMemo(() => {
    const summary = { H: 0, S: 0, I: 0, A: 0, B: 0 };
    filteredPresensi.forEach(p => {
      const sp = p.Status_Pagi;
      const ss = p.Status_Siang;
      const s = p.Status;

      const uniqueInDay = new Set();
      if (sp) uniqueInDay.add(sp);
      if (ss) uniqueInDay.add(ss);
      if (!sp && !ss && s) uniqueInDay.add(s);

      uniqueInDay.forEach(status => {
        if (summary[status] !== undefined) summary[status]++;
      });
    });
    return summary;
  }, [filteredPresensi]);

  const chartDataGeneral = [
    { name: 'Hadir', value: generalStats.H, color: '#10b981' },
    { name: 'Sakit', value: generalStats.S, color: '#f59e0b' },
    { name: 'Izin', value: generalStats.I, color: '#3b82f6' },
    { name: 'Alfa', value: generalStats.A, color: '#ef4444' },
    { name: 'Bolos', value: generalStats.B, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  // 2. Non-Attending Students (Capture if either session is non-H)
  const absentStudents = useMemo(() => {
    const isNotPresent = (s) => s && ['S', 'I', 'A', 'B'].includes(s);

    return filteredPresensi
      .filter(p => isNotPresent(p.Status_Pagi) || isNotPresent(p.Status_Siang) || isNotPresent(p.Status))
      .map(p => {
        const s = siswa.find(item => item.ID_Siswa === p.ID_Siswa);
        return {
          ...p,
          Nama: s?.Nama_Siswa || p.ID_Siswa
        };
      })
      .sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));
  }, [filteredPresensi, siswa]);

  // Total absence per student (Unique per day logic: A+A=1, A+B=1A & 1B)
  const studentAbsenceTotals = useMemo(() => {
    const totals = {};
    filteredPresensi.forEach(p => {
      const idSiswa = p.ID_Siswa;
      if (!totals[idSiswa]) totals[idSiswa] = { S: 0, I: 0, A: 0, B: 0 };

      const dayStatuses = new Set();
      if (['S', 'I', 'A', 'B'].includes(p.Status_Pagi)) dayStatuses.add(p.Status_Pagi);
      if (['S', 'I', 'A', 'B'].includes(p.Status_Siang)) dayStatuses.add(p.Status_Siang);

      // Fallback for old data structure
      if (!p.Status_Pagi && !p.Status_Siang && ['S', 'I', 'A', 'B'].includes(p.Status)) {
        dayStatuses.add(p.Status);
      }

      dayStatuses.forEach(st => {
        if (totals[idSiswa][st] !== undefined) totals[idSiswa][st]++;
      });
    });
    return totals;
  }, [filteredPresensi]);

  // 3. Financial Summary
  const financialStats = useMemo(() => {
    let masuk = 0;
    let keluar = 0;
    filteredKeuangan.forEach(k => {
      const val = Number(k.Jumlah) || 0;
      if (k.Tipe === 'Masuk') masuk += val;
      else if (k.Tipe === 'Keluar') keluar += val;
    });
    return { masuk, keluar, saldo: masuk - keluar };
  }, [filteredKeuangan]);

  // 4. Panggilan Stats
  const panggilanStats = useMemo(() => {
    const stats = { total: 0, pending: 0, selesai: 0, homeVisit: 0, panggilanWali: 0 };
    filteredPanggilan.forEach(pg => {
      stats.total++;
      if (pg.Status_Selesai === 'Selesai') stats.selesai++;
      else stats.pending++;

      if (pg.Kategori === 'Home Visit') stats.homeVisit++;
      else stats.panggilanWali++;
    });
    return stats;
  }, [filteredPanggilan]);

  // 1.5 Trend Data (Attendance counts per date)
  const trendData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayPresensi = filteredPresensi.filter(p => {
        try {
          return isSameDay(parseISO(p.Tanggal), day);
        } catch { return false; }
      });

      const counts = { H: 0, S: 0, I: 0, A: 0, B: 0 };
      dayPresensi.forEach(p => {
        const uniqueInDay = new Set();
        if (p.Status_Pagi) uniqueInDay.add(p.Status_Pagi);
        if (p.Status_Siang) uniqueInDay.add(p.Status_Siang);
        if (!p.Status_Pagi && !p.Status_Siang && p.Status) uniqueInDay.add(p.Status);

        uniqueInDay.forEach(status => {
          if (counts[status] !== undefined) counts[status]++;
        });
      });

      return {
        name: format(day, filterType === 'month' ? 'dd' : 'eee', { locale: id }),
        ...counts
      };
    }).filter(d => (d.H + d.S + d.I + d.A + d.B) > 0);
  }, [filteredPresensi, dateRange, filterType]);

  const handleDownload = () => {
    window.print();
  };

  const StatusBadge = ({ status, size = 'md' }) => {
    if (!status) return <span className="text-slate-300">-</span>;
    const styles = {
      'H': 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
      'S': 'bg-amber-50 text-amber-700 ring-amber-600/10',
      'I': 'bg-blue-50 text-blue-700 ring-blue-600/10',
      'A': 'bg-rose-50 text-rose-700 ring-rose-600/10',
      'B': 'bg-purple-50 text-purple-700 ring-purple-600/10',
    };
    const sizeClasses = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]';
    return (
      <span className={`inline-flex items-center justify-center rounded-lg font-black ring-1 ring-inset ${sizeClasses} ${styles[status] || 'bg-slate-50 text-slate-400 ring-slate-600/10'}`}>
        {status}
      </span>
    );
  };

  const formatTime = (ts) => {
    if (!ts || ts === '-') return '--:--';
    try {
      return format(parseISO(ts), 'HH:mm');
    } catch (e) {
      return '--:--';
    }
  };

  if (loading) return <Loading message="Menganalisis data laporan..." />;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm 15mm;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            box-shadow: none !important;
            border: none !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            display: table !important;
            page-break-inside: auto;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto;
          }
          th, td {
            border: 1px solid #e2e8f0 !important;
          }
          .bg-slate-900 { background-color: #0f172a !important; color: white !important; -webkit-print-color-adjust: exact; }
          .no-print {
             display: none !important;
          }
        }
      `}</style>

      {/* Header & Filters (Web Only) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm no-print">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-emerald-600">
            <FileText className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Wali Kelas Center</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Laporan Perkembangan Siswa {user?.managedClass && `- Kelas ${user.managedClass}`}
            </h1>
            <p className="text-slate-500 text-sm font-medium">SMKS AL AZHAR SEMPU</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterType('month')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'month' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setFilterType('week')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'week' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Mingguan
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            >
              {academicMonths.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            {filterType === 'week' && (
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              >
                {weekOptions.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            )}

            <button
              onClick={handleDownload}
              className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all group"
              title="Cetak Laporan"
            >
              <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <PageGuide 
        title="Panduan Laporan:"
        steps={[
          'Pilih periode laporan menggunakan fitur filter tanggal atau bulan.',
          'Grafik statistik akan berubah secara dinamis menyesuaikan data yang difilter.',
          'Gunakan tombol <span class="font-black text-emerald-700">Ekspor Laporan</span> untuk mengunduh versi Cetak/PDF.',
          'Laporan ini mencakup ringkasan kehadiran, akumulasi iuran kas, dan catatan kedisiplinan siswa.'
        ]}
      />

      <div ref={reportRef} id="printable-report" className="bg-white p-8 md:p-12 rounded-[2rem] border border-slate-100 shadow-xl space-y-12">
        {/* Simple Title */}
        <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Laporan {filterType === 'month' ? academicMonths.find(m => m.value === selectedMonth)?.label : `Minggu ${parseInt(selectedWeek?.split('-')[2]) / 7 + 1}`}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Sistem Informasi Wali Kelas Digital</p>
          </div>
          {user?.managedClass && (
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas</p>
              <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{user.managedClass}</p>
            </div>
          )}
        </div>

        {/* SECTION 1: REKAP ABSENSI UMUM */}
        <div className="space-y-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
            I. Ringkasan Kehadiran
          </h3>
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Hadir', val: generalStats.H, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Sakit', val: generalStats.S, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Izin', val: generalStats.I, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Alfa', val: generalStats.A, color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Bolos', val: generalStats.B, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} p-4 rounded-2xl border border-white shadow-sm flex flex-col items-center justify-center text-center`}>
                <span className="text-2xl font-black tracking-tighter">{s.val}</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-8 h-[240px]">
            <div className="bg-slate-50/50 rounded-3xl border border-slate-100 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartDataGeneral}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartDataGeneral.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value, name) => [`${value} Siswa-Hari`, name]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-50/50 rounded-3xl border border-slate-100 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataGeneral}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={30}>
                    {chartDataGeneral.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* New Trend Chart */}
          <div className="bg-slate-50/50 rounded-3xl border border-slate-100 p-6 h-[260px]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trend Kehadiran Periodik</h4>
            </div>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 800, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 800, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '8px', fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="H" stroke="#10b981" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 4 }} name="Hadir" />
                <Line type="monotone" dataKey="S" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} name="Sakit" />
                <Line type="monotone" dataKey="I" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} name="Izin" />
                <Line type="monotone" dataKey="A" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} name="Alfa" />
                <Line type="monotone" dataKey="B" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} name="Bolos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 2: REKAP SISWA TIDAK MASUK */}
        <div className="space-y-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="w-1.5 h-4 bg-rose-600 rounded-full" />
            II. Detail Ketidakhadiran
          </h3>
          <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[9px] tracking-widest text-center">
                  <th className="px-6 py-4 text-left">Nama Siswa</th>
                  <th className="px-4 py-4">Tgl</th>
                  <th className="px-4 py-4">Pagi</th>
                  <th className="px-4 py-4">Siang</th>
                  <th className="px-6 py-4">Rekap</th>
                  <th className="px-6 py-4 text-left">Ket.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {absentStudents.length > 0 ? absentStudents.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors text-center">
                    <td className="px-6 py-4 text-left border-r border-slate-50">
                      <p className="font-extrabold text-slate-800 leading-none">{p.Nama}</p>
                      <p className="text-[8px] text-slate-400 font-black mt-1 uppercase leading-none">{p.ID_Siswa} | {p.NISN || '-'}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-500 font-black border-r border-slate-50">{format(parseISO(p.Tanggal), 'dd/MM')}</td>
                    <td className="px-4 py-4 border-r border-slate-50">
                      <div className="flex flex-col items-center gap-0.5">
                        <StatusBadge status={p.Status_Pagi} size="sm" />
                        <span className="text-[7px] font-black text-slate-400 leading-none">{formatTime(p.Timestamp_Pagi)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 border-r border-slate-50">
                      <div className="flex flex-col items-center gap-0.5">
                        <StatusBadge status={p.Status_Siang} size="sm" />
                        <span className="text-[7px] font-black text-slate-400 leading-none">{formatTime(p.Timestamp_Siang)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r border-slate-50">
                      <div className="flex items-center justify-center gap-1">
                        {['S', 'I', 'A', 'B'].map(st => {
                          const count = (studentAbsenceTotals[p.ID_Siswa] || {})[st] || 0;
                          return (
                            <div key={st} className={`flex items-center gap-0.5 px-1 py-1 rounded-md border text-[8px] font-black ${count > 0 ? 'bg-slate-50 border-slate-200 text-slate-900' : 'text-slate-200 border-transparent opacity-30'}`}>
                              <span>{st}</span>
                              <span className="text-emerald-600 border-l border-slate-200 pl-0.5">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 italic text-[10px] truncate max-w-[100px] text-left">
                      {p.Keterangan || '-'}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" className="py-12 text-center text-slate-300 font-black uppercase tracking-widest">Nihil</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: KEUANGAN */}
        <div className="space-y-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
            III. Rekapitulasi Keuangan
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-white shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pemasukan</p>
              <p className="text-xl font-black text-emerald-600">Rp {financialStats.masuk.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-rose-50 p-4 rounded-2xl border border-white shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pengeluaran</p>
              <p className="text-xl font-black text-rose-600">Rp {financialStats.keluar.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-md">
              <p className="text-[9px] font-black opacity-60 uppercase tracking-widest">Saldo</p>
              <p className="text-xl font-black">Rp {financialStats.saldo.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[9px] tracking-widest">
                <tr>
                  <th className="px-6 py-4">Tgl</th>
                  <th className="px-6 py-4">Pihak</th>
                  <th className="px-6 py-4">Keterangan</th>
                  <th className="px-6 py-4 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredKeuangan.map((k, i) => {
                  const s = siswa.find(item => item.ID_Siswa === k.ID_Siswa);
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors font-bold">
                      <td className="px-6 py-4 text-slate-400">{format(parseISO(k.Tanggal), 'dd/MM/yy')}</td>
                      <td className="px-6 py-4 text-slate-800">{s?.Nama_Siswa || k.ID_Siswa || 'Umum'}</td>
                      <td className="px-6 py-4 text-slate-400 italic font-medium">{k.Keterangan || '-'}</td>
                      <td className={`px-6 py-4 text-right font-black ${k.Tipe === 'Masuk' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {k.Tipe === 'Masuk' ? '+' : '-'} Rp {Number(k.Jumlah).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 4: PANGGILAN & HOME VISIT */}
        <div className="space-y-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-600 rounded-full" />
            IV. Rekapitulasi Panggilan & Home Visit
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Record', val: panggilanStats.total, color: 'text-slate-600', bg: 'bg-slate-50' },
              { label: 'Home Visit', val: panggilanStats.homeVisit, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Panggilan Wali', val: panggilanStats.panggilanWali, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Selesai', val: panggilanStats.selesai, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} p-4 rounded-2xl border border-white shadow-sm flex flex-col items-center justify-center text-center`}>
                <span className="text-xl font-black tracking-tighter">{s.val}</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[9px] tracking-widest text-center">
                <tr>
                  <th className="px-6 py-4 text-left">Nama Siswa</th>
                  <th className="px-4 py-4">Tgl</th>
                  <th className="px-4 py-4">Kategori</th>
                  <th className="px-6 py-4">Alasan / Kasus</th>
                  <th className="px-4 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPanggilan.length > 0 ? filteredPanggilan.map((pg, i) => {
                  const s = siswa.find(item => item.ID_Siswa === pg.ID_Siswa);
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors text-center font-bold">
                      <td className="px-6 py-4 text-left border-r border-slate-50">
                        <p className="text-slate-800">{s?.Nama_Siswa || pg.ID_Siswa}</p>
                        <p className="text-[8px] text-slate-400 font-black mt-0.5">{pg.ID_Siswa}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-500 border-r border-slate-50">{format(parseISO(pg.Tanggal), 'dd/MM/yy')}</td>
                      <td className="px-4 py-4 border-r border-slate-50">
                        <span className={`px-2 py-0.5 rounded text-[8px] uppercase ${pg.Kategori === 'Home Visit' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {pg.Kategori}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 italic font-medium border-r border-slate-50">{pg.Alasan}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] uppercase ${pg.Status_Selesai === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {pg.Status_Selesai}
                        </span>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="5" className="py-8 text-center text-slate-300 font-black uppercase tracking-widest text-xs">Tidak ada data panggilan periodik</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 text-center">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">Laporan Digital Terverifikasi</p>
        </div>
      </div>
    </div>
  );
}
