import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchGAS } from '../utils/gasClient';
import { formatIDR } from '../utils/logic';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import Loading from '../components/Loading';
import Skeleton, { SkeletonStats, SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import PageGuide from '../components/PageGuide';
import { History, Users, Trash2, Edit2, X } from 'lucide-react';
import { sendNotification } from '../utils/notifications';


export default function Keuangan() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [keuangan, setKeuangan] = useState([]);
  const [siswa, setSiswa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [nominalIuran, setNominalIuran] = useState(0);

  const role = user?.role || 'Siswa';
  const canEdit = ['Bendahara', 'Wakil Bendahara'].includes(role);

  // Form State
  const [idSiswa, setIdSiswa] = useState('');
  const [jumlahInput, setJumlahInput] = useState('');
  const [tipe, setTipe] = useState('Masuk');
  const [keterangan, setKeterangan] = useState('');
  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [editingTrx, setEditingTrx] = useState(null);
  const formRef = useRef(null);
  const [draftTransaksi, setDraftTransaksi] = useState([]);

  const loadKeuangan = useCallback(async () => {
    setLoading(true);
    try {
      const [k, s, profil] = await Promise.all([
        fetchGAS('GET_ALL', { sheet: 'Keuangan' }),
        fetchGAS('GET_ALL', { sheet: 'Master_Siswa' }),
        fetchGAS('GET_ALL', { sheet: 'Profil_Wali_Kelas' })
      ]);

      setKeuangan((k.data || []).sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal)));
      const allSiswa = s.data || [];
      setSiswa(allSiswa.filter(st => st.Status_Aktif === 'Aktif'));

      // Ambil nominal iuran dari profil Wali Kelas (bisa dari user email atau yang pertama)
      if (profil.data && profil.data.length > 0) {
        const waliProfile = profil.data.find((p) => p.Email && p.Email.toLowerCase() === user.email.toLowerCase()) || profil.data[0];
        setNominalIuran(Number(waliProfile.Nominal_Iuran) || 0);
      }
    } catch (error) {
      console.error('Keuangan load error:', error);
      showToast('Gagal memuat data keuangan.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, user.email]);

  useEffect(() => {
    loadKeuangan();
  }, [loadKeuangan]);

  const totalKas = useMemo(() => {
    return keuangan.reduce((acc, curr) => {
      return curr.Tipe === 'Masuk' ? acc + Number(curr.Jumlah) : acc - Number(curr.Jumlah);
    }, 0);
  }, [keuangan]);

  const currentWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const currentWeekEnd = useMemo(() => endOfWeek(new Date(), { weekStartsOn: 1 }), []);

  const paidThisWeek = useMemo(() => {
    const paidSet = new Set();
    keuangan.forEach((trx) => {
      if (trx.Tipe !== 'Masuk') return;
      const date = new Date(trx.Tanggal);
      if (isWithinInterval(date, { start: currentWeekStart, end: currentWeekEnd })) {
        paidSet.add(trx.ID_Siswa);
      }
    });
    return paidSet;
  }, [keuangan, currentWeekStart, currentWeekEnd]);

  const activeStudents = useMemo(() => {
    return siswa.filter((item) => item.ID_Siswa && item.Status_Aktif !== 'Tidak Aktif');
  }, [siswa]);

  const unpaidKasThisWeek = useMemo(() => {
    return activeStudents.filter((item) => !paidThisWeek.has(item.ID_Siswa));
  }, [activeStudents, paidThisWeek]);

  // Laporan Tanggungan: siswa dan total yang sudah bayar
  const tanggunganReport = useMemo(() => {
    const report = {};
    activeStudents.forEach((student) => {
      report[student.ID_Siswa] = {
        siswa: student,
        totalBayar: 0,
        transaksiCount: 0,
        transaksi: []
      };
    });

    keuangan.forEach((trx) => {
      if (trx.Tipe === 'Masuk' && report[trx.ID_Siswa]) {
        report[trx.ID_Siswa].totalBayar += Number(trx.Jumlah);
        report[trx.ID_Siswa].transaksiCount += 1;
        report[trx.ID_Siswa].transaksi.push(trx);
      }
    });

    return Object.values(report).sort((a, b) => a.totalBayar - b.totalBayar);
  }, [activeStudents, keuangan]);

  const partialPayments = useMemo(() => {
    return tanggunganReport.filter((item) => item.totalBayar > 0 && item.totalBayar < nominalIuran);
  }, [tanggunganReport, nominalIuran]);

  const amountValue = Number(jumlahInput);
  const isAmountWarning = amountValue > 0 && ((amountValue < 50) || (amountValue > 50 && amountValue < 100));

  const filteredStudents = useMemo(() => {
    return activeStudents
      .filter((item) => {
        if (!studentSearch.trim()) return true;
        var lower = studentSearch.toLowerCase();
        return (
          (item.NISN || '').toString().toLowerCase().includes(lower) ||
          (item.Nama_Siswa || '').toLowerCase().includes(lower)
        );
      })
      .sort((a, b) => (a.Nama_Siswa || '').localeCompare(b.Nama_Siswa || ''));
  }, [activeStudents, studentSearch]);

  const cancelEdit = useCallback(() => {
    setEditingTrx(null);
    setIdSiswa('');
    setJumlahInput('');
    setTipe('Masuk');
    setKeterangan('');
    setTanggal(format(new Date(), 'yyyy-MM-dd'));
    setStudentSearch('');
  }, []);

const removeDraftTrx = useCallback((tempId) => {
  if (!window.confirm('Hapus draf transaksi ini?')) return;
  setDraftTransaksi(prev => prev.filter(trx => trx.tempId !== tempId));
}, []);

const saveAllDrafts = useCallback(async () => {
  if (draftTransaksi.length === 0) return;

  setSaving(true);
  try {
    const dataToSave = draftTransaksi.map(trx => ({
      ID_Transaksi: 'K' + trx.tempId,
      Tanggal: trx.Tanggal,
      ID_Siswa: trx.ID_Siswa,
      NISN: trx.NISN,
      Tipe: trx.Tipe,
      Jumlah: trx.Jumlah,
      Keterangan: trx.Keterangan
    }));

    await fetchGAS('BULK_CREATE', { sheet: 'Keuangan', data: dataToSave });

    // Send notifications for each transaction
    for (const trx of draftTransaksi) {
      const selectedStudent = activeStudents.find(s => String(s.ID_Siswa) === String(trx.ID_Siswa));
      const payerName = selectedStudent?.Nama_Siswa || trx.ID_Siswa;
      const isUnderpaid = trx.Tipe === 'Masuk' && trx.Jumlah < nominalIuran;

      await sendNotification(activeStudents, {
        subjectId: trx.ID_Siswa,
        targetRoles: ['Bendahara', 'Wakil Bendahara', 'Ketua Kelas', 'Wakil Ketua Kelas', 'Wali Kelas'],
        message: trx.Tipe === 'Masuk'
          ? `Halo! Ada kontribusi KAS baru nih dari ${payerName} sebesar ${formatIDR(trx.Jumlah)}${isUnderpaid ? ' (Belum Lunas)' : ''}. Dompet kelas makin sehat!`
          : `Info Pengeluaran: Ada dana kelas yang digunakan sebesar ${formatIDR(trx.Jumlah)} untuk ${trx.Keterangan || 'kebutuhan kelas'}.`,
        selfMessage: trx.Tipe === 'Masuk'
          ? (isUnderpaid
              ? `Terima kasih ya, ${payerName}! Kamu sudah mencicil KAS sebesar ${formatIDR(trx.Jumlah)}. Yuk semangat melunasi sisanya pelan-pelan!`
              : `Terima kasih ya, ${payerName}! Partisipasi KAS sebesar ${formatIDR(trx.Jumlah)} sudah kami terima. Kontribusimu sangat berarti untuk kegiatan kelas kita!`)
          : `Info Pengeluaran: Dana kelas digunakan sebesar ${formatIDR(trx.Jumlah)}.`,
        includeSelf: trx.Tipe === 'Masuk',
        type: isUnderpaid ? 'info' : 'success',
        waliEmail: user?.email
      });
    }

    showToast(`${draftTransaksi.length} transaksi berhasil disimpan.`, 'success');
    setDraftTransaksi([]);
    await loadKeuangan();
  } catch (error) {
    console.error('Simpan draft gagal:', error);
    showToast('Gagal menyimpan draf transaksi.', 'error');
  } finally {
    setSaving(false);
  }
}, [draftTransaksi, activeStudents, nominalIuran, loadKeuangan, showToast, user?.email]);

  const handleEdit = useCallback((trx) => {
    setEditingTrx(trx);
    setIdSiswa(trx.ID_Siswa);
    setJumlahInput(String(trx.Jumlah));
    setTipe(trx.Tipe);
    setKeterangan(trx.Keterangan || '');
    setTanggal(typeof trx.Tanggal === 'string' ? trx.Tanggal : new Date(trx.Tanggal).toISOString().split('T')[0]);
    
    // Scroll ke form dengan ref
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!idSiswa || amountValue <= 0 || isAmountWarning) return;

    const selectedStudent = activeStudents.find(s => String(s.ID_Siswa) === String(idSiswa));

    if (editingTrx) {
      // Edit mode still saves directly
      setSaving(true);
      try {
        const updatedData = {
          ID_Siswa: idSiswa,
          NISN: selectedStudent?.NISN || '',
          Tipe: tipe,
          Jumlah: amountValue,
          Keterangan: keterangan,
          Tanggal: tanggal
        };

        await fetchGAS('UPDATE', {
          sheet: 'Keuangan',
          id: editingTrx.ID_Transaksi,
          data: updatedData
        });

        const payerName = selectedStudent?.Nama_Siswa || idSiswa;
        await sendNotification(activeStudents, {
          subjectId: idSiswa,
          targetRoles: ['Bendahara', 'Wakil Bendahara', 'Wali Kelas'],
          message: `Update Keuangan: Transaksi ${payerName} sebesar ${formatIDR(amountValue)} telah diperbarui.`,
          selfMessage: `Info Keuangan: Transaksi pembayaran Anda sebesar ${formatIDR(amountValue)} telah diperbarui oleh Bendahara.`,
          includeSelf: true,
          type: 'info',
          waliEmail: user?.email
        });

        showToast('Transaksi berhasil diperbarui.', 'success');
        cancelEdit();
        await loadKeuangan();
      } catch (error) {
        console.error('Update transaksi gagal:', error);
        showToast('Gagal memperbarui transaksi.', 'error');
      } finally {
        setSaving(false);
      }
    } else {
      // Add to draft instead of saving directly
      const newDraft = {
        tempId: Date.now(),
        ID_Siswa: idSiswa,
        NISN: selectedStudent?.NISN || '',
        Tipe: tipe,
        Jumlah: amountValue,
        Keterangan: keterangan,
        Tanggal: tanggal,
        Nama_Siswa: selectedStudent?.Nama_Siswa || ''
      };

      setDraftTransaksi(prev => [...prev, newDraft]);
      showToast('Transaksi ditambahkan ke draf.', 'success');
      cancelEdit();
    }
  }, [idSiswa, amountValue, tipe, keterangan, tanggal, editingTrx, activeStudents, user?.email, nominalIuran, loadKeuangan, showToast, cancelEdit]);

  const handleDelete = useCallback(async (trxId) => {
    if (!canEdit) return;
    
    // Cari detail transaksi sebelum dihapus untuk kebutuhan notifikasi
    const trx = keuangan.find(t => String(t.ID_Transaksi) === String(trxId));
    if (!trx) return;

    if (!window.confirm('Apakah Anda yakin ingin membatalkan transaksi ini? Saldo akan disesuaikan kembali.')) return;

    setLoading(true);
    try {
      await fetchGAS('DELETE', { sheet: 'Keuangan', id: trxId });
      
      // Kirim notifikasi jika transaksi ini adalah pembayaran (Masuk)
      if (trx.Tipe === 'Masuk' && trx.ID_Siswa) {
        const studentName = activeStudents.find(s => String(s.ID_Siswa) === String(trx.ID_Siswa))?.Nama_Siswa || trx.ID_Siswa;
        
        await sendNotification(activeStudents, {
          subjectId: trx.ID_Siswa,
          targetRoles: ['Bendahara', 'Wakil Bendahara', 'Wali Kelas'],
          message: `Otoritas Keuangan: Transaksi KAS dari ${studentName} sebesar ${formatIDR(trx.Jumlah)} telah dibatalkan/dihapus oleh pengelola.`,
          selfMessage: `Info Pembatalan: Transaksi pembayaran KAS Anda sebesar ${formatIDR(trx.Jumlah)} telah dibatalkan oleh pengelola kelas. Silakan hubungi Bendahara jika ini adalah kekeliruan.`,
          includeSelf: true,
          type: 'warning',
          waliEmail: user?.email
        });
      }

      showToast('Transaksi berhasil dibatalkan.', 'success');
      await loadKeuangan();
    } catch (error) {
      console.error('Batal transaksi gagal:', error);
      showToast('Gagal membatalkan transaksi.', 'error');
    } finally {
      setLoading(false);
    }
  }, [canEdit, keuangan, activeStudents, loadKeuangan, showToast, user?.email]);

  if (loading) return <Loading message="Menyatukan aliran dana kelas..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Administrasi KAS {user?.managedClass && `- Kelas ${user.managedClass}`}</h2>
          <p className="text-sm text-slate-500">Kelola iuran dan pengeluaran kas kelas.</p>
          {nominalIuran > 0 && (
            <p className="text-xs text-slate-600 mt-1">
              <strong>Nominal Iuran Standar:</strong> Rp{nominalIuran.toLocaleString('id-ID')}
            </p>
          )}
        </div>
        <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg font-bold text-lg border border-emerald-200">
          Saldo: {formatIDR(totalKas)}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card xl:col-span-3 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Buku Kas Mingguan</h3>
              <p className="text-sm text-slate-500">Tampilkan siswa yang belum membayar kas kelas selama minggu ini.</p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Periode</div>
              <div className="font-semibold text-slate-800">{format(currentWeekStart, 'dd MMM')} - {format(currentWeekEnd, 'dd MMM yyyy')}</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">Total Siswa Aktif</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{activeStudents.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">Sudah Bayar Minggu Ini</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{activeStudents.length - unpaidKasThisWeek.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">Belum Bayar Minggu Ini</p>
              <p className="mt-2 text-2xl font-bold text-rose-700">{unpaidKasThisWeek.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">Bayar Kurang (Belum Tuntas)</p>
              <p className="mt-2 text-2xl font-bold text-yellow-700">{partialPayments.length}</p>
            </div>
          </div>

          <div className="mt-6">
            {unpaidKasThisWeek.length === 0 ? (
              <EmptyState
                title="Semua Lunas!"
                description="Semua siswa sudah membayar kas minggu ini. Kerja bagus!"
                icon={Users}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 border-b">NISN</th>
                      <th className="px-4 py-3 border-b">Nama Siswa</th>
                      <th className="px-4 py-3 border-b">Jabatan</th>
                      <th className="px-4 py-3 border-b">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unpaidKasThisWeek.map((item) => (
                      <tr key={item.ID_Siswa} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{item.ID_Siswa} | {item.NISN || '-'}</td>
                        <td className="px-4 py-3">{item.Nama_Siswa}</td>
                        <td className="px-4 py-3">{item.Kelas || item.Jabatan || '-'}</td>
                        <td className="px-4 py-3 text-rose-700 font-semibold">Belum Bayar</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Siswa yang Sudah Bayar tetapi Belum Tuntas</h3>
                <p className="text-sm text-slate-500">Menampilkan pembayaran sebagian yang belum mencapai nominal iuran standar.</p>
              </div>
              <div className="text-sm text-slate-500">
                Total: <span className="font-semibold text-yellow-700">{partialPayments.length}</span>
              </div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 border-b">NISN</th>
                    <th className="px-4 py-3 border-b">Nama Siswa</th>
                    <th className="px-4 py-3 border-b">Total Bayar</th>
                    <th className="px-4 py-3 border-b">Sisa Tanggungan</th>
                    <th className="px-4 py-3 border-b">Jumlah Transaksi</th>
                  </tr>
                </thead>
                <tbody>
                  {partialPayments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-slate-400">Tidak ada siswa dengan pembayaran sebagian saat ini.</td>
                    </tr>
                  ) : partialPayments.map((item) => {
                    const sisa = Math.max(0, nominalIuran - item.totalBayar);
                    return (
                      <tr key={item.siswa.ID_Siswa} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{item.siswa.ID_Siswa} | {item.siswa.NISN || '-'}</td>
                        <td className="px-4 py-3">{item.siswa.Nama_Siswa}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{formatIDR(item.totalBayar)}</td>
                        <td className="px-4 py-3 font-semibold text-yellow-700">{formatIDR(sisa)}</td>
                        <td className="px-4 py-3 text-center">{item.transaksiCount}x</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <PageGuide 
        title="Panduan Kas & Tabungan:"
        steps={[
          'Pilih nama siswa melalui fitur pencarian untuk mencatat transaksi.',
          'Masukkan <span class="font-black">Nominal</span> dan pilih <span class="font-black text-emerald-700">Tipe Transaksi</span> (Masuk/Keluar).',
          'Berikan <span class="font-black italic">Keterangan</span> singkat untuk setiap transaksi agar riwayat lebih jelas.',
          'Saldo akhir siswa akan otomatis dihitung berdasarkan seluruh riwayat transaksi yang ada.',
          'Gunakan tab <span class="font-black">Riwayat</span> untuk melihat daftar transaksi terbaru di kelas.'
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Input */}
        <div className="card lg:col-span-1 h-fit relative" ref={formRef}>
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h3 className="font-semibold text-slate-800">{editingTrx ? 'Edit Transaksi' : 'Input Transaksi'}</h3>
            {editingTrx && (
              <button 
                onClick={cancelEdit}
                className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                title="Batal Edit"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {!canEdit ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Hanya Bendahara dan Wakil Bendahara yang dapat menambah atau mengubah transaksi kas. Wali Kelas, Ketua Kelas, dan Wakil Ketua Kelas dapat melihat riwayat tanpa mengubah data.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cari Siswa</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Cari berdasarkan nama atau NISN"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Siswa</label>
                <select
                  className="input-field"
                  value={idSiswa}
                  onChange={(e) => setIdSiswa(e.target.value)}
                  required
                >
                  <option value="">-- Pilih Siswa --</option>
                  {filteredStudents.map(s => (
                    <option key={s.ID_Siswa} value={s.ID_Siswa}>{s.Nama_Siswa} ({s.ID_Siswa})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    className="input-field"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipe</label>
                  <select className="input-field" value={tipe} onChange={(e) => setTipe(e.target.value)}>
                    <option value="Masuk">Masuk</option>
                    <option value="Keluar">Keluar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Jumlah Aktual (Rp)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="Contoh: 10200"
                  value={jumlahInput}
                  onChange={(e) => setJumlahInput(e.target.value)}
                  onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                  onWheel={(e) => e.target.blur()}
                  required
                  min="0"
                />
                {jumlahInput && Number(jumlahInput) > 0 && (
                  <p className="text-xs mt-2 text-brand-600 font-medium bg-brand-50 p-2 rounded">
                    Nominal yang disimpan: {formatIDR(Number(jumlahInput))}
                  </p>
                )}
                {isAmountWarning && (
                  <p className="text-xs mt-2 text-rose-700 font-medium bg-rose-50 p-2 rounded border border-rose-100">
                    Peringatan: untuk angka di bawah 50 atau 51-99, gunakan nilai 50 atau kelipatan 100.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Keterangan</label>
                <input
                  type="text"
                  className="input-field"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Bayar kas bulan April"
                />
              </div>

               <div className="flex gap-2">
                 <button type="submit" className="btn-primary flex-1" disabled={saving || isAmountWarning}>
                   {saving ? 'Menyimpan...' : (editingTrx ? 'Update Transaksi' : 'Tambah ke Draf')}
                 </button>
                 {editingTrx && (
                   <button type="button" onClick={cancelEdit} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">
                     Batal
                   </button>
                 )}
               </div>
             </form>
          )}
        </div>
        {/* History Table */}
        <div className="card lg:col-span-2 p-0">
          {keuangan.length === 0 ? (
            <EmptyState
              title="Belum Ada Transaksi"
              description="Catat transaksi masuk atau keluar pertama Anda menggunakan form di sebelah kiri."
              icon={History}
            />
          ) : (
          <div className="overflow-x-auto">
              <table className="modern-table w-full">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>ID Siswa</th>
                    <th>Siswa</th>
                    <th>Tipe</th>
                    <th>Jumlah</th>
                    <th>Keterangan</th>
                    {canEdit && <th className="text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {keuangan.slice(0, 10).map(trx => {
                    const s = siswa.find(s => s.ID_Siswa === trx.ID_Siswa);
                    return (
                      <tr key={trx.ID_Transaksi} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3">{typeof trx.Tanggal === 'string' ? trx.Tanggal : new Date(trx.Tanggal).toISOString().split('T')[0]}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{trx.ID_Siswa}</td>
                        <td className="px-4 py-3">{s ? s.Nama_Siswa : '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${trx.Tipe === 'Masuk' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {trx.Tipe}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">{formatIDR(trx.Jumlah)}</td>
                        <td className="px-4 py-3 text-xs">{trx.Keterangan || '-'}</td>
                        {canEdit && (
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEdit(trx)}
                                className="p-2 text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                                title="Edit Transaksi"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(trx.ID_Transaksi)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Batalkan Transaksi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {keuangan.length > 10 && (
                <div className="px-4 py-3 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-400 font-medium">
                    + {keuangan.length - 10} transaksi lainnya tersimpan di Google Sheets
                  </p>
                </div>
              )}
             </div>
           )}
        </div>
      </div>

      {/* Draft Transactions Table - Full Width */}
      {draftTransaksi.length > 0 && (
        <div className="mt-6">
          <div className="card p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200 bg-amber-50">
              <h3 className="font-semibold text-amber-800">
                Draf Transaksi ({draftTransaksi.length})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={saveAllDrafts}
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : `Simpan Semua (${draftTransaksi.length})`}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Hapus semua draf transaksi?')) {
                      setDraftTransaksi([]);
                    }
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-600 text-sm rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Batal Semua Draf
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="modern-table w-full">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap">Tanggal</th>
                    <th className="whitespace-nowrap">ID Siswa</th>
                    <th className="whitespace-nowrap">Siswa</th>
                    <th className="whitespace-nowrap">Tipe</th>
                    <th className="whitespace-nowrap">Jumlah</th>
                    <th className="whitespace-nowrap">Keterangan</th>
                    <th className="text-center whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {draftTransaksi.map(draft => (
                    <tr key={draft.tempId} className="border-b last:border-0 bg-amber-50 hover:bg-amber-100">
                      <td className="px-4 py-3 whitespace-nowrap">{draft.Tanggal}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{draft.ID_Siswa}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{draft.Nama_Siswa || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${draft.Tipe === 'Masuk' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {draft.Tipe}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{formatIDR(draft.Jumlah)}</td>
                      <td className="px-4 py-3 text-xs">{draft.Keterangan || '-'}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => removeDraftTrx(draft.tempId)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Draf"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
