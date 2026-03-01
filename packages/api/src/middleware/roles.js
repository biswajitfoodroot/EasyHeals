import { logger } from '../app.js';

/**
 * Middleware: Requires the authenticated user to have role 'agent'.
 * Must be used AFTER authenticateToken middleware.
 */
export const requireAgent = (req, res, next) => {
    if (!req.user || req.user.role !== 'agent') {
        logger.warn(`Agent access denied for user ${req.user?.id} with role ${req.user?.role}`);
        return res.status(403).json({ error: 'Access denied. Agent role required.' });
    }
    next();
};

/**
 * Middleware: Requires the authenticated user to have role 'owner', 'admin', or 'advisor'.
 * Used to protect advisor-only endpoints.
 */
export const requireAdvisor = (req, res, next) => {
    const allowedRoles = ['owner', 'admin', 'advisor'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied. Advisor role required.' });
    }
    next();
};
