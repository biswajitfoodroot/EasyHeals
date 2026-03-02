import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

async function check() {
    try {
        const users = await client.execute('SELECT count(*) as count FROM users');
        const agents = await client.execute('SELECT count(*) as count FROM agents');
        console.log('Users count:', users.rows[0].count);
        console.log('Agents count:', agents.rows[0].count);

        if (users.rows[0].count > 0) {
            const allUsers = await client.execute('SELECT id, name, email, role FROM users');
            console.log('Users:', allUsers.rows);
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

check();
