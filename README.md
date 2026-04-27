# Siswa.Hub v4.9.0 - Ekosistem Manajemen Kelas Digital Premium

![License](https://img.shields.io/badge/License-Private-red.svg)
![Version](https://img.shields.io/badge/Version-4.9.0-emerald.svg)
![React](https://img.shields.io/badge/Frontend-React%2019-blue.svg)
![Backend](https://img.shields.io/badge/Backend-Google%20Apps%20Script-orange.svg)

**Siswa.Hub** adalah platform manajemen kelas revolusioner berbasis *Serverless* yang dirancang untuk mentransformasi kinerja Wali Kelas. Aplikasi ini menggabungkan keindahan desain modern dengan sistem backend yang tangguh menggunakan Google Workspace Ecosystem, memberikan pengalaman pengelolaan administrasi siswa yang cerdas, transparan, dan sangat efisien.

---

## 🚀 Fitur Unggulan

### 📊 Dashboard Analitik Cerdas
*   **Real-time Monitoring**: Visualisasi instan kehadiran harian, saldo kas, dan statistik kedisiplinan.
*   **Role-Based Experience**: Antarmuka yang dipersonalisasi untuk Wali Kelas, Pengurus Kelas (Ketua Kelas & Wakil, Sekretaris & Wakil, Bendahara & Wakil), dan Siswa.
*   **Privacy-First Design**: Siswa hanya dapat melihat data pribadi mereka (nilai dan presensi), sementara Wali Kelas memiliki kendali penuh atas seluruh data kelas.

### 📝 Administrasi Akademik & Presensi
*   **Presensi Dual-Session**: Pencatatan kehadiran pagi dan siang dengan *timestamp* otomatis untuk akurasi maksimal.
*   **Daftar Nilai (DKN) Dinamis**: Sistem pengelolaan nilai yang fleksibel dengan fitur "Terapkan Susunan Mapel" otomatis dan editor kategori yang mudah.
*   **Buku Klaper Digital**: Arsip data mutasi dan riwayat siswa yang siap cetak kapan saja.

### 💰 Manajemen Keuangan (Kas Kelas)
*   **Laporan Kas 4 Kolom**: Transparansi penuh dengan pencatatan masuk, keluar, dan saldo akhir secara otomatis.
*   **Smart Debtor Tracking**: Sistem otomatis mendeteksi siswa yang memiliki tanggungan iuran berdasarkan nominal yang ditetapkan Wali Kelas.
*   **Otoritas Bendahara**: Fitur input keuangan yang diamankan secara khusus hanya untuk akun Google Bendahara dan Wakil Bendahara yang terdaftar.

### 🏠 Layanan Konseling & Home Visit (NEW v4.9)
*   **Digital Call Log**: Pendataan panggilan siswa secara sistematis mulai dari kategori hingga alasan detail.
*   **Home Visit Evidence**: Fitur unggahan foto bukti kunjungan rumah langsung ke Google Drive melalui aplikasi, terintegrasi dengan laporan perkembangan siswa.
*   **Automated Notifications**: Kirim pesan motivasi dan pengingat resmi secara otomatis kepada siswa dan pengurus kelas.

---

## 🛠️ Panduan Instalasi (Langkah demi Langkah)

### 1. Persiapan Basis Data (Google Sheets)
Buat sebuah Google Spreadsheet baru. Tambahkan sheet-sheet berikut dengan nama dan struktur kolom yang **WAJIB SAMA** (Header di Baris 1):

| Nama Sheet | Struktur Kolom (Header Baris 1) |
| :--- | :--- |
| **Master_Siswa** | ID_Siswa, NIS, NISN, Nama_Siswa, L/P, Email, Jabatan, Tempat_Lahir, Tanggal_Lahir, Tanggal_Masuk_X, Tanggal_Naik_XI, Tanggal_Naik_XII, Tanggal_Tamat_Sekolah, No_WA_Siswa, Nama_Wali, No_WA_Wali, Alamat, Latitude, Longitude, Lokasi, Status_Aktif, Keterangan |
| **Presensi** | ID_Presensi, Tanggal, ID_Siswa, NISN, Status_Pagi, Timestamp_Pagi, Status_Siang, Timestamp_Siang, Keterangan |
| **Keuangan** | ID_Transaksi, Tanggal, ID_Siswa, NISN, Tipe, Jumlah, Keterangan |
| **Daftar_Nilai** | ID_Nilai, ID_Siswa, NISN, Jenjang, Semester, Kategori_Mapel, Nama_Mapel, Topik, Nilai, Timestamp |
| **Log_Panggilan** | ID_Panggilan, Tanggal, ID_Siswa, NISN, Kategori, Alasan, Tanggal_Pemanggilan, Waktu_Diskusi, Hasil_Pertemuan, Status_Selesai, Bukti_File_URL |
| **Profil_Wali_Kelas** | Id_Wali, Nama, Email, Bio, Gaya_Ajar, Kontak, Created_At, Nominal_Iuran, Kelas |
| **Piket** | ID_Piket, Hari, ID_Siswa, Nama_Siswa, Email |
| **Notifikasi** | ID, Message, Type, Target_Email, Is_Read, Timestamp, Target_Role, Role, Email |
| **Lokasi** | ID_Lokasi, Nama_Lokasi, Deskripsi, Alamat, Latitude, Longitude, Lokasi, Created_By, Created_By_Email, Created_At |

> [!IMPORTANT]
> Pastikan kolom `Bukti_File_URL` di sheet `Log_Panggilan` tersedia untuk menyimpan link foto dokumentasi dari Google Drive.

### 2. Konfigurasi Backend (Google Apps Script)
1.  Buka Spreadsheet Anda, arahkan ke **Extensions** > **Apps Script**.
2.  Hapus semua kode bawaan, lalu salin seluruh isi dari file `gas/Code.gs` dari repository ini.
3.  Simpan proyek dengan nama `SiswaHub_API`.
4.  **Pengaturan Izin**: Jalankan fungsi `pancingIzin` satu kali di editor script untuk mengizinkan aplikasi mengakses Google Drive (untuk fitur upload foto).
5.  **Deployment**:
    *   Klik **Deploy** > **New Deployment**.
    *   Select type: **Web App**.
    *   Execute as: **Me** (Email Anda).
    *   Who has access: **Anyone**.
    *   Salin **Web App URL** yang muncul (ini adalah API URL Anda).

### 3. Konfigurasi Autentikasi (Google Cloud Console)
1.  Buka [Google Cloud Console](https://console.cloud.google.com/).
2.  Buat proyek baru atau pilih proyek yang sudah ada.
3.  Pergi ke **APIs & Services** > **Credentials**.
4.  Klik **Create Credentials** > **OAuth client ID**.
5.  Pilih Application Type: **Web application**.
6.  Pada **Authorized JavaScript origins**, tambahkan:
    *   `http://localhost:5173` (untuk pengembangan lokal)
    *   URL Domain tempat Anda melakukan hosting aplikasi (jika sudah ada).
7.  Simpan dan salin **Client ID** yang diberikan.

### 4. Setup Frontend (Lokal)
1.  **Clone Repository**:
    ```bash
    git clone https://github.com/lukmanhasyim-ship-it/Wali-Kelas.git
    cd Wali-Kelas
    ```
2.  **Install Library**:
    ```bash
    npm install
    ```
3.  **Konfigurasi Environment**:
    Buat file `.env` di root folder dan isi dengan data yang sudah Anda dapatkan:
    ```env
    VITE_GOOGLE_CLIENT_ID=MASUKKAN_CLIENT_ID_ANDA
    VITE_GAS_API_URL=MASUKKAN_WEB_APP_URL_GAS_ANDA
    ```
4.  **Jalankan Aplikasi**:
    ```bash
    npm run dev
    ```

---

## 💻 Tech Stack

*   **Framework**: [React 19](https://react.dev/)
*   **Build Tool**: [Vite 6](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Storage & Database**: Google Sheets via [Google Apps Script](https://developers.google.com/apps-script)
*   **Auth**: Google OAuth 2.0
*   **Export Engine**: jsPDF, xlsx (SheetJS), html2canvas

---

## 🛡️ Keamanan & Privasi
Siswa.Hub menggunakan autentikasi resmi Google. Data Anda tersimpan sepenuhnya di Google Drive Anda sendiri. Kami sangat menyarankan untuk:
1.  Tidak membagikan file `.env` ke publik.
2.  Memasukkan email Pengurus Kelas di sheet `Master_Siswa` untuk memberikan hak akses tertentu secara otomatis.
3.  Secara berkala melakukan backup/ekspor data nilai ke format Excel melalui fitur yang disediakan di dalam aplikasi.

---

> **Didesain dengan ❤️ oleh Mohamad Lukman Nurhasyim, S.Kom, Gr.**  
> *Membangun ekosistem pendidikan yang lebih baik, satu baris kode dalam satu waktu.*

© 2026 Siswa.Hub. All rights reserved.man Nurhasyim, S.Kom, Gr.*
