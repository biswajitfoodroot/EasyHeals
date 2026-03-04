const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
    try {
        console.log('Checking hospitals table structure...');
        const res = await client.execute('PRAGMA table_info(hospitals)');
        console.log('Columns in hospitals table:');
        res.rows.forEach(row => {
            console.log(`- ${row.name} (${row.type})`);
        });

        console.log('\nChecking some data in hospitals table:');
        const data = await client.execute('SELECT id, name, contact_email, email_ids FROM hospitals LIMIT 5');
        console.log(JSON.stringify(data.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

run();
