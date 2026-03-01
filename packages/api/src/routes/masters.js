import express from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { hospitals, departments, doctors } from '../db/schema.js';
import { eq, like, and, desc } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { logger } from '../server.js';

const router = express.Router();

// ─── Hospitals ───────────────────────────────────────────────────────────────

const hospitalSchema = z.object({
    name: z.string().min(1, 'Hospital name is required'),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional().default('India'),
    address: z.string().optional(),
    contactPerson: z.string().optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
    accreditation: z.string().optional(),
    website: z.string().optional(),
});

// GET /masters/hospitals
router.get('/hospitals', authenticateToken, async (req, res) => {
    try {
        const { search, active } = req.query;
        let conditions = [];

        if (active !== 'all') conditions.push(eq(hospitals.isActive, true));
        if (search) conditions.push(like(hospitals.name, `%${search}%`));

        const results = await db.select().from(hospitals)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(hospitals.name);

        res.json(results);
    } catch (error) {
        logger.error('Error fetching hospitals:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /masters/hospitals
router.post('/hospitals', authenticateToken, validate(hospitalSchema), async (req, res) => {
    try {
        const data = req.validatedBody;
        const [newHospital] = await db.insert(hospitals).values(data).returning();
        res.status(201).json(newHospital);
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Hospital already exists' });
        logger.error('Error creating hospital:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PATCH /masters/hospitals/:id
router.patch('/hospitals/:id', authenticateToken, async (req, res) => {
    try {
        const [updated] = await db.update(hospitals)
            .set(req.body)
            .where(eq(hospitals.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Hospital not found' });
        res.json(updated);
    } catch (error) {
        logger.error('Error updating hospital:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /masters/hospitals/:id (soft delete)
router.delete('/hospitals/:id', authenticateToken, async (req, res) => {
    try {
        const [updated] = await db.update(hospitals)
            .set({ isActive: false })
            .where(eq(hospitals.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Hospital not found' });
        res.json({ message: 'Hospital deactivated' });
    } catch (error) {
        logger.error('Error deactivating hospital:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ─── Departments ─────────────────────────────────────────────────────────────

const departmentSchema = z.object({
    name: z.string().min(1, 'Department name is required'),
    description: z.string().optional(),
});

// GET /masters/departments
router.get('/departments', authenticateToken, async (req, res) => {
    try {
        const { search, active } = req.query;
        let conditions = [];

        if (active !== 'all') conditions.push(eq(departments.isActive, true));
        if (search) conditions.push(like(departments.name, `%${search}%`));

        const results = await db.select().from(departments)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(departments.name);

        res.json(results);
    } catch (error) {
        logger.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /masters/departments
router.post('/departments', authenticateToken, validate(departmentSchema), async (req, res) => {
    try {
        const data = req.validatedBody;
        const [newDept] = await db.insert(departments).values(data).returning();
        res.status(201).json(newDept);
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Department already exists' });
        logger.error('Error creating department:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PATCH /masters/departments/:id
router.patch('/departments/:id', authenticateToken, async (req, res) => {
    try {
        const [updated] = await db.update(departments)
            .set(req.body)
            .where(eq(departments.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Department not found' });
        res.json(updated);
    } catch (error) {
        logger.error('Error updating department:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /masters/departments/:id (soft delete)
router.delete('/departments/:id', authenticateToken, async (req, res) => {
    try {
        const [updated] = await db.update(departments)
            .set({ isActive: false })
            .where(eq(departments.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Department not found' });
        res.json({ message: 'Department deactivated' });
    } catch (error) {
        logger.error('Error deactivating department:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ─── Doctors ─────────────────────────────────────────────────────────────────

const doctorSchema = z.object({
    name: z.string().min(1, 'Doctor name is required'),
    specialization: z.string().optional(),
    hospitalId: z.string().uuid().optional().nullable(),
    departmentId: z.string().uuid().optional().nullable(),
    qualification: z.string().optional(),
    experienceYears: z.number().int().optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal('')),
});

// GET /masters/doctors
router.get('/doctors', authenticateToken, async (req, res) => {
    try {
        const { search, hospitalId, departmentId, active } = req.query;
        let conditions = [];

        if (active !== 'all') conditions.push(eq(doctors.isActive, true));
        if (search) conditions.push(like(doctors.name, `%${search}%`));
        if (hospitalId) conditions.push(eq(doctors.hospitalId, hospitalId));
        if (departmentId) conditions.push(eq(doctors.departmentId, departmentId));

        const results = await db.select().from(doctors)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(doctors.name);

        res.json(results);
    } catch (error) {
        logger.error('Error fetching doctors:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /masters/doctors
router.post('/doctors', authenticateToken, validate(doctorSchema), async (req, res) => {
    try {
        const data = req.validatedBody;
        const [newDoc] = await db.insert(doctors).values(data).returning();
        res.status(201).json(newDoc);
    } catch (error) {
        logger.error('Error creating doctor:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PATCH /masters/doctors/:id
router.patch('/doctors/:id', authenticateToken, async (req, res) => {
    try {
        const [updated] = await db.update(doctors)
            .set(req.body)
            .where(eq(doctors.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Doctor not found' });
        res.json(updated);
    } catch (error) {
        logger.error('Error updating doctor:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /masters/doctors/:id (soft delete)
router.delete('/doctors/:id', authenticateToken, async (req, res) => {
    try {
        const [updated] = await db.update(doctors)
            .set({ isActive: false })
            .where(eq(doctors.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Doctor not found' });
        res.json({ message: 'Doctor deactivated' });
    } catch (error) {
        logger.error('Error deactivating doctor:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
