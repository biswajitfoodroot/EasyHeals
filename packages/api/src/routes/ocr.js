import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../app.js';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

router.post('/scan-passport', upload.single('file'), async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent([
            OCR_PROMPT,
            {
                inlineData: {
                    data: req.file.buffer.toString('base64'),
                    mimeType: req.file.mimetype
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        // Extract JSON from markdown if Gemini wraps it
        const jsonString = text.replace(/```json\n?|```/g, '').trim();

        let data;
        try {
            data = JSON.parse(jsonString);
        } catch (parseErr) {
            console.error('Gemini response was not valid JSON:', text);
            return res.status(500).json({ error: 'Gemini returned unexpected response', raw: text });
        }

        if (data.error) {
            return res.status(422).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error('Passport OCR Error:', error);
        res.status(500).json({
            error: 'Failed to process document',
            message: error.message,
            stack: error.stack
        });
    }
});

export default router;
