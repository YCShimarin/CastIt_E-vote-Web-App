/**
 * STRESS TEST - KATUA VOTING SYSTEM
 * Skrip ini mensimulasikan banyak voting masuk secara bersamaan 
 * untuk menguji ketangguhan antrean (Queue) sistem.
 */
const http = require('http');

const TOTAL_REQUESTS = 50; // Jumlah permintaan yang akan ditembak sekaligus
const SERVER_URL = 'http://localhost:3000/vote';

const candidates = ['kandidat_1', 'kandidat_2', 'kandidat_3'];

function sendVote(index) {
    return new Promise((resolve) => {
        const payload = JSON.stringify({
            username: `STRESS_TEST_${index}`, // Username unik untuk test
            pilihan: candidates[index % candidates.length]
        });

        const req = http.request(SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`[Request ${index}] Status: ${res.statusCode} | Result: ${data}`);
                resolve();
            });
        });

        req.on('error', (err) => {
            console.error(`[Request ${index}] Error: ${err.message}`);
            resolve();
        });

        req.write(payload);
        req.end();
    });
}

async function runTest() {
    console.log("=========================================");
    console.log(`🔥 MEMULAI STRESS TEST: ${TOTAL_REQUESTS} VOTES`);
    console.log("=========================================");
    
    const startTime = Date.now();
    const tasks = [];

    for (let i = 1; i <= TOTAL_REQUESTS; i++) {
        tasks.push(sendVote(i));
    }

    await Promise.all(tasks);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log("\n=========================================");
    console.log(`✅ TEST SELESAI`);
    console.log(`⏱️  Durasi: ${duration} detik`);
    console.log(`📊 Rata-rata: ${(TOTAL_REQUESTS / duration).toFixed(2)} req/sec`);
    console.log("=========================================");
    console.log("Cek file users.json untuk melihat hasilnya.");
}

runTest();
