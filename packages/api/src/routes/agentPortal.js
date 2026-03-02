import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db/index.js';
import { leads, attendants, documents, activities, hospitals, departments, doctors, agents, users } from '../db/schema.js';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.js';
import { requireAgent } from '../middleware/roles.js';
import { logger } from '../app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// All routes require agent authentication
router.use(authenticateToken, requireAgent);

// ─── File Upload Config (4 MB limit) ──────────────────────────────────────────
// On Vercel, the filesystem is read-only outside /tmp
const isVercel = !!process.env.VERCEL;
const uploadDir = isVercel
    ? '/tmp/uploads'
    : path.resolve(__dirname, '../../../../uploads');
try {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
} catch (e) {
    console.warn('[agentPortal] Could not create uploadDir at startup:', e.message);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const leadDir = path.join(uploadDir, req.params.id || 'temp');
        try {
            if (!fs.existsSync(leadDir)) fs.mkdirSync(leadDir, { recursive: true });
        } catch (e) {
            console.warn('[agentPortal] Could not create leadDir:', e.message);
        }
        cb(null, leadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed. Accepted: PDF, JPEG, PNG, WebP, DOC, DOCX'));
        }
    }
});

// ─── Helper: Get agent's linked agentId ──────────────────────────────────────
async function getAgentId(userId) {
    const [user] = await db.select({ linkedAgentId: users.linkedAgentId })
        .from(users).where(eq(users.id, userId)).limit(1);
    return user?.linkedAgentId;
}

// ─── Helper: Verify lead belongs to this agent ───────────────────────────────
async function verifyLeadOwnership(leadId, agentId) {
    const [lead] = await db.select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.id, leadId), eq(leads.agentId, agentId)))
        .limit(1);
    return !!lead;
}

// ─── Generate ref ID ─────────────────────────────────────────────────────────
async function generateRefId() {
    const [result] = await db.select({ count: count() }).from(leads);
    const num = (result?.count || 0) + 1;
    return `EH-${String(num).padStart(5, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEADS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /agent-portal/leads — List agent's leads
router.get('/leads', async (req, res) => {
    try {
        const agentId = await getAgentId(req.user.id);
        if (!agentId) return res.status(403).json({ error: 'Agent profile not linked' });

        const { search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let conditions = [eq(leads.agentId, agentId), eq(leads.isArchived, false)];

        if (search) {
            conditions.push(
                sql`(${leads.name} LIKE ${'%' + search + '%'} OR ${leads.phone} LIKE ${'%' + search + '%'} OR ${leads.refId} LIKE ${'%' + search + '%'})`
            );
        }

        const whereClause = and(...conditions);

        const [results, totalResult] = await Promise.all([
            db.select().from(leads)
                .where(whereClause)
                .orderBy(desc(leads.createdAt))
                .limit(Number(limit))
                .offset(offset),
            db.select({ count: count() }).from(leads).where(whereClause)
        ]);

        res.json({
            data: results,
            total: totalResult[0].count,
            page: Number(page),
            totalPages: Math.ceil(totalResult[0].count / limit)
        });
    } catch (error) {
        logger.error('Agent: Error fetching leads:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /agent-portal/leads — Submit new lead
const leadSchema = z.object({
    name: z.string().min(1, 'Patient name is required'),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().min(4, 'Phone number is required'),
    countryCode: z.string().optional().default('+880'),
    dateOfBirth: z.string().optional(),
    passportNumber: z.string().optional(),
    nativeAddress: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    gender: z.string().optional(),
    medicalIssue: z.string().optional(),
    hospitalId: z.string().optional().nullable(),
    treatmentDepartmentId: z.string().optional().nullable(),
    doctorId: z.string().optional().nullable(),
    highCommissionName: z.string().optional(),
    embassyName: z.string().optional(),
    indiaAddress: z.string().optional(),
    indianPhoneNumber: z.string().optional(),
    tentativeDuration: z.string().optional(),
    appointmentDate: z.string().optional(),
    notes: z.string().optional(),
    attendants: z.array(z.object({
        name: z.string().min(1),
        dateOfBirth: z.string().optional(),
        passportNumber: z.string().optional(),
        relationship: z.string().optional(),
    })).optional().default([]),
});

router.post('/leads', async (req, res) => {
    try {
        const agentId = await getAgentId(req.user.id);
        if (!agentId) return res.status(403).json({ error: 'Agent profile not linked' });

        const parsed = leadSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        }

        const { attendants: attendantsData, ...leadData } = parsed.data;
        const refId = await generateRefId();

        const [newLead] = await db.insert(leads).values({
            ...leadData,
            refId,
            agentId,
            source: 'agent_portal',
            status: 'new',
            verificationStatus: 'pending',
            numberOfAttendants: attendantsData.length,
        }).returning();

        // Insert attendants
        if (attendantsData.length > 0) {
            await db.insert(attendants).values(
                attendantsData.map(a => ({ ...a, leadId: newLead.id }))
            );
        }

        // Log activity
        await db.insert(activities).values({
            leadId: newLead.id,
            type: 'lead_created',
            description: `Lead submitted via Agent Portal`,
            performedBy: req.user.id,
            metadata: { source: 'agent_portal', agentId },
        });

        res.status(201).json(newLead);
    } catch (error) {
        logger.error('Agent: Error creating lead:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /agent-portal/leads/:id — Lead detail with attendants & documents
router.get('/leads/:id', async (req, res) => {
    try {
        const agentId = await getAgentId(req.user.id);
        if (!agentId) return res.status(403).json({ error: 'Agent profile not linked' });

        if (!await verifyLeadOwnership(req.params.id, agentId)) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const [lead] = await db.select().from(leads)
            .where(eq(leads.id, req.params.id)).limit(1);

        const leadAttendants = await db.select().from(attendants)
            .where(eq(attendants.leadId, req.params.id));

        const leadDocs = await db.select().from(documents)
            .where(eq(documents.leadId, req.params.id))
            .orderBy(desc(documents.createdAt));

        // Get hospital/department/doctor names
        let hospitalName = null, departmentName = null, doctorName = null;
        if (lead.hospitalId) {
            const [h] = await db.select({ name: hospitals.name }).from(hospitals).where(eq(hospitals.id, lead.hospitalId)).limit(1);
            hospitalName = h?.name;
        }
        if (lead.treatmentDepartmentId) {
            const [d] = await db.select({ name: departments.name }).from(departments).where(eq(departments.id, lead.treatmentDepartmentId)).limit(1);
            departmentName = d?.name;
        }
        if (lead.doctorId) {
            const [d] = await db.select({ name: doctors.name }).from(doctors).where(eq(doctors.id, lead.doctorId)).limit(1);
            doctorName = d?.name;
        }

        res.json({
            ...lead,
            hospitalName,
            departmentName,
            doctorName,
            attendants: leadAttendants,
            documents: leadDocs,
            visaLetters: leadDocs.filter(d => d.docType === 'visa_invite_letter'),
        });
    } catch (error) {
        logger.error('Agent: Error fetching lead detail:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// VISA LETTER DATA
// ═══════════════════════════════════════════════════════════════════════════════

// PATCH /agent-portal/leads/:id/visa-data — Update visa letter information
router.patch('/leads/:id/visa-data', async (req, res) => {
    try {
        const agentId = await getAgentId(req.user.id);
        if (!agentId) return res.status(403).json({ error: 'Agent profile not linked' });
        if (!await verifyLeadOwnership(req.params.id, agentId)) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Check if frozen
        const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id)).limit(1);
        if (lead.visaDataFrozen) {
            return res.status(403).json({ error: 'Visa letter data has been locked by your advisor and cannot be edited' });
        }

        const { visaLetterData } = req.body;
        if (!visaLetterData) {
            return res.status(400).json({ error: 'Visa letter data is required' });
        }

        const patient = visaLetterData.patient || {};
        const updatePayload = {
            visaLetterData,
            updatedAt: new Date(),
        };

        // Sync patient info if available
        if (patient.name) updatePayload.name = patient.name;
        if (patient.passportNo) updatePayload.passportNumber = patient.passportNo;
        if (patient.dateOfBirth) updatePayload.dateOfBirth = patient.dateOfBirth;
        if (patient.gender) updatePayload.gender = patient.gender;
        if (patient.nationality) updatePayload.country = patient.nationality;
        if (patient.address) updatePayload.nativeAddress = patient.address;
        if (patient.contactNumber) updatePayload.phone = patient.contactNumber;
        if (patient.email) updatePayload.email = patient.email;

        const [updated] = await db.update(leads)
            .set(updatePayload)
            .where(eq(leads.id, req.params.id))
            .returning();

        await db.insert(activities).values({
            leadId: req.params.id,
            type: 'visa_data_updated',
            description: 'Visa letter data updated via Agent Portal',
            performedBy: req.user.id,
        });

        res.json({ message: 'Visa letter data saved', visaLetterData: updated.visaLetterData });
    } catch (error) {
        logger.error('Agent: Error updating visa data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANTS
// ═══════════════════════════════════════════════════════════════════════════════

// POST /agent-portal/leads/:id/attendants
router.post('/leads/:id/attendants', async (req, res) => {
    try {
        const agentId = await getAgentId(req.user.id);
        if (!agentId) return res.status(403).json({ error: 'Agent profile not linked' });
        if (!await verifyLeadOwnership(req.params.id, agentId)) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const { name, dateOfBirth, passportNumber, relationship } = req.body;
        if (!name) return res.status(400).json({ error: 'Attendant name is required' });

        const [newAttendant] = await db.insert(attendants).values({
            leadId: req.params.id, name, dateOfBirth, passportNumber, relationship,
        }).returning();

        // Update attendants count
        const countResult = await db.select({ count: count() }).from(attendants)
            .where(eq(attendants.leadId, req.params.id));
        await db.update(leads)
            .set({ numberOfAttendants: countResult[0].count, updatedAt: new Date() })
            .where(eq(leads.id, req.params.id));

        res.status(201).json(newAttendant);
    } catch (error) {
        logger.error('Agent: Error adding attendant:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /agent-portal/leads/:id/attendants/:aid
router.delete('/leads/:id/attendants/:aid', async (req, res) => {
    try {
        const agentId = await getAgentId(req.user.id);
        if (!agentId) return res.status(403).json({ error: 'Agent profile not linked' });
        if (!await verifyLeadOwnership(req.params.id, agentId)) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        await db.delete(attendants).where(
            and(eq(attendants.id, req.params.aid), eq(attendants.leadId, req.params.id))
        );

        // Update attendants count
        const countResult = await db.select({ count: count() }).from(attendants)
            .where(eq(attendants.leadId, req.params.id));
        await db.update(leads)
            .set({ numberOfAttendants: countResult[0].count, updatedAt: new Date() })
            .where(eq(leads.id, req.params.id));

        res.json({ message: 'Attendant removed' });
    } catch (error) {
        logger.error('Agent: Error removing attendant:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════════

// POST /agent-portal/leads/:id/documents
router.post('/leads/:id/documents', upload.single('file'), async (req, res) => {
    try {
        const agentId = await getAgentId(req.user.id);
        if (!agentId) return res.status(403).json({ error: 'Agent profile not linked' });
        if (!await verifyLeadOwnership(req.params.id, agentId)) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const docType = req.body.docType || 'other';
        const fileUrl = `/uploads/${req.params.id}/${req.file.filename}`;

        const [newDoc] = await db.insert(documents).values({
            leadId: req.params.id,
            docType,
            fileName: req.file.originalname,
            fileUrl,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            uploadedByAgent: agentId,
            notes: req.body.notes || '',
        }).returning();

        await db.insert(activities).values({
            leadId: req.params.id,
            type: 'document_uploaded',
            description: `${docType.replace('_', ' ')} uploaded by agent: ${req.file.originalname}`,
            performedBy: req.user.id,
        });

        res.status(201).json(newDoc);
    } catch (error) {
        // Handle file size error
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File exceeds 4 MB limit. Please compress or resize the file and try again.'
            });
        }
        logger.error('Agent: Error uploading document:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /agent-portal/leads/:id/documents
router.get('/leads/:id/documents', async (req, res) => {
    try {
        const agentId = await getAgentId(req.user.id);
        if (!agentId) return res.status(403).json({ error: 'Agent profile not linked' });
        if (!await verifyLeadOwnership(req.params.id, agentId)) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const docs = await db.select().from(documents)
            .where(eq(documents.leadId, req.params.id))
            .orderBy(desc(documents.createdAt));

        res.json(docs);
    } catch (error) {
        logger.error('Agent: Error fetching documents:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /agent-portal/leads/:id/visa-letters
router.get('/leads/:id/visa-letters', async (req, res) => {
    try {
        const agentId = await getAgentId(req.user.id);
        if (!agentId) return res.status(403).json({ error: 'Agent profile not linked' });
        if (!await verifyLeadOwnership(req.params.id, agentId)) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const visaLetters = await db.select().from(documents)
            .where(and(
                eq(documents.leadId, req.params.id),
                eq(documents.docType, 'visa_invite_letter')
            ))
            .orderBy(desc(documents.createdAt));

        res.json(visaLetters);
    } catch (error) {
        logger.error('Agent: Error fetching visa letters:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MASTER DATA (read-only)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/masters/hospitals', async (req, res) => {
    try {
        const results = await db.select({ id: hospitals.id, name: hospitals.name })
            .from(hospitals).where(eq(hospitals.isActive, true)).orderBy(hospitals.name);
        res.json(results);
    } catch (error) {
        logger.error('Agent: Error fetching hospitals:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/masters/departments', async (req, res) => {
    try {
        const results = await db.select({ id: departments.id, name: departments.name })
            .from(departments).where(eq(departments.isActive, true)).orderBy(departments.name);
        res.json(results);
    } catch (error) {
        logger.error('Agent: Error fetching departments:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/masters/doctors', async (req, res) => {
    try {
        const { hospitalId, departmentId } = req.query;
        let conditions = [eq(doctors.isActive, true)];
        if (hospitalId) conditions.push(eq(doctors.hospitalId, hospitalId));
        if (departmentId) conditions.push(eq(doctors.departmentId, departmentId));

        const results = await db.select({ id: doctors.id, name: doctors.name })
            .from(doctors).where(and(...conditions)).orderBy(doctors.name);
        res.json(results);
    } catch (error) {
        logger.error('Agent: Error fetching doctors:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /agent-portal/change-password — Agent changes their own password
router.post('/change-password', async (req, res) => {
    try {
        const bcrypt = (await import('bcryptjs')).default;
        const { users } = await import('../db/schema.js');

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const [userEntry] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
        if (!userEntry) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, userEntry.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect current password' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await db.update(users).set({ passwordHash }).where(eq(users.id, userEntry.id));

        await db.insert(activities).values({
            type: 'agent_self_password_change',
            description: `Agent ${userEntry.email} changed their own portal password`,
            performedBy: req.user.id,
            metadata: { userId: userEntry.id },
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        logger.error('Agent: Error changing password:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
