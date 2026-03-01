import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function AgentProtectedRoute() {
    const { token, user } = useAuth();
    const location = useLocation();

    if (!token) {
        return <Navigate to="/agent/login" state={{ from: location }} replace />;
    }

    if (user?.role !== 'agent') {
        return <Navigate to="/agent/login" replace />;
    }

    return <Outlet />;
}
