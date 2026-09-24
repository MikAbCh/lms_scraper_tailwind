# LEAPS Automation & Assignment Tracker

Aplikasi pemantau tugas dan jadwal kuliah interaktif yang terintegrasi secara otomatis dengan LMS LEAPS. Sistem ini menggunakan backend **Node.js Express** berbasis **Puppeteer** untuk penanganan autentikasi otomatis, serta scraping data menggunakan **Cheerio**.

---

## 🚀 Fitur Utama

- **Automated Login (Puppeteer)**: Mengamankan sesi login Google akun kampus secara otomatis tanpa pengisian kredensial manual di backend.
- **Dynamic Semester Fetcher**: Mengambil daftar ID mata kuliah aktif secara otomatis berdasarkan semester yang dipilih.
- **Assignment & Schedule Tracker**: Menampilkan daftar tugas lengkap beserta tenggat waktu (*due date*), status pengerjaan, dan *countdown* presisi.
- **Course Session Detail**: Menampilkan jadwal sesi kuliah terdekat, topik, format perkuliahan, hingga status perubahan jadwal (*rescheduled*).

---

## 🛠️ Prasyarat (Prerequisites)

Sebelum menjalankan proyek, pastikan perangkat Anda telah terpasang:
- [Node.js](https://nodejs.org/) (Versi 18 atau lebih baru)
- [Google Chrome](https://www.google.com/chrome/) terinstal di lokasi default (`C:\Program Files\Google\Chrome\Application\chrome.exe`)
- Ekstensi **Live Server** di Visual Studio Code

---

## 📋 Langkah-Langkah Penggunaan Singkat

1. **Clone repository** proyek ke komputer lokal.
2. Jalankan perintah `npm run dev` di terminal IDE (VS Code).
3. Buka file `index.html` menggunakan **Live Server**.
4. Pilih **Semester** di antarmuka web, lalu klik tombol muat data/fetch.
5. Jendela Chrome akan terbuka otomatis; lakukan **login dengan email kampus** ke sistem LEAPS.
6. Tunggu hingga proses verifikasi selesai dan data tugas/jadwal muncul di halaman web.
7. Jika sudah selesai menggunakan, matikan **Live Server** dan tekan `Ctrl + C` di terminal untuk memberhentikan program backend.

---

## 📦 Panduan Instalasi & Jalankan Proyek

### 1. Clone Repositori
Buka terminal dan jalankan perintah berikut:
```bash
git clone [https://github.com/username/repository-name.git](https://github.com/username/repository-name.git)
cd repository-name
```

### 2. Instalasi Dependensi

Install seluruh *library* Node.js yang dibutuhkan oleh backend:

```bash
npm install

```

### 3. Jalankan Backend Server

Jalankan server backend menggunakan script *development*:

```bash
npm run dev

```

> **Catatan:** Server backend akan berjalan secara lokal pada port 5000 (`http://localhost:5000`).

### 4. Buka Antarmuka Frontend (Live Server)

1. Buka file `index.html` di VS Code.
2. Klik kanan pada file `index.html` lalu pilih **Open with Live Server** (atau klik tombol *Go Live* di pojok kanan bawah VS Code).

### 5. Eksekusi & Pemakaian Aplikasi

1. Pada antarmuka web yang terbuka di browser, pilih **Semester** yang ingin Anda pantau.
2. Klik tombol **Fetch / Muat Data**.
3. Jendela browser Google Chrome asli akan terbuka secara otomatis via Puppeteer.
4. Silakan lakukan **Login** menggunakan email akun kampus Anda pada halaman Google / LEAPS.
5. Setelah login berhasil dan sistem mengarah ke dashboard/jadwal LEAPS, backend akan otomatis mengamankan sesi *cookie* dan menutup jendela Chrome tersebut.
6. Tunggu beberapa detik hingga seluruh detail tugas, *countdown* deadline, dan jadwal mata kuliah tampil penuh di antarmuka web.

### 6. Menghentikan Aplikasi

Apabila sesi penggunaan telah selesai:

1. Matikan **Live Server** di VS Code (klik indikator *Port: 5500* di pojok kanan bawah status bar untuk menutupnya).
2. Pindah ke terminal VS Code tempat `npm run dev` berjalan, lalu tekan tombol `Ctrl + C` dan konfirmasi dengan ketik `Y` untuk menghentikan server backend.

---

## 📁 Struktur Proyek

```text
├── server.js          # Backend Express, Puppeteer Automation, & Scraper Endpoint
├── index.html         # Frontend Dashboard & Interface User
├── package.json       # Manajer Dependensi Node.js & Script Execution
└── README.md          # Dokumentasi Lengkap Proyek

```

---

## ⚠️ Troubleshooting & Masalah Umum

* **Google Chrome Tidak Ditemukan**: Pastikan jalur `executablePath` di dalam file `server.js` mengarah ke lokasi eksekusi Google Chrome yang valid di komputer Anda (misal: `C:\Program Files\Google\Chrome\Application\chrome.exe`).
* **Session Expired (Status 401/419)**: Jika sesi cookie kampus telah kedaluwarsa, backend secara otomatis mereset cookie dan akan memicu jendela Puppeteer baru untuk login ulang pada pemanggilan endpoint berikutnya.
* **Tugas Tidak Muncul / Error Scraper**: Pastikan struktur koneksi internet stabil dan halaman LEAPS Kalbis dapat diakses tanpa kendala maintenance.

```

```