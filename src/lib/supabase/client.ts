import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './types';

type BrowserClient = SupabaseClient<Database>;

const createSafeStorage = () => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    } satisfies Storage;
  }

  return window.localStorage;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let client: BrowserClient | null = null;

export const getSupabaseBrowserClient = (): BrowserClient => {
  if (!client) {
    client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: createSafeStorage(),
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return client;
};

export const supabase = getSupabaseBrowserClient();
