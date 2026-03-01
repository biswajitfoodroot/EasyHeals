import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../server.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await db.update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, user.id));

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'super-secret-change-me',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                canManageUsers: user.canManageUsers,
            }
        });
    } catch (error) {
        logger.error('Login Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /auth/register — Protected: only owner/admin can create users
router.post('/register', authenticateToken, async (req, res) => {
    try {
        // Only owner/admin can register new users
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only owners and admins can create users' });
        }

        const { name, email, password, role = 'advisor', phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [newUser] = await db.insert(users).values({
            name,
            email,
            passwordHash,
            role,
            phone,
            isActive: true,
            canManageUsers: role === 'owner' || role === 'admin',
        }).returning();

        res.status(201).json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
        });
    } catch (error) {
        if (error.code === '23505' || error.message?.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        logger.error('Registration Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /auth/change-password — Self-service password change
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const [user] = await db.select().from(users)
            .where(eq(users.id, req.user.id)).limit(1);

        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await db.update(users)
            .set({ passwordHash })
            .where(eq(users.id, req.user.id));

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        logger.error('Change Password Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /auth/setup — Initial owner setup (only works if no users exist)
router.post('/setup', async (req, res) => {
    try {
        const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
        if (existingUsers.length > 0) {
            return res.status(403).json({ error: 'Setup already completed. Use login instead.' });
        }

        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const [owner] = await db.insert(users).values({
            name,
            email,
            passwordHash,
            role: 'owner',
            isActive: true,
            canManageUsers: true,
        }).returning();

        const token = jwt.sign(
            { id: owner.id, email: owner.email, role: owner.role },
            process.env.JWT_SECRET || 'super-secret-change-me',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Owner account created successfully',
            token,
            user: {
                id: owner.id,
                name: owner.name,
                email: owner.email,
                role: owner.role,
                canManageUsers: true,
            }
        });
    } catch (error) {
        logger.error('Setup Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
