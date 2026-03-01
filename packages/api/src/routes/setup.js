// Setup route: uses drizzle-orm/libsql migrator to create tables + seeds admin user
import express from 'express';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.post('/', async (req, res) => {
    const secret = req.headers['x-setup-secret'];
    const expectedSecret = process.env.SETUP_SECRET || 'setup-easyheals-2024';

    if (secret !== expectedSecret) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        // Run migrations using drizzle migrator
        const migrationsFolder = path.resolve(__dirname, '../db/migrations/sqlite');
        await migrate(db, { migrationsFolder });

        // Seed admin user if no users exist
        let userSeeded = false;
        const existingUsers = await db.select().from(users).limit(1);

        if (existingUsers.length === 0) {
            const passwordHash = await bcrypt.hash('Admin@123', 10);
            await db.insert(users).values({
                name: 'Biswajit Saha',
                email: 'biswajit_saha@easyheals.com',
                passwordHash,
                role: 'owner',
                isActive: true,
                canManageUsers: true,
            });
            userSeeded = true;
        }

        res.json({
            status: 'setup complete',
            migrationsRan: true,
            userSeeded,
            loginEmail: userSeeded ? 'biswajit_saha@easyheals.com' : 'user already existed',
            loginPassword: userSeeded ? 'Admin@123' : 'unchanged',
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
