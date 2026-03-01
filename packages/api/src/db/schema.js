import { pgTable, uuid, varchar, text, jsonb, timestamp, pgEnum, boolean, integer, decimal, date, index } from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const leadStatusEnum = pgEnum('lead_status', [
  'new', 'junk', 'valid', 'prospect',
  'visa_letter_requested', 'visa_received',
  'appointment_booked', 'visited',
  'converted', 'lost'
]);

export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'advisor', 'viewer']);

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'pending', 'confirmed', 'completed', 'cancelled', 'no_show'
]);

export const activityTypeEnum = pgEnum('activity_type', [
  'lead_created', 'call_made', 'wa_sent', 'note_added',
  'status_changed', 'appointment_booked', 'rx_uploaded',
  'document_uploaded', 'agent_assigned', 'invoice_created',
  'archived', 'restored', 'field_updated', 'lead_assigned'
]);

export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'cancelled']);
export const invoiceTypeEnum = pgEnum('invoice_type', ['hospital', 'agent_payout']);

export const docTypeEnum = pgEnum('doc_type', [
  'passport', 'visa_letter', 'medical_report', 'prescription',
  'travel_doc', 'insurance', 'agreement', 'other'
]);

export const commissionTypeEnum = pgEnum('commission_type', ['percentage', 'fixed']);

export const currencyEnum = pgEnum('currency_type', ['INR', 'USD', 'AED', 'BDT', 'EUR', 'GBP']);

export const genderEnum = pgEnum('gender_type', ['male', 'female', 'other']);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 200 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').default('advisor'),
  phone: varchar('phone', { length: 20 }),
  isActive: boolean('is_active').default(true),
  canManageUsers: boolean('can_manage_users').default(false),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── Hospitals ───────────────────────────────────────────────────────────────

export const hospitals = pgTable('hospitals', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }).default('India'),
  address: text('address'),
  contactPerson: varchar('contact_person', { length: 100 }),
  contactPhone: varchar('contact_phone', { length: 20 }),
  contactEmail: varchar('contact_email', { length: 200 }),
  accreditation: varchar('accreditation', { length: 100 }),
  website: text('website'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── Departments ─────────────────────────────────────────────────────────────

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── Doctors ─────────────────────────────────────────────────────────────────

export const doctors = pgTable('doctors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  specialization: varchar('specialization', { length: 100 }),
  hospitalId: uuid('hospital_id').references(() => hospitals.id),
  departmentId: uuid('department_id').references(() => departments.id),
  qualification: varchar('qualification', { length: 200 }),
  experienceYears: integer('experience_years'),
  contactPhone: varchar('contact_phone', { length: 20 }),
  contactEmail: varchar('contact_email', { length: 200 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── Agents / Referrers ─────────────────────────────────────────────────────

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  companyName: varchar('company_name', { length: 200 }),
  phone: varchar('phone', { length: 20 }),
  countryCode: varchar('country_code', { length: 5 }),
  email: varchar('email', { length: 200 }),
  country: varchar('country', { length: 100 }),
  city: varchar('city', { length: 100 }),
  address: text('address'),
  commissionType: commissionTypeEnum('commission_type'),
  commissionValue: decimal('commission_value', { precision: 10, scale: 2 }),
  agreementUrl: text('agreement_url'),
  panNumber: varchar('pan_number', { length: 20 }),
  bankName: varchar('bank_name', { length: 100 }),
  bankAccount: varchar('bank_account', { length: 50 }),
  ifscCode: varchar('ifsc_code', { length: 20 }),
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Leads ───────────────────────────────────────────────────────────────────

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  refId: varchar('ref_id', { length: 20 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 200 }),
  phone: varchar('phone', { length: 20 }).notNull(),
  countryCode: varchar('country_code', { length: 5 }).default('+91'),
  altPhone: varchar('alt_phone', { length: 20 }),
  altCountryCode: varchar('alt_country_code', { length: 5 }),
  country: varchar('country', { length: 100 }),
  city: varchar('city', { length: 100 }),
  gender: genderEnum('gender'),
  dateOfBirth: date('date_of_birth'),
  passportNumber: varchar('passport_number', { length: 50 }),

  // Medical details
  medicalIssue: text('medical_issue'),
  treatmentDepartmentId: uuid('treatment_department_id').references(() => departments.id),
  hospitalId: uuid('hospital_id').references(() => hospitals.id),
  doctorId: uuid('doctor_id').references(() => doctors.id),
  approximateAmount: decimal('approximate_amount', { precision: 12, scale: 2 }),
  currency: currencyEnum('currency').default('INR'),
  symptomsText: text('symptoms_text'),
  symptomsJson: jsonb('symptoms_json'),

  // Travel details
  estimatedTravelDate: date('estimated_travel_date'),
  numberOfAttendants: integer('number_of_attendants'),
  preferredLanguage: varchar('preferred_language', { length: 30 }),
  insuranceDetails: text('insurance_details'),
  referringDoctor: varchar('referring_doctor', { length: 100 }),
  medicalHistoryNotes: text('medical_history_notes'),

  // Assignment & tracking
  agentId: uuid('agent_id').references(() => agents.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  status: leadStatusEnum('status').default('new'),
  source: varchar('source', { length: 30 }).default('manual'),
  utmParams: jsonb('utm_params'),
  lang: varchar('lang', { length: 5 }),

  // Prescription
  prescriptionUrl: text('prescription_url'),
  prescriptionAnalysis: jsonb('prescription_analysis'),

  // Contact preferences
  preferredCallTime: varchar('preferred_call_time', { length: 50 }),
  waSentAt: timestamp('wa_sent_at', { withTimezone: true }),
  lastContactedAt: timestamp('last_contacted_at', { withTimezone: true }),
  followUpAt: timestamp('follow_up_at', { withTimezone: true }),

  // Notes & archive
  notes: text('notes'),
  isArchived: boolean('is_archived').default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  archivedBy: uuid('archived_by').references(() => users.id),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('leads_phone_idx').on(table.phone),
  index('leads_email_idx').on(table.email),
  index('leads_status_idx').on(table.status),
  index('leads_agent_idx').on(table.agentId),
  index('leads_archived_idx').on(table.isArchived),
  index('leads_assigned_idx').on(table.assignedTo),
  index('leads_created_idx').on(table.createdAt),
]);

// ─── Documents ───────────────────────────────────────────────────────────────

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leads.id).notNull(),
  docType: docTypeEnum('doc_type').notNull(),
  fileName: varchar('file_name', { length: 200 }),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 50 }),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('docs_lead_idx').on(table.leadId),
]);

// ─── Appointments ────────────────────────────────────────────────────────────

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leads.id).notNull(),
  hospitalId: uuid('hospital_id').references(() => hospitals.id),
  departmentId: uuid('department_id').references(() => departments.id),
  doctorId: uuid('doctor_id').references(() => doctors.id),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  status: appointmentStatusEnum('status').default('pending'),
  waConfirmationSent: boolean('wa_confirmation_sent').default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── Activities ──────────────────────────────────────────────────────────────

export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leads.id),
  type: activityTypeEnum('type').notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  performedBy: uuid('performed_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('activities_lead_idx').on(table.leadId),
  index('activities_created_idx').on(table.createdAt),
]);

// ─── Invoices ────────────────────────────────────────────────────────────────

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceNumber: varchar('invoice_number', { length: 30 }).unique().notNull(),
  invoiceType: invoiceTypeEnum('invoice_type').notNull(),
  leadId: uuid('lead_id').references(() => leads.id),
  hospitalId: uuid('hospital_id').references(() => hospitals.id),
  agentId: uuid('agent_id').references(() => agents.id),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: currencyEnum('currency').default('INR'),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  status: invoiceStatusEnum('status').default('draft'),
  dueDate: date('due_date'),
  paidDate: date('paid_date'),
  description: text('description'),
  lineItems: jsonb('line_items'),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('invoices_number_idx').on(table.invoiceNumber),
  index('invoices_status_idx').on(table.status),
  index('invoices_lead_idx').on(table.leadId),
]);

// ─── WhatsApp Templates ─────────────────────────────────────────────────────

export const waTemplates = pgTable('wa_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  category: varchar('category', { length: 50 }).default('custom'),
  bodyText: text('body_text').notNull(),
  variables: jsonb('variables'),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Audit Log ───────────────────────────────────────────────────────────────

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 30 }).notNull(),
  entityId: uuid('entity_id'),
  changes: jsonb('changes'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('audit_user_idx').on(table.userId),
  index('audit_entity_idx').on(table.entityType, table.entityId),
  index('audit_created_idx').on(table.createdAt),
]);
