import express from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { agents, leads, activities, users } from '../db/schema.js';
import { eq, like, and, desc, count, sql } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { logger } from '../app.js';

const router = express.Router();

const phoneItemSchema = z.object({
    countryCode: z.string().optional().default('+91'),
    phone: z.string().min(4),
    label: z.string().optional().default('Primary'),
});

const agentSchema = z.object({
    name: z.string().min(1, 'Agent name is required'),
    companyName: z.string().optional(),
    phone: z.string().optional(),
    countryCode: z.string().optional().default('+91'),
    phoneNumbers: z.array(phoneItemSchema).optional(),
    email: z.string().email().optional().or(z.literal('')),
    country: z.string().optional(),
    city: z.string().optional(),
    address: z.string().optional(),
    commissionType: z.enum(['percentage', 'fixed']).optional(),
    commissionValue: z.string().optional(),
    panNumber: z.string().optional(),
    bankName: z.string().optional(),
    bankAccount: z.string().optional(),
    ifscCode: z.string().optional(),
    notes: z.string().optional(),
});

// GET /agents — List with search + pagination
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, active, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        let conditions = [];

        if (active !== 'all') conditions.push(eq(agents.isActive, true));
        if (search) {
            conditions.push(
                sql`(${agents.name} LIKE ${'%' + search + '%'} OR ${agents.companyName} LIKE ${'%' + search + '%'} OR ${agents.phone} LIKE ${'%' + search + '%'})`
            );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        console.log(`[API] Fetching agents (search: "${search || ''}", active: "${active || 'default'}")`);

        const [results, countRes] = await Promise.all([
            db.select({
                id: agents.id,
                name: agents.name,
                companyName: agents.companyName,
                phone: agents.phone,
                countryCode: agents.countryCode,
                phoneNumbers: agents.phoneNumbers,
                email: agents.email,
                country: agents.country,
                city: agents.city,
                address: agents.address,
                commissionType: agents.commissionType,
                commissionValue: agents.commissionValue,
                panNumber: agents.panNumber,
                bankName: agents.bankName,
                bankAccount: agents.bankAccount,
                ifscCode: agents.ifscCode,
                notes: agents.notes,
                isActive: agents.isActive,
                createdAt: agents.createdAt,
                updatedAt: agents.updatedAt,
                // Using COUNT or EXISTS logic, but JOIN is safer for Drizzle/SQLite correlation
                hasPortalLogin: sql`COUNT(${users.id})`,
                portalEmail: sql`MAX(${users.email})` // MAX gives us one email if multiple exist
            }).from(agents)
                .leftJoin(users, sql`${users.linkedAgentId} = ${agents.id} AND ${users.role} = 'agent'`)
                .where(whereClause)
                .groupBy(agents.id)
                .orderBy(agents.name)
                .limit(Number(limit))
                .offset(offset),
            db.select({ total: count() }).from(agents).where(whereClause)
        ]);

        const total = countRes[0]?.total || 0;
        console.log(`[API] Found ${results.length} agents. Total in DB matching filter: ${total}`);

        res.json({
            data: results,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('[API] Error fetching agents:', error);
        logger.error('Error fetching agents:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// POST /agents — Create agent
router.post('/', authenticateToken, validate(agentSchema), async (req, res) => {
    try {
        const data = req.validatedBody;
        // Set primary phone from phoneNumbers if provided
        if (data.phoneNumbers?.length > 0 && !data.phone) {
            data.phone = data.phoneNumbers[0].phone;
            data.countryCode = data.phoneNumbers[0].countryCode || '+91';
        }
        const [newAgent] = await db.insert(agents).values({
            ...data,
            updatedAt: new Date()
        }).returning();

        res.status(201).json(newAgent);
    } catch (error) {
        logger.error('Error creating agent:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /agents/:id — Full profile + stats
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [agent] = await db.select().from(agents)
            .where(eq(agents.id, req.params.id)).limit(1);

        if (!agent) return res.status(404).json({ error: 'Agent not found' });

        // Get lead stats for this agent
        const statsResult = await db.select({
            totalLeads: count(),
            convertedLeads: count(sql`CASE WHEN ${leads.status} = 'service_taken' THEN 1 END`),
        }).from(leads).where(eq(leads.agentId, req.params.id));

        const stats = statsResult[0] || { totalLeads: 0, convertedLeads: 0 };

        res.json({
            ...agent,
            stats: {
                totalLeads: stats.totalLeads,
                convertedLeads: stats.convertedLeads,
                conversionRate: stats.totalLeads > 0
                    ? Math.round((stats.convertedLeads / stats.totalLeads) * 100)
                    : 0
            }
        });
    } catch (error) {
        logger.error('Error fetching agent:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PATCH /agents/:id — Update
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const { id, createdAt, ...updateData } = req.body;
        // Sync primary phone from phoneNumbers
        if (updateData.phoneNumbers?.length > 0 && !updateData.phone) {
            updateData.phone = updateData.phoneNumbers[0].phone;
            updateData.countryCode = updateData.phoneNumbers[0].countryCode || '+91';
        }
        const [updated] = await db.update(agents)
            .set({ ...updateData, updatedAt: new Date() })
            .where(eq(agents.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Agent not found' });
        res.json(updated);
    } catch (error) {
        logger.error('Error updating agent:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /agents/:id/leads — All leads for this agent
router.get('/:id/leads', authenticateToken, async (req, res) => {
    try {
        const results = await db.select().from(leads)
            .where(and(
                eq(leads.agentId, req.params.id),
                eq(leads.isArchived, false)
            ))
            .orderBy(desc(leads.createdAt));

        res.json(results);
    } catch (error) {
        logger.error('Error fetching agent leads:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /agents/:id (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const [updated] = await db.update(agents)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(agents.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Agent not found' });
        res.json({ message: 'Agent deactivated' });
    } catch (error) {
        logger.error('Error deactivating agent:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /agents/:id/create-login — Create portal login for an agent
router.post('/:id/create-login', authenticateToken, async (req, res) => {
    try {
        const bcrypt = (await import('bcryptjs')).default;
        const { default: usersModule } = await import('../db/schema.js');

        const [agent] = await db.select().from(agents).where(eq(agents.id, req.params.id)).limit(1);
        if (!agent) return res.status(404).json({ error: 'Agent not found' });

        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if login already exists
        const { users } = await import('../db/schema.js');
        const [existing] = await db.select({ id: users.id })
            .from(users).where(eq(users.email, email)).limit(1);
        if (existing) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const [newUser] = await db.insert(users).values({
            name: agent.name,
            email,
            passwordHash,
            role: 'agent',
            phone: agent.phone,
            linkedAgentId: agent.id,
            isActive: true,
        }).returning();

        await db.insert(activities).values({
            type: 'agent_login_created',
            description: `Portal login created for agent: ${agent.name}`,
            performedBy: req.user.id,
            metadata: { agentId: agent.id, userId: newUser.id },
        });

        res.status(201).json({
            message: 'Agent portal login created',
            user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
        });
    } catch (error) {
        if (error.message?.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        logger.error('Error creating agent login:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /agents/:id/reset-password — Reset portal password for an agent
router.post('/:id/reset-password', authenticateToken, async (req, res) => {
    try {
        const bcrypt = (await import('bcryptjs')).default;
        const { users } = await import('../db/schema.js');

        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Find the user entry for this agent
        const [userEntry] = await db.select().from(users).where(and(eq(users.linkedAgentId, req.params.id), eq(users.role, 'agent'))).limit(1);
        if (!userEntry) {
            return res.status(404).json({ error: 'Portal login not found for this agent' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await db.update(users).set({ passwordHash }).where(eq(users.id, userEntry.id));

        await db.insert(activities).values({
            type: 'agent_password_reset',
            description: `Portal password reset by admin for agent portal: ${userEntry.email}`,
            performedBy: req.user.id,
            metadata: { agentId: req.params.id, userId: userEntry.id },
        });

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        logger.error('Error resetting agent password:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /agents/:id/portal-login — Remove portal access for an agent
router.delete('/:id/portal-login', authenticateToken, async (req, res) => {
    try {
        const { users } = await import('../db/schema.js');

        const [deleted] = await db.delete(users)
            .where(and(eq(users.linkedAgentId, req.params.id), eq(users.role, 'agent')))
            .returning({ id: users.id, email: users.email });

        if (!deleted) {
            return res.status(404).json({ error: 'Portal login not found for this agent' });
        }

        await db.insert(activities).values({
            type: 'agent_login_deleted',
            description: `Portal login access removed for: ${deleted.email}`,
            performedBy: req.user.id,
            metadata: { agentId: req.params.id, userId: deleted.id },
        });

        res.json({ message: 'Portal access removed successfully' });
    } catch (error) {
        logger.error('Error deleting agent portal login:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
