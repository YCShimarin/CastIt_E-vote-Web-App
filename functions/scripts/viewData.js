const { db } = require('../services/dataService');

async function viewData() {
    const collection = process.argv[2]; // users, candidates, settings, pending
    const filterArg = process.argv[3];   // optional JSON string filter

    if (!collection || !db[collection]) {
        console.error('❌ Mohon tentukan koleksi yang benar: users, candidates, settings, atau pending');
        console.log('Contoh: node functions/scripts/viewData.js users');
        process.exit(1);
    }

    try {
        let filter = {};
        if (filterArg) {
            filter = JSON.parse(filterArg);
        }

        console.log(`🔍 Mencari data di koleksi [${collection}] dengan filter:`, filter);
        
        const results = await db[collection].find(filter);
        
        if (results.length === 0) {
            console.log('📭 Tidak ada data yang ditemukan.');
        } else {
            console.table(results);
            console.log(`\n✅ Total: ${results.length} data ditemukan.`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Gagal membaca data:', error.message);
        process.exit(1);
    }
}

viewData();
