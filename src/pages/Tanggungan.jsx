import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchGAS } from '../utils/gasClient';
import { formatIDR } from '../utils/logic';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  differenceInDays
} from 'date-fns';
import { id } from 'date-fns/locale';
import {
  CreditCard,
  Users,
  CheckCircle2,
  AlertCircle,
  Wallet,
  ChevronRight,
  Filter,
  Calendar,
  Search,
  ArrowUpRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import Loading from '../components/Loading';

export default function Tanggungan() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [siswa, setSiswa] = useState([]);
  const [keuangan, setKeuangan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nominalIuran, setNominalIuran] = useState(0);
  const [periodType, setPeriodType] = useState('all'); // all, week, month
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [s, k, profil] = await Promise.all([
          fetchGAS('GET_ALL', { sheet: 'Master_Siswa' }),
          fetchGAS('GET_ALL', { sheet: 'Keuangan' }),
          fetchGAS('GET_ALL', { sheet: 'Profil_Wali_Kelas' })
        ]);

        setSiswa(s.data || []);
        setKeuangan(k.data || []);

        if (profil.data && profil.data.length > 0) {
          const waliProfile = profil.data.find((p) => p.Email && p.Email.toLowerCase() === user.email.toLowerCase()) || profil.data[0];
          setNominalIuran(Number(waliProfile.Nominal_Iuran) || 0);
        }
      } catch (error) {
        console.error('Load data error:', error);
        showToast('Gagal memuat data tanggungan.', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user.email, showToast]);

  const activeStudents = useMemo(() => {
    return siswa.filter((item) => item.NISN && item.Status_Aktif === 'Aktif');
  }, [siswa]);

  // Filter keuangan berdasarkan periode
  const filteredKeuangan = useMemo(() => {
    if (periodType === 'all') return keuangan;

    const baseDate = new Date(selectedDate);
    let startDate, endDate;

    if (periodType === 'week') {
      startDate = startOfWeek(baseDate, { weekStartsOn: 1 });
      endDate = endOfWeek(baseDate, { weekStartsOn: 1 });
    } else if (periodType === 'month') {
      startDate = startOfMonth(baseDate);
      endDate = endOfMonth(baseDate);
    }

    return keuangan.filter((trx) => {
      const trxDate = new Date(trx.Tanggal);
      return isWithinInterval(trxDate, { start: startDate, end: endDate });
    });
  }, [keuangan, periodType, selectedDate]);

  const periodReport = useMemo(() => {
    const report = {};
    activeStudents.forEach((student) => {
      report[student.NISN] = {
        siswa: student,
        totalBayar: 0,
        transaksiCount: 0,
        transaksi: []
      };
    });

    filteredKeuangan.forEach((trx) => {
      if (trx.Tipe === 'Masuk' && report[trx.NISN]) {
        report[trx.NISN].totalBayar += Number(trx.Jumlah);
        report[trx.NISN].transaksiCount += 1;
        report[trx.NISN].transaksi.push(trx);
      }
    });

    return Object.values(report)
      .filter(item =>
        item.siswa.Nama_Siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.siswa.NISN.includes(searchTerm)
      )
      .sort((a, b) => a.totalBayar - b.totalBayar);
  }, [activeStudents, filteredKeuangan, searchTerm]);

  const getPeriodLabel = () => {
    if (periodType === 'all') return 'Semua Periode';
    const date = new Date(selectedDate);
    if (periodType === 'week') {
      const start = startOfWeek(date, { weekStartsOn: 1 });
      const end = endOfWeek(date, { weekStartsOn: 1 });
      return `Minggu: ${format(start, 'dd MMM')} - ${format(end, 'dd MMM yyyy')}`;
    } else if (periodType === 'month') {
      return format(date, 'MMMM yyyy', { locale: id });
    }
  };

  const stats = useMemo(() => {
    const total = periodReport.length || 1;
    const totalUang = periodReport.reduce((sum, p) => sum + p.totalBayar, 0);

    let lunasCount = 0;
    let kurangCount = 0;
    let belumCount = 0;

    periodReport.forEach(p => {
      let target = nominalIuran;
      if (periodType === 'month') {
        const baseDate = new Date(selectedDate);
        const start = startOfMonth(baseDate);
        const end = endOfMonth(baseDate);
        const daysInMonth = differenceInDays(end, start) + 1;
        const weeksInMonth = Math.ceil(daysInMonth / 7);
        target = nominalIuran * weeksInMonth;
      } else if (periodType === 'all' && keuangan.length > 0) {
        const validDates = keuangan.map(k => new Date(k.Tanggal)).filter(d => !isNaN(d.getTime()));
        if (validDates.length > 0) {
          const oldest = new Date(Math.min(...validDates));
          const weeks = Math.max(1, Math.floor(differenceInDays(new Date(), oldest) / 7) + 1);
          target = nominalIuran * weeks;
        }
      }

      if (p.totalBayar >= target) lunasCount++;
      else if (p.totalBayar > 0) kurangCount++;
      else belumCount++;
    });

    return {
      lunas: lunasCount,
      kurang: kurangCount,
      belum: belumCount,
      totalTerkumpul: totalUang,
      persenLunas: ((lunasCount / total) * 100).toFixed(0)
    };
  }, [periodReport, nominalIuran, periodType, selectedDate, keuangan]);

  const seharusnyaKas = useMemo(() => {
    let multiplier = 1;
    if (periodType === 'month') {
      const baseDate = new Date(selectedDate);
      const start = startOfMonth(baseDate);
      const end = endOfMonth(baseDate);
      const daysInMonth = differenceInDays(end, start) + 1;
      multiplier = Math.ceil(daysInMonth / 7);
    } else if (periodType === 'all' && keuangan.length > 0) {
      const validDates = keuangan.map(k => new Date(k.Tanggal)).filter(d => !isNaN(d.getTime()));
      if (validDates.length > 0) {
        const oldest = new Date(Math.min(...validDates));
        multiplier = Math.max(1, Math.floor(differenceInDays(new Date(), oldest) / 7) + 1);
      }
    }
    return activeStudents.length * (nominalIuran * multiplier);
  }, [activeStudents.length, nominalIuran, periodType, selectedDate, keuangan]);

  if (loading) return <Loading message="Memperbarui tagihan siswa..." />;

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Filter Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <CreditCard className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Billing Management</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tagihan & Iuran</h1>
            <p className="text-slate-500 text-sm font-medium">Monitoring kewajiban finansial dan progres kas kelas.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'week', label: 'Mingguan' },
                { id: 'month', label: 'Bulanan' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPeriodType(t.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${periodType === t.id
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {periodType !== 'all' && (
              <input
                type={periodType === 'week' ? 'date' : 'month'}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-slate-50">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari NISN atau Nama Siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-black uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            {getPeriodLabel()}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Belum Bayar', val: stats.belum, icon: AlertCircle, color: 'rose', bg: 'bg-rose-500' },
          { label: 'Kurang Bayar', val: stats.kurang, icon: TrendingUp, color: 'amber', bg: 'bg-amber-500' },
          { label: 'Lunas', val: stats.lunas, icon: CheckCircle2, color: 'emerald', bg: 'bg-emerald-500' },
          { label: 'Terkumpul', val: formatIDR(stats.totalTerkumpul), icon: Wallet, color: 'emerald', bg: 'bg-emerald-600' }
        ].map((s, i) => (
          <div key={i} className="group relative bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all overflow-hidden cursor-default">
            <div className="relative z-10 flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{s.label}</p>
                <p className={`text-2xl font-black text-slate-900 group-hover:text-${s.color}-600 transition-colors`}>{s.val}</p>
              </div>
              <div className={`p-3 rounded-2xl ${s.bg} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-opacity bg-current" />
          </div>
        ))}
      </div>

      {/* Progres Overview */}
      <div className="bg-emerald-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl shadow-emerald-200">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
          <div className="space-y-4">
            <div>
              <p className="text-emerald-200 text-xs font-bold uppercase tracking-[0.2em] mb-2">Progres Pelunasan</p>
              <h2 className="text-5xl font-black tracking-tighter">{stats.persenLunas}%</h2>
            </div>
            <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${stats.persenLunas}%` }} />
            </div>
            <p className="text-emerald-300 text-xs font-medium italic">Target Kas: {formatIDR(seharusnyaKas)}</p>
          </div>

          <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-6 border-l border-white/10 md:pl-12">
            <div>
              <p className="text-emerald-300 text-[10px] font-black uppercase tracking-widest mb-1">Target Siswa</p>
              <p className="text-xl font-bold">{activeStudents.length} <span className="text-emerald-400 text-sm">Siswa</span></p>
            </div>
            <div>
              <p className="text-emerald-300 text-[10px] font-black uppercase tracking-widest mb-1">Iuran Default</p>
              <p className="text-xl font-bold">{formatIDR(nominalIuran)}</p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-emerald-300 text-[10px] font-black uppercase tracking-widest mb-1">Deviasi Kas</p>
              <div className="flex items-center gap-2">
                <p className={`text-xl font-bold ${seharusnyaKas - stats.totalTerkumpul > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {formatIDR(Math.abs(seharusnyaKas - stats.totalTerkumpul))}
                </p>
                <ArrowUpRight className={`w-4 h-4 ${seharusnyaKas - stats.totalTerkumpul > 0 ? 'rotate-90 text-rose-400' : 'text-emerald-400'}`} />
              </div>
            </div>
          </div>
        </div>
        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/10 rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Main Table Container */}
      <div className="table-container pt-8 shadow-xl">
        <table className="modern-table">
          <thead>
            <tr>
              <th className="text-left w-64">Siswa</th>
              <th className="text-left">Nominal Bayar</th>
              <th className="text-left">Sisa Tanggungan</th>
              <th className="text-center">Tipe/Kali</th>
              <th className="text-right">Status</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-slate-50">
              {periodReport.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3 grayscale opacity-40">
                      <Filter className="w-12 h-12 text-slate-300" />
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Data Tidak Ditemukan</p>
                    </div>
                  </td>
                </tr>
              ) : periodReport.map((item) => {
                // Kalkulasi target individu sesuai filter periode
                let targetIndividu = nominalIuran;
                if (periodType === 'month') {
                  const baseDate = new Date(selectedDate);
                  const start = startOfMonth(baseDate);
                  const end = endOfMonth(baseDate);
                  const daysInMonth = differenceInDays(end, start) + 1;
                  const weeksInMonth = Math.ceil(daysInMonth / 7);
                  targetIndividu = nominalIuran * weeksInMonth;
                } else if (periodType === 'all' && keuangan.length > 0) {
                  // Hitung total minggu sejak transaksi pertama sampai sekarang
                  const validDates = keuangan.map(k => new Date(k.Tanggal)).filter(d => !isNaN(d.getTime()));
                  if (validDates.length > 0) {
                    const oldest = new Date(Math.min(...validDates));
                    const weeks = Math.max(1, Math.floor(differenceInDays(new Date(), oldest) / 7) + 1);
                    targetIndividu = nominalIuran * weeks;
                  }
                }

                const sisaTanggungan = Math.max(0, targetIndividu - item.totalBayar);
                const isPaid = item.totalBayar >= targetIndividu;
                const isPartial = item.totalBayar > 0 && item.totalBayar < targetIndividu;

                return (
                  <tr key={item.siswa.NISN} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-transform group-hover:scale-110 ${isPaid ? 'bg-emerald-100 text-emerald-600' : isPartial ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                          }`}>
                          {item.siswa.Nama_Siswa.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 leading-none mb-1">{item.siswa.Nama_Siswa}</p>
                          <p className="text-[10px] font-bold text-slate-400 leading-none tracking-wider uppercase">{item.siswa.NISN}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-black text-slate-900 leading-none mb-1">{formatIDR(item.totalBayar)}</p>
                      <p className="text-[9px] font-bold text-slate-400 lowercase tracking-tight italic">terekam di kas</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <p className={`font-black leading-none ${sisaTanggungan > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                          {formatIDR(sisaTanggungan)}
                        </p>
                        {sisaTanggungan === 0 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="inline-flex items-center bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-600 uppercase">
                        {item.transaksiCount}x Bayar
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${isPaid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        isPartial ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-600' : isPartial ? 'bg-amber-600' : 'bg-rose-600'}`} />
                        {isPaid ? 'Lunas' : isPartial ? 'Kurang' : 'Belum'}
                      </span>
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
