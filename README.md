# ScanQR

Proyek sistem manajemen Gym/Pusat Kebugaran dengan fitur QR scan, manajemen cabang (branch), pengaturan tier membership, dan dashboard admin.

## 🚀 Teknologi & Versi yang Digunakan

Proyek ini dibangun menggunakan *stack* teknologi berikut:

- **PHP**: `^8.3`
- **Laravel Framework**: `^13.0`
- **Node.js**: (Direkomendasikan v20+)
- **Vite**: `^8.0.0`
- **TailwindCSS**: `^4.0.0`
- **Sanctum**: `^4.3` (Untuk Autentikasi API)

## 🛠️ Cara Instalasi (Setup Project)

Ikuti langkah-langkah berikut untuk menjalankan project ini secara lokal di environment Anda (seperti Laragon):

1. **Clone Repository**
   Buka terminal, lalu clone project ini dan masuk ke foldernya:
   ```bash
   git clone <url-repository-anda>
   cd scanQR
   ```

2. **Jalankan Setup Otomatis (Recomended)**
   Proyek ini memiliki script otomatis dari Laravel. Pastikan Anda sudah menginstal **Composer** dan **Node.js**. Jalankan perintah ini:
   ```bash
   composer run setup
   ```
   *Perintah di atas akan secara otomatis mengeksekusi:*
   - `composer install` (Menginstal dependensi PHP)
   - Membuat salinan file `.env.example` menjadi `.env`
   - `php artisan key:generate` (Membuat application key)
   - `php artisan migrate` (Menjalankan migrasi database SQLite default)
   - `npm install` & `npm run build` (Menginstal dan mem-build dependensi frontend)

3. **Konfigurasi Database Tambahan (Opsional)**
   Secara default, Laravel menggunakan SQLite (`database/database.sqlite`). Jika Anda menggunakan MySQL (bawaan Laragon), buka file `.env` dan sesuaikan nilainya:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=nama_database_anda
   DB_USERNAME=root
   DB_PASSWORD=
   ```
   *(Setelah diubah, jangan lupa buat database di phpMyAdmin/HeidiSQL, lalu jalankan `php artisan migrate` ulang).*

4. **Jalankan Development Server**
   Untuk menyalakan server lokal secara bersamaan (Laravel backend + Vite frontend auto-reload), jalankan:
   ```bash
   composer run dev
   ```
   Aplikasi Anda sekarang dapat diakses di **http://localhost:8000**.

---

## 🌿 Cara Branching (Git Workflow)

Agar proses *development* berjalan rapi dan tidak terjadi konflik kode yang berantakan, ikuti standar aturan Git Branching di bawah ini:

### 1. Penamaan Branch
Jangan bekerja langsung di branch `main`. Buatlah branch baru setiap kali mengerjakan tugas/fitur. Gunakan format awalan berikut:
- **`feature/...`** : Untuk penambahan fitur baru. (contoh: `feature/admin-branch-selection`)
- **`bugfix/...`** : Untuk perbaikan error/bug. (contoh: `bugfix/export-csv-error`)
- **`hotfix/...`** : Untuk perbaikan kritis yang harus segera naik ke production.

### 2. Langkah-langkah Pembuatan Branch
Berikut adalah alur pengerjaannya di terminal:

```bash
# 1. Selalu pastikan Anda berada di branch utama (main) terlebih dahulu
git checkout main

# 2. Tarik update kode terbaru dari server online
git pull origin main

# 3. Buat branch baru sesuai tugas Anda dan langsung pindah ke branch tersebut
git checkout -b feature/nama-fitur-kamu
# (Contoh: git checkout -b feature/manage-tier)

# 4. Silakan mulai ngoding...

# 5. Setelah selesai, cek file apa saja yang berubah
git status

# 6. Tambahkan file yang berubah ke Git
git add .

# 7. Simpan perubahan dengan pesan (commit message) yang jelas
git commit -m "feat: menambahkan sistem template untuk tier gym"

# 8. Unggah (push) branch baru kamu ke GitHub/GitLab
git push origin feature/nama-fitur-kamu
```

### 3. Panduan Pesan Commit (Commit Convention)
Gunakan *prefix* yang jelas pada pesan commit untuk memudahkan pelacakan histori kode:
- `feat:` -> Jika menambahkan fitur baru.
- `fix:` -> Jika memperbaiki suatu bug/error.
- `refactor:` -> Jika merapikan kode (tanpa menambah fungsi baru).
- `docs:` -> Jika ada perubahan pada dokumentasi (misal update README).
- `style:` -> Perubahan tampilan CSS/UI tanpa merubah logika program.

Contoh Commit: `git commit -m "fix: memperbaiki masalah login gagal di perangkat mobile"`

---
**Catatan:** Jika branch kamu sudah selesai dikerjakan dan sudah di-push, buatlah **Pull Request (PR)** di GitHub untuk digabungkan kembali ke branch `main`.
