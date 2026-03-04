import { db } from './packages/api/src/db/index.js';
import { users } from './packages/api/src/db/schema.js';
import { eq } from 'drizzle-orm';

async function listAgents() {
    const results = await db.select({
        name: users.name,
        email: users.email,
        role: users.role
    }).from(users).where(eq(users.role, 'agent'));

    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
}

listAgents().catch(err => {
    console.error(err);
    process.exit(1);
});
