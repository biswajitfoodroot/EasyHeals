import express from 'express';
import { chatWithGemini } from '../services/geminiService.js';
import { logger } from '../server.js';

const router = express.Router();

// POST /chat - Chat with Gemini AI
router.post('/', async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const reply = await chatWithGemini(message, history || []);
        res.json({ reply });
    } catch (error) {
        logger.error('Error in chat with Gemini:', error);
        res.status(500).json({ error: 'Failed to get response from AI Health Assistant' });
    }
});

export default router;
