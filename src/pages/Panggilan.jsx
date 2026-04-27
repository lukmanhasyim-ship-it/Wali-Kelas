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
  Info,
  X,
  Upload,
  Trash2
} from 'lucide-react';
import Loading from '../components/Loading';
import { sendNotification } from '../utils/notifications';
import { formatDateIndo } from '../utils/logic';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [isTindakLanjutOpen, setIsTindakLanjutOpen] = useState(false);
  const [activeCallId, setActiveCallId] = useState(null);
  const [tindakLanjutNote, setTindakLanjutNote] = useState('');
  const [tindakLanjutFiles, setTindakLanjutFiles] = useState([]); // Now supports multiple files (up to 2)
  const [isUploading, setIsUploading] = useState(false);
  const [tanggalRencana, setTanggalRencana] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

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
      Tanggal_Pemanggilan: tanggalRencana,
      Hasil_Pertemuan: 'Belum Selesai',
      Status_Selesai: 'Pending'
    };

    try {
      await fetchGAS('CREATE', { sheet: 'Log_Panggilan', data: newRow });

      // Notify Student and Officers via Centralized Utility
      const calledStudentName = siswa.find(s => String(s.NISN) === String(nisn))?.Nama_Siswa || nisn;

      await sendNotification(siswa, {
        subjectId: nisn,
        targetRoles: ['Ketua Kelas', 'Wakil Ketua Kelas', 'Sekretaris', 'Wakil Sekretaris', 'Bendahara', 'Wakil Bendahara', 'Wali Kelas'],
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
      setTanggalRencana(format(new Date(), 'yyyy-MM-dd'));
    } catch (error) {
      console.error('Buat panggilan gagal:', error);
      showToast('Gagal membuat surat panggilan.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [nisn, alasan, keteranganLainnya, kategori, showToast, tanggalRencana, siswa, user]);


  const handleSaveTindakLanjut = async (e) => {
    e.preventDefault();
    if (!activeCallId) return;

    setIsUploading(true);
    try {
      let fileUrl = '';
      if (tindakLanjutFiles.length > 0) {
        const uploadedUrls = [];
        for (const file of tindakLanjutFiles) {
          if (!file) continue;
          const reader = new FileReader();
          const base64Promise = new Promise((resolve) => {
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
          const base64 = await base64Promise;
          const uploadRes = await fetchGAS('UPLOAD_FILE', {
            fileName: `Bukti_${activeCallId}_${file.name}`,
            mimeType: file.type,
            base64Data: base64
          });
          uploadedUrls.push(uploadRes.data.url);
        }
        fileUrl = uploadedUrls.join(',');
      }

      await fetchGAS('UPDATE', {
        sheet: 'Log_Panggilan',
        id: activeCallId,
        data: {
          Hasil_Pertemuan: tindakLanjutNote,
          Status_Selesai: 'Selesai',
          Bukti_File_URL: fileUrl
        }
      });

      setLog(prev => prev.map(item =>
        item.ID_Panggilan === activeCallId
          ? { ...item, Hasil_Pertemuan: tindakLanjutNote, Status_Selesai: 'Selesai', Bukti_File_URL: fileUrl }
          : item
      ));

      showToast('Tindak lanjut berhasil disimpan.', 'success');
      setIsTindakLanjutOpen(false);
      setTindakLanjutNote('');
      setTindakLanjutFiles([]);
    } catch (error) {
      console.error('Save tindak lanjut error:', error);
      showToast('Gagal menyimpan tindak lanjut.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

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

  const handleDeleteLog = useCallback((item) => {
    setDeleteTarget(item);
    setShowDeleteModal(true);
    setConfirmInput('');
  }, []);

  const confirmDeleteLog = useCallback(async () => {
    if (!deleteTarget || confirmInput !== 'HAPUS') return;

    setDeleting(true);
    try {
      await fetchGAS('DELETE', { sheet: 'Log_Panggilan', id: deleteTarget.ID_Panggilan });
      setLog(prev => prev.filter(log => log.ID_Panggilan !== deleteTarget.ID_Panggilan));
      showToast('Log panggilan berhasil dihapus.', 'success');
      setShowDeleteModal(false);
      setDeleteTarget(null);
      setConfirmInput('');
    } catch (error) {
      console.error('Delete log gagal:', error);
      showToast('Gagal menghapus log panggilan.', 'error');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, confirmInput, showToast]);

  if (loading) return <Loading message="Menyiapkan data log panggilan..." />;

  const stats = {
    total: log.length,
    pending: log.filter(l => l.Status_Selesai === 'Pending').length,
    selesai: log.filter(l => l.Status_Selesai === 'Selesai').length,
    today: log.filter(l => l.Tanggal === format(new Date(), 'yyyy-MM-dd')).length
  };

  const filteredLog = log.filter(item => {
    const s = siswa.find(s => String(s.NISN) === String(item.NISN));
    const searchStr = (s?.Nama_Siswa || item.NISN || '').toLowerCase() +
      (item.Kategori || '').toLowerCase() +
      (item.Alasan || '').toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
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
              <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">{formatDateIndo(new Date())}</span>
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
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
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
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl sticky top-6">
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
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Tanggal Rencana Pemanggilan</label>
                <input
                  type="date"
                  className="input-field"
                  value={tanggalRencana}
                  onChange={e => setTanggalRencana(e.target.value)}
                  required
                />
              </div>


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
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-black text-slate-800">Riwayat Panggilan</h3>
              {selectedLogs.length > 0 && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full">
                  {selectedLogs.length} dipilih
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {selectedLogs.length > 0 && (
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Terpilih
                </button>
              )}
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Cari nama atau alasan..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Info className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200 w-12">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        checked={selectAll && filteredLog.length > 0}
                        ref={(el) => { if (el) el.indeterminate = selectedLogs.length > 0 && selectedLogs.length < filteredLog.length; }}
                        onChange={(e) => {
                          setSelectAll(e.target.checked);
                          if (e.target.checked) {
                            setSelectedLogs(filteredLog.map(item => item.ID_Panggilan));
                          } else {
                            setSelectedLogs([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200 w-12">No</th>
                    <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200">Jadwal & Log</th>
                    <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200">Data Siswa</th>
                    <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200">Kasus / Alasan</th>
                    <th className="px-6 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Aksi</th>
                  </tr>
                  <tr className="bg-slate-50/50">
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <th key={num} className="py-1 text-center text-[8px] font-bold border-r border-slate-200 last:border-0 text-slate-400">{num}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLog.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center justify-center space-y-4 grayscale opacity-40">
                          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <PhoneCall className="w-8 h-8 text-slate-300" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Belum ada rekaman</p>
                            <p className="text-xs font-medium text-slate-400">Gunakan form di samping untuk membuat laporan baru.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredLog.slice(0, 5).map((item, idx) => {
                    const s = siswa.find(s => String(s.NISN) === String(item.NISN));
                    const isSelesai = item.Status_Selesai === 'Selesai';
                    const isSelected = selectedLogs.includes(item.ID_Panggilan);
                    return (
                      <tr key={item.ID_Panggilan} className={`hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${isSelected ? 'bg-red-50/30' : ''}`}>
                        <td className="px-4 py-4 text-center border-r border-slate-100">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLogs(prev => [...prev, item.ID_Panggilan]);
                              } else {
                                setSelectedLogs(prev => prev.filter(id => id !== item.ID_Panggilan));
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-4 text-center text-[10px] font-bold text-slate-400 italic border-r border-slate-100">{idx + 1}</td>
                        <td className="px-6 py-4 border-r border-slate-100">
                          <div className="flex flex-col">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tight">Jadwal Rencana:</span>
                              </div>
                              <span className="text-[12px] font-black text-slate-800 ml-3">{item.Tanggal_Pemanggilan ? formatDateIndo(item.Tanggal_Pemanggilan) : 'Belum Diatur'}</span>
                              <span className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-widest ml-3 opacity-60">Dibuat: {formatDateIndo(item.Tanggal)}</span>
                            </div>
                            <div className="mt-2 text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded w-fit">{item.ID_Panggilan}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 border border-white shadow-sm overflow-hidden shrink-0">
                              {s?.Picture ? <img src={s.Picture} className="w-full h-full object-cover" /> : (s?.Nama_Siswa?.charAt(0) || '?')}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-black text-slate-800 truncate">{s ? s.Nama_Siswa : item.NISN}</span>
                              <span className="text-[9px] font-bold text-slate-400">{item.NISN}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-slate-100">
                          <div className="space-y-1.5">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-black uppercase ${item.Kategori === 'Home Visit' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                              {item.Kategori}
                            </div>
                            <p className="text-[10px] font-bold text-slate-600 leading-tight">{item.Alasan}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            {isSelesai ? (
                              <div className="flex flex-col gap-1.5">
                                <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 flex items-center justify-center gap-2">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Selesai</span>
                                </div>
                                {item.Hasil_Pertemuan && (
                                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-[9px] text-slate-500 italic leading-tight line-clamp-2">{item.Hasil_Pertemuan}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => { setActiveCallId(item.ID_Panggilan); setIsTindakLanjutOpen(true); }}
                                className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
                              >
                                Tindak Lanjut
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateStatus(item.ID_Panggilan, isSelesai ? 'Pending' : 'Selesai')}
                                className="flex-1 text-[8px] font-bold text-slate-400 hover:text-emerald-500 uppercase tracking-tighter transition-colors text-center"
                              >
                                {isSelesai ? 'Batalkan Selesai' : 'Tandai Selesai'}
                              </button>
                              <button
                                onClick={() => handleDeleteLog(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus Log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Tindak Lanjut */}
      {isTindakLanjutOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Tindak Lanjut</h3>
              </div>
              <button onClick={() => setIsTindakLanjutOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTindakLanjut} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Catatan Hasil / Solusi</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-700 min-h-[120px] resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  placeholder="Tuliskan komitmen siswa, kesepakatan pertemuan dengan orang tua, dll..."
                  value={tindakLanjutNote}
                  onChange={e => setTindakLanjutNote(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Upload Bukti Fisik <span className="text-slate-400 normal-case tracking-normal font-medium">(Maks. 2 Foto)</span></label>
                
                <div className="grid grid-cols-2 gap-4">
                  {[0, 1].map((idx) => (
                    <div key={idx} className="relative border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center bg-white hover:bg-slate-50 hover:border-indigo-300 transition-colors cursor-pointer group h-32">
                      <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            setTindakLanjutFiles(prev => {
                              const next = [...prev];
                              next[idx] = file;
                              return next;
                            });
                          }
                        }}
                        accept="image/*"
                      />
                      {tindakLanjutFiles[idx] ? (
                        <div className="relative w-full h-full rounded-xl overflow-hidden shadow-sm">
                          <img src={URL.createObjectURL(tindakLanjutFiles[idx])} className="w-full h-full object-cover" alt={`Preview ${idx + 1}`} />
                          <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 p-1">
                             <p className="text-[8px] text-white font-black truncate text-center">{tindakLanjutFiles[idx].name}</p>
                          </div>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setTindakLanjutFiles(prev => {
                                const next = [...prev];
                                next[idx] = null;
                                return next;
                              });
                            }}
                            className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-lg hover:bg-rose-600 transition-colors shadow-lg"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors mb-2">
                             <PlusCircle className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-tighter">
                            Foto {idx + 1}
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium italic">* Anda dapat mengupload hingga 2 foto dokumentasi kunjungan.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsTindakLanjutOpen(false)} className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest flex-1 hover:bg-slate-200 hover:text-slate-700 transition-colors">Batal</button>
                <button type="submit" disabled={isUploading} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex-1 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center shadow-lg shadow-indigo-600/20 active:scale-95">
                  {isUploading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : 'Simpan Detail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Log Panggilan */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Hapus Log Panggilan?</h3>
              <p className="text-slate-500 mb-4 text-sm leading-relaxed">
                Anda akan menghapus log panggilan untuk <strong>{siswa.find(s => String(s.NISN) === String(deleteTarget.NISN))?.Nama_Siswa || deleteTarget.NISN}</strong>.
              </p>
              <p className="text-slate-500 mb-6 text-sm leading-relaxed">
                Tindakan ini akan <span className="text-red-600 font-bold underline">MEMPENGARUHI LAPORAN AKHIR WALI</span> dan <span className="text-red-600 font-bold underline">TIDAK DAPAT DIBATALKAN</span>.
              </p>

              <div className="mb-8">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ketik "HAPUS" untuk konfirmasi</label>
                <input
                  type="text"
                  className="input-field text-center font-bold tracking-[0.5em] focus:border-red-500 focus:ring-red-500/20"
                  placeholder="HAPUS"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); setConfirmInput(''); }}
                  className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 hover:text-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={confirmInput !== 'HAPUS' || deleting}
                  onClick={confirmDeleteLog}
                  className={`px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${
                    confirmInput !== 'HAPUS' || deleting
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200 active:scale-95'
                  }`}
                >
                  {deleting ? 'Menghapus...' : 'Hapus Log'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Massal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Hapus {selectedLogs.length} Log Panggilan?</h3>
              <p className="text-slate-500 mb-4 text-sm leading-relaxed">
                Anda akan menghapus <strong>{selectedLogs.length} log panggilan</strong> sekaligus.
              </p>
              <p className="text-slate-500 mb-6 text-sm leading-relaxed">
                Tindakan ini akan <span className="text-red-600 font-bold underline">MEMPENGARUHI LAPORAN AKHIR WALI</span> dan <span className="text-red-600 font-bold underline">TIDAK DAPAT DIBATALKAN</span>.
              </p>

              <div className="mb-8">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ketik "HAPUS" untuk konfirmasi</label>
                <input
                  type="text"
                  className="input-field text-center font-bold tracking-[0.5em] focus:border-red-500 focus:ring-red-500/20"
                  placeholder="HAPUS"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setShowBulkDeleteModal(false); setConfirmInput(''); }}
                  className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 hover:text-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={confirmInput !== 'HAPUS' || deleting}
                  onClick={async () => {
                    if (confirmInput !== 'HAPUS') return;
                    setDeleting(true);
                    try {
                      for (const id of selectedLogs) {
                        await fetchGAS('DELETE', { sheet: 'Log_Panggilan', id });
                      }
                      setLog(prev => prev.filter(item => !selectedLogs.includes(item.ID_Panggilan)));
                      showToast(`${selectedLogs.length} log panggilan berhasil dihapus.`, 'success');
                      setShowBulkDeleteModal(false);
                      setSelectedLogs([]);
                      setSelectAll(false);
                      setConfirmInput('');
                    } catch (error) {
                      console.error('Bulk delete gagal:', error);
                      showToast('Gagal menghapus log panggilan.', 'error');
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  className={`px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${
                    confirmInput !== 'HAPUS' || deleting
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200 active:scale-95'
                  }`}
                >
                  {deleting ? 'Menghapus...' : 'Hapus Semua'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
