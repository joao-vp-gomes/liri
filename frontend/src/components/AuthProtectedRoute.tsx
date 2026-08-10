// frontend/src/components/AuthProtectedRoute.tsx


import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { JSX } from 'react';


export const AuthProtectedRoute = ({ children }: { 
    children: JSX.Element 
}) => {

    const { account, loading } = useAuth();
    const location = useLocation();

    if (loading) return null;
    if (!account?.user) return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
    if (!account.role) return null;
    return children;

};


export default AuthProtectedRoute;