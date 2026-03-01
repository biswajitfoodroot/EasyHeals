import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function ProtectedRoute({ requiredRoles, requiredPermission }) {
    const { token, user, hasPermission } = useAuth();
    const location = useLocation();

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Block agents from CRM pages — redirect to agent portal
    if (user?.role === 'agent') {
        return <Navigate to="/agent/dashboard" replace />;
    }

    if (requiredRoles && !requiredRoles.includes(user?.role)) {
        return <Navigate to="/" replace />;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}

