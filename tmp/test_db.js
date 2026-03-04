import { db } from './packages/api/src/db/index.js';
import { leads } from './packages/api/src/db/schema.js';
import { desc } from 'drizzle-orm';

async function test() {
    try {
        console.log('Testing DB select...');
        const lastLead = await db.select({ refId: leads.refId })
            .from(leads)
            .orderBy(desc(leads.createdAt))
            .limit(1);
        console.log('Last lead:', lastLead);
    } catch (e) {
        console.error('DB test failed:', e);
    }
}

test();
