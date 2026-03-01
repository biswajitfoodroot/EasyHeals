import { logger } from '../app.js';

/**
 * Role-based access control middleware.
 * Usage: requireRole('owner', 'admin')
 * Must be used AFTER authenticateToken middleware.
 */
export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            logger.warn(`Access denied: user ${req.user.email} with role ${req.user.role} tried to access route requiring ${allowedRoles.join('/')}`);
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: allowedRoles
            });
        }

        next();
    };
};

/**
 * Shorthand for owner-only routes
 */
export const requireOwner = requireRole('owner');

/**
 * Shorthand for admin+ routes
 */
export const requireAdmin = requireRole('owner', 'admin');
