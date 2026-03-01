import express from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { db } from '../db/index.js';
import { leads, activities, hospitals, departments, doctors, agents, users } from '../db/schema.js';
import { desc, eq, or, like, and, gte, lte, count, sql, inArray } from 'drizzle-orm';
import { logger } from '../server.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validate.js';

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
    gender: z.enum(['male', 'female', 'other']).optional(),
    dateOfBirth: z.string().optional(),
    passportNumber: z.string().optional(),
    medicalIssue: z.string().optional(),
    treatmentDepartmentId: z.string().uuid().optional().nullable(),
    hospitalId: z.string().uuid().optional().nullable(),
    doctorId: z.string().uuid().optional().nullable(),
    approximateAmount: z.string().or(z.number()).optional(),
    currency: z.enum(['INR', 'USD', 'AED', 'BDT', 'EUR', 'GBP']).optional().default('INR'),
    symptomsText: z.string().optional(),
    symptomsJson: z.record(z.any()).optional(),
    estimatedTravelDate: z.string().optional(),
    numberOfAttendants: z.number().int().optional(),
    preferredLanguage: z.string().optional(),
    insuranceDetails: z.string().optional(),
    referringDoctor: z.string().optional(),
    medicalHistoryNotes: z.string().optional(),
    agentId: z.string().uuid().optional().nullable(),
    assignedTo: z.string().uuid().optional().nullable(),
    status: z.enum(['new', 'junk', 'valid', 'prospect', 'visa_letter_requested', 'visa_received', 'appointment_booked', 'visited', 'converted', 'lost']).optional().default('new'),
    source: z.string().optional().default('manual'),
    lang: z.string().optional(),
    preferredCallTime: z.string().optional(),
    notes: z.string().optional(),
    utmParams: z.record(z.any()).optional(),
});

// Helper: Generate Ref ID
async function generateRefId() {
    const lastLead = await db.select({ refId: leads.refId })
        .from(leads)
        .orderBy(desc(leads.createdAt))
        .limit(1);

    const nextNum = lastLead.length > 0
        ? parseInt(lastLead[0].refId.split('-')[1]) + 1
        : 100001;

    return `EH-${nextNum}`;
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

    if (search) {
        conditions.push(
            sql`(${leads.name} ILIKE ${'%' + search + '%'} OR ${leads.phone} ILIKE ${'%' + search + '%'} OR ${leads.refId} ILIKE ${'%' + search + '%'} OR ${leads.email} ILIKE ${'%' + search + '%'})`
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
        const { page = 1, limit = 20, isArchived } = req.query;

        // Get total count
        let countConditions = [];
        if (isArchived === 'true') {
            countConditions.push(eq(leads.isArchived, true));
        } else {
            countConditions.push(eq(leads.isArchived, false));
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
router.post('/', createLeadLimiter, async (req, res) => {
    try {
        const parsed = createLeadSchema.parse(req.body);
        const refId = await generateRefId();

        // Duplicate detection
        const existingByPhone = await db.select({ id: leads.id, refId: leads.refId, name: leads.name })
            .from(leads)
            .where(eq(leads.phone, parsed.phone))
            .limit(1);

        if (existingByPhone.length > 0) {
            return res.status(409).json({
                error: 'Duplicate lead detected',
                existing: existingByPhone[0],
                message: `A lead with this phone number already exists (${existingByPhone[0].refId} - ${existingByPhone[0].name})`
            });
        }

        if (parsed.email) {
            const existingByEmail = await db.select({ id: leads.id, refId: leads.refId, name: leads.name })
                .from(leads)
                .where(eq(leads.email, parsed.email))
                .limit(1);

            if (existingByEmail.length > 0) {
                return res.status(409).json({
                    error: 'Duplicate lead detected',
                    existing: existingByEmail[0],
                    message: `A lead with this email already exists (${existingByEmail[0].refId} - ${existingByEmail[0].name})`
                });
            }
        }

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
            approximateAmount: parsed.approximateAmount ? String(parsed.approximateAmount) : null,
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

        // Log activity
        await db.insert(activities).values({
            leadId: newLead.id,
            type: 'lead_created',
            description: `Lead created from ${parsed.source || 'manual'}`,
            performedBy: req.user?.id || null,
        });

        res.status(201).json({
            id: newLead.id,
            ref_id: newLead.refId,
            status: newLead.status,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
            });
        }
        logger.error('Error creating lead:', error);
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

        const updateData = { ...req.body, updatedAt: new Date() };
        // Don't allow direct archive via PATCH
        delete updateData.isArchived;
        delete updateData.archivedAt;
        delete updateData.archivedBy;

        const [updatedLead] = await db.update(leads)
            .set(updateData)
            .where(eq(leads.id, req.params.id))
            .returning();

        // Log status change
        if (req.body.status && req.body.status !== oldLead.status) {
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

export default router;
