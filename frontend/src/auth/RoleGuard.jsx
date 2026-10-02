import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const RoleGuard = ({ allowedRoles = [], children }) => {
  const { role } = useAuth();
  const currentRole = (role || '').toUpperCase().replace(/_/g, ' ');
  const allowed = allowedRoles.map((r) => r.toUpperCase().replace(/_/g, ' '));

  if (allowed.length > 0 && !allowed.includes(currentRole)) {
    return <Navigate to="/403" replace />;
  }

  return children;
};

export default RoleGuard;

