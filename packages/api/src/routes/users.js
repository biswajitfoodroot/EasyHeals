import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validate.js';
import { logger } from '../app.js';

const router = express.Router();

const DEFAULT_PERMISSIONS = {
    dashboard: true,
    leads: true,
    pipeline: true,
    agents: false,
    masters: false,
    invoices: false,
    reports: false,
    whatsapp: true,
    archive: false,
    closed_cases: true,
    users: false,
};

const permissionsSchema = z.record(z.boolean()).nullable().optional();

const createUserSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['owner', 'admin', 'advisor', 'viewer', 'agent']).optional().default('advisor'),
    phone: z.preprocess((val) => (val === '' ? null : val), z.string().nullable().optional()),
    permissions: permissionsSchema,
});

const updateUserSchema = z.object({
    name: z.string().min(1).optional(),
    role: z.enum(['owner', 'admin', 'advisor', 'viewer', 'agent']).optional(),
    phone: z.preprocess((val) => (val === '' ? null : val), z.string().nullable().optional()),
    isActive: z.boolean().optional(),
    canManageUsers: z.boolean().optional(),
    permissions: permissionsSchema,
});

const userSelectFields = {
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    phone: users.phone,
    isActive: users.isActive,
    canManageUsers: users.canManageUsers,
    permissions: users.permissions,
    lastLoginAt: users.lastLoginAt,
    createdAt: users.createdAt,
};

// GET /users/me — Current user profile
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const [user] = await db.select(userSelectFields).from(users)
            .where(eq(users.id, req.user.id))
            .limit(1);

        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        logger.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PATCH /users/me — Update own profile
router.patch('/me', authenticateToken, async (req, res) => {
    try {
        const { name, phone } = req.body;
        const updateData = {};
        if (name) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No data to update' });
        }

        const [updated] = await db.update(users)
            .set(updateData)
            .where(eq(users.id, req.user.id))
            .returning(userSelectFields);

        res.json(updated);
    } catch (error) {
        logger.error('Error updating profile:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /users — List all users (admin+ only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log(`[API] Fetching users list for requester: ${req.user.email} (${req.user.role})`);
        // Filter out 'agent' role because they are managed in the Agents section
        const results = await db.select(userSelectFields).from(users)
            .where(sql`${users.role} != 'agent'`)
            .orderBy(desc(users.createdAt));

        console.log(`[API] Found ${results.length} staff users`);
        res.json(results);
    } catch (error) {
        console.error('[API] Error fetching users:', error);
        logger.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// POST /users — Create user (admin+ only)
router.post('/', authenticateToken, requireAdmin, validate(createUserSchema), async (req, res) => {
    try {
        const data = req.validatedBody;
        const passwordHash = await bcrypt.hash(data.password, 10);

        // Owner/admin bypass permissions; for others, apply defaults merged with provided
        const isAdminRole = data.role === 'owner' || data.role === 'admin';
        const permissions = isAdminRole ? null : { ...DEFAULT_PERMISSIONS, ...data.permissions };

        const [newUser] = await db.insert(users).values({
            name: data.name,
            email: data.email,
            passwordHash,
            role: data.role,
            phone: data.phone,
            isActive: true,
            canManageUsers: isAdminRole,
            permissions,
        }).returning(userSelectFields);

        res.status(201).json(newUser);
    } catch (error) {
        if (error.code === '23505' || error.message?.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        logger.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /users/bulk — Bulk create users (admin+ only)
router.post('/bulk', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { users: userList } = req.body;
        if (!Array.isArray(userList) || userList.length === 0) {
            return res.status(400).json({ error: 'Provide an array of users' });
        }

        const results = { created: [], failed: [] };

        for (const userData of userList) {
            try {
                const parsed = createUserSchema.parse(userData);
                const passwordHash = await bcrypt.hash(parsed.password, 10);
                const isAdminRole = parsed.role === 'owner' || parsed.role === 'admin';

                const [newUser] = await db.insert(users).values({
                    name: parsed.name,
                    email: parsed.email,
                    passwordHash,
                    role: parsed.role,
                    phone: parsed.phone,
                    isActive: true,
                    canManageUsers: isAdminRole,
                    permissions: isAdminRole ? null : { ...DEFAULT_PERMISSIONS, ...parsed.permissions },
                }).returning({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    role: users.role,
                });

                results.created.push(newUser);
            } catch (error) {
                results.failed.push({
                    email: userData.email,
                    error: (error.code === '23505' || error.message?.includes('UNIQUE')) ? 'Email already exists' : error.message
                });
            }
        }

        res.status(201).json(results);
    } catch (error) {
        logger.error('Error bulk creating users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PATCH /users/:id — Update user (admin+ only)
router.patch('/:id', authenticateToken, requireAdmin, validate(updateUserSchema), async (req, res) => {
    try {
        const data = req.validatedBody;

        // If role changed to owner/admin, clear permissions (they bypass)
        if (data.role === 'owner' || data.role === 'admin') {
            data.permissions = null;
            data.canManageUsers = true;
        }

        const [updated] = await db.update(users)
            .set(data)
            .where(eq(users.id, req.params.id))
            .returning(userSelectFields);

        if (!updated) return res.status(404).json({ error: 'User not found' });
        res.json(updated);
    } catch (error) {
        logger.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /users/:id/reset-password — Reset password (admin+ only)
router.post('/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        const [updated] = await db.update(users)
            .set({ passwordHash })
            .where(eq(users.id, req.params.id))
            .returning({ id: users.id, name: users.name });

        if (!updated) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'Password reset successfully', user: updated });
    } catch (error) {
        logger.error('Error resetting password:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /users/:id — Delete user (admin+ only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Prevent users from deleting themselves
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own account' });
        }

        const [deleted] = await db.delete(users)
            .where(eq(users.id, req.params.id))
            .returning({ id: users.id, name: users.name });

        if (!deleted) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully', user: deleted });
    } catch (error) {
        logger.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
