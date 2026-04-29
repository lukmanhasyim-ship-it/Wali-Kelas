import React, { useState, useMemo, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import logo from '../assets/logo.png';
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
import { formatDateIndo } from '../utils/logic';
import { getCurrentVersion } from '../utils/version';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#64748b'];

export default function Laporan() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [siswa, setSiswa] = useState([]);
  const [presensi, setPresensi] = useState([]);
  const [keuangan, setKeuangan] = useState([]);
  const [panggilan, setPanggilan] = useState([]);
  const [archiveAbsensi, setArchiveAbsensi] = useState([]);
  const [archiveKeuangan, setArchiveKeuangan] = useState([]);
  const [archiveDetail, setArchiveDetail] = useState([]);
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
        const [s, p, k, pg, ar, rk, ad] = await Promise.all([
          fetchGAS('GET_ALL', { sheet: 'Master_Siswa' }),
          fetchGAS('GET_ALL', { sheet: 'Presensi' }),
          fetchGAS('GET_ALL', { sheet: 'Keuangan' }),
          fetchGAS('GET_ALL', { sheet: 'Log_Panggilan' }),
          fetchGAS('GET_ALL', { sheet: 'Archive_Rekap_Absensi' }),
          fetchGAS('GET_ALL', { sheet: 'Archive_Rekap_Keuangan' }),
          fetchGAS('GET_ALL', { sheet: 'Archive_Detail_Absensi' })
        ]);

        const allSiswa = s.data || [];
        setSiswa(allSiswa);
        setPresensi(p.data || []);
        setKeuangan(k.data || []);
        setPanggilan(pg.data || []);
        setArchiveAbsensi(ar.data || []);
        setArchiveKeuangan(rk.data || []);
        setArchiveDetail(ad.data || []);
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
    const combined = [...presensi, ...archiveDetail];
    return combined.filter(p => {
      try {
        const d = parseISO(p.Tanggal);
        return d >= dateRange.start && d <= dateRange.end;
      } catch { return false; }
    });
  }, [presensi, archiveDetail, dateRange]);

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

    // Add archived data if month matches
    if (filterType === 'month') {
      archiveAbsensi.forEach(ar => {
        if (ar.Bulan === selectedMonth) {
          summary.H += Number(ar.H) || 0;
          summary.S += Number(ar.S) || 0;
          summary.I += Number(ar.I) || 0;
          summary.A += Number(ar.A) || 0;
          summary.B += Number(ar.B) || 0;
        }
      });
    }

    return summary;
  }, [filteredPresensi, archiveAbsensi, selectedMonth, filterType]);

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

    const active = filteredPresensi
      .filter(p => isNotPresent(p.Status_Pagi) || isNotPresent(p.Status_Siang) || isNotPresent(p.Status));

    // Combine with archived detail if month matches
    const archivedForMonth = filterType === 'month'
      ? archiveDetail.filter(ad => ad.Tanggal.startsWith(selectedMonth))
      : [];

    const combined = [...active, ...archivedForMonth].map(p => ({
      ...p,
      Nama: siswa.find(item => item.ID_Siswa === p.ID_Siswa)?.Nama_Siswa || p.ID_Siswa
    }));

    return combined.sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));
  }, [filteredPresensi, archiveDetail, siswa, selectedMonth, filterType]);

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

    // Add totals from archive rekap
    if (filterType === 'month') {
      archiveAbsensi.forEach(ar => {
        if (ar.Bulan === selectedMonth) {
          const sid = ar.ID_Siswa;
          if (!totals[sid]) totals[sid] = { S: 0, I: 0, A: 0, B: 0 };
          totals[sid].S += Number(ar.S) || 0;
          totals[sid].I += Number(ar.I) || 0;
          totals[sid].A += Number(ar.A) || 0;
          totals[sid].B += Number(ar.B) || 0;
        }
      });
    }

    return totals;
  }, [filteredPresensi, archiveAbsensi, selectedMonth, filterType]);

  // 3. Financial Summary
  const financialStats = useMemo(() => {
    const parseNumber = (val) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      // Jika string, hapus titik (ribuan) dan ganti koma ke titik (desimal) jika ada
      const cleaned = val.toString().replace(/\./g, '').replace(/,/g, '.');
      return Number(cleaned) || 0;
    };

    // Hitung pemasukan & pengeluaran periode yang dipilih
    let masuk = 0;
    let keluar = 0;
    filteredKeuangan.forEach(k => {
      const val = parseNumber(k.Jumlah);
      if (k.Tipe === 'Masuk') masuk += val;
      else if (k.Tipe === 'Keluar') keluar += val;
    });

    // Step 1: Ambil saldo akhir dari arsip bulan-bulan sebelumnya
    let archivedSaldo = 0;
    if (archiveKeuangan.length > 0) {
      if (filterType === 'month') {
        const monthRekap = archiveKeuangan.find(ak => ak.Bulan === selectedMonth);
        if (monthRekap) {
          archivedSaldo = parseNumber(monthRekap.Saldo_Awal);
        } else {
          archivedSaldo = parseNumber(archiveKeuangan[archiveKeuangan.length - 1].Saldo_Akhir);
        }
      } else {
        archivedSaldo = parseNumber(archiveKeuangan[archiveKeuangan.length - 1].Saldo_Akhir);
      }
    }

    // Step 2: Untuk filter mingguan, tambahkan transaksi aktif SEBELUM minggu yang dipilih
    let preRangeNet = 0;
    if (filterType === 'week') {
      keuangan.forEach(k => {
        try {
          const d = parseISO(k.Tanggal);
          if (d < dateRange.start) {
            const val = parseNumber(k.Jumlah);
            if (k.Tipe === 'Masuk') preRangeNet += val;
            else if (k.Tipe === 'Keluar') preRangeNet -= val;
          }
        } catch { /* skip */ }
      });
    }

    const saldoAwal = archivedSaldo + preRangeNet;
    return { masuk, keluar, saldo: saldoAwal + masuk - keluar, saldoAwal };
  }, [filteredKeuangan, keuangan, archiveKeuangan, selectedMonth, filterType, dateRange]);

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

  // Memoized Student Groups
  const activeStudents = useMemo(() => {
    return siswa.filter(s => s.Status_Aktif === 'Aktif');
  }, [siswa]);

  const keluarStudents = useMemo(() => {
    return siswa.filter(s => s.Status_Aktif === 'Keluar');
  }, [siswa]);

  // Komposisi Siswa (Jenis Kelamin)
  const komposisiSiswa = useMemo(() => {
    const LKCount = activeStudents.filter(s => s.jk === 'L' || s['L/P'] === 'L').length;
    const PRCount = activeStudents.filter(s => s.jk === 'P' || s['L/P'] === 'P').length;
    return { LK: LKCount, PR: PRCount, total: LKCount + PRCount };
  }, [activeStudents]);

  // 1.5 Trend Data (Attendance counts per date)
  const trendData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    const totalSiswaCount = activeStudents.length || 0;

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');

      // Get from active data
      const dayPresensiActive = filteredPresensi.filter(p => {
        try { return isSameDay(parseISO(p.Tanggal), day); } catch { return false; }
      });

      // Get from archive detail (S/I/A/B only)
      const dayPresensiArchive = archiveDetail.filter(ad => {
        try { return isSameDay(parseISO(ad.Tanggal), day); } catch { return false; }
      });

      const counts = { H: 0, S: 0, I: 0, A: 0, B: 0 };

      if (dayPresensiActive.length > 0) {
        dayPresensiActive.forEach(p => {
          const uniqueInDay = new Set();
          if (p.Status_Pagi) uniqueInDay.add(p.Status_Pagi);
          if (p.Status_Siang) uniqueInDay.add(p.Status_Siang);
          if (!p.Status_Pagi && !p.Status_Siang && p.Status) uniqueInDay.add(p.Status);

          uniqueInDay.forEach(status => {
            if (counts[status] !== undefined) counts[status]++;
          });
        });
      } else if (dayPresensiArchive.length > 0) {
        // For archived days, we have S,I,A,B detail. We estimate H as Total - Non-H
        dayPresensiArchive.forEach(p => {
          const uniqueInDay = new Set();
          if (p.Status_Pagi) uniqueInDay.add(p.Status_Pagi);
          if (p.Status_Siang) uniqueInDay.add(p.Status_Siang);
          if (!p.Status_Pagi && !p.Status_Siang && p.Status) uniqueInDay.add(p.Status);

          uniqueInDay.forEach(status => {
            if (counts[status] !== undefined && status !== 'H') counts[status]++;
          });
        });

        // Count unique students who was NOT present at least once in that day
        const nonHadirStudentIds = new Set(dayPresensiArchive.map(p => p.ID_Siswa));
        counts.H = Math.max(0, totalSiswaCount - nonHadirStudentIds.size);
      }

      return {
        name: format(day, filterType === 'month' ? 'dd' : 'eee', { locale: id }),
        ...counts
      };
    }).filter(d => (d.H + d.S + d.I + d.A + d.B) > 0);
  }, [filteredPresensi, archiveDetail, dateRange, filterType, siswa]);

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
            margin: 0;
            size: auto;
          }
          .no-print, aside, header, nav, footer, button, .sidebar-class, .navbar-class, .page-guide {
            display: none !important;
          }
          
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #printable-report {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }

          /* Force Grid to work in Print */
          .grid {
            display: grid !important;
          }

          .table-responsive {
             overflow: visible !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            page-break-inside: auto !important;
            word-wrap: break-word !important;
            font-size: 9px !important; /* Smaller font to fit width */
          }

          th, td {
            word-wrap: break-word !important;
            word-break: break-all !important;
            overflow-wrap: break-word !important;
          }
          
          th {
            background-color: #f8fafc !important;
            color: #0f172a !important;
            border: 1px solid #e2e8f0 !important;
          }

          td {
            border: 1px solid #f1f5f9 !important;
          }

          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }

          .section-break {
            page-break-before: always !important;
            padding-top: 10mm !important;
          }

          .print-card {
            border: 1px solid #e2e8f0 !important;
            border-radius: 12px !important;
            padding: 15px !important;
            background: #fff !important;
            break-inside: avoid !important;
          }

          .signature-box {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            margin-top: 50px !important;
            text-align: center !important;
            break-inside: avoid !important;
          }

          .badge-print {
            border: 1px solid #e2e8f0 !important;
            background: #f8fafc !important;
            color: #475569 !important;
          }
           
          /* Ensure charts are visible and sized correctly */
          .recharts-responsive-container {
            width: 100% !important;
            height: 250px !important;
            min-height: 250px !important;
            max-width: 100% !important;
          }

          .recharts-wrapper {
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
          }

          .recharts-surface {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            overflow: visible !important;
          }

          .recharts-legend-wrapper {
            width: 100% !important;
            position: relative !important;
            left: 0 !important;
            bottom: 0 !important;
            text-align: center !important;
          }

          .print-footer {
            position: fixed;
            bottom: 0px;
            left: 0;
            right: 0;
            display: block !important;
            text-align: center;
            font-size: 8px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 5px;
            background: white;
            font-family: 'Inter', sans-serif;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
        }

        #printable-report {
          max-width: 210mm;
          margin-left: auto;
          margin-right: auto;
          padding: 10mm;
          background: white;
          min-height: 297mm;
          box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.1);
          border: 1px solid #f1f5f9;
        }

        .report-section-title {
          position: relative;
          padding-left: 1rem;
          margin-bottom: 1.5rem;
          font-family: 'Outfit', sans-serif;
        }
        .report-section-title::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          border-radius: 4px;
        }

        .kop-surat {
          display: flex;
          align-items: center;
          gap: 20px;
          border-bottom: 3px double #1e293b;
          padding-bottom: 15px;
          margin-bottom: 25px;
        }

        .kop-surat img {
          width: 80px;
          height: auto;
        }

        .kop-surat .edu-info {
          flex: 1;
          text-align: center;
        }

        .kop-surat h2 {
          font-size: 18px;
          font-weight: 900;
          margin: 15;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .kop-surat h1 {
          font-size: 24px;
          font-weight: 950;
          margin: 2px 0;
          color: #064e3b;
          text-transform: uppercase;
        }

        .kop-surat p {
          font-size: 10px;
          margin: 15;
          color: #64748b;
          font-weight: 600;
        }
      `}</style>

      {/* Header & Filters (Web Only) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm no-print">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-emerald-800">
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
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'month' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setFilterType('week')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'week' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-900 text-white rounded-xl shadow-lg shadow-emerald-900/20 hover:bg-emerald-950 transition-all group"
            >
              <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold">Ekspor Laporan</span>
            </button>
          </div>
        </div>
      </div>

      <PageGuide
        className="page-guide"
        title="Panduan Laporan:"
        steps={[
          'Pilih periode laporan menggunakan fitur filter tanggal atau bulan.',
          'Grafik statistik akan berubah secara dinamis menyesuaikan data yang difilter.',
          'Gunakan tombol <span class="font-black text-emerald-700">Ekspor Laporan</span> untuk mengunduh versi Cetak/PDF.',
          'Laporan ini mencakup ringkasan kehadiran, akumulasi iuran kas, dan catatan kedisiplinan siswa.'
        ]}
      />

      <div ref={reportRef} id="printable-report" className="space-y-12 relative">
        {/* Automatic Print Footer */}
        <div className="hidden print:block print-footer no-print-screen">
          Siswa.Hub Digital Report — Kelas {user?.managedClass} — Dicetak pada {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-start border-b border-slate-100 pb-6">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-emerald-900 uppercase">Laporan Perkembangan Siswa</h2>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded uppercase border border-emerald-100">
                  {filterType === 'month' ? 'Periode Bulanan' : 'Periode Mingguan'}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {filterType === 'month'
                    ? academicMonths.find(m => m.value === selectedMonth)?.label
                    : `${formatDateIndo(dateRange.start)} - ${formatDateIndo(dateRange.end)}`}
                </span>
              </div>
            </div>

            <div className="text-right grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] font-bold tracking-tight">
              <span className="text-slate-400 text-right uppercase">Wali Kelas:</span>
              <span className="text-slate-900 text-left">{user?.name || '-'}</span>
              <span className="text-slate-400 text-right uppercase">Kelas:</span>
              <span className="text-slate-900 text-left font-black uppercase">{user?.managedClass || '-'}</span>
              <span className="text-slate-400 text-right uppercase">Tgl Cetak:</span>
              <span className="text-slate-900 text-left uppercase">{formatDateIndo(new Date())}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 report-section-title before:bg-blue-600">
            I. Komposisi Kelas
          </h3>
          <div className="grid grid-cols-3 gap-4 print:grid-cols-3">
            <div className="bg-blue-50 p-5 rounded-2xl border border-white shadow-sm flex flex-col items-center justify-center text-center print-card">
              <span className="text-3xl font-black text-blue-600 tracking-tighter">{komposisiSiswa.total}</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Total Siswa Aktif</span>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-white shadow-sm flex flex-col items-center justify-center text-center print-card">
              <span className="text-3xl font-black text-slate-700 tracking-tighter">{komposisiSiswa.LK}</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Laki-Laki (L)</span>
            </div>
            <div className="bg-rose-50 p-5 rounded-2xl border border-white shadow-sm flex flex-col items-center justify-center text-center print-card">
              <span className="text-3xl font-black text-rose-600 tracking-tighter">{komposisiSiswa.PR}</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Perempuan (P)</span>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3 report-section-title before:bg-emerald-600">
            II. Ringkasan Kehadiran
          </h3>
          <div className="grid grid-cols-5 gap-4 print:grid-cols-5">
            {[
              { label: 'Hadir', val: generalStats.H, color: 'emerald', bg: 'bg-emerald-50' },
              { label: 'Sakit', val: generalStats.S, color: 'blue', bg: 'bg-blue-50' },
              { label: 'Izin', val: generalStats.I, color: 'amber', bg: 'bg-amber-50' },
              { label: 'Alfa', val: generalStats.A, color: 'rose', bg: 'bg-rose-50' },
              { label: 'Bolos', val: generalStats.B, color: 'purple', bg: 'bg-purple-50' }
            ].map((s, i) => (
              <div key={i} className={`${s.bg} p-4 rounded-2xl border border-white shadow-sm flex flex-col items-center justify-center text-center print-card`}>
                <p className="text-lg font-black text-slate-900 leading-none">{s.val}</p>
                <p className="text-[7px] font-black uppercase tracking-[0.2em] mt-2 text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 h-[250px] print:grid-cols-2">
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-col min-h-[220px]">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Persentase Kehadiran</h4>
              <div className="flex-1">
                <div className="flex justify-center items-center">
                  <PieChart width={300} height={210} margin={{ bottom: 5 }}>
                    <Pie
                      data={chartDataGeneral}
                      cx="50%"
                      cy="45%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {chartDataGeneral.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{
                        fontSize: '9px',
                        fontWeight: 'bold',
                        paddingTop: '2px'
                      }}
                    />
                  </PieChart>
                </div>
              </div>
            </div>
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-col min-h-[220px]">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Perbandingan Status</h4>
              <div className="flex-1 flex flex-col justify-center space-y-3">
                {chartDataGeneral.map((entry, idx) => {
                  const maxVal = Math.max(...chartDataGeneral.map(d => d.value), 1);
                  const percentage = (entry.value / maxVal) * 100;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest px-0.5">
                        <span className="text-slate-500">{entry.name}</span>
                        <span className="text-slate-900">{entry.value}</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-200/50 rounded-full overflow-hidden border border-slate-100">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: entry.color,
                            boxShadow: `0 0 10px ${entry.color}40`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        {/* SECTION 2: REKAP SISWA TIDAK MASUK */}
        <div className="section-break">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 report-section-title before:bg-indigo-600">
            III. Trend Kehadiran Periodik
          </h3>
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6 h-[320px] print-chart-container">
            <div className="flex justify-center items-center">
              <LineChart width={700} height={260} data={trendData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }}
                />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{
                    fontSize: '9px',
                    fontWeight: 'bold',
                    paddingTop: '15px'
                  }}
                />
                <Line type="monotone" dataKey="H" stroke="#10b981" strokeWidth={4} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Hadir" isAnimationActive={false} />
                <Line type="monotone" dataKey="S" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} name="Sakit" isAnimationActive={false} />
                <Line type="monotone" dataKey="I" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} name="Izin" isAnimationActive={false} />
                <Line type="monotone" dataKey="A" stroke="#ef4444" strokeWidth={3} dot={{ r: 3 }} name="Alfa" isAnimationActive={false} />
                <Line type="monotone" dataKey="B" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} name="Bolos" isAnimationActive={false} />
              </LineChart>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 report-section-title before:bg-rose-600">
            IV. Detail Ketidakhadiran
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden table-responsive">
            <table className="modern-table w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="text-left w-10 px-4">No.</th>
                  <th className="text-left min-w-[150px]">Nama Siswa</th>
                  <th className="text-center w-16">Sakit</th>
                  <th className="text-center w-16">Izin</th>
                  <th className="text-center w-16">Alfa</th>
                  <th className="text-center w-16">Bolos</th>
                  <th className="text-center w-20">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const filtered = siswa
                    .filter(x => {
                      const totals = studentAbsenceTotals[String(x.ID_Siswa)] || { S: 0, I: 0, A: 0, B: 0 };
                      const total = (totals.S || 0) + (totals.I || 0) + (totals.A || 0) + (totals.B || 0);
                      return x.Status_Aktif === 'Aktif' && total > 0;
                    })
                    .sort((a, b) => (a.Nama_Siswa || '').localeCompare(b.Nama_Siswa || ''));

                  if (filtered.length === 0) {
                    return <tr><td colSpan="7" className="py-12 text-center text-slate-300 font-black uppercase tracking-widest">Nihil</td></tr>;
                  }

                  return filtered.map((x, idx) => {
                    const totals = studentAbsenceTotals[String(x.ID_Siswa)];
                    const total = (totals.S || 0) + (totals.I || 0) + (totals.A || 0) + (totals.B || 0);
                    return (
                      <tr key={x.ID_Siswa} className="hover:bg-slate-50 transition-colors text-center font-bold">
                        <td className="text-slate-400 font-black text-[10px] text-center">{idx + 1}</td>
                        <td className="text-left font-extrabold text-slate-800 leading-none">
                          <p>{x.Nama_Siswa}</p>
                          <p className="text-[8px] text-slate-400 font-black mt-1 uppercase leading-none">{x.ID_Siswa} | {x.NISN || '-'}</p>
                        </td>
                        <td className="text-center">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-black ${totals.S > 0 ? 'bg-amber-100 text-amber-700' : 'text-slate-200'}`}>{totals.S || 0}</span>
                        </td>
                        <td className="text-center">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-black ${totals.I > 0 ? 'bg-blue-100 text-blue-700' : 'text-slate-200'}`}>{totals.I || 0}</span>
                        </td>
                        <td className="text-center">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-black ${totals.A > 0 ? 'bg-rose-100 text-rose-700' : 'text-slate-200'}`}>{totals.A || 0}</span>
                        </td>
                        <td className="text-center">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-black ${totals.B > 0 ? 'bg-purple-100 text-purple-700' : 'text-slate-200'}`}>{totals.B || 0}</span>
                        </td>
                        <td className="text-center">
                          <span className="px-2 py-1 rounded-full text-[9px] font-black bg-slate-900 text-white">{total}</span>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8 section-break">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3 report-section-title before:bg-indigo-600">
            V. Rekapitulasi Keuangan
          </h3>
          <div className="grid grid-cols-4 gap-6 print:grid-cols-4">
            <div className="bg-slate-50 p-5 rounded-2xl border border-white shadow-sm print-card">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Saldo Awal</p>
              <p className="text-base font-black text-slate-600 mt-1">Rp {financialStats.saldoAwal.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-emerald-50 p-5 rounded-2xl border border-white shadow-sm print-card">
              <p className="text-[7px] font-black text-emerald-400 uppercase tracking-widest">Masuk (+)</p>
              <p className="text-base font-black text-emerald-600 mt-1">Rp {financialStats.masuk.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-rose-50 p-5 rounded-2xl border border-white shadow-sm print-card">
              <p className="text-[7px] font-black text-rose-400 uppercase tracking-widest">Keluar (-)</p>
              <p className="text-base font-black text-rose-600 mt-1">Rp {financialStats.keluar.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-slate-900 p-5 rounded-2xl text-white shadow-md print:bg-slate-100 print:text-slate-900 print:border-slate-900 print-card" style={{ backgroundColor: '#0f172a' }}>
              <p className="text-[7px] font-black opacity-60 uppercase tracking-widest print:opacity-100 print:text-slate-500">Saldo Akhir</p>
              <p className="text-base font-black print:text-slate-900 mt-1">Rp {financialStats.saldo.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Visualisasi Arus Kas (Periode Ini)</h4>
            <div className="flex justify-center items-center">
              <BarChart
                width={700}
                height={200}
                data={[
                  { name: 'Pemasukan', amount: financialStats.masuk, fill: '#10b981' },
                  { name: 'Pengeluaran', amount: financialStats.keluar, fill: '#ef4444' }
                ]}
                margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }}
                  tickFormatter={(val) => `Rp ${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val) => `Rp ${val.toLocaleString('id-ID')}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={60} isAnimationActive={false} />
              </BarChart>
            </div>
          </div>

          {/* Tabel Mutasi Kas */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-indigo-400 rounded-full" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Riwayat Mutasi Saldo Kas</p>
            </div>
            <table className="modern-table">
              <thead>
                <tr>
                  <th className="text-left">Bulan</th>
                  <th className="text-right">Saldo Awal</th>
                  <th className="text-right">Pemasukan</th>
                  <th className="text-right">Pengeluaran</th>
                  <th className="text-right">Saldo Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {archiveKeuangan.length > 0 ? archiveKeuangan.map((ak, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors font-bold">
                    <td className="px-6 py-3 text-slate-600">{ak.Bulan}</td>
                    <td className="px-4 py-3 text-right text-slate-500">Rp {Number(ak.Saldo_Awal).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">+Rp {Number(ak.Total_Masuk).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right text-rose-600">-Rp {Number(ak.Total_Keluar).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">Rp {Number(ak.Saldo_Akhir).toLocaleString('id-ID')}</td>
                  </tr>
                )) : null}
                <tr className="bg-indigo-50 font-black text-[11px]">
                  <td className="px-6 py-3 text-indigo-700">
                    {selectedMonth}
                    <span className="text-[8px] ml-1.5 bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Aktif</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">Rp {(financialStats.saldoAwal || 0).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">+Rp {financialStats.masuk.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right text-rose-600">-Rp {financialStats.keluar.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right text-indigo-700">Rp {financialStats.saldo.toLocaleString('id-ID')}</td>
                </tr>
                {archiveKeuangan.length === 0 && filteredKeuangan.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-300 font-black uppercase tracking-widest text-xs">Belum ada data mutasi</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 4: PANGGILAN & HOME VISIT */}
        <div className="space-y-6 print-page-2">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 report-section-title before:bg-amber-600">
            VI. Rekapitulasi Panggilan & Home Visit
          </h3>
          <div className="grid grid-cols-4 gap-4 print:grid-cols-4">
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

          {/* VERSI 1: REKAP RINGKAS */}
          <div className="mt-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">A. Versi Rekapitulasi Ringkas (Berdasarkan Siswa)</p>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden table-responsive">
              <table className="modern-table w-full">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="text-left w-10 px-4">No.</th>
                    <th className="text-left min-w-[150px]">Nama Siswa</th>
                    <th className="text-left">Tanggal Pemanggilan (Rencana)</th>
                    <th className="text-center w-24">Total</th>
                    <th className="text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const studentCallCounts = {};
                    filteredPanggilan.forEach(pg => {
                      const id = String(pg.NISN || pg.ID_Siswa);
                      if (!studentCallCounts[id]) {
                        studentCallCounts[id] = { total: 0, selesai: 0, dates: [] };
                      }
                      studentCallCounts[id].total++;
                      if (pg.Status_Selesai === 'Selesai') studentCallCounts[id].selesai++;
                      studentCallCounts[id].dates.push(pg.Tanggal_Pemanggilan || pg.Tanggal);
                    });

                    const groupedData = Object.entries(studentCallCounts)
                      .map(([id, counts]) => {
                        const s = siswa.find(item => String(item.ID_Siswa) === id || String(item.NISN) === id);
                        return { id, name: s?.Nama_Siswa || id, ...counts };
                      })
                      .sort((a, b) => b.total - a.total);

                    if (groupedData.length === 0) {
                      return <tr><td colSpan="5" className="py-8 text-center text-slate-300 font-black uppercase tracking-widest text-xs">Tidak ada data panggilan periodik</td></tr>;
                    }

                    return groupedData.map((data, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors font-bold">
                        <td className="text-slate-400 font-black text-[10px] text-center">{i + 1}</td>
                        <td className="text-left">
                          <p className="text-slate-800">{data.name}</p>
                          <p className="text-[8px] text-slate-400 font-black mt-0.5 uppercase">{data.id}</p>
                        </td>
                        <td className="text-left">
                          <div className="flex flex-wrap gap-1">
                            {data.dates.map((d, didx) => (
                              <span key={didx} className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-1 rounded-md font-bold whitespace-nowrap">
                                {formatDateIndo(d)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700">
                            {data.total} Kali
                          </span>
                        </td>
                        <td className="text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black ${data.selesai === data.total ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {data.selesai} / {data.total}
                          </span>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* VERSI 2: DETAIL */}
          <div className="mt-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">B. Versi Detail Panggilan & Home Visit</p>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden table-responsive">
              <table className="modern-table w-full">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="text-left w-8 px-1 py-2">No.</th>
                    <th className="text-left w-36 px-2 py-2">Nama Siswa</th>
                    <th className="text-center w-12 px-1 py-2">Freq</th>
                    <th className="text-center w-20 px-1 py-2">Kategori</th>
                    <th className="text-left px-2 py-2">Alasan</th>
                    <th className="text-left px-2 py-2">Tindak Lanjut</th>
                    <th className="text-center w-28 px-1 py-2">Bukti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    let studentCounters = {};
                    const sortedAllPanggilan = [...panggilan].sort((a, b) => new Date(a.Tanggal) - new Date(b.Tanggal));
                    sortedAllPanggilan.forEach(pg => {
                      const id = String(pg.NISN || pg.ID_Siswa);
                      if (!studentCounters[id]) studentCounters[id] = 0;
                      studentCounters[id]++;
                      pg._callIndex = studentCounters[id];
                    });

                    if (filteredPanggilan.length === 0) {
                      return <tr><td colSpan="7" className="py-8 text-center text-slate-300 font-black uppercase tracking-widest text-xs">Tidak ada data panggilan periodik</td></tr>;
                    }

                    return filteredPanggilan.map((pg, i) => {
                      const s = siswa.find(item => item.ID_Siswa === pg.ID_Siswa || String(item.NISN) === String(pg.NISN));
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors font-bold text-[10px]">
                          <td className="text-slate-400 font-bold text-[10px] text-center px-1">{i + 1}</td>
                          <td className="text-left py-2 px-2 align-top break-words">
                            <p className="text-slate-800 leading-none font-bold text-[9px]">{s?.Nama_Siswa || pg.NISN || pg.ID_Siswa}</p>
                            <p className="text-[7px] text-emerald-600 font-extrabold mt-1 uppercase leading-none">Jadwal: {formatDateIndo(pg.Tanggal_Pemanggilan || pg.Tanggal)}</p>
                          </td>
                          <td className="text-center py-2 px-1 align-top">
                            <span className="px-1 py-0.5 rounded text-[7px] font-black uppercase bg-slate-50 text-slate-400 border border-slate-200">
                              #{pg._callIndex || 1}
                            </span>
                          </td>
                          <td className="text-center py-2 px-1 align-top">
                            <span className={`px-1 py-0.5 rounded text-[7px] uppercase font-black ${pg.Kategori === 'Home Visit' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                              {pg.Kategori === 'Panggilan Wali' ? 'Panggilan' : pg.Kategori}
                            </span>
                          </td>
                          <td className="text-slate-600 italic font-medium text-left text-[9px] leading-tight py-2 px-2 align-top break-words">
                            {pg.Alasan}
                          </td>
                          <td className="text-left align-top py-2 px-2 break-words">
                            <p className="text-[9px] font-medium text-slate-700 leading-tight">
                              {pg.Hasil_Pertemuan && pg.Hasil_Pertemuan !== 'Belum Selesai' ? pg.Hasil_Pertemuan : '-'}
                            </p>
                            {pg.Waktu_Diskusi && (
                              <p className="text-[7px] font-black uppercase text-indigo-500 mt-1 flex items-center gap-1 opacity-60">
                                {formatDateIndo((pg.Waktu_Diskusi || '').split('T')[0])}
                              </p>
                            )}
                          </td>
                          <td className="text-center align-top py-2 px-1">
                            {pg.Bukti_File_URL ? (
                              <div className="flex flex-wrap justify-center gap-1 max-w-[100px] mx-auto">
                                {(pg.Bukti_File_URL || '').split(',').filter(Boolean).map((url, uIdx) => {
                                  const driveIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                                  const driveId = driveIdMatch ? driveIdMatch[1] : null;
                                  const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || driveId;

                                  return (
                                    <div key={uIdx} className="relative">
                                      {isImage ? (
                                        <a href={url} target="_blank" rel="noreferrer" className="block">
                                          <img
                                            src={driveId ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w200-h200` : url}
                                            className="h-10 w-12 object-cover rounded shadow-sm border border-slate-200"
                                            alt="Bukti"
                                            onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                                          />
                                          <div className="hidden h-10 w-12 items-center justify-center bg-slate-50 border rounded text-[7px] font-bold">IMG</div>
                                        </a>
                                      ) : (
                                        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-8 h-8 bg-slate-50 text-slate-400 rounded border border-slate-200 text-[8px] font-bold">
                                          #{uIdx + 1}
                                        </a>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded block mt-1 w-full text-center border border-slate-100 border-dashed">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* SECTION 5: SISWA KELUAR */}
        <div className="space-y-6 section-break">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 report-section-title before:bg-slate-400">
            VII. Rekapitulasi Siswa Keluar
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="modern-table">
              <thead>
                <tr>
                  <th className="text-left w-12">No.</th>
                  <th className="text-left font-black">Nama Siswa</th>
                  <th className="text-left font-black">Keterangan (Alasan Keluar)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {keluarStudents.length > 0 ? keluarStudents
                  .sort((a, b) => (a.Nama_Siswa || '').localeCompare(b.Nama_Siswa || ''))
                  .map((x, idx) => (
                    <tr key={x.ID_Siswa} className="hover:bg-slate-50 transition-colors font-bold">
                      <td className="text-slate-400 font-black text-[10px] text-center">{idx + 1}</td>
                      <td className="text-left font-extrabold text-slate-800 leading-none">
                        <p>{x.Nama_Siswa}</p>
                        <p className="text-[8px] text-slate-400 font-black mt-1 uppercase leading-none">{x.ID_Siswa} | {x.NISN || '-'}</p>
                      </td>
                      <td className="text-slate-600 italic font-medium text-left">
                        {x.Keterangan || 'Tidak ada keterangan'}
                      </td>
                    </tr>
                  )) : (
                  <tr>
                    <td colSpan="3" className="py-8 text-center text-slate-300 font-black uppercase tracking-widest text-xs">
                      Nihil
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>


        {/* Footer for PDF */}
        <div className="pt-12 text-center border-t border-slate-50 text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">
          Siswa.Hub : Wali Kelas Digital Project © 2026 (v{getCurrentVersion()})
        </div>
      </div>
    </div>
  );
}
