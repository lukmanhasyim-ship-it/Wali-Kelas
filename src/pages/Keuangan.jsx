import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchGAS } from '../utils/gasClient';
import { formatIDR } from '../utils/logic';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import Loading from '../components/Loading';
import Skeleton, { SkeletonStats, SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import PageGuide from '../components/PageGuide';
import { History, Users } from 'lucide-react';
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
  const canEdit = ['Bendahara'].includes(role);

  // Form State
  const [idSiswa, setIdSiswa] = useState('');
  const [jumlahInput, setJumlahInput] = useState('');
  const [tipe, setTipe] = useState('Masuk');
  const [keterangan, setKeterangan] = useState('');

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

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!idSiswa || amountValue <= 0 || isAmountWarning) return;

    const selectedStudent = activeStudents.find(s => String(s.ID_Siswa) === String(idSiswa));
    
    const newTrx = {
      ID_Transaksi: 'K' + Date.now(),
      Tanggal: format(new Date(), 'yyyy-MM-dd'),
      ID_Siswa: idSiswa,
      NISN: selectedStudent?.NISN || '', // Pastikan NISN ikut tersimpan
      Tipe: tipe,
      Jumlah: amountValue,
      Keterangan: keterangan
    };

    setSaving(true);
    try {
      await fetchGAS('CREATE', { sheet: 'Keuangan', data: newTrx });

      // Notify relevant parties via utility
      const payerName = activeStudents.find(s => String(s.ID_Siswa) === String(idSiswa))?.Nama_Siswa || idSiswa;
      const isUnderpaid = tipe === 'Masuk' && amountValue < nominalIuran;

      await sendNotification(activeStudents, {
        subjectId: idSiswa,
        targetRoles: ['Bendahara', 'Ketua Kelas', 'Wali Kelas'],
        message: tipe === 'Masuk'
          ? `Halo! Ada kontribusi KAS baru nih dari ${payerName} sebesar ${formatIDR(amountValue)}${isUnderpaid ? ' (Belum Lunas)' : ''}. Dompet kelas makin sehat!`
          : `Info Pengeluaran: Ada dana kelas yang digunakan sebesar ${formatIDR(amountValue)} untuk ${keterangan || 'kebutuhan kelas'}.`,
        selfMessage: tipe === 'Masuk'
          ? (isUnderpaid 
              ? `Terima kasih ya, ${payerName}! Kamu sudah mencicil KAS sebesar ${formatIDR(amountValue)}. Yuk semangat melunasi sisanya pelan-pelan!`
              : `Terima kasih ya, ${payerName}! Partisipasi KAS sebesar ${formatIDR(amountValue)} sudah kami terima. Kontribusimu sangat berarti untuk kegiatan kelas kita!`)
          : `Info Pengeluaran: Dana kelas digunakan sebesar ${formatIDR(amountValue)}.`,
        includeSelf: tipe === 'Masuk',
        type: isUnderpaid ? 'info' : 'success',
        waliEmail: user?.email
      });

      showToast('Transaksi berhasil disimpan.', 'success');
      setIdSiswa('');
      setJumlahInput('');
      setKeterangan('');
      setStudentSearch('');
      await loadKeuangan();
    } catch (error) {
      console.error('Simpan transaksi gagal:', error);
      showToast('Gagal menyimpan transaksi.', 'error');
    } finally {
      setSaving(false);
    }
  }, [idSiswa, amountValue, tipe, keterangan, showToast, loadKeuangan]);

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
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">Total Siswa Aktif</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{activeStudents.length}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">Sudah Bayar Minggu Ini</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{activeStudents.length - unpaidKasThisWeek.length}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">Belum Bayar Minggu Ini</p>
              <p className="mt-2 text-2xl font-bold text-rose-700">{unpaidKasThisWeek.length}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
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
            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
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
        <div className="card lg:col-span-1 h-fit">
          <h3 className="font-semibold text-slate-800 mb-4 border-b pb-2">Input Transaksi</h3>
          {!canEdit ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Hanya Bendahara yang dapat menambah atau mengubah transaksi kas. Wali Kelas dan Ketua Kelas dapat melihat riwayat tanpa mengubah data.
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

              <button type="submit" className="btn-primary w-full" disabled={saving || isAmountWarning}>
                {saving ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
            </form>
          )}
        </div>
        {/* History Table */}
        <div className="card lg:col-span-2 overflow-hidden p-0">
          {keuangan.length === 0 ? (
            <EmptyState
              title="Belum Ada Transaksi"
              description="Catat transaksi masuk atau keluar pertama Anda menggunakan form di sebelah kiri."
              icon={History}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 border-b">Tanggal</th>
                    <th className="px-4 py-3 border-b">NISN</th>
                    <th className="px-4 py-3 border-b">Siswa</th>
                    <th className="px-4 py-3 border-b">Tipe</th>
                    <th className="px-4 py-3 border-b">Jumlah</th>
                    <th className="px-4 py-3 border-b">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {keuangan.map(trx => {
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
