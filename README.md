# Siswa.Hub - Ekosistem Manajemen Kelas Digital Premium

Siswa.Hub adalah platform revolusioner berbasis **Serverless** yang dirancang khusus untuk memodernisasi kinerja Wali Kelas dan sekolah dalam mengelola administrasi siswa. Mengusung konsep *Human-Centric Design*, aplikasi ini memadukan estetika antarmuka (UI) mutakhir dengan logika sistem yang cerdas, transparan, dan peduli.

---

## ✨ Fitur Unggulan Utama

### 🖥️ Smart & Personal Dashboard
*   **Contextual Greeting**: Penyambutan personal berdasarkan Role (Wali Kelas / Siswa).
*   **Privacy-First Alerts**: Siswa hanya melihat status kedisiplinan miliknya sendiri, sementara Wali Kelas mengontrol seluruh kelas.
*   **Real-time Analytics**: Visualisasi kehadiran hari ini dan saldo kas mingguan secara instan.

### ⏰ Presensi & Manajemen Kedisiplinan Terpadu
*   **Dual-Session Attendance**: Pencatatan pagi dan siang untuk akurasi maksimal.
*   **Automated Archive Integration**: Data otomatis digabungkan dari sheet aktif dan arsip historis (`Archive_*`) untuk laporan bulanan/semester yang utuh.
*   **Smart Disciplinary Workflow**: Notifikasi "Siap Panggil" otomatis berubah menjadi status "Sudah Dipanggil" saat surat panggilan dibuat.

### 💰 Keuangan & Tanggungan Transparan
*   **4-Column Financial Report**: Laporan saldo transparan (Saldo Awal, Masuk, Keluar, Saldo Akhir).
*   **Cumulative Balance**: Saldo kas tetap berlanjut meskipun periode bulan sudah diarsip.
*   **Debtor Tracking**: Deteksi otomatis siswa yang memiliki tanggungan iuran kas kelas.


### 📞 Log Panggilan & Pendampingan
*   **Wali Kelas Exclusive**: Fitur pemanggilan resmi dan akses Google Maps rumah siswa hanya dapat diakses oleh Wali Kelas.
*   **Premium Call History**: Tabel riwayat panggilan interaktif dengan pencarian instan, filter kategori (Home Visit/Teguran), dan animasi status yang modern.
*   **Integrated WhatsApp**: Tombol chat langsung ke nomor Siswa atau nomor Wali dengan **Auto-formatting Kode Negara (62)** dan pesan motivasi otomatis.

### 🛡️ Keamanan & Pemeliharaan Sistem
*   **Database Reset Control**: Fitur pembersihan database menyeluruh (kecuali Profil Wali Kelas) dengan proteksi konfirmasi ganda "RESET" untuk keamanan data.
*   **Student Self-Service Profile**: Siswa dapat melengkapi dan memperbarui data pribadi (No WA, Tempat/Tanggal Lahir, Alamat) secara mandiri.
*   **Clean Database Policy**: Sistem memfilter data secara dinamis berdasarkan status keaktifan (hanya menampilkan siswa Aktif pada iuran kas dan presensi).

---

## 🛠️ Panduan Instalasi (Development)

### 1. Prasyarat
*   Node.js versi 18 ke atas.
*   Akun Google (untuk Spreadsheet & Apps Script).

### 2. Setup Database (Google Sheets)
Buat Spreadsheet baru dan buat sheet dengan struktur kolom **PERSIS** seperti berikut:

| Nama Sheet | Struktur Kolom (Header Baris 1) |
| :--- | :--- |
| **Profil_Wali_Kelas** | Id_Wali, Nama, Email, Bio, Gaya_Ajar, Kontak, Alamat, Latitude, Longitude, Lokasi, Nominal_Iuran, Kelas, Semester |
| **Master_Siswa** | ID_Siswa, NISN, NIS, Nama_Siswa, L/P, Tempat_Lahir, Tanggal_Lahir, Email, Jabatan, No_WA_Siswa, Nama_Wali, No_WA_Wali, Alamat, Latitude, Longitude, Lokasi, Status_Aktif, Keterangan, Tanggal_Masuk_X, Tanggal_Naik_XI, Tanggal_Naik_XII, Tanggal_Tamat_Sekolah |
| **Presensi** | ID_Presensi, Tanggal, ID_Siswa, NISN, Sesi, Status, Keterangan |
| **Keuangan** | ID_Transaksi, Tanggal, ID_Siswa, NISN, Tipe, Jumlah, Keterangan |
| **Log_Panggilan** | ID_Panggilan, Tanggal, NISN, Kategori, Alasan, Hasil_Pertemuan, Status_Selesai |
| **Notifikasi** | ID, Message, Type, Timestamp, Role, Email, Is_Read |
| **Archive_Detail_Absensi** | (Sama dengan struktur sheet *Presensi*) |
| **Archive_Rekap_Absensi** | ID_Siswa, Bulan, H, S, I, A, B |
| **Archive_Rekap_Keuangan** | Bulan, Saldo_Awal, Total_Masuk, Total_Keluar, Saldo_Akhir |

### 3. Deploy Backend (Google Apps Script)
1.  Buka Spreadsheet > Menu **Extensions** > **Apps Script**.
2.  Copy seluruh isi file `gas/Code.gs` ke editor Apps Script.
3.  Klik **Deploy** > **New Deployment** > Type: **Web App**.
4.  Set *Execute as:* **Me** dan *Who has access:* **Anyone**.
5.  Catat **Web App URL** yang dihasilkan.

### 4. Setup Frontend
1. Clone repository ini.
2. Jalankan `npm install`.
3. Buat file `.env` di root direktori:
   ```env
   VITE_GAS_URL=URL_WEB_APP_ANDA_DISINI
   VITE_GOOGLE_CLIENT_ID=CLIENT_ID_GOOGLE_OAUTH_ANDA
   ```
4. Jalankan `npm run dev` untuk memulai server lokal.

---

## 🎨 Tech Stack & UX
*   **React 19 + Vite 6**: Performa kilat dan reaktivitas tinggi.
*   **Vanilla CSS + Design Tokens**: Layout kustom dengan standar estetika premium dan responsif.
*   **Indonesian Date Standard**: Seluruh aplikasi menggunakan format **DD MMMM YYYY** (contoh: 20 April 2026).
*   **Caring Language**: Tone komunikasi yang memotivasi, peduli, dan tidak menghukum.

---

> **Siswa.Hub © 2026.**  
> *Didesain dengan presisi dan kepedulian oleh Mohamad Lukman Nurhasyim, S.Kom, Gr.*
