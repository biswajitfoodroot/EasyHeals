import express from 'express';
import multer from 'multer';
import { db } from '../db/index.js';
import { leads, activities } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { uploadToS3 } from '../services/storageService.js';
import { analysePrescriptionWithGemini } from '../services/geminiService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const upload = multer({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only images are allowed'));
    }
});

// POST /prescriptions/upload
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { lead_id } = req.body;
        const file = req.file;

        if (!lead_id || !file) {
            return res.status(400).json({ error: 'Lead ID and file are required' });
        }

        // Check if lead exists
        const [lead] = await db.select().from(leads).where(eq(leads.id, lead_id)).limit(1);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Upload to S3
        const s3Key = await uploadToS3(file.buffer, file.originalname, file.mimetype);
        const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

        // AI Analysis
        const analysis = await analysePrescriptionWithGemini(file.buffer, file.mimetype);

        // Update lead
        await db.update(leads)
            .set({
                prescriptionUrl: s3Url,
                prescriptionAnalysis: analysis,
                updatedAt: new Date()
            })
            .where(eq(leads.id, lead_id));

        // Log activity
        await db.insert(activities).values({
            leadId: lead_id,
            type: 'rx_uploaded',
            description: 'Prescription uploaded and analyzed by AI',
            metadata: { analysis }
        });

        res.json({
            prescription_url: s3Url,
            analysis
        });

    } catch (error) {
        logger.error('Error uploading prescription:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

export default router;
