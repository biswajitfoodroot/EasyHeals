import express from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { invoices, activities, leads, hospitals, agents } from '../db/schema.js';
import { eq, and, desc, count, sql, gte, lte } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { logger } from '../app.js';

const router = express.Router();

const lineItemSchema = z.object({
    description: z.string().min(1),
    quantity: z.number().min(1),
    rate: z.number().min(0),
    amount: z.number().min(0),
});

const invoiceSchema = z.object({
    invoiceType: z.enum(['hospital', 'agent_payout']),
    leadId: z.string().uuid().optional().nullable(),
    hospitalId: z.string().uuid().optional().nullable(),
    agentId: z.string().uuid().optional().nullable(),
    amount: z.string().or(z.number()),
    currency: z.enum(['INR', 'USD', 'AED', 'BDT', 'EUR', 'GBP']).optional().default('INR'),
    taxAmount: z.string().or(z.number()).optional().default('0'),
    totalAmount: z.string().or(z.number()),
    status: z.enum(['draft', 'sent', 'paid', 'cancelled']).optional().default('draft'),
    dueDate: z.string().optional().nullable(),
    description: z.string().optional(),
    lineItems: z.array(lineItemSchema).optional(),
    notes: z.string().optional(),
});

// Helper: Generate next invoice number
async function generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const lastInvoice = await db.select({ invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(sql`${invoices.invoiceNumber} LIKE ${'EH-INV-' + year + '-%'}`)
        .orderBy(desc(invoices.createdAt))
        .limit(1);

    let nextNum = 1;
    if (lastInvoice.length > 0) {
        const parts = lastInvoice[0].invoiceNumber.split('-');
        nextNum = parseInt(parts[parts.length - 1]) + 1;
    }

    return `EH-INV-${year}-${String(nextNum).padStart(4, '0')}`;
}

// GET /invoices/next-number
router.get('/next-number', authenticateToken, async (req, res) => {
    try {
        const number = await generateInvoiceNumber();
        res.json({ invoiceNumber: number });
    } catch (error) {
        logger.error('Error generating invoice number:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /invoices — List with filters
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { type, status, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        let conditions = [];

        if (type) conditions.push(eq(invoices.invoiceType, type));
        if (status) conditions.push(eq(invoices.status, status));
        if (dateFrom) conditions.push(gte(invoices.createdAt, new Date(dateFrom)));
        if (dateTo) conditions.push(lte(invoices.createdAt, new Date(dateTo)));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [results, totalResult] = await Promise.all([
            db.select({
                invoice: invoices,
                leadName: leads.name,
                leadRefId: leads.refId,
                hospitalName: hospitals.name,
                agentName: agents.name,
            })
                .from(invoices)
                .leftJoin(leads, eq(invoices.leadId, leads.id))
                .leftJoin(hospitals, eq(invoices.hospitalId, hospitals.id))
                .leftJoin(agents, eq(invoices.agentId, agents.id))
                .where(whereClause)
                .orderBy(desc(invoices.createdAt))
                .limit(Number(limit))
                .offset(offset),
            db.select({ count: count() }).from(invoices).where(whereClause)
        ]);

        // Flatten the joined results
        const data = results.map(r => ({
            ...r.invoice,
            leadName: r.leadName,
            leadRefId: r.leadRefId,
            hospitalName: r.hospitalName,
            agentName: r.agentName,
        }));

        res.json({
            data,
            total: totalResult[0].count,
            page: Number(page),
            totalPages: Math.ceil(totalResult[0].count / limit)
        });
    } catch (error) {
        logger.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /invoices — Create
router.post('/', authenticateToken, validate(invoiceSchema), async (req, res) => {
    try {
        const data = req.validatedBody;
        const invoiceNumber = await generateInvoiceNumber();

        const [newInvoice] = await db.insert(invoices).values({
            invoiceNumber,
            invoiceType: data.invoiceType,
            leadId: data.leadId,
            hospitalId: data.hospitalId,
            agentId: data.agentId,
            amount: String(data.amount),
            currency: data.currency,
            taxAmount: String(data.taxAmount || 0),
            totalAmount: String(data.totalAmount),
            status: data.status,
            dueDate: data.dueDate,
            description: data.description,
            lineItems: data.lineItems,
            notes: data.notes,
            createdBy: req.user.id,
            updatedAt: new Date(),
        }).returning();

        // Log activity if linked to a lead
        if (data.leadId) {
            await db.insert(activities).values({
                leadId: data.leadId,
                type: 'invoice_created',
                description: `Invoice ${invoiceNumber} created (${data.invoiceType})`,
                performedBy: req.user.id,
            });
        }

        res.status(201).json(newInvoice);
    } catch (error) {
        logger.error('Error creating invoice:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /invoices/:id — Full detail
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const results = await db.select({
            invoice: invoices,
            leadName: leads.name,
            leadRefId: leads.refId,
            hospitalName: hospitals.name,
            agentName: agents.name,
        })
            .from(invoices)
            .leftJoin(leads, eq(invoices.leadId, leads.id))
            .leftJoin(hospitals, eq(invoices.hospitalId, hospitals.id))
            .leftJoin(agents, eq(invoices.agentId, agents.id))
            .where(eq(invoices.id, req.params.id))
            .limit(1);

        if (results.length === 0) return res.status(404).json({ error: 'Invoice not found' });

        const r = results[0];
        res.json({
            ...r.invoice,
            leadName: r.leadName,
            leadRefId: r.leadRefId,
            hospitalName: r.hospitalName,
            agentName: r.agentName,
        });
    } catch (error) {
        logger.error('Error fetching invoice:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PATCH /invoices/:id — Update
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const [updated] = await db.update(invoices)
            .set({ ...req.body, updatedAt: new Date() })
            .where(eq(invoices.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Invoice not found' });
        res.json(updated);
    } catch (error) {
        logger.error('Error updating invoice:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
