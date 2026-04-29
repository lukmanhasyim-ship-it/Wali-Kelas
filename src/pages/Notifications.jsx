import React from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Bell, Info, AlertTriangle, CheckCircle2, ArrowLeft, Trash2, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchGAS } from '../utils/gasClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';
import PageGuide from '../components/PageGuide';

export default function Notifications() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const role = user?.role || 'Siswa';

  const loadNotifs = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchGAS('GET_NOTIFICATIONS', { role, email: user?.email });
      if (res.status === 'success') {
        const mapped = res.data.map(n => ({
          id: String(n.ID),
          message: String(n.Message),
          type: String(n.Type || 'info'),
          timestamp: n.Timestamp,
          isRead: String(n.Is_Read).toLowerCase() === 'true'
        }));
        setNotifications(mapped);
      }
    } catch (err) {
      showToast('Gagal memuat riwayat notifikasi', 'error');
    } finally {
      setLoading(false);
    }
  }, [role, user?.email, showToast]);

  const handleDeleteNotif = async (id) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      await fetchGAS('DELETE_NOTIF', { id });
      showToast('Notifikasi dihapus', 'success');
    } catch (err) {
      showToast('Gagal menghapus notifikasi', 'error');
      loadNotifs(); // Revert on fail
    }
  };

  React.useEffect(() => {
    if (user) loadNotifs();
  }, [user, loadNotifs]);

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.isRead);
      if (unread.length === 0) return;

      showToast('Menempel status baca...', 'info');
      await Promise.all(unread.map(n => fetchGAS('MARK_NOTIF_READ', { id: n.id })));
      loadNotifs();
      showToast('Semua notifikasi ditandai telah dibaca', 'success');
    } catch (err) {
      showToast('Gagal memperbarui status', 'error');
    }
  };


  const handleDeleteAll = async () => {
    if (notifications.length === 0) return;
    if (!window.confirm('Apakah Anda yakin ingin menghapus seluruh riwayat notifikasi? Tindakan ini tidak dapat dibatalkan.')) return;
    
    try {
      setLoading(true);
      showToast('Membersihkan riwayat...', 'info');
      // Batch delete current notifications
      await Promise.all(notifications.map(n => fetchGAS('DELETE_NOTIF', { id: n.id })));
      setNotifications([]);
      showToast('Seluruh riwayat berhasil dibersihkan.', 'success');
    } catch (err) {
      console.error('Delete all failed:', err);
      showToast('Gagal membersihkan riwayat.', 'error');
      loadNotifs();
    } finally {
      setLoading(false);
    }
  };

  const handleResetAll = async () => {
    if (!window.confirm('PERHATIAN: Ini akan menghapus SEMUA notifikasi untuk semua pengguna. Lanjutkan?')) return;
    
    try {
      setLoading(true);
      showToast('Mereset semua notifikasi...', 'info');
      const res = await fetchGAS('RESET_ALL_NOTIFICATIONS', { email: user?.email });
      if (res.status === 'success') {
        setNotifications([]);
        showToast('Semua notifikasi berhasil direset.', 'success');
      } else {
        throw new Error('Gagal reset notifikasi');
      }
    } catch (err) {
      console.error('Reset all failed:', err);
      showToast('Gagal mereset notifikasi.', 'error');
    } finally {
      setLoading(false);
    }
  };


  if (loading) return <Loading message="Memuat notifikasi..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Riwayat Notifikasi</h2>
            <p className="text-sm text-slate-500 font-medium">Pantau aktivitas dan pengumuman kelas Anda.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            disabled={!notifications.some(n => !n.isRead)}
            className="btn-secondary flex items-center gap-2 group disabled:opacity-50 !py-2.5"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-widest">Tandai Dibaca</span>
          </button>
          
          <button
            onClick={handleDeleteAll}
            disabled={notifications.length === 0}
            className="btn-secondary flex items-center gap-2 group hover:!bg-rose-50 hover:!text-rose-600 hover:!border-rose-100 disabled:opacity-50 !py-2.5"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Hapus Semua</span>
          </button>

          {role === 'Wali Kelas' && (
            <button
              onClick={handleResetAll}
              className="btn-secondary flex items-center gap-2 group hover:!bg-red-50 hover:!text-red-600 hover:!border-red-100 !py-2.5"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Reset Semua</span>
            </button>
          )}
        </div>
      </div>

      <PageGuide 
        title="Pusat Notifikasi:"
        steps={[
          'Pantau seluruh aktivitas transaksi kas dan absensi secara real-time.',
          'Notifikasi yang muncul disesuaikan dengan peran (Role) Anda di kelas.',
          'Gunakan filter riwayat untuk mencari notifikasi pada periode tertentu.'
        ]}
      />

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="card py-20 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Bell className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Tidak Ada Notifikasi Baru</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
              Semua info penting akan muncul di sini saat tersedia.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`card p-6 transition-all border-l-4 ${n.isRead ? 'opacity-80 border-slate-200 shadow-sm' : 'border-[#008647] shadow-lg shadow-emerald-500/5'
                }`}
            >
              <div className="flex gap-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${n.type === 'alert' ? 'bg-rose-50 text-rose-500' :
                    n.type === 'success' ? 'bg-emerald-50 text-emerald-500' :
                      'bg-blue-50 text-blue-500'
                  }`}>
                  {n.type === 'alert' ? <AlertTriangle className="w-6 h-6" /> :
                    n.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> :
                      <Info className="w-6 h-6" />}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <p className={`text-base leading-relaxed flex-1 ${n.isRead ? 'text-slate-600 font-medium' : 'text-slate-900 font-bold'}`}>
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!n.isRead && (
                        <span className="px-3 py-1 bg-emerald-100 text-[#008647] text-[10px] font-black uppercase tracking-widest rounded-full">
                          Baru
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotif(n.id);
                        }}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2 border-t border-slate-50">
                    <span className="flex items-center gap-1.5">
                      {format(new Date(n.timestamp), 'HH:mm', { locale: id })}
                    </span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span>{format(new Date(n.timestamp), 'dd MMMM yyyy', { locale: id })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
