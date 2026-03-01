CREATE TABLE IF NOT EXISTS "users" (
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
);
CREATE TABLE IF NOT EXISTS "hospitals" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "city" text, "state" text,
    "country" text DEFAULT 'India',
    "address" text, "contact_person" text, "contact_phone" text, "contact_email" text,
    "accreditation" text, "website" text,
    "is_active" integer DEFAULT 1,
    "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE TABLE IF NOT EXISTS "departments" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL UNIQUE,
    "description" text,
    "is_active" integer DEFAULT 1,
    "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE TABLE IF NOT EXISTS "doctors" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "specialization" text,
    "hospital_id" text REFERENCES "hospitals"("id"),
    "department_id" text REFERENCES "departments"("id"),
    "qualification" text, "experience_years" integer, "contact_phone" text, "contact_email" text,
    "is_active" integer DEFAULT 1,
    "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE TABLE IF NOT EXISTS "agents" (
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
);
CREATE TABLE IF NOT EXISTS "leads" (
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
);
CREATE TABLE IF NOT EXISTS "attendants" (
    "id" text PRIMARY KEY NOT NULL,
    "lead_id" text NOT NULL REFERENCES "leads"("id"),
    "name" text NOT NULL, "date_of_birth" text, "passport_number" text, "relationship" text,
    "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE TABLE IF NOT EXISTS "documents" (
    "id" text PRIMARY KEY NOT NULL,
    "lead_id" text NOT NULL REFERENCES "leads"("id"),
    "doc_type" text NOT NULL, "file_name" text, "file_url" text NOT NULL,
    "file_size" integer, "mime_type" text,
    "uploaded_by" text REFERENCES "users"("id"),
    "uploaded_by_agent" text REFERENCES "agents"("id"),
    "notes" text,
    "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE TABLE IF NOT EXISTS "appointments" (
    "id" text PRIMARY KEY NOT NULL,
    "lead_id" text NOT NULL REFERENCES "leads"("id"),
    "hospital_id" text REFERENCES "hospitals"("id"),
    "department_id" text REFERENCES "departments"("id"),
    "doctor_id" text REFERENCES "doctors"("id"),
    "scheduled_at" integer NOT NULL,
    "status" text DEFAULT 'pending', "wa_confirmation_sent" integer DEFAULT 0, "notes" text,
    "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE TABLE IF NOT EXISTS "activities" (
    "id" text PRIMARY KEY NOT NULL,
    "lead_id" text REFERENCES "leads"("id"),
    "type" text NOT NULL, "description" text, "metadata" text,
    "performed_by" text REFERENCES "users"("id"),
    "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE TABLE IF NOT EXISTS "invoices" (
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
);
CREATE TABLE IF NOT EXISTS "wa_templates" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL UNIQUE, "category" text DEFAULT 'custom', "body_text" text NOT NULL,
    "variables" text, "is_active" integer DEFAULT 1,
    "created_by" text REFERENCES "users"("id"),
    "created_at" integer DEFAULT (strftime('%s', 'now') * 1000),
    "updated_at" integer DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text REFERENCES "users"("id"),
    "action" text NOT NULL, "entity_type" text NOT NULL,
    "entity_id" text, "changes" text, "ip_address" text,
    "created_at" integer DEFAULT (strftime('%s', 'now') * 1000)
);
