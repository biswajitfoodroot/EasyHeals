import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { sendWhatsAppTemplate } from '../services/whatsappService.js';
import { db } from '../db/index.js';
import { leads } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../server.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

export const waQueue = new Queue('wa-messages', { connection: redis });
export const followUpQueue = new Queue('follow-ups', { connection: redis });

// Worker for WhatsApp Messages
new Worker('wa-messages', async (job) => {
    const { phone, templateName, variables, leadId } = job.data;

    try {
        await sendWhatsAppTemplate(phone, templateName, variables);

        if (leadId) {
            await db.update(leads)
                .set({ waSentAt: new Date() })
                .where(eq(leads.id, leadId));
        }

        logger.info(`WhatsApp sent to ${phone} for lead ${leadId}`);
    } catch (error) {
        logger.error(`Failed to send WhatsApp to ${phone}:`, error);
        throw error;
    }
}, { connection: redis });

// Worker for Follow-ups
new Worker('follow-ups', async (job) => {
    const { leadId } = job.data;

    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);

    if (lead && lead.status === 'new') {
        // If lead is still 'new', send a nudge
        await waQueue.add('send-nudge', {
            phone: lead.phone,
            templateName: 'follow_up_check_in',
            variables: { name: lead.name },
            leadId: lead.id
        });
    }
}, { connection: redis });

export { redis };
