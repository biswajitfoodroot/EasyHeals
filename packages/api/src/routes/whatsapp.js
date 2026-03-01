import express from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { waTemplates } from '../db/schema.js';
import { eq, like, desc } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { logger } from '../server.js';

const router = express.Router();

const templateSchema = z.object({
    name: z.string().min(1, 'Template name is required'),
    category: z.enum(['greeting', 'follow_up', 'visa', 'appointment', 'custom']).optional().default('custom'),
    bodyText: z.string().min(1, 'Message body is required'),
    variables: z.array(z.string()).optional(),
});

// GET /whatsapp/templates — List all templates
router.get('/templates', authenticateToken, async (req, res) => {
    try {
        const { category, search } = req.query;
        let conditions = [eq(waTemplates.isActive, true)];

        if (category) conditions.push(eq(waTemplates.category, category));
        if (search) conditions.push(like(waTemplates.name, `%${search}%`));

        const { and: andOp } = await import('drizzle-orm');
        const results = await db.select().from(waTemplates)
            .where(andOp(...conditions))
            .orderBy(desc(waTemplates.createdAt));

        res.json(results);
    } catch (error) {
        logger.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /whatsapp/templates — Create template
router.post('/templates', authenticateToken, validate(templateSchema), async (req, res) => {
    try {
        const data = req.validatedBody;

        // Extract variables from body text ({{variable}})
        const extractedVars = [...data.bodyText.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
        const variables = data.variables || extractedVars;

        const [newTemplate] = await db.insert(waTemplates).values({
            name: data.name,
            category: data.category,
            bodyText: data.bodyText,
            variables,
            isActive: true,
            createdBy: req.user.id,
            updatedAt: new Date(),
        }).returning();

        res.status(201).json(newTemplate);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Template name already exists' });
        }
        logger.error('Error creating template:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PATCH /whatsapp/templates/:id — Update
router.patch('/templates/:id', authenticateToken, async (req, res) => {
    try {
        const updateData = { ...req.body, updatedAt: new Date() };

        // Re-extract variables if body changed
        if (updateData.bodyText) {
            const extractedVars = [...updateData.bodyText.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
            if (!updateData.variables) updateData.variables = extractedVars;
        }

        const [updated] = await db.update(waTemplates)
            .set(updateData)
            .where(eq(waTemplates.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Template not found' });
        res.json(updated);
    } catch (error) {
        logger.error('Error updating template:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /whatsapp/templates/:id — Soft delete
router.delete('/templates/:id', authenticateToken, async (req, res) => {
    try {
        const [updated] = await db.update(waTemplates)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(waTemplates.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Template not found' });
        res.json({ message: 'Template deactivated' });
    } catch (error) {
        logger.error('Error deleting template:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /whatsapp/generate-link — Generate wa.me link with pre-filled message
router.post('/generate-link', authenticateToken, async (req, res) => {
    try {
        const { countryCode, phone, templateId, message, variables } = req.body;

        if (!phone) return res.status(400).json({ error: 'Phone number is required' });

        let messageText = message || '';

        if (templateId) {
            const [template] = await db.select().from(waTemplates)
                .where(eq(waTemplates.id, templateId)).limit(1);

            if (template) {
                messageText = template.bodyText;
                // Replace variables
                if (variables && typeof variables === 'object') {
                    for (const [key, value] of Object.entries(variables)) {
                        messageText = messageText.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
                    }
                }
            }
        }

        // Clean phone number (remove spaces, dashes)
        const cleanPhone = phone.replace(/[\s\-()]/g, '');
        const cleanCode = (countryCode || '+91').replace('+', '');
        const fullPhone = `${cleanCode}${cleanPhone}`;
        const encodedMessage = encodeURIComponent(messageText);

        const waUrl = `https://wa.me/${fullPhone}${messageText ? `?text=${encodedMessage}` : ''}`;

        res.json({ url: waUrl, message: messageText });
    } catch (error) {
        logger.error('Error generating WhatsApp link:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
