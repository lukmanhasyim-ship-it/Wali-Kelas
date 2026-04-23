import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardList, CalendarCheck,
  Wallet, PhoneCall, LogOut, Sun, Moon, FileText,
  Edit3, User, Settings, Bell, BookOpen, LibraryBig,
  ChevronLeft, ChevronRight, Search, Calendar, Menu, X
} from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import { useAuth } from '../context/AuthContext';
import Toast from './Toast';
import NotificationDrawer from './NotificationDrawer';
import SearchModal from './SearchModal';
import appLogo from '../assets/logo.png';
import { fetchGAS } from '../utils/gasClient';

function NavItem({ to, icon: Icon, label, collapsed, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center ${collapsed ? 'justify-center w-12 h-12 mx-auto' : 'gap-3 px-4 py-3'} rounded-2xl transition-all duration-300 group ${
          isActive
            ? 'bg-emerald-50 text-[#008647]'
            : 'text-slate-500 hover:bg-emerald-50 hover:text-[#008647]'
        }`
      }
      title={collapsed ? label : ''}
    >
      <Icon className={`w-5 h-5 transition-all duration-300 ${collapsed ? 'group-hover:scale-125' : 'group-hover:scale-110'}`} />
      {!collapsed && (
        <span className="text-[13px] font-bold tracking-tight animate-in fade-in slide-in-from-left-2 duration-300">
          {label}
        </span>
      )}
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
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [notifications, setNotifications] = React.useState([]);
  const [students, setStudents] = React.useState([]);
  const prevNotifIds = React.useRef(new Set());

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

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
    async function loadStudents() {
      try {
        const res = await fetchGAS('GET_ALL', { sheet: 'Master_Siswa' });
        if (res.status === 'success') {
          setStudents(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load students:', err);
      }
    }

    if (user) {
      loadNotifs();
      loadStudents();
      requestNotificationPermission();
    }

    // Optional: Refresh notifications every 2 minutes
    const interval = setInterval(() => {
      if (user) loadNotifs();
    }, 120000);

    return () => clearInterval(interval);
  }, [user, role]);

  // Global Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleMarkAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await fetchGAS('MARK_ALL_NOTIFS_READ', { role, email: user?.email });
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
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
    laporanHarian: ['Wali Kelas'].includes(role),
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans relative overflow-hidden">
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-[90] md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar for Desktop and Mobile */}
      <aside 
        className={`fixed inset-y-0 left-0 z-[100] h-screen bg-white border-r border-slate-100/50 transition-all duration-300 ease-in-out print:hidden flex flex-col ${
          isMobileOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full md:translate-x-0'
        } ${isSidebarCollapsed ? 'md:w-20 md:shadow-sm' : 'md:w-72 md:shadow-xl'}`}
      >
        <div className={`p-4 ${isSidebarCollapsed ? 'md:p-4' : 'md:p-6'} mb-2 relative flex items-center justify-between`}>
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-full' : 'gap-4'} transition-all duration-300`}>
            <div className={`bg-white p-2 rounded-2xl border border-slate-50 transition-all duration-300 ${isSidebarCollapsed ? 'shadow-sm' : ''}`}>
              <img src={appLogo} alt="Logo SMK" className="h-10 w-auto object-contain" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300 whitespace-nowrap overflow-hidden">
                <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">
                  SISWA<span className="text-[#008647]">.HUB</span>
                </h1>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  SMKS AL AZHAR SEMPU
                </p>
              </div>
            )}
          </div>
          
          {/* Mobile Close Button */}
          <button 
            className="md:hidden p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg absolute right-4"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Toggle Button */}
          <button 
            className="hidden md:flex absolute -right-3 top-8 bg-white border border-slate-200 text-slate-400 hover:text-[#008647] hover:border-[#008647] rounded-full p-1 shadow-sm transition-all z-10"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className={`flex-1 ${isSidebarCollapsed ? 'px-2' : 'px-4'} space-y-1 overflow-y-auto custom-scrollbar`}>
          {access.dashboard && <NavItem to="dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={isSidebarCollapsed} onClick={() => setIsMobileOpen(false)} />}
          
          <div className={`${isSidebarCollapsed ? 'my-2 mx-auto w-8' : 'my-4 px-4'} h-px bg-slate-200`} />
          <span className={`${isSidebarCollapsed ? 'hidden' : 'block'} text-[9px] font-black text-slate-300 uppercase tracking-widest px-4`}>Manajemen Data</span>
          {access.siswa && <NavItem to="master-siswa" icon={Users} label="Data Siswa" collapsed={isSidebarCollapsed} onClick={() => setIsMobileOpen(false)} />}
          {access.bukuKlaper && <NavItem to="buku-klaper" icon={BookOpen} label="Buku Klaper" collapsed={isSidebarCollapsed} onClick={() => setIsMobileOpen(false)} />}
          {access.dkn && <NavItem to="dkn" icon={LibraryBig} label="Leger" collapsed={isSidebarCollapsed} onClick={() => setIsMobileOpen(false)} />}

          <div className={`${isSidebarCollapsed ? 'my-2 mx-auto w-8' : 'my-4 px-4'} h-px bg-slate-200`} />
          <span className={`${isSidebarCollapsed ? 'hidden' : 'block'} text-[9px] font-black text-slate-300 uppercase tracking-widest px-4`}>Keuangan</span>
          {access.keuangan && <NavItem to="tanggungan" icon={ClipboardList} label="Tanggungan KAS" collapsed={isSidebarCollapsed} onClick={() => setIsMobileOpen(false)} />}
          {access.keuangan && <NavItem to="keuangan" icon={Wallet} label="KAS Kelas" collapsed={isSidebarCollapsed} onClick={() => setIsMobileOpen(false)} />}

          <div className={`${isSidebarCollapsed ? 'my-2 mx-auto w-8' : 'my-4 px-4'} h-px bg-slate-200`} />
          <span className={`${isSidebarCollapsed ? 'hidden' : 'block'} text-[9px] font-black text-slate-300 uppercase tracking-widest px-4`}>Presensi</span>
          {access.presensiPagi && <NavItem to="presensi-pagi" icon={Sun} label="Presensi Pagi" collapsed={isSidebarCollapsed} onClick={() => setIsMobileOpen(false)} />}
          {access.presensiSiang && <NavItem to="presensi-siang" icon={Moon} label="Presensi Siang" collapsed={isSidebarCollapsed} onClick={() => setIsMobileOpen(false)} />}
          <NavItem to="piket" icon={Calendar} label="Jadwal Piket" collapsed={isSidebarCollapsed} onClick={() => setIsMobileOpen(false)} />

          <div className={`${isSidebarCollapsed ? 'my-2 mx-auto w-8' : 'my-4 px-4'} h-px bg-slate-200`} />
          <span className={`${isSidebarCollapsed ? 'hidden' : 'block'} text-[9px] font-black text-slate-300 uppercase tracking-widest px-4`}>Pelaporan</span>
          {access.laporan && <NavItem to="laporan" icon={FileText} label="Laporan Akhir" collapsed={isSidebarCollapsed} onClick={() => setIsMobileOpen(false)} />}
          {access.laporanHarian && <NavItem to="laporan-harian" icon={CalendarCheck} label="Laporan Harian" collapsed={isSidebarCollapsed} onClick={() => setIsMobileOpen(false)} />}

          <div className={`${isSidebarCollapsed ? 'my-2 mx-auto w-8' : 'my-4 px-4'} h-px bg-slate-200`} />
          <span className={`${isSidebarCollapsed ? 'hidden' : 'block'} text-[9px] font-black text-slate-300 uppercase tracking-widest px-4`}>Komunikasi</span>
          {access.panggilan && <NavItem to="panggilan" icon={PhoneCall} label="Log Panggilan" collapsed={isSidebarCollapsed} onClick={() => setIsMobileOpen(false)} />}
        </nav>

        <div className={`${isSidebarCollapsed ? 'p-2' : 'p-6'} mt-auto`}>
          <div className={`${isSidebarCollapsed ? 'p-2' : 'p-4'} bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden group`}>
            {!isSidebarCollapsed && (
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:rotate-12 transition-transform">
                <Settings className="w-12 h-12" />
              </div>
            )}
            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} relative z-10`}>
              {user?.picture ? (
                <img src={user.picture} alt="User" className="w-10 h-10 rounded-2xl shadow-sm border-2 border-white" />
              ) : (
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-sm uppercase">
                  {user?.name?.charAt(0)}
                </div>
              )}
              {!isSidebarCollapsed && (
                <div className="overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">{role}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className={`mt-4 flex w-full items-center justify-center gap-2 ${isSidebarCollapsed ? 'p-2' : 'p-2.5'} text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-[11px] uppercase tracking-wider`}
              title={isSidebarCollapsed ? 'Keluar' : ''}
            >
              <LogOut className="w-4 h-4" />
              {!isSidebarCollapsed && <span>Keluar Sesi</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 min-h-screen overflow-x-hidden ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-72'}`}>
        {/* Header Bar */}
        <header className="bg-white sticky top-0 z-50 px-4 md:px-8 py-4 border-b border-slate-100 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <Breadcrumbs />
              <h2 className="hidden md:block text-sm font-black text-slate-800 uppercase tracking-tight">SISWA.HUB Platform</h2>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 group transition-all"
              title="Cari Siswa... (Ctrl+K)"
            >
              <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`relative p-2 rounded-xl transition-all ${isNotifOpen ? 'bg-emerald-50 text-[#008647]' : 'hover:bg-slate-50 hover:text-slate-400'}`}
              >
                <Bell className="w-5 h-5 transition-transform group-hover:rotate-12" />
                {notifications.some(n => !n.isRead) && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-sm animate-pulse z-10" />
                )}
              </button>

              <NotificationDrawer
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
                onMarkAllAsRead={handleMarkAllAsRead}
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
              className="w-10 h-10 rounded-2xl overflow-hidden hover:ring-4 hover:ring-emerald-50 transition-all border-2 border-white flex-shrink-0"
            >
              {user?.picture ? (
                <img src={user.picture} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center"><User className="w-5 h-5 text-slate-400" /></div>
              )}
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-8 pb-8">
          <div className="max-w-[1600px] mx-auto space-y-8 animate-slide-up">
            <Outlet />

            <footer className="mt-20 pt-8 border-t border-slate-100 print:hidden">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Wali Kelas Digital Project &copy; 2026 <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">v4.9</span></p>
                <p className="text-[10px] font-medium text-slate-500 italic">Designed with precision by Mohamad Lukman Nurhasyim, S.Kom, Gr.</p>
              </div>
            </footer>
          </div>
        </div>
      </main>

      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        students={students}
      />
      <Toast />
    </div>
  );
}
