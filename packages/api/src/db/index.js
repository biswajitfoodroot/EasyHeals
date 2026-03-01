import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
}

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL) {
    console.error('[DB] FATAL: TURSO_DATABASE_URL environment variable is not set.');
}

const client = createClient({
    url: TURSO_DATABASE_URL || 'file:local.db', // fallback prevents crash on missing env
    authToken: TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export const dbReady = !!TURSO_DATABASE_URL;
