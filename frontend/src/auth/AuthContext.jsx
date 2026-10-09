import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { getAccessToken, setTokens, clearTokens } from '../api/client';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Restore authenticated session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await authApi.me();
        if (res.success && res.data) {
          setUser(res.data);
          setIsAuthenticated(true);
        } else {
          clearTokens();
        }
      } catch (err) {
        console.warn('Session restoration check warning:', err.message);
        if (err.status === 401 || err.code === 'UNAUTHORIZED' || err.code === 'SESSION_EXPIRED') {
          clearTokens();
          setUser(null);
          setIsAuthenticated(false);
        } else if (token) {
          // Retain authenticated state if token exists and error is transient network glitch
          setIsAuthenticated(true);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setIsAuthenticated(false);
      clearTokens();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (username, password) => {
    setAuthError('');
    try {
      const res = await authApi.login(username, password);
      if (res.success && res.data) {
        const { access_token, refresh_token, user: loggedUser } = res.data;
        setTokens(access_token, refresh_token);
        setUser(loggedUser);
        setIsAuthenticated(true);
        return loggedUser;
      }
      throw new Error(res.error?.message || 'Login failed');
    } catch (err) {
      setAuthError(err.message || 'Incorrect username or password.');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const logoutAll = async () => {
    try {
      await authApi.logoutAll();
    } catch (err) {
      console.error('Logout all error:', err);
    } finally {
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    const res = await authApi.changePassword(currentPassword, newPassword, confirmPassword);
    if (res.success && user) {
      setUser({ ...user, must_change_password: false });
    }
    return res;
  };

  const normalizedRole = (user?.role || '').toUpperCase();
  const isRoleAdmin = normalizedRole === 'ADMIN';
  const isRoleSupervisor = normalizedRole === 'SUPERVISOR' || normalizedRole === 'MIS' || isRoleAdmin;
  const isRoleOperator = normalizedRole === 'OPERATOR';

  const value = {
    user,
    isAuthenticated,
    loading,
    authError,
    setAuthError,
    role: user?.role || 'OPERATOR',
    isRoleAdmin,
    isRoleSupervisor,
    isRoleOperator,
    mustChangePassword: user?.must_change_password || false,
    login,
    logout,
    logoutAll,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
