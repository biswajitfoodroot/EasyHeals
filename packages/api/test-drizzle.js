import { db } from './src/db/index.js';
import { users, agents } from './src/db/schema.js';

async function test() {
    try {
        const u = await db.select().from(users);
        console.log('Users:', u.map(x => ({ name: x.name, role: x.role, active: x.isActive })));

        const a = await db.select().from(agents);
        console.log('Agents:', a.map(x => ({ name: x.name, active: x.isActive })));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
