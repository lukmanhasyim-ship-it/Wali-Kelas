import React, { createContext, useContext, useState, useEffect } from 'react';
import { googleLogout } from '@react-oauth/google';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check local storage for existing session
    const storedUser = localStorage.getItem('wali_kelas_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (payload, role = 'Wali Kelas') => {
    const userData = {
      token: payload.token || '',
      name: payload.name || 'User',
      email: payload.email || '',
      picture: payload.picture || '',
      managedClass: payload.managedClass || '', // The class this user belongs to or manages
      role, // 'Wali Kelas', 'Ketua Kelas', 'Sekretaris', 'Bendahara', 'Siswa'
      idSiswa: payload.idSiswa || '' // ID Siswa jika role adalah Siswa
    };

    setUser(userData);
    localStorage.setItem('wali_kelas_user', JSON.stringify(userData));
  };

  const logout = () => {
    googleLogout();
    setUser(null);
    localStorage.removeItem('wali_kelas_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
