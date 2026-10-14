/**
 * Authentication context for LENDR.
 *
 * Provides:
 * - current logged-in user (or null)
 * - login / register / logout functions
 * - loading state while session is being restored
 *
 * Design rule: This context ONLY manages state and API calls.
 * It does NOT render any UI or change any visual design.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, usersApi, ApiError, type ApiUser } from '../services/api';

interface AuthContextValue {
  user: ApiUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    fullName: string;
    registrationNumber?: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: {
    fullName?: string;
    registrationNumber?: string | null;
    phone?: string | null;
  }) => Promise<ApiUser>;
  refreshUser: () => Promise<ApiUser | null>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount if token exists
  useEffect(() => {
    if (!authApi.isLoggedIn()) {
      setIsLoading(false);
      return;
    }
    authApi
      .me()
      .then(({ user: u }) => setUser(u))
      .catch(() => {
        // Token is invalid / expired — clear it silently
        authApi.logout().catch(() => undefined);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const { user: u } = await authApi.login(email, password);
      setUser(u);
    } catch (err: unknown) {
      let msg = 'Login failed. Please check your credentials and connection.';
      if (err instanceof ApiError) {
        if (err.status === 429) {
          if (err.retryAfter && err.retryAfter > 0) {
            const minutes = Math.ceil(err.retryAfter / 60);
            msg = `Too many attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
          } else {
            msg = 'Too many attempts. Please wait a few minutes before trying again.';
          }
        } else if (typeof err.message === 'string' && err.message.trim()) {
          msg = err.message;
        }
      } else if (err instanceof Error && typeof err.message === 'string' && err.message.trim()) {
        msg = err.message;
      }
      setError(msg);
      throw err;
    }
  }, []);


  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      fullName: string;
      registrationNumber?: string;
      phone?: string;
    }) => {
      setError(null);
      try {
        const { user: u } = await authApi.register(payload);
        setUser(u);
      } catch (err: unknown) {
        let msg = 'Registration failed. Please check your details and try again.';
        if (err instanceof ApiError && typeof err.message === 'string') {
          msg = err.message;
        } else if (err instanceof Error && typeof err.message === 'string') {
          msg = err.message;
        }
        setError(msg);
        throw err;
      }
    },
    [],
  );


  const logout = useCallback(async () => {
    setError(null);
    await authApi.logout().catch(() => undefined);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!authApi.isLoggedIn()) {
      setUser(null);
      return null;
    }
    try {
      const { user: u } = await authApi.me();
      setUser(u);
      return u;
    } catch {
      return null;
    }
  }, []);

  const updateProfile = useCallback(
    async (payload: {
      fullName?: string;
      registrationNumber?: string | null;
      phone?: string | null;
    }) => {
      setError(null);
      try {
        const { user: updated } = await usersApi.updateProfile(payload);
        setUser(updated);
        return updated;
      } catch (err: unknown) {
        let msg = 'Failed to update profile.';
        if (err instanceof ApiError && typeof err.message === 'string') {
          msg = err.message;
        } else if (err instanceof Error && typeof err.message === 'string') {
          msg = err.message;
        }
        setError(msg);
        throw err;
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
