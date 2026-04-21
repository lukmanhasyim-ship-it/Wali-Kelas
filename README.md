# Siswa.Hub - Ekosistem Manajemen Kelas Digital Premium

Siswa.Hub adalah platform revolusioner berbasis **Serverless** yang dirancang khusus untuk memodernisasi kinerja Wali Kelas dalam mengelola administrasi siswa. Mengusung konsep *Human-Centric Design*, aplikasi ini memadukan estetika antarmuka (UI) mutakhir dengan logika sistem yang cerdas, transparan, dan peduli.

---

## ✨ Fitur Unggulan Utama

### 🖥️ Smart & Personal Dashboard
*   **Contextual Greeting**: Penyambutan personal berdasarkan Role (Wali Kelas / Siswa).
*   **Privacy-First Alerts**: Siswa hanya melihat status kedisiplinan dan nilai miliknya sendiri.
*   **Real-time Analytics**: Visualisasi kehadiran hari ini dan saldo kas mingguan secara instan.

### 📚 Administrasi Akademik & Kurikulum Merdeka
*   **Leger Nilai (DKN)**: Modul pengelolaan nilai yang fleksibel dengan fitur **"Terapkan Susunan Mapel"** otomatis dan editor nama mata pelajaran dinamis.
*   **Buku Klaper Digital**: Arsip data mutasi, ijazah, dan riwayat siswa yang rapi dan siap cetak.
*   **Dual-Session Attendance**: Pencatatan presensi pagi dan siang untuk akurasi maksimal.

### 💰 Keuangan & Kedisiplinan Terpadu
*   **Laporan Kas 4 Kolom**: Transparansi dana kelas dengan deteksi otomatis siswa yang memiliki tanggungan (Debtor Tracking).
*   **Smart Disciplinary Workflow**: Log panggilan resmi, home visit, dan integrasi Google Maps ke rumah siswa.
*   **Integrated WhatsApp**: Pesan motivasi otomatis dan notifikasi resmi dengan formatting kode negara (62).

### 🛡️ Registrasi & Keamanan
*   **Self-Registration System**: Siswa baru dapat mendaftar mandiri via aplikasi yang langsung terhubung ke WhatsApp Wali Kelas.
*   **Google OAuth 2.0**: Keamanan tingkat tinggi menggunakan akun Gmail resmi sekolah.

---

## 🛠️ Panduan Instalasi (Mendetail)

### 1. Prasyarat Sistem
*   **Node.js**: Versi 18 atau lebih tinggi.
*   **Google Account**: Untuk mengelola Google Sheets dan Google Apps Script.

### 2. Persiapan Database (Google Sheets)
Buat Spreadsheet baru di Google Drive Anda. Lalu buat sheet-sheet berikut dengan nama dan struktur kolom (Header di Baris 1) **HARUS PERSIS**:

| Nama Sheet | Struktur Kolom (Header Baris 1) |
| :--- | :--- |
| **Profil_Wali_Kelas** | Id_Wali, Nama, Email, Bio, Gaya_Ajar, Kontak, Alamat, Latitude, Longitude, Lokasi, Nominal_Iuran, Kelas, Semester |
| **Master_Siswa** | ID_Siswa, NISN, NIS, Nama_Siswa, L/P, Tempat_Lahir, Tanggal_Lahir, Email, Jabatan, No_WA_Siswa, Nama_Wali, No_WA_Wali, Alamat, Latitude, Longitude, Lokasi, Status_Aktif, Keterangan, Tanggal_Masuk_X, Tanggal_Naik_XI, Tanggal_Naik_XII, Tanggal_Tamat_Sekolah |
| **Daftar_Nilai** | ID_Siswa, Kategori_Mapel, Nama_Mapel, Topik, Nilai, KKM |
| **Presensi** | ID_Presensi, Tanggal, ID_Siswa, Status_Pagi, Status_Siang, Keterangan, Timestamp_Pagi, Timestamp_Siang |
| **Keuangan** | ID_Transaksi, Tanggal, ID_Siswa, NISN, Tipe, Jumlah, Keterangan |
| **Log_Panggilan** | ID_Panggilan, Tanggal, NISN, Kategori, Alasan, Hasil_Pertemuan, Status_Selesai |
| **Notifikasi** | ID, Message, Type, Timestamp, Role, Email, Is_Read |
| **Archive_Rekap_Absensi** | ID_Siswa, Bulan, H, S, I, A, B |
| **Archive_Rekap_Keuangan** | Bulan, Saldo_Awal, Total_Masuk, Total_Keluar, Saldo_Akhir |
| **Archive_Detail_Absensi** | ID_Presensi, Tanggal, ID_Siswa, Status_Pagi, Status_Siang, Keterangan, Timestamp_Pagi, Timestamp_Siang |

### 3. Konfigurasi Google Apps Script (Backend)
1.  Di Spreadsheet Anda, klik menu **Extensions** > **Apps Script**.
2.  Hapus kode yang ada, lalu salin seluruh isi dari file `gas/Code.gs` di repository ini.
3.  Simpan proyek dengan nama "Siswa.Hub Backend".
4.  Klik tombol **Deploy** (biru) > **New Deployment**.
    *   Select type: **Web App**.
    *   Description: "Initial Deployment".
    *   Execute as: **Me** (Email Anda).
    *   Who has access: **Anyone**.
5.  Klik **Deploy**, berikan izin (Authorize Access), dan salin **Web App URL** Anda.

### 4. Konfigurasi Google Cloud (Untuk Login)
1.  Buka [Google Cloud Console](https://console.cloud.google.com/).
2.  Buat Proyek baru > Buka **APIs & Services** > **OAuth consent screen**.
3.  Pilih **External**, isi data aplikasi, lalu tambahkan scope `./auth/userinfo.email` dan `./auth/userinfo.profile`.
4.  Buka tab **Credentials** > **Create Credentials** > **OAuth client ID**.
    *   Application type: **Web application**.
    *   Authorized JavaScript origins: `http://localhost:5173` (untuk dev) dan URL hosting Anda.
5.  Salin **Client ID** yang dihasilkan.

### 5. Setup Frontend (Via GitHub)
Jika Anda ingin memasang aplikasi ini di PC baru atau berpindah perangkat, ikuti langkah berikut:

1.  **Clone Repository**: 
    Buka terminal/command prompt, lalu arahkan ke folder tujuan dan jalankan:
    ```bash
    git clone https://github.com/username-anda/Siswa.Hub.git
    cd Siswa.Hub
    ```
2.  **Install Dependencies**:
    Jalankan perintah berikut untuk memasang semua library yang dibutuhkan:
    ```bash
    npm install
    ```
3.  **Konfigurasi Environment**:
    Karena file `.env` biasanya tidak ikut diunggah ke GitHub demi keamanan, Anda wajib membuat file baru bernama `.env` di root folder dan menginput kembali variabel backend Anda:
    ```env
    VITE_GAS_API_URL=MASUKKAN_WEB_APP_URL_GAS_ANDA
    VITE_GOOGLE_CLIENT_ID=MASUKKAN_CLIENT_ID_GOOGLE_ANDA
    ```
4.  **Menjalankan Aplikasi**:
    ```bash
    npm run dev
    ```
5.  **Sinkronisasi Update**:
    Jika ada perubahan kode dari PC lain yang sudah di-*push* ke GitHub, cukup jalankan `git pull origin main` di PC saat ini.

---

## 🎨 Tech Stack
*   **Frontend**: React 19, Vite 6, Tailwind CSS (Core Logic), Lucide React Icons.
*   **Backend**: Google Apps Script (GAS).
*   **Database**: Google Sheets API.
*   **Security**: Google OAuth 2.0.

---

> **Siswa.Hub © 2026.**  
> *Didesain dengan presisi dan kepedulian oleh Mohamad Lukman Nurhasyim, S.Kom, Gr.*
