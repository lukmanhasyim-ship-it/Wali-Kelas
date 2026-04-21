import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeMap = {
  'dashboard': 'Dashboard',
  'master-siswa': 'Data Siswa',
  'buku-klaper': 'Buku Klaper',
  'dkn': 'Leger Nilai',
  'tanggungan': 'Tanggungan KAS',
  'presensi-pagi': 'Presensi Pagi',
  'presensi-siang': 'Presensi Siang',
  'laporan': 'Laporan Akhir',
  'laporan-harian': 'Laporan Harian',
  'keuangan': 'KAS Kelas',
  'panggilan': 'Log Panggilan',
  'notifications': 'Notifikasi',
  'profile': 'Profil Pengguna',
  'piket': 'Jadwal Piket'
};

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0 || pathnames[0] === 'dashboard') return null;

  return (
    <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 animate-fade-in">
      <Link to="/dashboard" className="hover:text-emerald-600 transition-colors flex items-center gap-1">
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>
      
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const label = routeMap[value] || value;

        return (
          <React.Fragment key={to}>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            {last ? (
              <span className="text-emerald-700 font-black">{label}</span>
            ) : (
              <Link to={to} className="hover:text-emerald-600 transition-colors">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
