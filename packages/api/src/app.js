import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';

// Routes
import leadRoutes from './routes/leads.js';
import prescriptionRoutes from './routes/prescriptions.js';
import whatsappRoutes from './routes/whatsapp.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import masterRoutes from './routes/masters.js';
import agentRoutes from './routes/agents.js';
import documentRoutes from './routes/documents.js';
import invoiceRoutes from './routes/invoices.js';
import userRoutes from './routes/users.js';
import agentPortalRoutes from './routes/agentPortal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

const app = express();

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*'
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
const uploadsPath = path.resolve(__dirname, '../../../uploads');
app.use('/uploads', express.static(uploadsPath));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/v1/leads', leadRoutes);
app.use('/v1/prescriptions', prescriptionRoutes);
app.use('/v1/whatsapp', whatsappRoutes);
app.use('/v1/auth', authRoutes);
app.use('/v1/chat', chatRoutes);
app.use('/v1/masters', masterRoutes);
app.use('/v1/agents', agentRoutes);
app.use('/v1', documentRoutes);          // /v1/leads/:leadId/documents + /v1/documents/:id
app.use('/v1/invoices', invoiceRoutes);
app.use('/v1/users', userRoutes);
app.use('/v1/agent-portal', agentPortalRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
    logger.error(err.stack);

    // Multer file size error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB' });
    }

    // Multer file type error
    if (err.message && err.message.includes('File type not allowed')) {
        return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Internal Server Error' });
});

export { app, logger };
export default app;
