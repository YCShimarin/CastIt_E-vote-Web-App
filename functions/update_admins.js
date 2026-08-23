const Datastore = require('nedb-promises');
const path = require('path');

const dbPath = path.join(__dirname, 'functions', 'data', 'users.db');
const db = Datastore.create({ filename: dbPath, autoload: true });

async function seedAdmins() {
    // 1. Remove old verificators
    const removed = await db.remove({ role: 'admin_verificator' }, { multi: true });
    console.log(`Removed ${removed} old verificators.`);

    // 2. Add new verificators based on the new categories (Category A, Category B)
    await db.insert({
        username: "admin1",
        password: "password123",
        role: "admin_verificator",
        jurusan: "Category A",
        nama: "Verificator Category A"
    });
    
    await db.insert({
        username: "admin2",
        password: "password456",
        role: "admin_verificator",
        jurusan: "Category B",
        nama: "Verificator Category B"
    });

    console.log('Successfully added new verificators admin1 (Category A) and admin2 (Category B) to users.db');
}

seedAdmins().catch(console.error);
