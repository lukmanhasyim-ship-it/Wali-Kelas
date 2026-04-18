# Siswa.Hub - Sistem Manajemen Kelas

Aplikasi web untuk manajemen kelas sekolah yang mencakup:
- ✅ Manajemen data siswa
- ✅ Pencatatan absensi pagi dan siang
- ✅ Manajemen keuangan kas kelas
- ✅ Sistem panggilan orang tua
- ✅ Role-based access control (Wali Kelas, Ketua Kelas, Sekretaris, Bendahara)

## Setup Environment

### 1. Clone Repository
```bash
git clone <repository-url>
cd wali-kelas
npm install
```

### 2. Setup Google Apps Script API

**Wajib**: Aplikasi ini menggunakan Google Apps Script sebagai backend. Ikuti langkah berikut:

1. **Buat Google Spreadsheet** dengan sheet berikut:
   - `Master_Siswa`
   - `Presensi`
   - `Keuangan`
   - `Log_Panggilan`

2. **Deploy Google Apps Script**:
   - Buat script di Google Apps Script
   - Copy kode dari folder `gas/`
   - Deploy sebagai Web App dengan akses "Anyone"

3. **Konfigurasi Environment**:
   ```bash
   # Copy .env dan isi dengan URL GAS API
   cp .env .env.local
   ```

   Edit `.env`:
   ```env
   VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   VITE_GAS_API_URL=https://script.google.com/macros/s/your-script-id/exec
   ```

### 3. Setup Google OAuth

1. Buat project di [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google+ API
3. Buat OAuth 2.0 Client ID
4. Tambahkan authorized redirect URIs: `http://localhost:5173` (development)

## Menjalankan Aplikasi

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

## Fitur Utama

### Role-based Access
- **Wali Kelas**: Full access semua fitur
- **Ketua Kelas**: View presensi & keuangan
- **Sekretaris**: CRUD presensi pagi & siang
- **Bendahara**: CRUD keuangan

### Absensi Terpisah
- **Presensi Pagi**: Pencatatan kehadiran pagi
- **Presensi Siang**: Pencatatan kehadiran siang dengan referensi pagi

### Manajemen Keuangan
- Pembulatan otomatis jumlah transaksi
- Tracking saldo kas kelas real-time

## Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Backend**: Google Apps Script
- **Database**: Google Sheets
- **Auth**: Google OAuth 2.0

## Development Notes

- Aplikasi **tidak menggunakan mock data** - semua data berasal dari Google Sheets
- Pastikan `VITE_GAS_API_URL` sudah dikonfigurasi dengan benar
- CORS issues dapat diatasi dengan deploy GAS sebagai "Anyone"
