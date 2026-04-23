import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, 
  Printer, 
  Search, 
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  FileText
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { fetchGAS } from '../utils/gasClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';
import PageGuide from '../components/PageGuide';

export default function LaporanHarian() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [siswa, setSiswa] = useState([]);
  const [presensi, setPresensi] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const reportRef = useRef();

  const normalizeDateString = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return format(parsed, 'yyyy-MM-dd');
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [s, p] = await Promise.all([
          fetchGAS('GET_ALL', { sheet: 'Master_Siswa' }),
          fetchGAS('GET_ALL', { sheet: 'Presensi' })
        ]);
        
        setSiswa((s.data || []).filter(st => st.Status_Aktif === 'Aktif'));
        
        const presensiData = (p.data || []).map(item => ({
          ...item,
          Tanggal: normalizeDateString(item.Tanggal)
        }));
        setPresensi(presensiData);
      } catch (err) {
        showToast('Gagal memuat data laporan harian.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [showToast]);

  const dailyPresensiByStudent = useMemo(() => {
    const map = {};
    presensi.filter(p => p.Tanggal === selectedDate).forEach(p => {
      map[p.ID_Siswa] = p;
    });
    return map;
  }, [presensi, selectedDate]);

  const formatTime = (ts) => {
    if (!ts || ts === '-' || ts === '') return '-';
    try {
      if (typeof ts === 'string' && ts.includes(' ')) {
        return ts.split(' ')[1].substring(0, 5);
      }
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '-';
      return format(d, 'HH:mm');
    } catch (e) {
      return '-';
    }
  };

  const attendanceData = useMemo(() => {
    return siswa.map(s => {
      const record = dailyPresensiByStudent[s.ID_Siswa] || {};
      return {
        ...s,
        pagiStatus: record.Status_Pagi || '-',
        pagiTime: formatTime(record.Timestamp_Pagi),
        siangStatus: record.Status_Siang || '-',
        siangTime: formatTime(record.Timestamp_Siang),
      };
    }).filter(s => s.Nama_Siswa.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [siswa, dailyPresensiByStudent, searchQuery]);

  const stats = useMemo(() => {
    const sessionPagi = presensi.filter(p => p.Tanggal === selectedDate && p.Status_Pagi);
    const sessionSiang = presensi.filter(p => p.Tanggal === selectedDate && p.Status_Siang);
    
    const calc = (items, field) => ({
      H: items.filter(i => i[field] === 'H').length,
      S: items.filter(i => i[field] === 'S').length,
      I: items.filter(i => i[field] === 'I').length,
      A: items.filter(i => i[field] === 'A').length,
      B: items.filter(i => i[field] === 'B').length,
    });
    
    return { 
      pagi: calc(sessionPagi, 'Status_Pagi'), 
      siang: calc(sessionSiang, 'Status_Siang') 
    };
  }, [presensi, selectedDate]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <Loading message="Menyiapkan laporan harian..." />;

  const StatusIcon = ({ status }) => {
    switch (status) {
      case 'H': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'S': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'I': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'A': return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'B': return <UserX className="w-4 h-4 text-purple-500" />;
      default: return <span className="text-slate-300">-</span>;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'H': 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
      'S': 'bg-amber-50 text-amber-700 ring-amber-600/10',
      'I': 'bg-blue-50 text-blue-700 ring-blue-600/10',
      'A': 'bg-rose-50 text-rose-700 ring-rose-600/10',
      'B': 'bg-purple-50 text-purple-700 ring-purple-600/10',
    };
    return colors[status] || 'bg-slate-50 text-slate-400 ring-slate-600/10';
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <style>{`
        @media print {
          @page { size: A4; margin: 5mm 5mm 5mm 10mm; }
          .no-print, aside, header, nav, footer, button { display: none !important; }
          html, body, #root, main, .max-w-6xl {
            height: auto !important;
            overflow: visible !important;
            display: block !important;
            position: static !important;
            width: 100% !important;
          }
          #printable-report {
            display: block !important;
            position: static !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #e2e8f0 !important; }
          .bg-slate-900 { background-color: #0f172a !important; color: white !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .bg-slate-50, .bg-slate-100, .bg-slate-200 { background-color: white !important; }
        }
      `}</style>

      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm no-print">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-emerald-600">
            <Calendar className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Monitoring Harian</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Laporan Presensi Harian</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all w-64 font-medium"
            />
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Printer className="w-4 h-4" />
            Cetak Laporan
          </button>
        </div>
      </div>

      <PageGuide 
        title="Tentang Laporan Harian:"
        steps={[
          'Pilih tanggal untuk melihat detail presensi pagi dan siang.',
          'Gunakan kolom pencarian untuk memfilter siswa tertentu.',
          'Status "Nihil" atau "-" berarti siswa belum melakukan presensi atau data tidak ada.'
        ]}
      />

      {/* Printable Report Content */}
      <div ref={reportRef} id="printable-report" className="space-y-10">
        
        {/* Print Header (Visible only when printing) */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-8">
          <h2 className="text-2xl font-black text-slate-900 uppercase">LAPORAN PRESENSI HARIAN</h2>
          <div className="flex justify-between items-end mt-2">
            <div>
              <p className="text-sm font-bold text-slate-700">Tanggal: {format(parseISO(selectedDate), 'EEEE, dd MMMM yyyy', { locale: id })}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Siswa.Hub Digital Class Management</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase">Kelas</p>
              <p className="text-lg font-black text-slate-900">{user?.managedClass}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesi Pagi</h4>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {['H', 'S', 'I', 'A', 'B'].map(type => (
                <div key={type} className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-white">
                  <span className="text-lg font-black text-slate-900">{stats.pagi[type]}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">{type}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesi Siang</h4>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {['H', 'S', 'I', 'A', 'B'].map(type => (
                <div key={type} className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-white">
                  <span className="text-lg font-black text-slate-900">{stats.siang[type]}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th className="text-center w-12">No.</th>
                <th className="text-left">Nama Siswa</th>
                <th className="text-center">Presensi Pagi</th>
                <th className="text-center">Presensi Siang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceData.length > 0 ? attendanceData.map((s, idx) => (
                <tr key={s.ID_Siswa} className="hover:bg-slate-50 transition-colors font-bold">
                  <td className="text-center text-slate-400 font-black">{idx + 1}</td>
                  <td>
                    <p className="text-slate-800 leading-none">{s.Nama_Siswa}</p>
                    <p className="text-[8px] text-slate-400 font-black mt-1 uppercase leading-none">{s.ID_Siswa}</p>
                  </td>
                  <td>
                    <div className="flex flex-col items-center gap-1">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-black ring-1 ring-inset ${getStatusColor(s.pagiStatus)}`}>
                        {s.pagiStatus}
                      </span>
                      <span className="text-[8px] text-slate-400 font-black tracking-tighter">{s.pagiTime}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col items-center gap-1">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-black ring-1 ring-inset ${getStatusColor(s.siangStatus)}`}>
                        {s.siangStatus}
                      </span>
                      <span className="text-[8px] text-slate-400 font-black tracking-tighter">{s.siangTime}</span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-slate-300 font-black uppercase tracking-widest">Siswa tidak ditemukan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="hidden print:block pt-8 border-t border-slate-100 text-center">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">Laporan Digital Terverifikasi</p>
        </div>
      </div>
    </div>
  );
}
