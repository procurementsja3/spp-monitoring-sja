# PANDUAN LENGKAP HOSTING KE GITHUB PAGES
### Sistem Monitoring Realisasi SPP - PT SJA Procurement Management

Panduan ini memandu Anda langkah demi langkah untuk mengunggah (*push*) proyek ini ke repositori **GitHub** dan mengaktifkan **GitHub Pages** gratis sehingga aplikasi dapat diakses secara online oleh seluruh tim (Sepanjang, Karawang, Sukodono, Semarang, dan Superadmin).

---

## 1. Persiapan Awal
1. Pastikan Anda memiliki akun di [GitHub.com](https://github.com/).
2. Pastikan program **Git** dan **Node.js** sudah terpasang di komputer Anda.

---

## 2. Buat Repositori Baru di GitHub
1. Masuk ke akun Anda di [https://github.com/new](https://github.com/new).
2. Isi formulir pembuatan repositori:
   - **Repository name**: misalnya `spp-monitoring-sja`
   - **Visibility**: Pilih **Public** (agar GitHub Pages gratis dapat langsung aktif) atau **Private** (jika akun GitHub Anda mendukung GitHub Pages pada private repo).
   - Jangan centang "Initialize this repository with a README" (karena kita akan mengunggah kode yang sudah ada).
3. Klik tombol hijau **Create repository**.
4. Salin URL repositori yang muncul, misalnya:
   `https://github.com/USERNAME_ANDA/spp-monitoring-sja.git`

---

## 3. Unggah Kode dari Komputer ke GitHub
Buka terminal (Command Prompt / PowerShell / Git Bash / Terminal VS Code) di folder proyek ini, lalu jalankan perintah berikut secara berurutan:

```bash
# 1. Inisialisasi Git (jika belum)
git init

# 2. Tambahkan semua file proyek
git add .

# 3. Lakukan commit pertama
git commit -m "Initial commit: Sistem Monitoring SPP SJA multi-area"

# 4. Ubah nama branch utama menjadi main
git branch -M main

# 5. Hubungkan ke repositori GitHub Anda (ganti URL dengan milik Anda)
git remote add origin https://github.com/USERNAME_ANDA/spp-monitoring-sja.git

# 6. Unggah kode ke GitHub
git push -u origin main
```

---

## 4. Mengaktifkan GitHub Pages Otomatis (Metode GitHub Actions - Disarankan)
Aplikasi ini sudah dilengkapi dengan file otomatis `.github/workflows/deploy.yml`.

Cukup lakukan pengaturan 1 kali di halaman GitHub:
1. Buka repositori Anda di GitHub.
2. Klik tab **Settings** (di menu atas repositori).
3. Di panel sebelah kiri, klik menu **Pages** (di bawah bagian *Code and automation*).
4. Pada bagian **Build and deployment**:
   - **Source**: Ganti dari *Deploy from a branch* menjadi **GitHub Actions**.
5. Selesai! GitHub Actions akan otomatis mendeteksi file `.github/workflows/deploy.yml`, melakukan kompilasi (*build*), dan menerbitkan web app Anda.

Anda dapat memantau prosesnya di tab **Actions** di GitHub. Dalam waktu 1-2 menit, URL publik aplikasi Anda akan aktif, contoh:
👉 `https://USERNAME_ANDA.github.io/spp-monitoring-sja/`

---

## 5. Metode Alternatif (Manual dengan Gh-Pages)
Jika Anda lebih suka menggunakan perintah manual di komputer:

1. Pasang paket `gh-pages`:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Tambahkan skrip deploy pada file `package.json`:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

3. Jalankan perintah deploy:
   ```bash
   npm run deploy
   ```

4. Di GitHub **Settings** -> **Pages**, pastikan Source diset ke **Deploy from a branch** dan pilih branch `gh-pages` / `root`.

---

## 6. Tips & Catatan Penting
- **Konfigurasi Path Relatif**: File `vite.config.ts` sudah diset `base: './'` sehingga seluruh aset JavaScript dan CSS akan otomatis terhubung dengan baik di subdomain GitHub Pages.
- **Koneksi Google Sheets**: Integrasi Google Sheets tetap berjalan 100% normal di GitHub Pages karena menggunakan komunikasi HTTPS langsung ke Google Apps Script Web App URL masing-masing cabang.
- **Penyimpanan Data**: Data disimpan di `localStorage` per-browser pengguna dan disinkronkan secara *cloud* dengan Google Sheets cabang masing-masing saat login.
