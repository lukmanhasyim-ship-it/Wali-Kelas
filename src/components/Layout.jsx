import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardList, CalendarCheck,
  Wallet, PhoneCall, LogOut, Sun, Moon, FileText,
  Edit3, User, Settings, Bell, BookOpen, LibraryBig
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Toast from './Toast';
import NotificationDrawer from './NotificationDrawer';
import appLogo from '../assets/logo.png';
import { fetchGAS } from '../utils/gasClient';

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2 md:p-3 rounded-2xl transition-all duration-500 group relative ${isActive
          ? 'bg-emerald-800 text-white shadow-xl shadow-emerald-200/50 font-bold md:translate-x-1'
          : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
        }`
      }
    >
      <Icon className={`w-5 h-5 md:w-5 md:h-5 transition-transform duration-300 group-hover:scale-110`} />
      <span className="hidden md:block text-sm">{label}</span>
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]);
  const prevNotifIds = React.useRef(new Set());

  const role = user?.role || 'Siswa';

  React.useEffect(() => {
    async function loadNotifs() {
      try {
        const res = await fetchGAS('GET_NOTIFICATIONS', { role, email: user?.email });
        if (res.status === 'success') {
          const mapped = res.data.map(n => ({
            id: String(n.ID),
            message: String(n.Message),
            type: String(n.Type || 'info'),
            timestamp: n.Timestamp,
            isRead: String(n.Is_Read).toLowerCase() === 'true'
          }));

          // Browser Notification Logic
          if (prevNotifIds.current.size > 0) { // Don't notify on first load
            mapped.forEach(n => {
              if (!prevNotifIds.current.has(n.id) && !n.isRead) {
                showBrowserNotification(n.message);
              }
            });
          }
          prevNotifIds.current = new Set(mapped.map(n => n.id));

          setNotifications(mapped);
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    }
    if (user) {
      loadNotifs();
      requestNotificationPermission();
    }

    // Optional: Refresh notifications every 2 minutes
    const interval = setInterval(() => {
      if (user) loadNotifs();
    }, 120000);

    return () => clearInterval(interval);
  }, [user, role]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const showBrowserNotification = (message) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    new Notification("SISWA.HUB", {
      body: message,
      icon: appLogo,
    });
  };
  const handleMarkAsRead = async (id) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      await fetchGAS('MARK_NOTIF_READ', { id });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const access = {
    dashboard: ['Wali Kelas', 'Ketua Kelas', 'Bendahara', 'Sekretaris', 'Siswa'].includes(role),
    siswa: ['Wali Kelas'].includes(role),
    laporan: ['Wali Kelas'].includes(role),
    bukuKlaper: ['Wali Kelas'].includes(role),
    dkn: ['Wali Kelas'].includes(role),
    presensiPagi: ['Wali Kelas', 'Ketua Kelas', 'Sekretaris'].includes(role),
    presensiSiang: ['Wali Kelas', 'Ketua Kelas', 'Sekretaris'].includes(role),
    keuangan: ['Wali Kelas', 'Ketua Kelas', 'Bendahara'].includes(role),
    panggilan: ['Wali Kelas'].includes(role),
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col bg-white border-r border-slate-100/50 shadow-sm z-30 sticky top-0 h-screen w-72 transition-all duration-500 ease-in-out print:hidden">
        <div className="p-4 md:p-6 mb-2">
          <div className="flex items-center gap-4 group transition-all duration-500">
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-50 transition-all duration-300 group-hover:shadow-md">
              <img src={appLogo} alt="Logo SMK" className="h-10 w-auto object-contain" />
            </div>
            <div className="flex flex-col animate-fade-in">
              <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">
                SISWA<span className="text-[#008647]">.HUB</span>
              </h1>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                SMKS AL AZHAR SEMPU
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {access.dashboard && <NavItem to="dashboard" icon={LayoutDashboard} label="Dashboard" />}
          {access.siswa && <NavItem to="master-siswa" icon={Users} label="Data Siswa" />}
          {access.bukuKlaper && <NavItem to="buku-klaper" icon={BookOpen} label="Buku Klaper" />}
          {access.dkn && <NavItem to="dkn" icon={LibraryBig} label="Daftar Nilai (DKN)" />}
          {access.keuangan && <NavItem to="tanggungan" icon={ClipboardList} label="Tanggungan KAS" />}


          {access.presensiPagi && <NavItem to="presensi-pagi" icon={Sun} label="Presensi Pagi" />}
          {access.presensiSiang && <NavItem to="presensi-siang" icon={Moon} label="Presensi Siang" />}
          {access.laporan && <NavItem to="laporan" icon={FileText} label="Laporan Akhir" />}
          {access.keuangan && <NavItem to="keuangan" icon={Wallet} label="KAS Kelas" />}
          {access.panggilan && <NavItem to="panggilan" icon={PhoneCall} label="Log Panggilan" />}
        </nav>

        <div className="p-6 mt-auto">
          <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:rotate-12 transition-transform">
              <Settings className="w-12 h-12" />
            </div>
            <div className="flex items-center gap-3 relative z-10">
              {user?.picture ? (
                <img src={user.picture} alt="User" className="w-10 h-10 rounded-2xl shadow-sm border-2 border-white" />
              ) : (
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-sm uppercase">
                  {user?.name?.charAt(0)}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 font-semibold">{role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-4 flex w-full items-center justify-center gap-2 p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-[11px] uppercase tracking-wider"
            >
              <LogOut className="w-4 h-4" />
              Keluar Sesi
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-x-hidden">
        {/* Header Bar */}
        <header className="bg-white/70 backdrop-blur-md sticky top-0 z-20 px-4 md:px-8 py-4 border-b border-slate-100 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4 text-slate-400">
            {/* Branding or Breadcrumbs can go here if needed */}
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`relative p-2 rounded-xl transition-all ${isNotifOpen ? 'bg-emerald-50 text-[#008647]' : 'hover:bg-slate-50 hover:text-slate-400'}`}
              >
                <Bell className="w-5 h-5 transition-transform group-hover:rotate-12" />
                {notifications.some(n => !n.isRead) && (
                  <span className="absolute top-2 right-2.1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>

              <NotificationDrawer
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
              />
            </div>

            <div className="h-4 w-px bg-slate-100 mx-1" />

            <div className="text-right hidden sm:block">
              <p className="text-[11px] font-black text-slate-900 leading-none">{user?.name}</p>
              <div className="flex items-center justify-end gap-1.5 mt-1">
                <p className="text-[9px] font-bold text-[#fdb813] uppercase tracking-widest">{role}</p>
                {user?.managedClass && (
                  <>
                    <span className="text-[8px] text-slate-300">•</span>
                    <span className="bg-emerald-50 text-[#008647] px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border border-emerald-100/50">
                      Kelas {user.managedClass}
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => navigate('/profile')}
              className="w-10 h-10 rounded-2xl overflow-hidden shadow-md hover:ring-4 hover:ring-emerald-50 transition-all border-2 border-white flex-shrink-0"
            >
              {user?.picture ? (
                <img src={user.picture} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center"><User className="w-5 h-5 text-slate-400" /></div>
              )}
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto space-y-8 animate-slide-up">
            <Outlet />

            <footer className="mt-20 pt-8 border-t border-slate-100 print:hidden">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Wali Kelas Digital Project &copy; 2026</p>
                <p className="text-[10px] font-medium text-slate-500 italic">Designed with precision by Mohamad Lukman Nurhasyim, S.Kom, Gr.</p>
              </div>
            </footer>
          </div>
        </div>
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-2xl border-t border-slate-100 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] flex justify-around items-center px-2 z-50 print:hidden">
        {access.dashboard && <NavItem to="dashboard" icon={LayoutDashboard} label="Home" />}
        {access.presensiPagi && <NavItem to="presensi-pagi" icon={Sun} label="Pagi" />}
        {access.presensiSiang && <NavItem to="presensi-siang" icon={Moon} label="Siang" />}
        {access.keuangan && <NavItem to="keuangan" icon={Wallet} label="KAS" />}
        <button
          onClick={() => navigate('/profile')}
          className="p-2 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
        >
          <User className="w-5 h-5" />
        </button>
      </nav>

      <Toast />
    </div>
  );
}
