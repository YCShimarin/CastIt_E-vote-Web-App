const path = require('path');
const Datastore = require('nedb-promises');

const usersDb = Datastore.create({ filename: path.join(__dirname, '../data/users.db'), autoload: true });
const pendingDb = Datastore.create({ filename: path.join(__dirname, '../data/pending_users.db'), autoload: true });

async function migrateData() {
    console.log('🚀 Starting Data Migration (Indonesian -> English)...');
    
    // Migrate users.db
    let usersCount = 0;
    const users = await usersDb.find({});
    for (const doc of users) {
        const newDoc = { ...doc };
        if (newDoc.nama !== undefined) { newDoc.fullName = newDoc.nama; delete newDoc.nama; }
        if (newDoc.nim !== undefined) { newDoc.idNumber = newDoc.nim; delete newDoc.nim; }
        if (newDoc.jurusan !== undefined) { newDoc.category = newDoc.jurusan; delete newDoc.jurusan; }
        if (newDoc.angkatan !== undefined) { newDoc.batch = newDoc.angkatan; delete newDoc.angkatan; }
        
        await usersDb.update({ _id: doc._id }, newDoc, {});
        usersCount++;
    }
    console.log(`✅ Migrated ${usersCount} users.`);

    // Migrate pending_users.db
    let pendingCount = 0;
    const pendingUsers = await pendingDb.find({});
    for (const doc of pendingUsers) {
        const newDoc = { ...doc };
        if (newDoc.nama !== undefined) { newDoc.fullName = newDoc.nama; delete newDoc.nama; }
        if (newDoc.nim !== undefined) { newDoc.idNumber = newDoc.nim; delete newDoc.nim; }
        if (newDoc.jurusan !== undefined) { newDoc.category = newDoc.jurusan; delete newDoc.jurusan; }
        if (newDoc.angkatan !== undefined) { newDoc.batch = newDoc.angkatan; delete newDoc.angkatan; }
        
        await pendingDb.update({ _id: doc._id }, newDoc, {});
        pendingCount++;
    }
    console.log(`✅ Migrated ${pendingCount} pending users.`);

    console.log('🎉 Migration Completed Successfully!');
}

migrateData();
