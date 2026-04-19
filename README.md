# Siswa.Hub - Ekosistem Manajemen Kelas Digital Premium

Siswa.Hub adalah platform revolusioner berbasis **Serverless** yang dirancang khusus untuk memodernisasi kinerja Wali Kelas dan sekolah dalam mengelola administrasi siswa. Mengusung konsep *Human-Centric Design*, aplikasi ini memadukan estetika antarmuka (UI) mutakhir dengan logika sistem yang peduli, transparan, dan efisien.

---

## ✨ Fitur Unggulan Terbaru

### 📚 Daftar Kumpulan Nilai (DKN) & Akademik
*   **Input Nilai Dinamis**: Kelola nilai Akademik (Umum) dan Produktif secara fleksibel sesuai jenjang dan semester.
*   **Excel Integration**: Dukungan penuh untuk **Ekspor DKN** dan **Impor Nilai** secara massal menggunakan template Excel yang cerdas.
*   **Buku Klaper Digital**: Rekam jejak historis siswa yang tertata rapi untuk kebutuhan arsip jangka panjang.

### 💰 Manajemen Finansial & Tanggungan
*   **Smart KAS Monitoring**: Pencatatan pemasukan dan pengeluaran kas kelas dengan pelaporan otomatis per periode (Minggu/Bulan/Tahun).
*   **Kalkulasi Tanggungan**: Deteksi otomatis siswa yang masih memiliki tunggakan iuran secara real-time.
*   **Humanist Payment Alerts**: Notifikasi pembayaran yang mengapresiasi siswa ("Terima kasih sudah mencicil!") alih-alih sekadar menagih.

### ⏰ Presensi & Alert Kedisiplinan
*   **Dual-Session Attendance**: Pencatatan presensi sesi Pagi dan Siang untuk akurasi data kehadiran yang lebih tinggi.
*   **Interactive Alerts**: Deteksi dini siswa bermasalah (Contoh: **3x Alfa Kumulatif** atau **6x Bolos**) yang akan memicu peringatan "Siap Panggil" di Dashboard Wali Kelas.

### 📞 Komunikasi & Pendampingan Siswa
*   **Digital Call Logging**: Pencatatan log Panggilan Wali dan *Home Visit* secara komprehensif.
*   **Caring Notifications**: Sistem notifikasi otomatis ke Siswa dan Pengurus Kelas dengan gaya bahasa yang hangat, memotivasi, dan tidak menyudutkan.

---

## 🎨 Estetika & Pengalaman Pengguna (UX)

*   **Premium Loader & Quotes**: Menunggu data dimuat menjadi pengalaman yang menyenangkan dengan animasi loader *radial-gradient* khusus dan kutipan inspiratif yang acak setiap saat.
*   **Role-Based Experience**: Antarmuka yang beradaptasi secara cerdas sesuai peran pengguna (**Wali Kelas, Ketua Kelas, Sekretaris, Bendahara, atau Siswa**).
*   **Progressive Web App (PWA)**: Akses super cepat dan dapat diinstal langsung ke layar utama smartphone seperti aplikasi native.
*   **Responsive Design**: Tampilan yang tajam dan nyaman digunakan baik di monitor PC maupun layar ponsel.

---

## 🛠️ Tech Stack Modern

*   **Core**: React 19 + Vite 6
*   **Styling**: Vanilla-style CSS with Glossy Effects & Tailwind Design Tokens
*   **Backend**: Google Apps Script (High Performance Web App)
*   **Database**: Google Sheets (Spreadsheet-as-a-DB)
*   **Integration**: Google OAuth 2.0 & SheetJS (Excel Engine)

---

## 🚀 Persiapan Backend (Spreadsheet Headers)

Pastikan spreadsheet Anda memiliki sheet berikut dengan nama kolom yang sesuai:
*   `Master_Siswa`: ID_Siswa, NISN, Nama_Siswa, Email, Jabatan, Status_Aktif, ...
*   `Keuangan`: ID_Transaksi, Tanggal, ID_Siswa, NISN, Tipe, Jumlah, Keterangan
*   `Daftar_Nilai`: ID_Siswa, NISN, Jenjang, Semester, Kategori_Mapel, Nama_Mapel, Topik, Nilai
*   `Log_Panggilan`: ID_Panggilan, Tanggal, NISN, Kategori, Alasan, Status_Selesai
*   `Notifikasi`: ID, Message, Type, Timestamp, Role, Email, Is_Read

---

> **Siswa.Hub © 2026.**  
> *Didesain dengan presisi dan kepedulian oleh Mohamad Lukman Nurhasyim, S.Kom, Gr.*
