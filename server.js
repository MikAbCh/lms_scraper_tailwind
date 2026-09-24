import express from 'express'; 
import cors from 'cors'; 
import axios from 'axios'; 
import * as cheerio from 'cheerio'; 
import puppeteer from 'puppeteer'; 

const app = express(); 
const PORT = 5000; 

app.use(cors()); 
app.use(express.json()); 

// ─── VARIABEL MEMORI BACKEND ─── 
let COOKIE_KAMPUS_AUTOMATED = ''; 

// ─── FUNGSI PEMBANTU: GENERATE TIMESTAMP [HH:MM:SS] ─── 
function getLogTime() {         
    const now = new Date();         
    const jam = String(now.getHours()).padStart(2, '0');         
    const menit = String(now.getMinutes()).padStart(2, '0');         
    const detik = String(now.getSeconds()).padStart(2, '0');         
    return `[${jam}:${menit}:${detik}]`; 
} 

// ─── FUNGSI PEMBANTU: PARSING STRUKTUR TANGGAL LMS SESI ─── 
function parseSessionDate(dateStr) {         
    try {                 
        const cleanStr = dateStr.replace(/^[A-Za-z]{3},\s*|^[A-Za-z]{3}\s+/, '').trim();                 
        const parts = cleanStr.split(' ');                 
        const day = parseInt(parts[0], 10);                 
        const months = {                         
            Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11,                         
            jan:0, feb:1, mar:2, apr:3, mei:4, jun:5, jul:6, agu:7, sep:8, okt:9, nov:10, des:11                 
        };                 
        const month = months[parts[1]];                 
        const year = parseInt(parts[2], 10);                 
        return new Date(year, month, day);         
    } catch (e) {                 
        return new Date();         
    } 
} 

// ─── FUNGSI 1: OTOMATISASI LOGIN HYBRID (PUPPETEER) ─── 
async function jalankanOtomatisasiLogin() {         
    console.log('Menampilkan jendela Chrome asli. Silakan lakukan login Google di layar...');         
    const browser = await puppeteer.launch({                 
        headless: false,                 
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',                 
        args: ['--no-sandbox', '--disable-setuid-sandbox']         
    });         
    const page = await browser.newPage();         
    try {                 
        await page.goto('https://leaps.kalbis.ac.id/LMS/lectures/class-schedules', { waitUntil: 'networkidle2' });                 
        console.log('Menunggu kamu menyelesaikan proses login di browser...');                 
        const tokenCookie = await new Promise((resolve, reject) => {                         
            const cekUrlInterval = setInterval(async () => {                                 
                try {                                         
                    const currentUrl = page.url();                                         
                    if (currentUrl.includes('/LMS/dashboard') || currentUrl.includes('/home') || currentUrl.includes('lectures')) {                                                 
                        console.log('Deteksi sukses! Kamu berhasil login ke LEAPS.');                                                 
                        clearInterval(cekUrlInterval);                                                 
                        const cookiesObj = await page.cookies();                                                 
                        const formattedCookie = cookiesObj.map(c => `${c.name}=${c.value}`).join('; ');                                                 
                        resolve(formattedCookie);                                         
                    }                                 
                } catch (err) {                                         
                    clearInterval(cekUrlInterval);                                         
                    reject(new Error('Jendela login ditutup oleh pengguna sebelum proses selesai.'));                                 
                }                         
            }, 1000);                 
        });                 
        COOKIE_KAMPUS_AUTOMATED = tokenCookie;                 
        console.log('Cookie hasil login manual berhasil diamankan oleh backend.');                 
        await browser.close();                 
        return COOKIE_KAMPUS_AUTOMATED;         
    } catch (error) {                 
        console.error('Gagal mengamankan cookie:', error.message);                 
        try { await browser.close(); } catch(e) {}                 
        return null;         
    } 
} 

// ─── FUNGSI 2: SCRAPER ID MATA KULIAH DINAMIS BERDASARKAN SEMESTER ─── 
async function ambilDaftarIdMatkulDinamis(idSemester) {         
    try {                 
        const scheduleUrl = `https://leaps.kalbis.ac.id/LMS/lectures/class-schedules/ajax/get-index?idschedules=${idSemester}&view_option=course&data_option=student&idstudents=2024105567&idlecturers=null`;                 
        console.log(`${getLogTime()} Menyisir Class Schedule untuk ID Semester [${idSemester}]...`);                 
        const response = await axios.get(scheduleUrl, {                         
            headers: {                                 
                'Cookie': COOKIE_KAMPUS_AUTOMATED,                                 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'                         
            }                 
        });                 
        const $ = cheerio.load(response.data);                 
        const setOfIds = new Set();                 
        $('.datatable-preload tbody tr td a[href*="/lectures/detail/"]').each((index, element) => {                         
            const href = $(element).attr('href');                         
            const match = href.match(/\/detail\/(\d+)/);                         
            if (match && match[1]) {                                 
                setOfIds.add(parseInt(match[1], 10));                         
            }                 
        });                 
        const hasilArrayId = Array.from(setOfIds);                 
        console.log(`${getLogTime()} [TERMINAL CHECK] Berhasil fetch ${hasilArrayId.length} ID untuk Semester [${idSemester}]:`, hasilArrayId);                 
        return hasilArrayId;         
    } catch (error) {                 
        console.error(`${getLogTime()} Gagal pengerukan Class Schedule pada semester ${idSemester}:`, error.message);                 
        return [];         
    } 
} 

// ─── FUNGSI 3: ENDPOINT API UTAMA UNTUK AMBIL DAFTAR TUGAS (MENU ASSIGNMENT) ─── 
app.get('/api/tasks', async (req, res) => {         
    try {                 
        const idSemesterDariUser = req.query.semester || '46';                 
        if (!COOKIE_KAMPUS_AUTOMATED) {                         
            const tokenSukses = await jalankanOtomatisasiLogin();                         
            if (!tokenSukses) {                                 
                return res.status(500).json({ success: false, error: 'Gagal melakukan verifikasi akun via Puppeteer' });                         
            }                 
        }                 
        const daftarIdMatkul = await ambilDaftarIdMatkulDinamis(idSemesterDariUser);                 
        if (daftarIdMatkul.length === 0) {                         
            return res.status(500).json({ success: false, error: `Tidak ditemukan mata kuliah aktif atau gagal memuat jadwal untuk semester ${idSemesterDariUser}` });                 
        }                 
        const semuaTugas = [];                 
        for (const id of daftarIdMatkul) {                         
            const targetUrl = `https://leaps.kalbis.ac.id/LMS/lectures/detail/${id}/assignments`;                         
            console.log(`${getLogTime()} Menembak URL detail tugas: ${targetUrl}`);                         
            const response = await axios.get(targetUrl, {                                 
                headers: {                                         
                    'Cookie': COOKIE_KAMPUS_AUTOMATED,                                         
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'                                 
                }                         
            });                         
            const $ = cheerio.load(response.data);                         
            let namaMatkulAsli = `Mata Kuliah ${id}`;                         
            const teksHalaman = $('body').text();                         
            const matchMatkul = teksHalaman.match(/[A-Z]{2,4}\d{4}\s*-\s*[^/\n\t]+/);                         
            if (matchMatkul) {                                 
                namaMatkulAsli = matchMatkul[0].trim().substring(0, 60);                         
            }                         
            let adaTugas = false;                         
            $('.table.table-striped tbody tr').each((index, element) => {                                 
                const kolom = $(element).find('td');                                 
                if (kolom.length >= 8) {                                         
                    const no = $(kolom[0]).text().trim();                                         
                    const title = $(kolom[2]).find('a').text().trim();                                         
                    const workingEnd = $(kolom[5]).text().trim();                                         
                    const status1 = $(kolom[6]).text().trim();                                         
                    const status2 = $(kolom[7]).text().trim();                                         
                    const statusGabungan = `${status1} (${status2})`;                                         
                    if (title) {                                                 
                        adaTugas = true;                                                 
                        semuaTugas.push({                                                         
                            id: `${id}-${no}`,                                                         
                            course: namaMatkulAsli,                                                         
                            title: title,                                                         
                            dueDate: workingEnd,                                                         
                            status: statusGabungan                                                 
                        });                                         
                    }                                 
                }                         
            });                         
            if (!adaTugas && id === 12686) {                                 
                semuaTugas.push({                                         
                    id: `${id}-mock`,                                         
                    course: "Enterprise Resource Planning",                                         
                    title: "Simulasi Tugas: Analisis Arsitektur Sistem",                                         
                    dueDate: "30 Jun 2026 - 23:59",                                         
                    status: "Passed (Active)"                                 
                });                         
            }                 
        } 

        // ─── LOGGING DETAIL TUGAS KE TERMINAL ───
        console.log(`\n================================================================`);
        console.log(`${getLogTime()} 📋 [DAFTAR TUGAS BERHASIL DIDAPATKAN] Total: ${semuaTugas.length} Tugas`);
        console.log(`================================================================`);
        if (semuaTugas.length > 0) {
            semuaTugas.forEach((tugas, idx) => {
                console.log(`[Tugas #${idx + 1}]`);
                console.log(`  │ ID Task   : ${tugas.id}`);
                console.log(`  │ Matkul    : ${tugas.course}`);
                console.log(`  │ Judul     : ${tugas.title}`);
                console.log(`  │ Due Date  : ${tugas.dueDate}`);
                console.log(`  │ Status    : ${tugas.status}`);
                console.log(`  └─────────────────────────────────────────────────────────────`);
            });
        } else {
            console.log(`  (Tidak ada tugas yang ditemukan untuk semester ini)`);
        }
        console.log(`================================================================\n`);

        res.json({ success: true, data: semuaTugas });         
    } catch (error) {                 
        if (error.response && (error.response.status === 401 || error.response.status === 419)) {                         
            COOKIE_KAMPUS_AUTOMATED = '';                 
        }                 
        console.error("Terjadi kesalahan saat fetch data tugas:", error.message);                 
        res.status(500).json({ success: false, error: error.message });         
    } 
}); 

// ─── ENDPOINT DASHBOARD: AMBIL JADWAL DASAR MATKUL (FIX PARSING MULTIPLE SCHEDULES) ─── 
app.get('/api/dashboard-courses', async (req, res) => {         
    try {                 
        const idSemesterDariUser = req.query.semester || '46';                 
        if (!COOKIE_KAMPUS_AUTOMATED) {                         
            const tokenSukses = await jalankanOtomatisasiLogin();                         
            if (!tokenSukses) return res.status(500).json({ success: false, error: 'Gagal login' });                 
        }                 
        console.log(`${getLogTime()} ⚡ [DASHBOARD REQUEST] Mengambil list kartu matkul untuk Semester [${idSemesterDariUser}]...`);                 
        
        const scheduleUrl = `https://leaps.kalbis.ac.id/LMS/lectures/class-schedules/ajax/get-index?idschedules=${idSemesterDariUser}&view_option=course&data_option=student&idstudents=2024105567&idlecturers=null`;                 
        const responseSchedule = await axios.get(scheduleUrl, {                         
            headers: {                                 
                'Cookie': COOKIE_KAMPUS_AUTOMATED,                                 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'                         
            }                 
        });                 
        const $ = cheerio.load(responseSchedule.data);                 
        const daftarMataKuliahLengkap = [];                 
        $('#datatable-excel-helper tbody tr').each((index, element) => {                         
            const row = $(element);                         
            const mainTableRow = $('.datatable-preload tbody tr').eq(index);                         
            const detailHref = mainTableRow.find('td:nth-child(1) a').attr('href') || '';                         
            const idMatch = detailHref.match(/detail\/(\d+)/);                         
            const courseId = idMatch ? parseInt(idMatch[1], 10) : index;                         
            
            const courseCode = row.find('td:nth-child(1)').text().trim();                         
            const courseNameEn = row.find('td:nth-child(2)').text().trim();                         
            const fullCourseName = `[${courseCode}] ${courseNameEn}`;                         
            const lecturer = row.find('td:nth-child(10)').text().trim() || 'N/A';                         
            
            const rawRoomText = row.find('td:nth-child(8)').text().trim() || 'N/A';             
            const rawDayTimeText = row.find('td:nth-child(9)').text().trim() || 'N/A';             
            const roomList = rawRoomText.split('|').map(r => r.trim());             
            const dayTimeBlocks = rawDayTimeText.split('/').map(dt => dt.trim());             
            
            const schedules = [];             
            dayTimeBlocks.forEach((block, idx) => {                 
                const parts = block.split(',');                 
                const d = parts[0] ? parts[0].trim() : 'N/A';                 
                const t = parts[1] ? parts[1].trim() : 'N/A';                 
                const r = roomList[idx] || roomList[0] || 'N/A';                 
                schedules.push({ day: d, time: t, room: r });             
            });             
            if (!daftarMataKuliahLengkap.some(c => c.id === courseId)) {                                 
                daftarMataKuliahLengkap.push({                                         
                    id: courseId,                                         
                    courseName: fullCourseName,                                         
                    schedules: schedules,                                         
                    day: schedules[0]?.day || 'N/A',                                         
                    time: schedules[0]?.time || 'N/A',                                         
                    room: schedules[0]?.room || 'N/A',                                         
                    lecturer: lecturer                                 
                });                         
            }                 
        });                 
        console.log(`${getLogTime()} 🚀 [DASHBOARD SUCCESS] Berhasil mengirim ${daftarMataKuliahLengkap.length} data kartu ke UI.`);                 
        res.json({ success: true, courses: daftarMataKuliahLengkap });         
    } catch (error) {                 
        console.error("Gagal memuat dashboard:", error.message);                 
        res.status(500).json({ success: false, error: error.message });         
    } 
}); 

// ─── FITUR AMBIL DETAIL SESI TERDEKAT ─── 
app.get('/api/course-sessions', async (req, res) => {         
    const idMatkul = req.query.id;         
    if (!idMatkul) return res.status(400).json({ success: false, error: 'ID Kosong' });         
    
    console.log(`\n================================================================`);         
    console.log(`${getLogTime()} 🔍 [FRONTEND EVENT] User mengklik kartu Mata Kuliah ID: [${idMatkul}]`);         
    console.log(`================================================================`);         
    
    try {                 
        const targetUrl = `https://leaps.kalbis.ac.id/LMS/lectures/detail/${idMatkul}/sessions`;                 
        const response = await axios.get(targetUrl, {                         
            headers: {                                 
                'Cookie': COOKIE_KAMPUS_AUTOMATED,                                 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'                         
            }                 
        });                 
        const $ = cheerio.load(response.data);                 
        const semuaSesi = [];                 
        $('.table tbody tr').each((index, element) => {                         
            const kolom = $(element).find('td');                         
            if (kolom.length === 0) return;                         
            const namaSesi = $(kolom[0]).find('a').text().trim();                         
            if (!namaSesi) return;                         
            const topik = $(kolom[2]).text().trim().replace(/\s+/g, ' ');                         
            const format = $(kolom[3]).text().trim();                         
            
            let tanggalFinalText = '';                         
            let jamSesi = 'N/A';                         
            let ruanganReschedule = 'N/A';                         
            let isRescheduled = false;                         
            
            const adaCoretan = $(kolom[1]).find('span[style*="line-through"]').length > 0;                         
            if (adaCoretan) {                                 
                isRescheduled = true;                                 
                tanggalFinalText = $(kolom[1]).find('span[title="Rescheduled"]').text().trim();                                 
                const smallText = $(kolom[1]).find('small[title="Rescheduled"]').text().trim();                                 
                
                const matchJamReschedule = smallText.match(/(\d{2}:\d{2}\s*[AP]M\s*-\s*\d{2}:\d{2}\s*[AP]M)/i);                                 
                if (matchJamReschedule) {                                         
                    jamSesi = matchJamReschedule[0];                                 
                } else {                                         
                    const match24 = smallText.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);                                         
                    if (match24) jamSesi = match24[0];                                 
                }                                 
                
                if (matchJamReschedule) {                                         
                    const sisaTeks = smallText.replace(matchJamReschedule[0], '').trim();                                         
                    if (sisaTeks) ruanganReschedule = sisaTeks;                                 
                } else {                                         
                    const parts = smallText.split('\n');                                         
                    if (parts.length > 1) {                                                 
                        ruanganReschedule = parts[parts.length - 1].trim();                                         
                    }                                 
                }                         
            } else {                                 
                const spanFixed = $(kolom[1]).find('span[title="Fixed Schedule"]');                                 
                const smallText = spanFixed.find('small').text().trim();                                 
                const matchJamNormal = smallText.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);                                 
                if (matchJamNormal) {                                         
                    jamSesi = matchJamNormal[0];                                 
                }                                 
                const cloneSpan = spanFixed.clone();                                 
                cloneSpan.find('small').remove();                                 
                tanggalFinalText = cloneSpan.text().trim();                         
            }                         
            
            semuaSesi.push({                                 
                sessionName: namaSesi,                                 
                dateText: tanggalFinalText,                                 
                timeText: jamSesi,                                 
                roomRescheduled: ruanganReschedule,                                 
                tanggal: parseSessionDate(tanggalFinalText),                                 
                topic: topik,                                 
                deliveryFormat: format,                                 
                rescheduled: isRescheduled                         
            });                 
        });                 
        
        console.log(`${getLogTime()} 📦 [SCRAPE SUCCESS] Berhasil mengikis total ${semuaSesi.length} sesi dari tabel LMS.`);                 
        if (semuaSesi.length === 0) {                         
            return res.json({ success: true, data: null });                 
        }                 
        
        const sekarang = new Date();                 
        const sesiMasaDepan = semuaSesi.filter(sesi => sesi.tanggal >= sekarang);                 
        const sesiMasaLalu = semuaSesi.filter(sesi => sesi.tanggal < sekarang);                 
        let sesiTerpilih = null;                 
        
        if (sesiMasaDepan.length > 0) {                         
            sesiMasaDepan.sort((a, b) => a.tanggal - b.tanggal);                         
            sesiTerpilih = sesiMasaDepan[0];                 
        } else if (sesiMasaLalu.length > 0) {                         
            sesiMasaLalu.sort((a, b) => b.tanggal - a.tanggal);                         
            sesiTerpilih = sesiMasaLalu[0];                 
        }                 
        
        if (sesiTerpilih) {                         
            console.log(`--- [DATA CARD SESI AKTIF] ---`);                         
            console.log(`| Target Sesi : ${sesiTerpilih.sessionName}`);                         
            console.log(`| Tanggal     : ${sesiTerpilih.dateText}`);                         
            console.log(`| Jam Sesi    : ${sesiTerpilih.timeText}`);                         
            console.log(`| Ruang Resch : ${sesiTerpilih.roomRescheduled}`);                         
            console.log(`| Topik       : ${sesiTerpilih.topic}`);                         
            console.log(`-------------------------------\n`);                 
        }                 
        
        const dataKirim = { ...sesiTerpilih };                 
        delete dataKirim.tanggal;                 
        res.json({ success: true, data: dataKirim });         
    } catch (error) {                 
        console.error(`Gagal memproses sesi untuk ID ${idMatkul}:`, error.message);                 
        res.status(500).json({ success: false, error: error.message });         
    } 
});

// ─── MENJALANKAN SERVER BACKEND ─── 
app.listen(PORT, () => {         
    console.log(`${getLogTime()} Backend server running at http://localhost:${PORT}`); 
});