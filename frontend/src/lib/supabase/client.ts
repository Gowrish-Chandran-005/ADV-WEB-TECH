import { createClient } from '@supabase/supabase-js';

const browserEnv: Record<string, string | undefined> =
  typeof import.meta !== 'undefined'
    ? (import.meta.env as Record<string, string | undefined>)
    : {};

const getEnvValue = (key: string) => {
  const value = browserEnv[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : '';
};

export const supabaseUrl = getEnvValue('VITE_SUPABASE_URL');
export const supabaseAnonKey = getEnvValue('VITE_SUPABASE_ANON_KEY');

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
