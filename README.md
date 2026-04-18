# Siswa.Hub - Sistem Manajemen Kelas Digital

Siswa.Hub adalah sebuah platform perampingan kinerja Wali Kelas berkonsep Serverless yang memodernisasi cara sekolah mengelola administrasi muridnya secara digital. Aplikasi web interaktif ini didesain mengutamakan Pengalaman Pengguna (UX) premium dengan tampilan antarmuka mutakhir (UI) sekaligus kemudahan implementasi tanpa harus memelihara server database tradisional.

## ✨ Fitur-Fitur Utama

*   **👥 Manajemen Data Terpusat:** Pengelolaan master data profil & lokasi siswa yang akurat dan dapat disesuaikan.
*   **⏰ Presensi Terpisah (Pagi & Siang):** Pencatatan absensi dua tahap secara proaktif pada awal jam pelajaran dan akhir jam pelajaran.
*   **💰 Modul Finansial:** Manajemen buku Kas Kelas dengan pelaporan otomatis untuk pemasukan, pengeluaran komprehensif, serta kalkulasi Tanggungan Beban KAS.
*   **📞 Log Pemanggilan Orang Tua:** Pemantauan dan pencatatan komprehensif kunjungan rumah (*Home Visit*) maupun Pemanggilan Wali dari berbagai kategori indisipliner (seperti 3x Alfa, 6x Bolos).
*   **🔔 Live Notification System:** Sistem manajemen notisfikasif terintegrasi untuk perayaan pembaruan absensi maupun pelunasan biaya.
*   **🔐 Role-Based Access Control (RBAC):** Login terverifikasi melalui autentikasi akun Google tunggal yang akan menyesuaikan menu navigasi bergantung porsi tugas penggunanya:
    *   **Wali Kelas / Admin**: Memiliki kendali dan akses global penuh di seluruh platform.
    *   **Bendahara**: Mengawasi pencatatan pembukuan, transaksi "KAS Kelas", dan "Tanggungan KAS".
    *   **Sekretaris**: Menguasai entri "Presensi Pagi" dan "Presensi Siang".
    *   **Ketua Kelas**: Dapat melakukan monitor baca (View-only) untuk log presensi dan rekam kelasnya.
    *   **Siswa**: Meninjau pembaruan profil serta absensi/keuangannya secara transparan.

## 📱 Keunggulan PWA & Antarmuka (Aesthetics)
*   **Progressive Web App (PWA):** Mendukung instalasi di perangkat seluler melalui fitur *"Add to Home Screen"* agar berfungsi sebagai native mobile app.
*   **Premium Shimmer Loading:** Kecepatan yang dirasakan secara empiris jauh lebih baik dengan animasi skeleton loader saat pengambilan data berlangsung.
*   **Interactive Empty States:** Arahan visual indah ketika suatu modul belum memiliki data. 
*   **Smooth Fade-In:** Setiap sub-halaman dilengapi efek pergantian menu *(transition in)* yang berkelas tinggi.

---

## 🛠️ Tech Stack & Ekosistem Pendukung

*   **Frontend**: React 19 + ESModules Vite 8.
*   **Styling**: Vanilla-like Tailwind CSS 3.4 (dengan konfigurasi design-token).
*   **State Management & Routing**: React Router v7.
*   **Autentikasi**: Google OAuth 2.0 (GSI).
*   **Backend & DB Tersebar (Serverless)**: Google Apps Script API + Google Sheets Storage.
*   **Fungsional Dokumen**: HTML2Canvas + jsPDF (Auto-Print Laporan Final).

---

## 🚀 Panduan Instalasi (Development)

### 1. Kloning Source Code
```bash
git clone <repository-url>
cd wali-kelas
npm install  # (Atau npm install --legacy-peer-deps jika ada konflik versi vite)
```

### 2. Setup Google Apps Script (Backend)
1.  **Siapkan Database**: Buat file *Spreadsheet* baru di Akun Google Anda dan sisipkan Sheet berikut:
    *   `Master_Siswa`, `Presensi`, `Keuangan`, `Log_Panggilan`, `Profil_Wali_Kelas`, `Queue_Chat`, `Catatan_Siswa`, `Lokasi`, `Notifikasi`. *(Atau cukup jalankan fungsi opsional `setupSpreadsheet()`).*
2.  **Siapkan API Endpoint**: Di Spreadsheet tersebut, klik menu **Ekstensi > Apps Script**.
3.  Salin seluruh kode dari file `/gas/Code.gs` ke antarmuka script di sana.
4.  Lakukan Deployment: Klik **Terapkan (Deploy) > Deployment Baru**, pilih jenis "Aplikasi Web", Eksekusi Sebagai: "Saya", dan Yang Memiliki Akses: "Siapa saja (Anyone)".
5.  Salin URL API *Web App* yang dihasilkan.

### 3. Setup Google OAuth (Login)
1.  Masuk ke [Google Cloud Console](https://console.cloud.google.com/).
2.  Buat/Gunakan proyek yang sama, masuk ke "APIs & Services" > "Credentials".
3.  Buat **OAuth 2.0 Client ID**, atur tipe aplikasinya ke **Web Application**.
4.  Tambahkan Authorized JavaScript origins & redirect URIs: `http://localhost:5173` (untuk Environment *development*).
5.  Salin **Client ID** yang dihasilkan.

### 4. Konfigurasi Sistem Internal
Buat sebuah file berektensi `.env` (atau lakukan salin `.env.example` jika ada) pada root folder instalasi dan cocokkan kunci berikut:
```env
VITE_GOOGLE_CLIENT_ID="[Paste Client ID Anda di sini]"
VITE_GAS_API_URL="[Paste Web App URL API Anda di sini]"
```

### 5. Start The App!
```bash
npm run dev
```
Buka browser dan segera mulai pengelolaan murid yang revolusioner dari `http://localhost:5173`!

---
> Siswa.Hub © 2026. *Penyelerasan presisi digital administrasi pendidikan oleh Wali Kelas Moden.*
