const fs = require('fs-extra');
const path = require('path');
const { db } = require('../services/dataService');

const ARCHIVE_DIR = path.join(__dirname, '../data/archive');

async function migrate() {
    console.log('🚀 Starting Migration to NeDB...');

    try {
        // 1. Migrate Users
        const usersFile = path.join(ARCHIVE_DIR, 'users.json');
        if (await fs.pathExists(usersFile)) {
            const users = await fs.readJson(usersFile);
            await db.users.remove({}, { multi: true });
            
            let successCount = 0;
            let skipCount = 0;

            for (const user of users) {
                try {
                    await db.users.insert(user);
                    successCount++;
                } catch (e) {
                    if (e.errorType === 'uniqueViolated') {
                        console.warn(`⚠️ Skipping duplicate user: ${user.username} (${user.nama})`);
                        skipCount++;
                    } else {
                        throw e;
                    }
                }
            }
            console.log(`✅ Migrated ${successCount} users. (Skipped ${skipCount} duplicates)`);
        }

        // 2. Migrate Candidates
        const candidatesFile = path.join(ARCHIVE_DIR, 'candidates.json');
        if (await fs.pathExists(candidatesFile)) {
            const candidates = await fs.readJson(candidatesFile);
            await db.candidates.remove({}, { multi: true });
            await db.candidates.insert(candidates);
            console.log(`✅ Migrated ${candidates.length} candidates.`);
        }

        // 3. Migrate Pending Users
        const pendingFile = path.join(ARCHIVE_DIR, 'pending_users.json');
        if (await fs.pathExists(pendingFile)) {
            const pending = await fs.readJson(pendingFile);
            if (Array.isArray(pending) && pending.length > 0) {
                await db.pending.remove({}, { multi: true });
                await db.pending.insert(pending);
                console.log(`✅ Migrated ${pending.length} pending users.`);
            }
        }

        // 4. Migrate Settings
        const settingsFile = path.join(ARCHIVE_DIR, 'settings.json');
        if (await fs.pathExists(settingsFile)) {
            const settings = await fs.readJson(settingsFile);
            await db.settings.update(
                { type: 'global' },
                { $set: { ...settings, type: 'global' } },
                { upsert: true }
            );
            console.log(`✅ Migrated settings.`);
        }

        console.log('🎉 Migration Completed Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
}

migrate();
