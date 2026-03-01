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
            const errors = result.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));

            return res.status(400).json({
                error: 'Validation failed',
                details: errors
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
