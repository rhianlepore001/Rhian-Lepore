/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');

function checkMigrations() {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        console.error(`Directory not found: ${MIGRATIONS_DIR}`);
        return;
    }

    const files = fs.readdirSync(MIGRATIONS_DIR);
    const invalidFiles = [];

    const datePattern = /^\d{8}_/; // YYYYMMDD_

    files.forEach(file => {
        if (file.endsWith('.sql') && !datePattern.test(file)) {
            invalidFiles.push(file);
        }
    });

    if (invalidFiles.length > 0) {
        console.error('❌ Found migration files without date prefix (Supabase will ignore these):');
        invalidFiles.forEach(f => console.error(` - ${f}`));
        console.log('\nTo fix, rename them to YYYYMMDD_name.sql');
        process.exit(1);
    } else {
        console.log('✅ All migration files follow the date prefix convention.');
    }
}

checkMigrations();
