import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchGAS } from '../utils/gasClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';
import {
  PhoneCall,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  ChevronRight,
  FileText,
  PlusCircle,
  History,
  Info
} from 'lucide-react';
import Loading from '../components/Loading';
import { sendNotification } from '../utils/notifications';

export default function Panggilan() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const [log, setLog] = useState([]);
  const [siswa, setSiswa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [nisn, setNisn] = useState('');
  const [kategori, setKategori] = useState('Panggilan Wali');
  const [alasan, setAlasan] = useState('Lainnya');
  const [keteranganLainnya, setKeteranganLainnya] = useState('');

  // Handle incoming state (from dashboard alerts)
  useEffect(() => {
    if (location.state) {
      const { nisn: passedNisn, alasan: passedAlasan } = location.state;
      if (passedNisn) setNisn(passedNisn);
      if (passedAlasan) {
        setKategori('Panggilan Wali');
        setAlasan('Lainnya');
        setKeteranganLainnya(passedAlasan);
      }
    }
  }, [location.state]);

  useEffect(() => {
    async function load() {
      try {
        const [s, l] = await Promise.all([
          fetchGAS('GET_ALL', { sheet: 'Master_Siswa' }),
          fetchGAS('GET_ALL', { sheet: 'Log_Panggilan' })
        ]);
        setSiswa(s.data || []);
        setLog((l.data || []).sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal)));
      } catch (error) {
        console.error('Panggilan load error:', error);
        showToast('Gagal memuat data panggilan.', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!nisn) return;

    setIsSaving(true);
    const finalAlasan = alasan === 'Lainnya' ? keteranganLainnya || 'Lainnya' : alasan;

    const newRow = {
      ID_Panggilan: 'PG' + Date.now(),
      Tanggal: format(new Date(), 'yyyy-MM-dd'),
      NISN: nisn,
      Kategori: kategori,
      Alasan: finalAlasan,
      Hasil_Pertemuan: 'Belum Selesai',
      Status_Selesai: 'Pending'
    };

    try {
      await fetchGAS('CREATE', { sheet: 'Log_Panggilan', data: newRow });

      // Notify Student and Officers via Centralized Utility
      const calledStudentName = siswa.find(s => String(s.NISN) === String(nisn))?.Nama_Siswa || nisn;
      
      await sendNotification(siswa, {
        subjectId: nisn,
        targetRoles: ['Ketua Kelas', 'Sekretaris', 'Bendahara', 'Wali Kelas'],
        message: `Halo Pengurus Kelas! Sekadar info, Wali Kelas sedang mendampingi ${calledStudentName} terkait ${kategori}. Tetap semangat ya menjadi teladan di kelas!`,
        selfMessage: `Halo! Wali Kelas ingin mengobrol sebentar terkait ${kategori} (${finalAlasan}). Yuk, sempatkan waktu untuk diskusi santai bersama, kami peduli dengan prosesmu!`,
        includeSelf: true,
        type: 'info',
        waliEmail: user?.email
      });

      setLog(prev => [newRow, ...prev]);
      showToast('Surat panggilan berhasil dibuat.', 'success');
      setNisn('');
      setKeteranganLainnya('');
    } catch (error) {
      console.error('Buat panggilan gagal:', error);
      showToast('Gagal membuat surat panggilan.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [nisn, alasan, keteranganLainnya, kategori, showToast]);

  const handleUpdateStatus = useCallback(async (id, status) => {
    try {
      setLog(prev => prev.map(item => item.ID_Panggilan === id ? { ...item, Status_Selesai: status } : item));
      await fetchGAS('UPDATE', { sheet: 'Log_Panggilan', id: id, data: { Status_Selesai: status } });
      showToast('Status panggilan berhasil diperbarui.', 'success');
    } catch (error) {
      console.error('Update status gagal:', error);
      showToast('Gagal memperbarui status panggilan.', 'error');
    }
  }, [showToast]);

  if (loading) return <Loading message="Menyiapkan data log panggilan..." />;

  const stats = {
    total: log.length,
    pending: log.filter(l => l.Status_Selesai === 'Pending').length,
    selesai: log.filter(l => l.Status_Selesai === 'Selesai').length,
    today: log.filter(l => l.Tanggal === format(new Date(), 'yyyy-MM-dd')).length
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <PhoneCall className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Call Logging System</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Log Panggilan {user?.managedClass && `- Kelas ${user.managedClass}`}</h1>
            <p className="text-slate-500 font-medium">Monitoring komunikasi sekolah dengan orang tua dan kunjungan rumah.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 px-4 py-2 rounded-2xl flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">{format(new Date(), 'dd MMMM yyyy')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Record', val: stats.total, color: 'slate', icon: History },
          { label: 'Pending', val: stats.pending, color: 'rose', icon: AlertCircle },
          { label: 'Selesai', val: stats.selesai, color: 'emerald', icon: CheckCircle2 },
          { label: 'Hari Ini', val: stats.today, color: 'amber', icon: PlusCircle }
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-2xl bg-${s.color}-50 flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 text-${s.color}-600`} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{s.label}</p>
              <p className="text-xl font-black text-slate-900 leading-none">{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Creation Card */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl sticky top-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <PlusCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Buat Panggilan</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Pilih Siswa</label>
                <select
                  className="input-field"
                  value={nisn}
                  onChange={e => setNisn(e.target.value)}
                  required
                >
                  <option value="">-- Nama Siswa --</option>
                  {siswa.map(s => <option key={s.NISN} value={s.NISN}>{s.Nama_Siswa} ({s.NISN})</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Kategori Konten</label>
                <select className="input-field" value={kategori} onChange={e => setKategori(e.target.value)}>
                  <option value="Panggilan Wali">Panggilan Wali</option>
                  <option value="Home Visit">Home Visit</option>
                  <option value="Teguran">Teguran</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Alasan Utama</label>
                <select className="input-field" value={alasan} onChange={e => setAlasan(e.target.value)}>
                  <option value="3x Alfa">3x Alfa</option>
                  <option value="6x Bolos">6x Bolos</option>
                  <option value="Indisipliner">Indisipliner</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {alasan === 'Lainnya' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Jelaskan Detail</label>
                  <input
                    type="text"
                    className="input-field"
                    value={keteranganLainnya}
                    onChange={e => setKeteranganLainnya(e.target.value)}
                    placeholder="Contoh: Konsultasi Beasiswa"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Submit Surat
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* History Table Container */}
        <div className="lg:col-span-2">
            <div className="table-container pt-8 shadow-xl">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th className="text-left">Tanggal</th>
                    <th className="text-left">Siswa</th>
                    <th className="text-left">Detail Masalah</th>
                    <th className="text-right">Aksi Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {log.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-8 py-16 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3 grayscale opacity-40">
                          <PhoneCall className="w-12 h-12 text-slate-300" />
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Tidak ada riwayat panggilan</p>
                        </div>
                      </td>
                    </tr>
                  ) : log.map(item => {
                    const s = siswa.find(s => String(s.NISN) === String(item.NISN));
                    const isSelesai = item.Status_Selesai === 'Selesai';
                    return (
                      <tr key={item.ID_Panggilan} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900">{item.Tanggal}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recorded</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400">
                              {s ? s.Nama_Siswa.charAt(0) : '?'}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-slate-800 leading-tight">{s ? s.Nama_Siswa : item.NISN}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.NISN}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <div className={`inline-flex items-center gap-1.5 self-start px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${item.Kategori === 'Home Visit' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                              }`}>
                              {item.Kategori === 'Home Visit' ? <MapPin className="w-2.5 h-2.5" /> : <PhoneCall className="w-2.5 h-2.5" />}
                              {item.Kategori}
                            </div>
                            <span className="text-xs font-bold text-slate-600">{item.Alasan}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button
                            onClick={() => handleUpdateStatus(item.ID_Panggilan, isSelesai ? 'Pending' : 'Selesai')}
                            className={`inline-flex items-center gap-2 pl-4 pr-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${isSelesai
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'
                              }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${isSelesai ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                            {item.Status_Selesai}
                            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }
