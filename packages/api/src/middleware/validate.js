/**
 * Zod validation middleware factory.
 * Usage: validate(zodSchema) or validate(zodSchema, 'query')
 * Standardizes validation error responses across all routes.
 */
export const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const data = source === 'query' ? req.query : req.body;
        const result = schema.safeParse(data);

        if (!result.success) {
            const errorLog = {
                timestamp: new Date().toISOString(),
                path: req.path,
                method: req.method,
                errors: result.error.errors,
                received: data
            };

            // Try as a simple log first
            console.error('[VALIDATION ERROR]', JSON.stringify(errorLog, null, 2));

            return res.status(400).json({
                error: 'Validation failed',
                details: result.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        // Replace body/query with parsed (and transformed) data
        if (source === 'query') {
            req.validatedQuery = result.data;
        } else {
            req.validatedBody = result.data;
        }

        next();
    };
};
