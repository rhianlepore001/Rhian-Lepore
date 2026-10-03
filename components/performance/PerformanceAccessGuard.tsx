import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/** R7.1: colaborador que abre /financeiro/performance vai para os próprios resultados. */
export const PerformanceAccessGuard: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const { isAuthenticated, loading, role } = useAuth();
    if (loading) return null;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (role === 'staff') return <Navigate to="/meus-insights" replace />;
    return children;
};
