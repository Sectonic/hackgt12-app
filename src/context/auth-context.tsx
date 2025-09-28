'use client';

import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
};

const defaultValue: AuthContextValue = {
  user: null,
  loading: true,
};

export const AuthContext = createContext<AuthContextValue>(defaultValue);

export const useAuth = () => useContext(AuthContext);
