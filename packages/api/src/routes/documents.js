import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import util from 'util';
import { db } from '../db/index.js';
import { leads, documents, activities } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { put as blobPut, del as blobDel } from '@vercel/blob';

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
// Wrap multer in a promise so Express 5 error handling works correctly with multer 1.x
function runMulter(req, res) {
    return new Promise((resolve, reject) => {
        upload.single('file')(req, res, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

router.post('/leads/:leadId/documents', authenticateToken, async (req, res) => {
    // Run multer manually so errors are catchable in our try/catch
    try {
        await runMulter(req, res);
    } catch (multerErr) {
        logger.warn('[documents] Multer error:', multerErr.message);
        if (multerErr.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
        return res.status(400).json({ error: multerErr.message || 'File upload error.' });
    }
    try {
        const { leadId } = req.params;
        logger.info(`[documents] Upload request for lead: ${leadId}`);

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // 1. Check if lead exists first
        const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
        if (!lead) {
            logger.warn(`[documents] Lead not found: ${leadId}`);
            return res.status(404).json({ error: 'Lead not found. Cannot attach document.' });
        }

        const docType = req.body.docType || 'other';
        const notes = req.body.notes || '';
        let fileUrl;

        if (isVercel) {
            // ── Vercel Blob upload ────────────────────────────────────────────
            if (!process.env.BLOB_READ_WRITE_TOKEN) {
                logger.error('[documents] BLOB_READ_WRITE_TOKEN is missing in environment');
                return res.status(500).json({
                    error: 'Configuration Error',
                    detail: 'BLOB_READ_WRITE_TOKEN is not configured on the server.'
                });
            }

            // Sanitize filename: preserve extension separately (Vercel Blob uses extension for content-type)
            const fileExt = path.extname(req.file.originalname);
            const fileBase = path.basename(req.file.originalname, fileExt).replace(/[^a-zA-Z0-9._-]/g, '_');
            const safeFilename = `${fileBase}${fileExt}`;
            const blobPath = `uploads/${leadId}/${Date.now()}-${safeFilename}`;

            logger.info(`[documents] Attempting Vercel Blob upload:`, {
                path: blobPath,
                mime: req.file.mimetype,
                bufferSize: req.file.buffer ? req.file.buffer.length : 'MISSING',
                tokenPresent: !!process.env.BLOB_READ_WRITE_TOKEN,
                tokenPeek: process.env.BLOB_READ_WRITE_TOKEN ? `...${process.env.BLOB_READ_WRITE_TOKEN.slice(-4)}` : 'none',
                sdkType: typeof blobPut
            });

            let blob;
            try {
                blob = await blobPut(blobPath, req.file.buffer, {
                    access: 'private',
                    allowOverwrite: true,
                    contentType: req.file.mimetype,
                    token: process.env.BLOB_READ_WRITE_TOKEN,
                });
            } catch (blobErr) {
                // Log the COMPLETE error object using util.inspect to see everything
                const errorDetail = util.inspect(blobErr, { depth: null, colors: false });
                logger.error(`[documents] Vercel Blob upload FAILED: ${blobErr.message || 'No message'}`);
                logger.error(`[documents] Full Error Object: ${errorDetail}`);

                return res.status(500).json({
                    error: 'File storage error',
                    detail: blobErr.message,
                    code: blobErr.code
                });
            }
            fileUrl = blob.url; // persistent public URL
            logger.info(`[documents] Blob uploaded successfully: ${fileUrl}`);
        } else {
            // ── Local disk ───────────────────────────────────────────────────
            fileUrl = `/uploads/${leadId}/${req.file.filename}`;
            logger.info(`[documents] File saved locally: ${fileUrl}`);
        }

        logger.info(`[documents] Inserting document metadata into DB for lead: ${leadId}`);
        const [newDoc] = await db.insert(documents).values({
            leadId: leadId,
            docType,
            fileName: req.file.originalname,
            fileUrl,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            uploadedBy: req.user.id,
            notes,
        }).returning();

        // 2. Log activity (Wrap in try-catch so failure here doesn't block the response)
        try {
            logger.info(`[documents] Logging activity for lead: ${leadId}`);
            await db.insert(activities).values({
                leadId: leadId,
                type: 'document_uploaded',
                description: `${docType.replace('_', ' ')} uploaded: ${req.file.originalname}`,
                performedBy: req.user.id,
            });
        } catch (actErr) {
            logger.error('[documents] Failed to log activity:', actErr.message);
            // We don't throw here, so the user still gets their successful upload response
        }

        res.status(201).json(newDoc);
    } catch (error) {
        logger.error('[documents] UNHANDLED Error uploading document:', {
            message: error.message,
            code: error.code,
            name: error.name,
            stack: error.stack,
        });
        res.status(500).json({
            error: 'Internal Server Error',
            detail: error.message,
            code: error.code,
        });
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
                await blobDel(doc.fileUrl);
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
