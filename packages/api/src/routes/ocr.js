import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../app.js';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const getGenAI = () => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured');
    }
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

const OCR_PROMPT = `
You are an expert document parser for EasyHeals. 
Your task is to extract structured information from this passport or identity document.
Return ONLY a JSON object with the following fields:
- surname (Upper case)
- givenName (Upper case)
- passportNo (Alphanumeric)
- dob (ISO format YYYY-MM-DD)
- gender (MALE, FEMALE, or OTHER)
- nationality (Upper case country name)
- address (Full address as it appears)

If a field is not found, return null for that field.
If the document is not a passport or identity document, return {"error": "Invalid document type"}.
`;

const MODELS_PRIORITY = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-flash-latest'
];

async function runOCRWithFallback(fileBuffer, mimeType) {
    let lastError = null;

    for (const modelName of MODELS_PRIORITY) {
        try {
            console.log(`[OCR] Attempting with model: ${modelName}`);
            const genAI = getGenAI();
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([
                OCR_PROMPT,
                {
                    inlineData: {
                        data: fileBuffer.toString('base64'),
                        mimeType: mimeType
                    }
                }
            ]);

            const response = await result.response;
            return { data: response.text(), model: modelName };
        } catch (error) {
            console.warn(`[OCR] Model ${modelName} failed:`, error.message);
            lastError = error;
            // Continue to next model
        }
    }
    throw lastError;
}

// GET /ocr/health — Diagnostic endpoint
router.get('/health', async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ status: 'error', message: 'API Key missing' });
        }

        const results = [];
        for (const name of MODELS_PRIORITY) {
            try {
                const genAI = getGenAI();
                const model = genAI.getGenerativeModel({ model: name });
                // Minimal check
                await model.generateContent('ping');
                results.push({ name, status: 'ok' });
            } catch (e) {
                results.push({ name, status: 'failed', error: e.message });
            }
        }

        res.json({
            status: results.some(r => r.status === 'ok') ? 'ok' : 'error',
            models: results,
            apiKeyPrefix: process.env.GEMINI_API_KEY.substring(0, 8) + '...'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/scan-passport', upload.single('file'), async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { data: text, model: usedModel } = await runOCRWithFallback(req.file.buffer, req.file.mimetype);

        // Extract JSON from markdown if Gemini wraps it
        const jsonString = text.replace(/```json\n?|```/g, '').trim();

        let data;
        try {
            data = JSON.parse(jsonString);
        } catch (parseErr) {
            console.error('Gemini response was not valid JSON:', text);
            return res.status(500).json({
                error: 'Gemini returned unexpected response',
                raw: text,
                modelUsed: usedModel
            });
        }

        if (data.error) {
            return res.status(422).json({ ...data, modelUsed: usedModel });
        }

        res.json({ ...data, modelUsed: usedModel });
    } catch (error) {
        console.error('Passport OCR Error:', error);
        res.status(500).json({
            error: 'Failed to process document. All models exhausted.',
            message: error.message,
            modelList: MODELS_PRIORITY
        });
    }
});

export default router;
