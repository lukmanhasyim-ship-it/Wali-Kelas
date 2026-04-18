import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import Keuangan from './pages/Keuangan';
import Panggilan from './pages/Panggilan';
import Profile from './pages/Profile';
import Tanggungan from './pages/Tanggungan';
import Notifications from './pages/Notifications';

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

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ToastProvider>
        <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route 
                path="master-siswa" 
                element={
                  <RoleProtectedRoute allowedRoles={['Wali Kelas']}>
                    <MasterSiswa />
                  </RoleProtectedRoute>
                } 
              />
              <Route path="profile" element={<Profile />} />
              <Route 
                path="tanggungan" 
                element={
                  <RoleProtectedRoute allowedRoles={['Wali Kelas', 'Bendahara']}>
                    <Tanggungan />
                  </RoleProtectedRoute>
                }
              />
              <Route 
                path="presensi-pagi" 
                element={
                  <RoleProtectedRoute allowedRoles={['Wali Kelas', 'Ketua Kelas', 'Sekretaris']}>
                    <PresensiPagi />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="presensi-siang" 
                element={
                  <RoleProtectedRoute allowedRoles={['Wali Kelas', 'Ketua Kelas', 'Sekretaris']}>
                    <PresensiSiang />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="laporan" 
                element={
                  <RoleProtectedRoute allowedRoles={['Wali Kelas']}>
                    <Laporan />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="update-presensi" 
                element={
                  <RoleProtectedRoute allowedRoles={[]}> 
                    <Presensi />
                  </RoleProtectedRoute>
                } 
              />
              <Route 

                path="keuangan" 
                element={
                  <RoleProtectedRoute allowedRoles={['Wali Kelas', 'Ketua Kelas', 'Bendahara']}>
                    <Keuangan />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="panggilan" 
                element={
                  <RoleProtectedRoute allowedRoles={['Wali Kelas']}>
                    <Panggilan />
                  </RoleProtectedRoute>
                } 
              />
              <Route path="notifications" element={<Notifications />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ToastProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
