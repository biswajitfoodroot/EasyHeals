// One-time setup: creates all tables via Turso HTTP API + seeds admin user
// Call: POST /v1/setup  with header  x-setup-secret: setup-easyheals-2024
import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

const router = express.Router();

// Use Turso HTTP API directly — no @libsql/client dependency issues
async function tursoExecute(statements) {
    const dbUrl = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    // Convert libsql:// to https:// for HTTP API
    const httpUrl = dbUrl
        .replace('libsql://', 'https://')
        .replace('///', '//'); // handle local file:// edge case

    const response = await fetch(`${httpUrl}/v2/pipeline`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            requests: statements.map(sql => ({
                type: 'execute',
                stmt: { sql }
            }))
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Turso HTTP API error: ${response.status} ${err}`);
    }

    return await response.json();
}

const CREATE_TABLES = [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT DEFAULT 'advisor', phone TEXT, linked_agent_id TEXT, is_active INTEGER DEFAULT 1, can_manage_users INTEGER DEFAULT 0, permissions TEXT, last_login_at INTEGER, created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS hospitals (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, city TEXT, state TEXT, country TEXT DEFAULT 'India', address TEXT, contact_person TEXT, contact_phone TEXT, contact_email TEXT, accreditation TEXT, website TEXT, is_active INTEGER DEFAULT 1, created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS departments (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL UNIQUE, description TEXT, is_active INTEGER DEFAULT 1, created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS doctors (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, specialization TEXT, hospital_id TEXT REFERENCES hospitals(id), department_id TEXT REFERENCES departments(id), qualification TEXT, experience_years INTEGER, contact_phone TEXT, contact_email TEXT, is_active INTEGER DEFAULT 1, created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, company_name TEXT, phone TEXT, country_code TEXT, phone_numbers TEXT, email TEXT, country TEXT, city TEXT, address TEXT, commission_type TEXT, commission_value REAL, agreement_url TEXT, pan_number TEXT, bank_name TEXT, bank_account TEXT, ifsc_code TEXT, portal_password_hash TEXT, notes TEXT, is_active INTEGER DEFAULT 1, created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000), updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY NOT NULL, ref_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, email TEXT, phone TEXT NOT NULL, country_code TEXT DEFAULT '+91', alt_phone TEXT, alt_country_code TEXT, country TEXT, city TEXT, gender TEXT, date_of_birth TEXT, passport_number TEXT, medical_issue TEXT, treatment_department_id TEXT REFERENCES departments(id), hospital_id TEXT REFERENCES hospitals(id), doctor_id TEXT REFERENCES doctors(id), approximate_amount REAL, currency TEXT DEFAULT 'INR', symptoms_text TEXT, symptoms_json TEXT, estimated_travel_date TEXT, number_of_attendants INTEGER, preferred_language TEXT, insurance_details TEXT, referring_doctor TEXT, medical_history_notes TEXT, native_address TEXT, high_commission_name TEXT, embassy_name TEXT, india_address TEXT, indian_phone_number TEXT, tentative_duration TEXT, appointment_date TEXT, agent_id TEXT REFERENCES agents(id), assigned_to TEXT REFERENCES users(id), status TEXT DEFAULT 'new', source TEXT DEFAULT 'manual', utm_params TEXT, lang TEXT, verification_status TEXT DEFAULT 'pending', verified_by TEXT REFERENCES users(id), verified_at INTEGER, rejection_reason TEXT, prescription_url TEXT, prescription_analysis TEXT, preferred_call_time TEXT, wa_sent_at INTEGER, last_contacted_at INTEGER, follow_up_at INTEGER, notes TEXT, is_archived INTEGER DEFAULT 0, archived_at INTEGER, archived_by TEXT REFERENCES users(id), created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000), updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS attendants (id TEXT PRIMARY KEY NOT NULL, lead_id TEXT NOT NULL REFERENCES leads(id), name TEXT NOT NULL, date_of_birth TEXT, passport_number TEXT, relationship TEXT, created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY NOT NULL, lead_id TEXT NOT NULL REFERENCES leads(id), doc_type TEXT NOT NULL, file_name TEXT, file_url TEXT NOT NULL, file_size INTEGER, mime_type TEXT, uploaded_by TEXT REFERENCES users(id), uploaded_by_agent TEXT REFERENCES agents(id), notes TEXT, created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY NOT NULL, lead_id TEXT NOT NULL REFERENCES leads(id), hospital_id TEXT REFERENCES hospitals(id), department_id TEXT REFERENCES departments(id), doctor_id TEXT REFERENCES doctors(id), scheduled_at INTEGER NOT NULL, status TEXT DEFAULT 'pending', wa_confirmation_sent INTEGER DEFAULT 0, notes TEXT, created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY NOT NULL, lead_id TEXT REFERENCES leads(id), type TEXT NOT NULL, description TEXT, metadata TEXT, performed_by TEXT REFERENCES users(id), created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY NOT NULL, invoice_number TEXT NOT NULL UNIQUE, invoice_type TEXT NOT NULL, lead_id TEXT REFERENCES leads(id), hospital_id TEXT REFERENCES hospitals(id), agent_id TEXT REFERENCES agents(id), amount REAL NOT NULL, currency TEXT DEFAULT 'INR', tax_amount REAL DEFAULT 0, total_amount REAL NOT NULL, status TEXT DEFAULT 'draft', due_date TEXT, paid_date TEXT, description TEXT, line_items TEXT, notes TEXT, created_by TEXT REFERENCES users(id), created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000), updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS wa_templates (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL UNIQUE, category TEXT DEFAULT 'custom', body_text TEXT NOT NULL, variables TEXT, is_active INTEGER DEFAULT 1, created_by TEXT REFERENCES users(id), created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000), updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY NOT NULL, user_id TEXT REFERENCES users(id), action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, changes TEXT, ip_address TEXT, created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000))`,
];

router.post('/', async (req, res) => {
    const secret = req.headers['x-setup-secret'];
    const expectedSecret = process.env.SETUP_SECRET || 'setup-easyheals-2024';

    if (secret !== expectedSecret) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        // Execute all CREATE TABLE statements via Turso HTTP API
        const result = await tursoExecute(CREATE_TABLES);

        // Now use drizzle (which works fine) to seed the admin user
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
            status: 'setup complete ✅',
            tablesCreated: CREATE_TABLES.length,
            userSeeded,
            loginEmail: 'biswajit_saha@easyheals.com',
            loginPassword: userSeeded ? 'Admin@123' : 'unchanged (already existed)',
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 8)
        });
    }
});

export default router;
