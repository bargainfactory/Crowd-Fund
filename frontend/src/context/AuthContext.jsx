import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../lib/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user from token on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const { data } = await authAPI.getMe();
          setUser(data.user);
          setIsAuthenticated(true);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await authAPI.login(credentials);

    if (data.requiresTwoFactor) {
      return { requiresTwoFactor: true, tempToken: data.tempToken };
    }

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    setIsAuthenticated(true);
    return { success: true, user: data.user };
  }, []);

  const verifyTwoFactor = useCallback(async (tempToken, code) => {
    const { data } = await authAPI.verifyTwoFactor({ tempToken, code });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    setIsAuthenticated(true);
    return { success: true };
  }, []);

  const register = useCallback(async (userData) => {
    const { data } = await authAPI.register(userData);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    setIsAuthenticated(true);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
    window.location.href = '/';
  }, []);

  const updateUser = useCallback(async (updates) => {
    const { data } = await authAPI.updateProfile(updates);
    setUser(data.user);
    return data.user;
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authAPI.getMe();
      setUser(data.user);
    } catch {
      logout();
    }
  }, [logout]);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    verifyTwoFactor,
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    isCreator: user?.role === 'creator' || user?.role === 'admin' || user?.role === 'superadmin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
