import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function listAgents() {
    try {
        const results = await db.select({
            name: users.name,
            email: users.email,
            role: users.role
        }).from(users).where(eq(users.role, 'agent'));

        console.log(JSON.stringify(results, null, 2));
    } catch (err) {
        console.error('Error fetching agents:', err);
    }
    process.exit(0);
}

listAgents();
