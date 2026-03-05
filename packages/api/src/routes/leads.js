import express from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { db } from '../db/index.js';
import { activities, hospitals, departments, doctors, agents, users, attendants, documents, leads } from '../db/schema.js';
import { desc, eq, or, like, and, gte, lte, count, sql, inArray } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validate.js';
import { requireAdvisor } from '../middleware/roles.js';
import { sendEmail } from '../services/emailService.js';
import PDFDocument from 'pdfkit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);

const router = express.Router();

// Rate limit for public lead creation
const createLeadLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: { error: 'Too many requests, please try again after a minute' }
});

// Zod schema for lead creation
const createLeadSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().min(4, 'Phone is required'),
    countryCode: z.string().optional().default('+91'),
    altPhone: z.string().optional(),
    altCountryCode: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    gender: z.preprocess((val) => {
        if (val === undefined || val === null || val === '') return undefined;
        return String(val).toLowerCase();
    }, z.enum(['male', 'female', 'other']).optional()),
    dateOfBirth: z.string().optional(),
    passportNumber: z.string().optional(),
    medicalIssue: z.string().optional(),
    treatmentDepartmentId: z.preprocess((val) => (val === 'undefined' ? null : val), z.string().uuid().optional().nullable()),
    hospitalId: z.preprocess((val) => (val === 'undefined' ? null : val), z.string().uuid().optional().nullable()),
    doctorId: z.preprocess((val) => (val === 'undefined' ? null : val), z.string().uuid().optional().nullable()),
    approximateAmount: z.preprocess((val) => (val === undefined || val === null || val === '' ? undefined : val), z.string().or(z.number()).optional()),
    currency: z.enum(['INR', 'USD', 'AED', 'BDT', 'EUR', 'GBP']).optional().default('INR'),
    symptomsText: z.string().optional(),
    symptomsJson: z.record(z.any()).optional(),
    estimatedTravelDate: z.string().optional(),
    numberOfAttendants: z.preprocess((val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const n = Number(val);
        return isNaN(n) ? undefined : n;
    }, z.number().int().optional()),
    preferredLanguage: z.string().optional(),
    insuranceDetails: z.string().optional(),
    referringDoctor: z.string().optional(),
    medicalHistoryNotes: z.string().optional(),
    agentId: z.preprocess((val) => (val === 'undefined' ? null : val), z.string().uuid().optional().nullable()),
    assignedTo: z.preprocess((val) => (val === 'undefined' ? null : val), z.string().uuid().optional().nullable()),
    status: z.enum(['new', 'junk', 'valid', 'prospect', 'visa_letter_requested', 'visa_received', 'appointment_booked', 'visited', 'service_taken', 'lost']).optional().default('new'),
    source: z.string().optional().default('manual'),
    lang: z.string().optional(),
    preferredCallTime: z.string().optional(),
    notes: z.string().optional(),
    utmParams: z.record(z.any()).optional(),
});

// Helper: Generate Ref ID
// Uses MAX(CAST(...)) to safely find the highest existing number,
// avoiding race conditions that can occur when ordering by createdAt.
async function generateRefId() {
    try {
        const result = await db.select({
            maxNum: sql`MAX(CAST(SUBSTR(ref_id, 4) AS INTEGER))`,
        }).from(leads);

        const maxNum = result[0]?.maxNum;
        if (maxNum && !isNaN(Number(maxNum))) {
            return `EH-${Number(maxNum) + 1}`;
        }
        return 'EH-100001';
    } catch (e) {
        logger.error('Error generating refId:', e);
        return `EH-${Date.now()}`; // Last resort fallback
    }
}

// GET /leads/stats — Aggregated counts for dashboard
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const statusCounts = await db.select({
            status: leads.status,
            count: count(),
        })
            .from(leads)
            .where(eq(leads.isArchived, false))
            .groupBy(leads.status);

        const totalLeads = statusCounts.reduce((sum, s) => sum + Number(s.count), 0);

        // Today's new leads
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [todayResult] = await db.select({ count: count() })
            .from(leads)
            .where(and(
                gte(leads.createdAt, today),
                eq(leads.isArchived, false)
            ));

        // Follow-ups due
        const [followUpResult] = await db.select({ count: count() })
            .from(leads)
            .where(and(
                lte(leads.followUpAt, new Date()),
                eq(leads.isArchived, false),
                or(
                    eq(leads.status, 'new'),
                    eq(leads.status, 'valid'),
                    eq(leads.status, 'prospect'),
                    eq(leads.status, 'visa_letter_requested')
                )
            ));

        res.json({
            totalLeads,
            todayLeads: Number(todayResult.count),
            followUpsDue: Number(followUpResult.count),
            byStatus: statusCounts.reduce((acc, s) => {
                acc[s.status] = Number(s.count);
                return acc;
            }, {}),
        });
    } catch (error) {
        logger.error('Error fetching lead stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /leads/export — CSV export
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const results = await buildLeadQuery(req.query);

        // Build CSV
        const headers = ['Ref ID', 'Name', 'Email', 'Country Code', 'Phone', 'Alt Phone', 'Country', 'City', 'Status', 'Medical Issue', 'Amount', 'Currency', 'Agent', 'Created At'];
        const rows = results.map(r => [
            r.refId, r.name, r.email || '', r.countryCode || '', r.phone,
            r.altPhone || '', r.country || '', r.city || '', r.status,
            (r.medicalIssue || '').replace(/,/g, ';'), r.approximateAmount || '',
            r.currency || '', r.agentName || '', r.createdAt
        ].map(v => `"${v}"`).join(','));

        const csv = [headers.join(','), ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=leads-export-${Date.now()}.csv`);
        res.send(csv);
    } catch (error) {
        logger.error('Error exporting leads:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /leads/followups — Leads needing follow-up
router.get('/followups', authenticateToken, async (req, res) => {
    try {
        const results = await db.select().from(leads)
            .where(and(
                eq(leads.isArchived, false),
                or(
                    eq(leads.status, 'new'),
                    eq(leads.status, 'valid'),
                    eq(leads.status, 'prospect')
                )
            ))
            .orderBy(desc(leads.createdAt));

        res.json(results);
    } catch (error) {
        logger.error('Error fetching follow-ups:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Helper to build filtered lead query
async function buildLeadQuery(query) {
    const {
        status, agentId, hospitalId, departmentId, country,
        dateFrom, dateTo, amountMin, amountMax,
        assignedTo, isArchived, search,
        sortBy = 'createdAt', sortOrder = 'desc',
        page = 1, limit = 20
    } = query;

    const offset = (page - 1) * limit;
    let conditions = [];

    // Archive filter (default: show non-archived)
    if (isArchived === 'true') {
        conditions.push(eq(leads.isArchived, true));
    } else {
        conditions.push(eq(leads.isArchived, false));
    }

    // Multi-status filter
    if (status) {
        const statuses = Array.isArray(status) ? status : [status];
        if (statuses.length === 1) {
            conditions.push(eq(leads.status, statuses[0]));
        } else {
            conditions.push(inArray(leads.status, statuses));
        }
    }

    if (agentId) conditions.push(eq(leads.agentId, agentId));
    if (hospitalId) conditions.push(eq(leads.hospitalId, hospitalId));
    if (departmentId) conditions.push(eq(leads.treatmentDepartmentId, departmentId));
    if (country) conditions.push(like(leads.country, `%${country}%`));
    if (assignedTo) conditions.push(eq(leads.assignedTo, assignedTo));
    if (dateFrom) conditions.push(gte(leads.createdAt, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(leads.createdAt, new Date(dateTo)));
    if (amountMin) conditions.push(gte(leads.approximateAmount, String(amountMin)));
    if (amountMax) conditions.push(lte(leads.approximateAmount, String(amountMax)));

    if (query.followUpDue === 'true') {
        conditions.push(and(
            lte(leads.followUpAt, new Date()),
            inArray(leads.status, ['new', 'valid', 'prospect', 'visa_letter_requested'])
        ));
    }

    if (search) {
        conditions.push(
            sql`(${leads.name} LIKE ${'%' + search + '%'} OR ${leads.phone} LIKE ${'%' + search + '%'} OR ${leads.refId} LIKE ${'%' + search + '%'} OR ${leads.email} LIKE ${'%' + search + '%'})`
        );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort column
    const sortCol = {
        'createdAt': leads.createdAt,
        'name': leads.name,
        'status': leads.status,
        'amount': leads.approximateAmount,
        'updatedAt': leads.updatedAt,
    }[sortBy] || leads.createdAt;

    const orderFn = sortOrder === 'asc' ? sql`${sortCol} ASC` : desc(sortCol);

    const results = await db.select({
        lead: leads,
        agentName: agents.name,
        hospitalName: hospitals.name,
        departmentName: departments.name,
        doctorName: doctors.name,
        assignedToName: users.name,
    })
        .from(leads)
        .leftJoin(agents, eq(leads.agentId, agents.id))
        .leftJoin(hospitals, eq(leads.hospitalId, hospitals.id))
        .leftJoin(departments, eq(leads.treatmentDepartmentId, departments.id))
        .leftJoin(doctors, eq(leads.doctorId, doctors.id))
        .leftJoin(users, eq(leads.assignedTo, users.id))
        .where(whereClause)
        .orderBy(orderFn)
        .limit(Number(limit))
        .offset(offset);

    return results.map(r => ({
        ...r.lead,
        agentName: r.agentName,
        hospitalName: r.hospitalName,
        departmentName: r.departmentName,
        doctorName: r.doctorName,
        assignedToName: r.assignedToName,
    }));
}

// GET /leads — List with filters + pagination
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, isArchived, status } = req.query;

        // Get total count with same filters as data query
        let countConditions = [];
        if (isArchived === 'true') {
            countConditions.push(eq(leads.isArchived, true));
        } else {
            countConditions.push(eq(leads.isArchived, false));
        }
        // Apply status filter to count too
        if (status) {
            const statuses = Array.isArray(status) ? status : [status];
            if (statuses.length === 1) {
                countConditions.push(eq(leads.status, statuses[0]));
            } else {
                countConditions.push(inArray(leads.status, statuses));
            }
        }
        const [totalResult] = await db.select({ count: count() }).from(leads)
            .where(and(...countConditions));

        const data = await buildLeadQuery(req.query);

        res.json({
            data,
            total: Number(totalResult.count),
            page: Number(page),
            totalPages: Math.ceil(Number(totalResult.count) / Number(limit))
        });
    } catch (error) {
        logger.error('Error fetching leads:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /leads — Create new lead (public + authenticated)
router.post('/', async (req, res) => {
    console.log('[DEBUG] POST /leads request received');
    console.log('[DEBUG] Payload:', JSON.stringify(req.body, null, 2));
    try {
        console.log('[DEBUG] Starting createLeadSchema.parse...');
        const parsed = createLeadSchema.parse(req.body);
        console.log('[DEBUG] Zod Parse Successful');

        console.log('[DEBUG] Starting generateRefId...');
        const refId = await generateRefId();
        console.log('[DEBUG] Ref ID Generated:', refId);

        // Duplicate detection
        console.log('[DEBUG] Checking duplicate by phone:', parsed.phone);
        const existingByPhone = await db.select({ id: leads.id, refId: leads.refId, name: leads.name })
            .from(leads)
            .where(eq(leads.phone, parsed.phone))
            .limit(1);

        if (existingByPhone.length > 0) {
            console.log('[DEBUG] Duplicate phone found:', existingByPhone[0].refId);
            return res.status(409).json({
                error: 'Duplicate lead detected',
                existing: existingByPhone[0],
                message: `A lead with this phone number already exists (${existingByPhone[0].refId} - ${existingByPhone[0].name})`
            });
        }

        if (parsed.email) {
            console.log('[DEBUG] Checking duplicate by email:', parsed.email);
            const existingByEmail = await db.select({ id: leads.id, refId: leads.refId, name: leads.name })
                .from(leads)
                .where(eq(leads.email, parsed.email))
                .limit(1);

            if (existingByEmail.length > 0) {
                console.log('[DEBUG] Duplicate email found:', existingByEmail[0].refId);
                return res.status(409).json({
                    error: 'Duplicate lead detected',
                    existing: existingByEmail[0],
                    message: `A lead with this email already exists (${existingByEmail[0].refId} - ${existingByEmail[0].name})`
                });
            }
        }

        console.log('[DEBUG] Starting db.insert into leads...');
        const [newLead] = await db.insert(leads).values({
            refId,
            name: parsed.name,
            email: parsed.email || null,
            phone: parsed.phone,
            countryCode: parsed.countryCode,
            altPhone: parsed.altPhone,
            altCountryCode: parsed.altCountryCode,
            country: parsed.country,
            city: parsed.city,
            gender: parsed.gender,
            dateOfBirth: parsed.dateOfBirth,
            passportNumber: parsed.passportNumber,
            medicalIssue: parsed.medicalIssue,
            treatmentDepartmentId: parsed.treatmentDepartmentId,
            hospitalId: parsed.hospitalId,
            doctorId: parsed.doctorId,
            approximateAmount: parsed.approximateAmount ? parseFloat(parsed.approximateAmount) : null,
            currency: parsed.currency,
            symptomsText: parsed.symptomsText,
            symptomsJson: parsed.symptomsJson,
            estimatedTravelDate: parsed.estimatedTravelDate,
            numberOfAttendants: parsed.numberOfAttendants,
            preferredLanguage: parsed.preferredLanguage,
            insuranceDetails: parsed.insuranceDetails,
            referringDoctor: parsed.referringDoctor,
            medicalHistoryNotes: parsed.medicalHistoryNotes,
            agentId: parsed.agentId,
            assignedTo: parsed.assignedTo,
            status: parsed.status,
            source: parsed.source,
            lang: parsed.lang,
            preferredCallTime: parsed.preferredCallTime,
            notes: parsed.notes,
            utmParams: parsed.utmParams,
        }).returning();
        console.log('[DEBUG] Lead inserted successfully:', newLead.id);

        try {
            // Log activity
            console.log('[DEBUG] Starting activity log for lead_created...');
            await db.insert(activities).values({
                leadId: newLead.id,
                type: 'lead_created',
                description: `Lead created from ${parsed.source || 'manual'}`,
                performedBy: req.user?.id || null,
            });
            console.log('[DEBUG] Activity log successful');
        } catch (actErr) {
            console.error('[DEBUG] Activity log FAILED:', actErr);
            logger.error('Error logging lead creation activity:', actErr);
        }

        console.log('[DEBUG] Returning 201 Success');
        res.status(201).json({
            id: newLead.id,
            ref_id: newLead.refId,
            status: newLead.status,
        });
    } catch (error) {
        console.error('[DEBUG] CATCH BLOCK EXCEPTION:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
            });
        }
        logger.error('Error creating lead:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error.message, stack: error.stack });
    }
});

// POST /leads/bulk — Bulk import leads
router.post('/bulk', authenticateToken, async (req, res) => {
    try {
        const { leads: leadList } = req.body;
        if (!Array.isArray(leadList) || leadList.length === 0) {
            return res.status(400).json({ error: 'Provide an array of leads' });
        }

        const results = { created: [], skipped: [], failed: [] };

        for (const raw of leadList) {
            try {
                // Minimal validation
                if (!raw.name || !raw.phone) {
                    results.failed.push({ ...raw, _error: 'Name and phone are required' });
                    continue;
                }

                // Clean phone
                const phone = String(raw.phone).replace(/[\s\-()]/g, '');

                // Duplicate check
                const existing = await db.select({ id: leads.id, refId: leads.refId, name: leads.name })
                    .from(leads)
                    .where(eq(leads.phone, phone))
                    .limit(1);

                if (existing.length > 0) {
                    results.skipped.push({ ...raw, _error: `Duplicate: ${existing[0].refId} - ${existing[0].name}` });
                    continue;
                }

                const refId = await generateRefId();

                const [newLead] = await db.insert(leads).values({
                    refId,
                    name: raw.name,
                    email: raw.email || null,
                    phone,
                    countryCode: raw.countryCode || '+91',
                    altPhone: raw.altPhone || null,
                    altCountryCode: raw.altCountryCode || '+91',
                    country: raw.country || null,
                    city: raw.city || null,
                    gender: raw.gender || null,
                    medicalIssue: raw.medicalIssue || null,
                    approximateAmount: raw.approximateAmount ? String(raw.approximateAmount) : null,
                    currency: raw.currency || 'INR',
                    status: raw.status || 'new',
                    source: raw.source || 'import',
                    notes: raw.notes || null,
                }).returning({ id: leads.id, refId: leads.refId, name: leads.name });

                // Log activity
                await db.insert(activities).values({
                    leadId: newLead.id,
                    type: 'lead_created',
                    description: 'Lead created via bulk import',
                    performedBy: req.user?.id || null,
                });

                results.created.push(newLead);
            } catch (err) {
                results.failed.push({ ...raw, _error: err.message });
            }
        }

        res.status(201).json(results);
    } catch (error) {
        logger.error('Error bulk importing leads:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /leads/:id — Full lead with related data + activities
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const results = await db.select({
            lead: leads,
            agentName: agents.name,
            hospitalName: hospitals.name,
            hospitalEmail: hospitals.contactEmail,
            hospitalEmailIds: hospitals.emailIds,
            departmentName: departments.name,
            doctorName: doctors.name,
            assignedToName: users.name,
        })
            .from(leads)
            .leftJoin(agents, eq(leads.agentId, agents.id))
            .leftJoin(hospitals, eq(leads.hospitalId, hospitals.id))
            .leftJoin(departments, eq(leads.treatmentDepartmentId, departments.id))
            .leftJoin(doctors, eq(leads.doctorId, doctors.id))
            .leftJoin(users, eq(leads.assignedTo, users.id))
            .where(eq(leads.id, req.params.id))
            .limit(1);

        if (results.length === 0) return res.status(404).json({ error: 'Lead not found' });

        const r = results[0];
        const lead = {
            ...r.lead,
            agentName: r.agentName,
            hospitalName: r.hospitalName,
            hospitalEmail: r.hospitalEmail,
            hospitalEmailIds: r.hospitalEmailIds,
            departmentName: r.departmentName,
            doctorName: r.doctorName,
            assignedToName: r.assignedToName,
        };

        const leadActivities = await db.select({
            activity: activities,
            performedByName: users.name,
        })
            .from(activities)
            .leftJoin(users, eq(activities.performedBy, users.id))
            .where(eq(activities.leadId, lead.id))
            .orderBy(desc(activities.createdAt));

        res.json({
            ...lead,
            activities: leadActivities.map(a => ({
                ...a.activity,
                performedByName: a.performedByName,
            }))
        });
    } catch (error) {
        logger.error('Error fetching lead details:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PATCH /leads/:id — Partial update with activity logging
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const [oldLead] = await db.select().from(leads).where(eq(leads.id, req.params.id)).limit(1);
        if (!oldLead) return res.status(404).json({ error: 'Lead not found' });

        const allowedFields = [
            'name', 'email', 'phone', 'countryCode', 'altPhone', 'altCountryCode',
            'country', 'city', 'gender', 'dateOfBirth', 'passportNumber',
            'medicalIssue', 'treatmentDepartmentId', 'hospitalId', 'doctorId',
            'approximateAmount', 'currency', 'symptomsText', 'symptomsJson',
            'estimatedTravelDate', 'numberOfAttendants', 'preferredLanguage',
            'insuranceDetails', 'referringDoctor', 'medicalHistoryNotes',
            'agentId', 'assignedTo', 'status', 'source', 'utmParams', 'lang',
            'prescriptionUrl', 'prescriptionAnalysis', 'preferredCallTime',
            'notes', 'waSentAt', 'lastContactedAt', 'followUpAt',
            'visaLetterData',
            'nativeAddress', 'highCommissionName', 'embassyName', 'indiaAddress',
            'indianPhoneNumber', 'tentativeDuration', 'appointmentDate',
        ];

        // Block visa data edits if frozen
        if (req.body.visaLetterData !== undefined && oldLead.visaDataFrozen) {
            return res.status(403).json({ error: 'Visa letter data is frozen and cannot be edited' });
        }

        const filteredBody = {};
        for (const key of allowedFields) {
            if (req.body[key] !== undefined) {
                let val = req.body[key];

                // Explicit type casting for database
                if (key === 'approximateAmount') val = val ? parseFloat(val) : null;
                if (key === 'numberOfAttendants') val = val ? Number(val) : null;
                if (['waSentAt', 'lastContactedAt', 'followUpAt'].includes(key)) val = val ? new Date(val) : null;

                filteredBody[key] = val;
            }
        }

        const updateData = { ...filteredBody, updatedAt: new Date() };
        // Don't allow direct archive via PATCH
        delete updateData.isArchived;
        delete updateData.archivedAt;
        delete updateData.archivedBy;

        const [updatedLead] = await db.update(leads)
            .set(updateData)
            .where(eq(leads.id, req.params.id))
            .returning().catch(err => {
                console.error('DATABASE UPDATE ERROR:', err);
                logger.error('Database update error detail:', { error: err.message, stack: err.stack, payload: updateData });
                throw err;
            });

        // Log status change
        if (req.body.status && req.body.status !== oldLead.status) {
            // Auto-archive on junk/lost
            if (req.body.status === 'junk' || req.body.status === 'lost') {
                await db.update(leads)
                    .set({
                        isArchived: true,
                        archivedAt: new Date(),
                        archivedBy: req.user?.id,
                    })
                    .where(eq(leads.id, req.params.id));
            }
            await db.insert(activities).values({
                leadId: updatedLead.id,
                type: 'status_changed',
                description: `Status changed from ${oldLead.status} to ${updatedLead.status}`,
                performedBy: req.user?.id,
            });
        }

        // Log agent assignment
        if (req.body.agentId && req.body.agentId !== oldLead.agentId) {
            await db.insert(activities).values({
                leadId: updatedLead.id,
                type: 'agent_assigned',
                description: `Agent assigned`,
                performedBy: req.user?.id,
                metadata: { agentId: req.body.agentId },
            });
        }

        // Log user assignment
        if (req.body.assignedTo && req.body.assignedTo !== oldLead.assignedTo) {
            await db.insert(activities).values({
                leadId: updatedLead.id,
                type: 'lead_assigned',
                description: `Lead assigned to user`,
                performedBy: req.user?.id,
                metadata: { assignedTo: req.body.assignedTo },
            });
        }

        // Log generic field update for important fields
        const trackedFields = ['hospitalId', 'treatmentDepartmentId', 'doctorId', 'approximateAmount'];
        for (const field of trackedFields) {
            if (req.body[field] !== undefined && req.body[field] !== oldLead[field]) {
                await db.insert(activities).values({
                    leadId: updatedLead.id,
                    type: 'field_updated',
                    description: `${field} updated`,
                    performedBy: req.user?.id,
                    metadata: { field, oldValue: oldLead[field], newValue: req.body[field] },
                });
            }
        }

        res.json(updatedLead);
    } catch (error) {
        logger.error('Error updating lead:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /leads/:id/visa-data/freeze — Lock visa letter data (advisor+ only)
router.post('/:id/visa-data/freeze', authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.role;
        if (!['owner', 'admin', 'advisor'].includes(userRole)) {
            return res.status(403).json({ error: 'Only advisors or higher can freeze visa data' });
        }

        const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id)).limit(1);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const [updated] = await db.update(leads)
            .set({
                visaDataFrozen: true,
                visaDataFrozenBy: req.user.id,
                visaDataFrozenAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(leads.id, req.params.id))
            .returning();

        await db.insert(activities).values({
            leadId: req.params.id,
            type: 'visa_data_frozen',
            description: 'Visa letter data has been frozen',
            performedBy: req.user.id,
        });

        res.json({ message: 'Visa letter data frozen', lead: updated });
    } catch (error) {
        logger.error('Error freezing visa data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /leads/:id/visa-data/unfreeze — Unlock visa letter data (advisor+ only)
router.post('/:id/visa-data/unfreeze', authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.role;
        if (!['owner', 'admin', 'advisor'].includes(userRole)) {
            return res.status(403).json({ error: 'Only advisors or higher can unfreeze visa data' });
        }

        const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id)).limit(1);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const [updated] = await db.update(leads)
            .set({
                visaDataFrozen: false,
                visaDataFrozenBy: null,
                visaDataFrozenAt: null,
                updatedAt: new Date(),
            })
            .where(eq(leads.id, req.params.id))
            .returning();

        await db.insert(activities).values({
            leadId: req.params.id,
            type: 'visa_data_unfrozen',
            description: 'Visa letter data has been unfrozen',
            performedBy: req.user.id,
        });

        res.json({ message: 'Visa letter data unfrozen', lead: updated });
    } catch (error) {
        logger.error('Error unfreezing visa data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /leads/:id/archive — Archive a lead
router.post('/:id/archive', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [updated] = await db.update(leads)
            .set({
                isArchived: true,
                archivedAt: new Date(),
                archivedBy: req.user.id,
                updatedAt: new Date(),
            })
            .where(eq(leads.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Lead not found' });

        await db.insert(activities).values({
            leadId: updated.id,
            type: 'archived',
            description: 'Lead archived',
            performedBy: req.user.id,
        });

        res.json({ message: 'Lead archived', lead: updated });
    } catch (error) {
        logger.error('Error archiving lead:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /leads/:id/restore — Restore from archive
router.post('/:id/restore', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [updated] = await db.update(leads)
            .set({
                isArchived: false,
                archivedAt: null,
                archivedBy: null,
                updatedAt: new Date(),
            })
            .where(eq(leads.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Lead not found' });

        await db.insert(activities).values({
            leadId: updated.id,
            type: 'restored',
            description: 'Lead restored from archive',
            performedBy: req.user.id,
        });

        res.json({ message: 'Lead restored', lead: updated });
    } catch (error) {
        logger.error('Error restoring lead:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /leads/bulk-archive — Bulk archive
router.post('/bulk-archive', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Provide an array of lead IDs' });
        }

        await db.update(leads)
            .set({
                isArchived: true,
                archivedAt: new Date(),
                archivedBy: req.user.id,
                updatedAt: new Date(),
            })
            .where(inArray(leads.id, ids));

        // Log activities
        for (const id of ids) {
            await db.insert(activities).values({
                leadId: id,
                type: 'archived',
                description: 'Lead archived (bulk)',
                performedBy: req.user.id,
            });
        }

        res.json({ message: `${ids.length} leads archived` });
    } catch (error) {
        logger.error('Error bulk archiving:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /leads/bulk-assign — Bulk assign to user/agent
router.post('/bulk-assign', authenticateToken, async (req, res) => {
    try {
        const { ids, assignedTo, agentId } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Provide an array of lead IDs' });
        }

        const updateData = { updatedAt: new Date() };
        if (assignedTo) updateData.assignedTo = assignedTo;
        if (agentId) updateData.agentId = agentId;

        await db.update(leads).set(updateData).where(inArray(leads.id, ids));

        const actType = agentId ? 'agent_assigned' : 'lead_assigned';
        for (const id of ids) {
            await db.insert(activities).values({
                leadId: id,
                type: actType,
                description: `Bulk ${agentId ? 'agent' : 'user'} assignment`,
                performedBy: req.user.id,
            });
        }

        res.json({ message: `${ids.length} leads updated` });
    } catch (error) {
        logger.error('Error bulk assigning:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /leads/:id/notes — Add a quick note
router.post('/:id/notes', authenticateToken, async (req, res) => {
    try {
        const { note } = req.body;
        if (!note) return res.status(400).json({ error: 'Note text is required' });

        await db.insert(activities).values({
            leadId: req.params.id,
            type: 'note_added',
            description: note,
            performedBy: req.user.id,
        });

        res.status(201).json({ message: 'Note added' });
    } catch (error) {
        logger.error('Error adding note:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /leads/:id/verify — Accept or reject an agent-submitted lead
router.post('/:id/verify', authenticateToken, requireAdvisor, async (req, res) => {
    try {
        const { action, reason } = req.body;
        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Action must be "accept" or "reject"' });
        }

        const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id)).limit(1);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const updateData = {
            verificationStatus: action === 'accept' ? 'accepted' : 'rejected',
            verifiedBy: req.user.id,
            verifiedAt: new Date(),
            updatedAt: new Date(),
        };
        if (action === 'reject' && reason) updateData.rejectionReason = reason;
        if (action === 'accept') {
            updateData.status = 'valid'; // auto-advance to valid on acceptance
        }

        const [updated] = await db.update(leads)
            .set(updateData)
            .where(eq(leads.id, req.params.id))
            .returning();

        await db.insert(activities).values({
            leadId: req.params.id,
            type: action === 'accept' ? 'lead_verified' : 'lead_rejected',
            description: action === 'accept'
                ? 'Lead verified and accepted by advisor'
                : `Lead rejected: ${reason || 'No reason provided'}`,
            performedBy: req.user.id,
        });

        res.json({ message: `Lead ${action}ed`, lead: updated });
    } catch (error) {
        logger.error('Error verifying lead:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /leads/:id/visa-letters — Upload visa invite letter (advisor only)
// On Vercel, filesystem is read-only outside /tmp — must match documents.js upload path
const visaUploadDir = process.env.VERCEL
    ? '/tmp/uploads'
    : path.resolve(__dirname2, '../../../../uploads');
const visaStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(visaUploadDir, req.params.id);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const suffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `visa-${suffix}${path.extname(file.originalname)}`);
    }
});
const visaUpload = multer({
    storage: visaStorage,
    limits: { fileSize: 4 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        cb(null, allowed.includes(file.mimetype));
    }
});

router.post('/:id/visa-letters', authenticateToken, requireAdvisor, visaUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const fileUrl = `/uploads/${req.params.id}/${req.file.filename}`;
        const [newDoc] = await db.insert(documents).values({
            leadId: req.params.id,
            docType: 'visa_invite_letter',
            fileName: req.file.originalname,
            fileUrl,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            uploadedBy: req.user.id,
            notes: req.body.notes || '',
        }).returning();

        await db.insert(activities).values({
            leadId: req.params.id,
            type: 'document_uploaded',
            description: `Visa invite letter uploaded: ${req.file.originalname}`,
            performedBy: req.user.id,
        });

        res.status(201).json(newDoc);
    } catch (error) {
        logger.error('Error uploading visa letter:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /leads/:id/attendants — List attendants for a lead
router.get('/:id/attendants', authenticateToken, async (req, res) => {
    try {
        const results = await db.select().from(attendants)
            .where(eq(attendants.leadId, req.params.id));
        res.json(results);
    } catch (error) {
        logger.error('Error fetching attendants:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /leads/:id/send-visa-email — Send VIL to hospital
router.post('/:id/send-visa-email', authenticateToken, requireAdvisor, async (req, res) => {
    try {
        const { id } = req.params;
        const { recipientEmails, subject: customSubject, body: customBody, attachmentIds } = req.body; // Array of emails, optional custom subject/body, optional extra attachments

        // Fetch lead with visa data
        const [lead] = await db.select({
            lead: leads,
            hospital: hospitals
        })
            .from(leads)
            .leftJoin(hospitals, eq(leads.hospitalId, hospitals.id))
            .where(eq(leads.id, id))
            .limit(1);

        if (!lead) return res.status(404).json({ error: 'Lead not found' });
        if (!lead.lead.visaLetterData) return res.status(400).json({ error: 'Visa letter data not found' });

        const data = lead.lead.visaLetterData;
        const patientName = `${data.patient?.givenName || lead.lead.name} ${data.patient?.surname || ''}`.trim();

        // Generate PDF — formatted to match the View Letter preview
        const chunks = [];
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        doc.on('data', chunk => chunks.push(chunk));

        // ── Header ──────────────────────────────────────────────────────────
        doc.fontSize(16).font('Helvetica-Bold')
            .text('VISA INVITATION LETTER — REQUEST DATA', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica')
            .fillColor('#555')
            .text(`Patient: ${patientName}`, { align: 'center' });
        doc.moveDown(1);

        // ── Helper: draw a two-column table for a person ─────────────────────
        const drawTable = (rows, title) => {
            // Section heading
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#0d9488')
                .text(title, { underline: false });
            doc.moveDown(0.3);

            const tableTop = doc.y;
            const colLabel = 50;
            const colValue = 250;
            const colWidth1 = 190;
            const colWidth2 = 290;
            const rowHeight = 20;
            const pageWidth = 495; // A4 usable width at margin 50

            rows.forEach(([label, value], i) => {
                const y = tableTop + i * rowHeight;

                // Check page overflow
                if (y + rowHeight > doc.page.height - 60) {
                    doc.addPage();
                }

                const rowY = y < doc.page.height - 60 ? y : doc.y;

                // Background for label cell
                doc.rect(colLabel, rowY, colWidth1, rowHeight).fillAndStroke('#f8fafc', '#cccccc');
                // Value cell
                doc.rect(colLabel + colWidth1, rowY, colWidth2, rowHeight).fillAndStroke('white', '#cccccc');

                // Label text
                doc.fontSize(9).font('Helvetica-Bold').fillColor('#444')
                    .text(label, colLabel + 4, rowY + 5, { width: colWidth1 - 8, ellipsis: true });

                // Value text
                doc.fontSize(9).font('Helvetica').fillColor('#111')
                    .text(value || '', colLabel + colWidth1 + 4, rowY + 5, { width: colWidth2 - 8, ellipsis: true });
            });

            // Move cursor past the table
            doc.y = tableTop + rows.length * rowHeight + 16;
            doc.moveDown(0.5);
        };

        // ── Patient Table ────────────────────────────────────────────────────
        const p = data.patient || {};
        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '';
        drawTable([
            ['Patient Surname *', p.surname],
            ['Patient Given Name *', p.givenName],
            ['Gender *', p.gender],
            ['Date of Birth (DD/MM/YYYY) *', fmtDate(p.dateOfBirth)],
            ['Nationality *', p.nationality],
            ['Passport No *', p.passportNo],
            ['Address *', p.address],
            ['Contact Number *', p.contactNumber],
            ['Email id *', p.email],
            ['Diagnosis / Proposed Treatment *', p.doctorSpeciality],
            ['Department Name', p.departmentName],
            ['Appointment Date', fmtDate(p.appointmentDate)],
            ['Dr to Meet', p.doctorMeetName],
        ], 'PATIENT DETAILS');

        // ── Attendant Tables ─────────────────────────────────────────────────
        const drawAttendant = (att, label) => {
            if (!att?.surname) return;
            drawTable([
                [`${label} Surname *`, att.surname],
                [`${label} Given Name *`, att.givenName],
                [`${label} Passport No *`, att.passportNo],
                ['Gender *', att.gender],
                ['Date of Birth (DD/MM/YYYY) *', fmtDate(att.dateOfBirth)],
                ['Address *', att.address],
                ['Contact Number', att.contactNumber],
                ['Email', att.email],
                ['Relationship between Patient & Attendant', att.relationship],
            ], label.toUpperCase());
        };

        drawAttendant(data.attendant1, 'Attendant 1');
        drawAttendant(data.attendant2, 'Attendant 2');
        drawAttendant(data.attendant3, 'Attendant 3');

        doc.end();

        // Wait for PDF to finish
        const pdfBuffer = await new Promise((resolve) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
        });

        // Email Content
        const defaultSubject = `Request for VIL - ${patientName}`;
        const finalSubject = customSubject || defaultSubject;

        // Use customBody from frontend if provided, otherwise use a default
        const contentBody = customBody || `Dear Sir/Madam,\n\nPlease find attached the Visa Invitation Letter request for our patient, ${patientName}.\n\nBelow are the details for your quick reference:\n\nPatient: ${patientName}\nPassport: ${data.patient?.passportNo || 'N/A'}`;

        const bodyHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
                <div style="background-color: #0d9488; padding: 24px; color: white; text-align: center;">
                    <h2 style="margin: 0; font-size: 20px;">Visa Invitation Request</h2>
                </div>
                <div style="padding: 32px; background-color: white;">
                    <div style="white-space: pre-wrap; margin-bottom: 24px;">${contentBody}</div>
                    
                    ${(() => {
                const tableRow = (label, value) => value ? `<tr><td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; width: 160px; color: #64748b; font-size: 12px; white-space: nowrap;"><strong>${label}</strong></td><td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px;">${value}</td></tr>` : '';
                const sectionHeader = (label) => `<tr><td colspan="2" style="padding: 10px 16px; background: #0d9488; color: white; font-size: 12px; font-weight: 800; letter-spacing: 0.05em;">${label}</td></tr>`;
                const p = data.patient || {};
                const a1 = data.attendant1 || {};
                const a2 = data.attendant2 || {};
                const a3 = data.attendant3 || {};
                let rows = '';
                rows += sectionHeader('PATIENT DETAILS');
                rows += tableRow('Name', [p.givenName, p.surname].filter(Boolean).join(' ') || patientName);
                rows += tableRow('Date of Birth', p.dateOfBirth);
                rows += tableRow('Gender', p.gender);
                rows += tableRow('Passport No', p.passportNo);
                rows += tableRow('Nationality', p.nationality);
                rows += tableRow('Address', p.address);
                rows += tableRow('Contact Number', p.contactNumber);
                rows += tableRow('Email', p.email);
                rows += tableRow('Doctor Speciality', p.doctorSpeciality);
                rows += tableRow('Department', p.departmentName);
                rows += tableRow('Appointment Date', p.appointmentDate);
                rows += tableRow('Doctor to Meet', p.doctorMeetName);
                if (a1.surname) {
                    rows += sectionHeader('ATTENDANT 1');
                    rows += tableRow('Name', [a1.givenName, a1.surname].filter(Boolean).join(' '));
                    rows += tableRow('Date of Birth', a1.dateOfBirth);
                    rows += tableRow('Gender', a1.gender);
                    rows += tableRow('Passport No', a1.passportNo);
                    rows += tableRow('Nationality', a1.nationality);
                    rows += tableRow('Address', a1.address);
                    rows += tableRow('Contact Number', a1.contactNumber);
                    rows += tableRow('Email', a1.email);
                    rows += tableRow('Relationship', a1.relationship);
                }
                if (a2.surname) {
                    rows += sectionHeader('ATTENDANT 2');
                    rows += tableRow('Name', [a2.givenName, a2.surname].filter(Boolean).join(' '));
                    rows += tableRow('Date of Birth', a2.dateOfBirth);
                    rows += tableRow('Gender', a2.gender);
                    rows += tableRow('Passport No', a2.passportNo);
                    rows += tableRow('Nationality', a2.nationality);
                    rows += tableRow('Address', a2.address);
                    rows += tableRow('Contact Number', a2.contactNumber);
                    rows += tableRow('Email', a2.email);
                    rows += tableRow('Relationship', a2.relationship);
                }
                if (a3.surname) {
                    rows += sectionHeader('ATTENDANT 3');
                    rows += tableRow('Name', [a3.givenName, a3.surname].filter(Boolean).join(' '));
                    rows += tableRow('Date of Birth', a3.dateOfBirth);
                    rows += tableRow('Gender', a3.gender);
                    rows += tableRow('Passport No', a3.passportNo);
                    rows += tableRow('Nationality', a3.nationality);
                    rows += tableRow('Address', a3.address);
                    rows += tableRow('Contact Number', a3.contactNumber);
                    rows += tableRow('Email', a3.email);
                    rows += tableRow('Relationship', a3.relationship);
                }
                return `<table style="width: 100%; border-collapse: collapse; margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">${rows}</table>`;
            })()}

                    <p style="margin-bottom: 32px; color: #64748b; font-size: 13px; italic">Please process the VIL at the earliest. If you require any further information, please feel free to reach out.</p>
                    
                    <div style="margin-top: 40px; padding-top: 24px; border-top: 2px solid #f1f5f9;">
                        <table style="width: 100%;">
                            <tr>
                                <td style="vertical-align: top;">
                                    <div style="font-weight: 800; color: #0d9488; font-size: 16px; margin-bottom: 4px;">Marketing Department</div>
                                    <div style="color: #1e293b; font-size: 14px; font-weight: 600;">EasyHeals Technologies Pvt Ltd.</div>
                                    <div style="margin-top: 8px;">
                                        <a href="https://www.easyheals.com" style="color: #c2410c; text-decoration: none; font-size: 13px; font-weight: 600;">www.easyheals.com</a>
                                    </div>
                                    <div style="margin-top: 12px; font-size: 11px; color: #94a3b8; font-weight: 500;">
                                        Supported by IIM Lucknow & IIT Mandi
                                    </div>
                                </td>
                                <td style="text-align: right; vertical-align: bottom;">
                                    <div style="background: #f0fdfa; color: #0d9488; padding: 4px 12px; border-radius: 6px; font-size: 10px; font-weight: 800; display: inline-block; border: 1px solid #ccfbf1;">
                                        TRUSTED HEALTHCARE PARTNER
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const finalAttachments = [{
            filename: `VIL_Request_data_${patientName.replace(/\s+/g, '_')}.pdf`,
            content: pdfBuffer
        }];

        // Add extra attachments if requested
        if (attachmentIds && Array.isArray(attachmentIds) && attachmentIds.length > 0) {
            const extraDocs = await db.select().from(documents).where(inArray(documents.id, attachmentIds));
            for (const docInfo of extraDocs) {
                try {
                    let fileContent;
                    if (docInfo.fileUrl.startsWith('http')) {
                        // Vercel Blob URL: fetch content via HTTP (persistent, shared across instances)
                        logger.info('[API] Fetching blob attachment: ' + docInfo.fileName);
                        const blobRes = await fetch(docInfo.fileUrl);
                        if (!blobRes.ok) throw new Error('Blob fetch HTTP ' + blobRes.status);
                        fileContent = Buffer.from(await blobRes.arrayBuffer());
                    } else {
                        // Local disk path
                        const rel = docInfo.fileUrl.replace(/^\/?(uploads\/)?/, '');
                        const fp = path.join(visaUploadDir, rel);
                        logger.info('[API] Reading local attachment: ' + fp);
                        if (!fs.existsSync(fp)) {
                            logger.error('[API] File not found on disk: ' + fp);
                            continue;
                        }
                        fileContent = fs.readFileSync(fp);
                    }
                    finalAttachments.push({ filename: docInfo.fileName, content: fileContent });
                    logger.info('[API] Attachment added: ' + docInfo.fileName);
                } catch (err) {
                    logger.error('[API] Failed to load attachment ' + docInfo.fileName + ': ' + err.message);
                }
            }
            logger.info('[API] Total attachments being sent: ' + finalAttachments.length);
        }

        const toAddress = (recipientEmails && Array.isArray(recipientEmails) && recipientEmails.length > 0)
            ? recipientEmails
            : lead.hospital?.contactEmail;

        await sendEmail({
            to: toAddress,
            cc: 'biswajit_saha@easyheals.com',
            subject: finalSubject,
            text: contentBody,
            html: bodyHtml,
            attachments: finalAttachments
        });

        // ── Temporary Attachment Cleanup ─────────────────────────────────────
        // If any attachments were uploaded specifically for this email (marked 'email_attachment'),
        // delete them from storage and DB after sending to keep storage clean/private.
        if (attachmentIds && Array.isArray(attachmentIds) && attachmentIds.length > 0) {
            const tempDocs = await db.select().from(documents)
                .where(and(inArray(documents.id, attachmentIds), eq(documents.docType, 'email_attachment')));

            for (const doc of tempDocs) {
                try {
                    if (process.env.VERCEL && doc.fileUrl.startsWith('http')) {
                        const { del } = await import('@vercel/blob');
                        await del(doc.fileUrl);
                    } else {
                        const rel = doc.fileUrl.replace(/^\/?(uploads\/)?/, '');
                        const fp = path.join(visaUploadDir, rel);
                        if (fs.existsSync(fp)) fs.unlinkSync(fp);
                    }
                    await db.delete(documents).where(eq(documents.id, doc.id));
                    logger.info(`[API] Temp attachment cleaned up: ${doc.fileName}`);
                } catch (err) {
                    logger.error(`[API] Failed to clean up temp attachment ${doc.id}: ${err.message}`);
                }
            }
        }

        const loggedRecipients = Array.isArray(toAddress) ? toAddress.join(', ') : toAddress;
        await db.insert(activities).values({
            leadId: id,
            type: 'email_sent',
            description: `Visa Letter emailed to hospital: ${loggedRecipients || 'Unknown'}`,
            performedBy: req.user.id,
        });

        res.json({ message: 'Email sent successfully' });
    } catch (error) {
        logger.error('Error sending visa email:', error);
        res.status(500).json({ error: 'Failed to send email', message: error.message });
    }
});

router.use((err, req, res, next) => {
    console.error('[DEBUG] LEADS ROUTER ERROR:', err);
    logger.error('Leads router error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message, stack: err.stack });
});

export default router;

