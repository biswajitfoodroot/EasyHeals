import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── Enums (SQLite uses text) ───────────────────────────────────────────────
// We'll define the union types for internal typing convenience.

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('advisor'), // 'owner', 'admin', 'advisor', 'viewer', 'agent'
  phone: text('phone'),
  linkedAgentId: text('linked_agent_id'), // links agent-role user to agents table
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  canManageUsers: integer('can_manage_users', { mode: 'boolean' }).default(false),
  permissions: text('permissions', { mode: 'json' }), // {dashboard:true, leads:true, ...}
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
});

// ─── Hospitals ───────────────────────────────────────────────────────────────

export const hospitals = sqliteTable('hospitals', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  city: text('city'),
  state: text('state'),
  country: text('country').default('India'),
  address: text('address'),
  contactPerson: text('contact_person'),
  contactPhone: text('contact_phone'),
  contactEmail: text('contact_email'),
  emailIds: text('email_ids', { mode: 'json' }), // ['email1', 'email2', ...]
  accreditation: text('accreditation'),
  website: text('website'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
});

// ─── Departments ─────────────────────────────────────────────────────────────

export const departments = sqliteTable('departments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').unique().notNull(),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
});

// ─── Doctors ─────────────────────────────────────────────────────────────────

export const doctors = sqliteTable('doctors', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  specialization: text('specialization'),
  hospitalId: text('hospital_id').references(() => hospitals.id),
  departmentId: text('department_id').references(() => departments.id),
  qualification: text('qualification'),
  experienceYears: integer('experience_years'),
  contactPhone: text('contact_phone'),
  contactEmail: text('contact_email'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
});

// ─── Agents / Referrers ─────────────────────────────────────────────────────

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  companyName: text('company_name'),
  phone: text('phone'),
  countryCode: text('country_code'),
  phoneNumbers: text('phone_numbers', { mode: 'json' }), // [{countryCode, phone, label}]
  email: text('email'),
  country: text('country'),
  city: text('city'),
  address: text('address'),
  commissionType: text('commission_type'), // 'percentage', 'fixed'
  commissionValue: real('commission_value'),
  agreementUrl: text('agreement_url'),
  panNumber: text('pan_number'),
  bankName: text('bank_name'),
  bankAccount: text('bank_account'),
  ifscCode: text('ifsc_code'),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
});

// ─── Leads ───────────────────────────────────────────────────────────────────

export const leads = sqliteTable('leads', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  refId: text('ref_id').unique().notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone').notNull(),
  countryCode: text('country_code').default('+91'),
  altPhone: text('alt_phone'),
  altCountryCode: text('alt_country_code'),
  country: text('country'),
  city: text('city'),
  gender: text('gender'), // 'male', 'female', 'other'
  dateOfBirth: text('date_of_birth'), // SQLite date as text
  passportNumber: text('passport_number'),

  // Medical details
  medicalIssue: text('medical_issue'),
  treatmentDepartmentId: text('treatment_department_id').references(() => departments.id),
  hospitalId: text('hospital_id').references(() => hospitals.id),
  doctorId: text('doctor_id').references(() => doctors.id),
  approximateAmount: real('approximate_amount'),
  currency: text('currency').default('INR'), // 'INR', 'USD', 'AED', 'BDT', 'EUR', 'GBP'
  symptomsText: text('symptoms_text'),
  symptomsJson: text('symptoms_json', { mode: 'json' }),

  // Travel details
  estimatedTravelDate: text('estimated_travel_date'),
  numberOfAttendants: integer('number_of_attendants'),
  preferredLanguage: text('preferred_language'),
  insuranceDetails: text('insurance_details'),
  referringDoctor: text('referring_doctor'),
  medicalHistoryNotes: text('medical_history_notes'),
  nativeAddress: text('native_address'),
  highCommissionName: text('high_commission_name'),
  embassyName: text('embassy_name'),
  indiaAddress: text('india_address'),
  indianPhoneNumber: text('indian_phone_number'),
  tentativeDuration: text('tentative_duration'),
  appointmentDate: text('appointment_date'),

  // Assignment & tracking
  agentId: text('agent_id').references(() => agents.id),
  assignedTo: text('assigned_to').references(() => users.id),
  status: text('status').default('new'), // 'new', 'junk', 'valid', 'prospect', 'visa_letter_requested', 'visa_received', 'appointment_booked', 'visited', 'service_taken', 'lost'
  source: text('source').default('manual'),
  utmParams: text('utm_params', { mode: 'json' }),
  lang: text('lang'),

  // Verification (for agent-submitted leads)
  verificationStatus: text('verification_status').default('pending'), // 'pending', 'accepted', 'rejected'
  verifiedBy: text('verified_by').references(() => users.id),
  verifiedAt: integer('verified_at', { mode: 'timestamp' }),
  rejectionReason: text('rejection_reason'),

  // Prescription
  prescriptionUrl: text('prescription_url'),
  prescriptionAnalysis: text('prescription_analysis', { mode: 'json' }),

  // Contact preferences
  preferredCallTime: text('preferred_call_time'),
  waSentAt: integer('wa_sent_at', { mode: 'timestamp' }),
  lastContactedAt: integer('last_contacted_at', { mode: 'timestamp' }),
  followUpAt: integer('follow_up_at', { mode: 'timestamp' }),

  // Visa letter data
  visaLetterData: text('visa_letter_data', { mode: 'json' }), // {patient:{...}, attendant1:{...}, attendant2:{...}}
  visaDataFrozen: integer('visa_data_frozen', { mode: 'boolean' }).default(false),
  visaDataFrozenBy: text('visa_data_frozen_by').references(() => users.id),
  visaDataFrozenAt: integer('visa_data_frozen_at', { mode: 'timestamp' }),

  // Notes & archive
  notes: text('notes'),
  isArchived: integer('is_archived', { mode: 'boolean' }).default(false),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
  archivedBy: text('archived_by').references(() => users.id),

  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
});

// ─── Attendants ──────────────────────────────────────────────────────────────

export const attendants = sqliteTable('attendants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  leadId: text('lead_id').references(() => leads.id).notNull(),
  name: text('name').notNull(),
  dateOfBirth: text('date_of_birth'),
  passportNumber: text('passport_number'),
  relationship: text('relationship'), // spouse, parent, child, sibling, other
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
});

// ─── Documents ───────────────────────────────────────────────────────────────

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  leadId: text('lead_id').references(() => leads.id).notNull(),
  docType: text('doc_type').notNull(), // 'passport', 'visa_letter', 'visa_invite_letter', 'prescription', ...
  fileName: text('file_name'),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  uploadedBy: text('uploaded_by').references(() => users.id),
  uploadedByAgent: text('uploaded_by_agent').references(() => agents.id),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
});

// ─── Appointments ────────────────────────────────────────────────────────────

export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  leadId: text('lead_id').references(() => leads.id).notNull(),
  hospitalId: text('hospital_id').references(() => hospitals.id),
  departmentId: text('department_id').references(() => departments.id),
  doctorId: text('doctor_id').references(() => doctors.id),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }).notNull(),
  status: text('status').default('pending'), // 'pending', 'confirmed', ...
  waConfirmationSent: integer('wa_confirmation_sent', { mode: 'boolean' }).default(false),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
});

// ─── Activities ──────────────────────────────────────────────────────────────

export const activities = sqliteTable('activities', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  leadId: text('lead_id').references(() => leads.id),
  type: text('type').notNull(), // 'lead_created', ...
  description: text('description'),
  metadata: text('metadata', { mode: 'json' }),
  performedBy: text('performed_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
});

// ─── Invoices ────────────────────────────────────────────────────────────────

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceNumber: text('invoice_number').unique().notNull(),
  invoiceType: text('invoice_type').notNull(), // 'hospital', 'agent_payout'
  leadId: text('lead_id').references(() => leads.id),
  hospitalId: text('hospital_id').references(() => hospitals.id),
  agentId: text('agent_id').references(() => agents.id),
  amount: real('amount').notNull(),
  currency: text('currency').default('INR'),
  taxAmount: real('tax_amount').default(0),
  totalAmount: real('total_amount').notNull(),
  status: text('status').default('draft'), // 'draft', 'sent', ...
  dueDate: text('due_date'),
  paidDate: text('paid_date'),
  description: text('description'),
  lineItems: text('line_items', { mode: 'json' }),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
});

// ─── WhatsApp Templates ─────────────────────────────────────────────────────

export const waTemplates = sqliteTable('wa_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').unique().notNull(),
  category: text('category').default('custom'),
  bodyText: text('body_text').notNull(),
  variables: text('variables', { mode: 'json' }),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
});

// ─── Audit Log ───────────────────────────────────────────────────────────────

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  changes: text('changes', { mode: 'json' }),
  ipAddress: text('ip_address'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now') * 1000)`),
});
