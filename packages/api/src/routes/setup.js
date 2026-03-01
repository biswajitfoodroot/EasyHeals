// One-time setup route — creates all tables and seeds admin user.
// Protected by x-setup-secret header.
// Call: POST /v1/setup  with header  x-setup-secret: setup-easyheals-2024
import express from 'express';
import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';

const router = express.Router();

function getClient() {
    return createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
}

const CREATE_TABLES_SQL = [
    `CREATE TABLE IF NOT EXISTS "users" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "email" text NOT NULL UNIQUE,
        "password_hash" text NOT NULL,
        "role" text DEFAULT 'advisor',
        "phone" text,
        "linked_agent_id" text,
        "is_active" integer DEFAULT 1,
        "can_manage_users" integer DEFAULT 0,
        "permissions" text,
        "last_login_at" integer,
        "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    )`,
    `CREATE TABLE IF NOT EXISTS "hospitals" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "city" text, "state" text,
        "country" text DEFAULT 'India',
        "address" text, "contact_person" text, "contact_phone" text, "contact_email" text,
        "accreditation" text, "website" text,
        "is_active" integer DEFAULT 1,
        "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    )`,
    `CREATE TABLE IF NOT EXISTS "departments" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL UNIQUE,
        "description" text,
        "is_active" integer DEFAULT 1,
        "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    )`,
    `CREATE TABLE IF NOT EXISTS "doctors" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "specialization" text,
        "hospital_id" text REFERENCES "hospitals"("id"),
        "department_id" text REFERENCES "departments"("id"),
        "qualification" text, "experience_years" integer, "contact_phone" text, "contact_email" text,
        "is_active" integer DEFAULT 1,
        "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    )`,
    `CREATE TABLE IF NOT EXISTS "agents" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "company_name" text, "phone" text, "country_code" text, "phone_numbers" text,
        "email" text, "country" text, "city" text, "address" text,
        "commission_type" text, "commission_value" real,
        "agreement_url" text, "pan_number" text, "bank_name" text, "bank_account" text, "ifsc_code" text,
        "portal_password_hash" text, "notes" text,
        "is_active" integer DEFAULT 1,
        "created_at" integer DEFAULT (strftime('%s', 'now') * 1000),
        "updated_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    )`,
    `CREATE TABLE IF NOT EXISTS "leads" (
        "id" text PRIMARY KEY NOT NULL,
        "ref_id" text NOT NULL UNIQUE,
        "name" text NOT NULL, "email" text, "phone" text NOT NULL,
        "country_code" text DEFAULT '+91', "alt_phone" text, "alt_country_code" text,
        "country" text, "city" text, "gender" text, "date_of_birth" text, "passport_number" text,
        "medical_issue" text,
        "treatment_department_id" text REFERENCES "departments"("id"),
        "hospital_id" text REFERENCES "hospitals"("id"),
        "doctor_id" text REFERENCES "doctors"("id"),
        "approximate_amount" real, "currency" text DEFAULT 'INR',
        "symptoms_text" text, "symptoms_json" text,
        "estimated_travel_date" text, "number_of_attendants" integer,
        "preferred_language" text, "insurance_details" text, "referring_doctor" text,
        "medical_history_notes" text, "native_address" text, "high_commission_name" text,
        "embassy_name" text, "india_address" text, "indian_phone_number" text,
        "tentative_duration" text, "appointment_date" text,
        "agent_id" text REFERENCES "agents"("id"),
        "assigned_to" text REFERENCES "users"("id"),
        "status" text DEFAULT 'new', "source" text DEFAULT 'manual', "utm_params" text, "lang" text,
        "verification_status" text DEFAULT 'pending',
        "verified_by" text REFERENCES "users"("id"),
        "verified_at" integer, "rejection_reason" text,
        "prescription_url" text, "prescription_analysis" text,
        "preferred_call_time" text, "wa_sent_at" integer, "last_contacted_at" integer, "follow_up_at" integer,
        "notes" text,
        "is_archived" integer DEFAULT 0, "archived_at" integer,
        "archived_by" text REFERENCES "users"("id"),
        "created_at" integer DEFAULT (strftime('%s', 'now') * 1000),
        "updated_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    )`,
    `CREATE TABLE IF NOT EXISTS "attendants" (
        "id" text PRIMARY KEY NOT NULL,
        "lead_id" text NOT NULL REFERENCES "leads"("id"),
        "name" text NOT NULL, "date_of_birth" text, "passport_number" text, "relationship" text,
        "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    )`,
    `CREATE TABLE IF NOT EXISTS "documents" (
        "id" text PRIMARY KEY NOT NULL,
        "lead_id" text NOT NULL REFERENCES "leads"("id"),
        "doc_type" text NOT NULL, "file_name" text, "file_url" text NOT NULL,
        "file_size" integer, "mime_type" text,
        "uploaded_by" text REFERENCES "users"("id"),
        "uploaded_by_agent" text REFERENCES "agents"("id"),
        "notes" text,
        "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    )`,
    `CREATE TABLE IF NOT EXISTS "appointments" (
        "id" text PRIMARY KEY NOT NULL,
        "lead_id" text NOT NULL REFERENCES "leads"("id"),
        "hospital_id" text REFERENCES "hospitals"("id"),
        "department_id" text REFERENCES "departments"("id"),
        "doctor_id" text REFERENCES "doctors"("id"),
        "scheduled_at" integer NOT NULL,
        "status" text DEFAULT 'pending', "wa_confirmation_sent" integer DEFAULT 0, "notes" text,
        "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    )`,
    `CREATE TABLE IF NOT EXISTS "activities" (
        "id" text PRIMARY KEY NOT NULL,
        "lead_id" text REFERENCES "leads"("id"),
        "type" text NOT NULL, "description" text, "metadata" text,
        "performed_by" text REFERENCES "users"("id"),
        "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    )`,
    `CREATE TABLE IF NOT EXISTS "invoices" (
        "id" text PRIMARY KEY NOT NULL,
        "invoice_number" text NOT NULL UNIQUE, "invoice_type" text NOT NULL,
        "lead_id" text REFERENCES "leads"("id"),
        "hospital_id" text REFERENCES "hospitals"("id"),
        "agent_id" text REFERENCES "agents"("id"),
        "amount" real NOT NULL, "currency" text DEFAULT 'INR',
        "tax_amount" real DEFAULT 0, "total_amount" real NOT NULL,
        "status" text DEFAULT 'draft', "due_date" text, "paid_date" text,
        "description" text, "line_items" text, "notes" text,
        "created_by" text REFERENCES "users"("id"),
        "created_at" integer DEFAULT (strftime('%s', 'now') * 1000),
        "updated_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    )`,
    `CREATE TABLE IF NOT EXISTS "wa_templates" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL UNIQUE, "category" text DEFAULT 'custom', "body_text" text NOT NULL,
        "variables" text, "is_active" integer DEFAULT 1,
        "created_by" text REFERENCES "users"("id"),
        "created_at" integer DEFAULT (strftime('%s', 'now') * 1000),
        "updated_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    )`,
    `CREATE TABLE IF NOT EXISTS "audit_log" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text REFERENCES "users"("id"),
        "action" text NOT NULL, "entity_type" text NOT NULL,
        "entity_id" text, "changes" text, "ip_address" text,
        "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
    )`,
];

router.post('/', async (req, res) => {
    const secret = req.headers['x-setup-secret'];
    const expectedSecret = process.env.SETUP_SECRET || 'setup-easyheals-2024';

    if (secret !== expectedSecret) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const results = [];
    const client = getClient();

    try {
        // Create all tables using raw libsql client
        for (const tableSql of CREATE_TABLES_SQL) {
            const tableName = tableSql.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1] || 'unknown';
            try {
                await client.execute(tableSql);
                results.push({ table: tableName, status: 'ok' });
            } catch (e) {
                results.push({ table: tableName, status: 'error', error: e.message });
            }
        }

        // Seed admin user if no users exist
        let userSeeded = false;
        const countResult = await client.execute('SELECT COUNT(*) as c FROM users');
        const count = countResult?.rows?.[0]?.['c'] || 0;

        if (count === 0) {
            const passwordHash = await bcrypt.hash('Admin@123', 10);
            const userId = crypto.randomUUID();
            await client.execute({
                sql: `INSERT INTO users (id, name, email, password_hash, role, is_active, can_manage_users)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: [userId, 'Biswajit Saha', 'biswajit_saha@easyheals.com', passwordHash, 'owner', 1, 1]
            });
            userSeeded = true;
        }

        res.json({
            status: 'setup complete',
            tables: results,
            userSeeded,
            loginEmail: userSeeded ? 'biswajit_saha@easyheals.com' : 'user already existed',
            loginPassword: userSeeded ? 'Admin@123' : 'unchanged',
        });
    } catch (error) {
        res.status(500).json({ error: error.message, results });
    }
});

export default router;
