import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MasterSiswa from './pages/MasterSiswa';
import Presensi from './pages/Presensi';
import PresensiPagi from './pages/PresensiPagi';
import PresensiSiang from './pages/PresensiSiang';
import Laporan from './pages/Laporan';
import LaporanHarian from './pages/LaporanHarian';
import Keuangan from './pages/Keuangan';
import Panggilan from './pages/Panggilan';
import Profile from './pages/Profile';
import Tanggungan from './pages/Tanggungan';
import Notifications from './pages/Notifications';
import BukuKlaper from './pages/BukuKlaper';
import DKN from './pages/DKN';
import Register from './pages/Register';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Piket from './pages/Piket';

// Google OAuth Client ID dari .env
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  console.error('VITE_GOOGLE_CLIENT_ID tidak ditemukan di environment variables.');
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RoleProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// AppRoutes: wrapper yang punya akses ke useLocation.
// key={location.key} memaksa komponen remount setiap navigasi → data selalu fresh.
function AppRoutes() {
  const location = useLocation();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard key={location.key} />} />
        <Route
          path="master-siswa"
          element={
            <RoleProtectedRoute allowedRoles={['Wali Kelas']}>
              <MasterSiswa key={location.key} />
            </RoleProtectedRoute>
          }
        />
        <Route path="profile" element={<Profile key={location.key} />} />
        <Route
          path="tanggungan"
          element={
            <RoleProtectedRoute allowedRoles={['Wali Kelas', 'Bendahara']}>
              <Tanggungan key={location.key} />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="presensi-pagi"
          element={
            <RoleProtectedRoute allowedRoles={['Wali Kelas', 'Ketua Kelas', 'Sekretaris']}>
              <PresensiPagi key={location.key} />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="presensi-siang"
          element={
            <RoleProtectedRoute allowedRoles={['Wali Kelas', 'Ketua Kelas', 'Sekretaris']}>
              <PresensiSiang key={location.key} />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="laporan"
          element={
            <RoleProtectedRoute allowedRoles={['Wali Kelas']}>
              <Laporan key={location.key} />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="laporan-harian"
          element={
            <RoleProtectedRoute allowedRoles={['Wali Kelas']}>
              <LaporanHarian key={location.key} />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="buku-klaper"
          element={
            <RoleProtectedRoute allowedRoles={['Wali Kelas']}>
              <BukuKlaper key={location.key} />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="dkn"
          element={
            <RoleProtectedRoute allowedRoles={['Wali Kelas']}>
              <DKN key={location.key} />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="update-presensi"
          element={
            <RoleProtectedRoute allowedRoles={[]}>
              <Presensi key={location.key} />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="keuangan"
          element={
            <RoleProtectedRoute allowedRoles={['Wali Kelas', 'Ketua Kelas', 'Bendahara']}>
              <Keuangan key={location.key} />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="panggilan"
          element={
            <RoleProtectedRoute allowedRoles={['Wali Kelas']}>
              <Panggilan key={location.key} />
            </RoleProtectedRoute>
          }
        />
        <Route path="piket" element={<Piket key={location.key} />} />
        <Route path="notifications" element={<Notifications key={location.key} />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
