const { z } = require('zod');

const createLeadSchema = z.object({
    gender: z.preprocess((val) => (val === undefined || val === null || val === '' ? undefined : String(val).toLowerCase()), z.enum(['male', 'female', 'other']).optional()),
    numberOfAttendants: z.preprocess((val) => (val === undefined || val === null || val === '' ? undefined : Number(val)), z.number().int().optional()),
});

try {
    console.log('Test 1 (empty strings):', createLeadSchema.parse({ gender: '', numberOfAttendants: '' }));
    console.log('Test 2 (undefined):', createLeadSchema.parse({}));
    console.log('Test 3 (valid values):', createLeadSchema.parse({ gender: 'Male', numberOfAttendants: '2' }));
} catch (e) {
    console.error('Validation failed:', e.errors);
}
