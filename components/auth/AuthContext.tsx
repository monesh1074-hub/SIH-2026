'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, PermissionKey, UserRole } from '@/types';
import { DEMO_USERS } from '@/lib/mock-data';
import { hasPermission as checkPermission, hasAnyPermission as checkAnyPermission } from '@/lib/auth';

interface AuthContextType {
  currentUser: User;
  loading: boolean;
  switchUser: (userId: string) => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
  hasRole: (roles: UserRole[]) => boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: DEMO_USERS[0],
  loading: true,
  switchUser: async () => {},
  hasPermission: () => true,
  hasRole: () => true,
  refreshSession: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(DEMO_USERS[0]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.data) {
        setCurrentUser(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const switchUser = async (userId: string) => {
    const user = DEMO_USERS.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCurrentUser(data.data);
      }
    } catch (err) {
      console.error('Switch user error:', err);
    }
  };

  const hasPerm = (permission: PermissionKey): boolean => {
    return checkPermission(currentUser, permission);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    return roles.includes(currentUser.role);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        switchUser,
        hasPermission: hasPerm,
        hasRole,
        refreshSession: fetchSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
