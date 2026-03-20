'use client';

import React, { createContext, useContext } from 'react';
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react';
import type { UserRole } from '@/types';

interface AuthContextType {
  user: { id: string; email?: string | null; name?: string | null } | null;
  userRole: UserRole;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: 'Proprietário',
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const user = session?.user
    ? { id: session.user.id, email: session.user.email, name: session.user.name }
    : null;

  const userRole = ((session?.user as any)?.role as UserRole) || 'Proprietário';
  const loading = status === 'loading';

  const signOut = async () => {
    await nextAuthSignOut({ callbackUrl: '/login' });
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
