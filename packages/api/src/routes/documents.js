import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db/index.js';
import { documents, activities } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ── Storage Strategy ─────────────────────────────────────────────────────────
// On Vercel, /tmp is ephemeral and NOT shared across function instances.
// We use Vercel Blob (persistent cloud storage) in production.
// Locally, files are saved to disk as before.
const isVercel = !!process.env.VERCEL;

// Local disk storage (used only outside Vercel)
const localUploadDir = path.resolve(__dirname, '../../../../uploads');

if (!isVercel) {
    try {
        if (!fs.existsSync(localUploadDir)) {
            fs.mkdirSync(localUploadDir, { recursive: true });
        }
    } catch (e) {
        console.warn('[documents] Could not create uploadDir at startup:', e.message);
    }
}

// Multer: memory storage on Vercel (we stream to Blob), disk storage locally
const storage = isVercel
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, file, cb) => {
            const leadDir = path.join(localUploadDir, req.params.leadId || 'misc');
            try {
                if (!fs.existsSync(leadDir)) fs.mkdirSync(leadDir, { recursive: true });
            } catch (e) {
                console.warn('[documents] Could not create leadDir:', e.message);
            }
            cb(null, leadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, `${uniqueSuffix}${ext}`);
        }
    });

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg', 'image/png', 'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            console.warn(`[documents] REJECTED file type: ${file.mimetype} for ${file.originalname}`);
            cb(new Error('File type not allowed. Accepted: PDF, JPEG, PNG, WebP, DOC, DOCX'));
        }
    }
});

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /leads/:leadId/documents
router.get('/leads/:leadId/documents', authenticateToken, async (req, res) => {
    try {
        const results = await db.select().from(documents)
            .where(eq(documents.leadId, req.params.leadId))
            .orderBy(desc(documents.createdAt));

        res.json(results);
    } catch (error) {
        logger.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /leads/:leadId/documents
router.post('/leads/:leadId/documents', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const docType = req.body.docType || 'other';
        const notes = req.body.notes || '';
        let fileUrl;

        if (isVercel) {
            // ── Vercel Blob upload ────────────────────────────────────────────
            const { put } = await import('@vercel/blob');
            const blobPath = `uploads/${req.params.leadId}/${Date.now()}-${req.file.originalname}`;
            const blob = await put(blobPath, req.file.buffer, {
                access: 'public',
                contentType: req.file.mimetype,
            });
            fileUrl = blob.url; // persistent public URL, e.g. https://xxx.public.blob.vercel-storage.com/...
        } else {
            // ── Local disk ───────────────────────────────────────────────────
            fileUrl = `/uploads/${req.params.leadId}/${req.file.filename}`;
        }

        const [newDoc] = await db.insert(documents).values({
            leadId: req.params.leadId,
            docType,
            fileName: req.file.originalname,
            fileUrl,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            uploadedBy: req.user.id,
            notes,
        }).returning();

        // Log activity
        await db.insert(activities).values({
            leadId: req.params.leadId,
            type: 'document_uploaded',
            description: `${docType.replace('_', ' ')} uploaded: ${req.file.originalname}`,
            performedBy: req.user.id,
        });

        res.status(201).json(newDoc);
    } catch (error) {
        logger.error('Error uploading document:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /documents/:id
router.delete('/documents/:id', authenticateToken, async (req, res) => {
    try {
        const [doc] = await db.select().from(documents)
            .where(eq(documents.id, req.params.id)).limit(1);

        if (!doc) return res.status(404).json({ error: 'Document not found' });

        if (isVercel && doc.fileUrl.startsWith('http')) {
            // Delete from Vercel Blob
            try {
                const { del } = await import('@vercel/blob');
                await del(doc.fileUrl);
            } catch (e) {
                logger.warn(`[documents] Could not delete blob: ${e.message}`);
            }
        } else {
            // Delete local file
            const filePath = path.resolve(__dirname, '../../../..', doc.fileUrl.replace(/^\//, ''));
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await db.delete(documents).where(eq(documents.id, req.params.id));
        res.json({ message: 'Document deleted' });
    } catch (error) {
        logger.error('Error deleting document:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /documents/:id/download
router.get('/documents/:id/download', authenticateToken, async (req, res) => {
    try {
        const [doc] = await db.select().from(documents)
            .where(eq(documents.id, req.params.id)).limit(1);

        if (!doc) return res.status(404).json({ error: 'Document not found' });

        if (isVercel && doc.fileUrl.startsWith('http')) {
            // Redirect to Vercel Blob URL for download
            return res.redirect(doc.fileUrl);
        }

        const filePath = path.resolve(__dirname, '../../../..', doc.fileUrl.replace(/^\//, ''));
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }

        res.download(filePath, doc.fileName);
    } catch (error) {
        logger.error('Error downloading document:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
