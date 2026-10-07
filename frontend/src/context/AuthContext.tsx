import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase } from '../lib/supabase/client';
import { loginSchema, normalizeRole, signupSchema, type AppRole } from '../lib/validation/auth';

export type SessionStatus = 'ACTIVE' | 'SUSPENDED';

export interface ProfileRecord {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: AppRole | 'ADMIN';
  account_status: SessionStatus;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: AppRole | string;
}

interface AuthContextValue {
  user: User | null;
  profile: ProfileRecord | null;
  loading: boolean;
  signIn: (input: SignInInput) => Promise<{ success: boolean; message: string; user?: User | null; profile?: ProfileRecord | null }>;
  signUp: (input: SignUpInput) => Promise<{ success: boolean; message: string; user?: User | null; profile?: ProfileRecord | null; fieldErrors?: Record<string, string[] | undefined> }>;
  signOut: () => Promise<{ success: boolean; message: string }>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const friendlyAuthError = (error: { message?: string } | null | undefined) => {
  const message = error?.message ?? 'Authentication failed.';

  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'The email or password is incorrect.';
  }

  if (message.toLowerCase().includes('user not found') || message.toLowerCase().includes('no user')) {
    return 'No account was found for that email.';
  }

  if (message.toLowerCase().includes('suspended')) {
    return 'This account has been suspended and cannot access the platform.';
  }

  return 'Something went wrong while signing in. Please try again.';
};

async function getProfileByUserId(userId: string): Promise<ProfileRecord | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, phone, avatar_url, bio, role, account_status')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ProfileRecord;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    if (!supabase || !hasSupabaseConfig) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const sessionUser = userData.user ?? null;

    console.info('[GearLoop auth]', {
      userId: sessionUser?.id ?? null,
      email: sessionUser?.email ?? null,
      userError: userError ? { message: userError.message, status: userError.status } : null,
    });

    if (userError || !sessionUser) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name, phone, avatar_url, bio, role, account_status')
      .eq('id', sessionUser.id)
      .maybeSingle();

    console.info('[GearLoop profile]', {
      userId: sessionUser.id,
      profileError: profileError ? { message: profileError.message, code: profileError.code, details: profileError.details } : null,
      profileRow: profileData ?? null,
      profileRole: profileData?.role ?? null,
    });

    if (profileError || !profileData) {
      setUser(sessionUser);
      setProfile(null);
      setLoading(false);
      return;
    }

    setUser(sessionUser);
    setProfile(profileData as ProfileRecord);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshAuth();

    if (!supabase) {
      return;
    }

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void refreshAuth();
        return;
      }

      setUser(null);
      setProfile(null);
      setLoading(false);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [refreshAuth]);

  const signIn = useCallback(async (input: SignInInput) => {
    if (!supabase || !hasSupabaseConfig) {
      return {
        success: false,
        message: 'Supabase is not configured yet. Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values.',
      };
    }

    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? 'Please check your login details.',
      };
    }

    const { email, password } = parsed.data;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return {
        success: false,
        message: friendlyAuthError(error),
      };
    }

    const nextUser = data.user ?? null;
    console.info('[GearLoop signIn]', {
      userId: nextUser?.id ?? null,
      email: nextUser?.email ?? null,
    });

    const nextProfile = nextUser ? await getProfileByUserId(nextUser.id) : null;
    console.info('[GearLoop signIn profile]', {
      userId: nextUser?.id ?? null,
      profileRow: nextProfile ?? null,
      profileRole: nextProfile?.role ?? null,
    });

    if (nextProfile?.account_status === 'SUSPENDED') {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      return {
        success: false,
        message: 'This account has been suspended and cannot access the platform.',
      };
    }

    setUser(nextUser);
    setProfile(nextProfile);
    setLoading(false);

    return {
      success: true,
      message: 'Signed in successfully.',
      user: data.user ?? null,
      profile: nextProfile,
    };
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    if (!supabase || !hasSupabaseConfig) {
      return {
        success: false,
        message: 'Supabase is not configured yet. Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values.',
      };
    }

    const parsed = signupSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? 'Please check the signup form and try again.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { name, email, phone, password, role } = parsed.data;
    const normalizedRole = normalizeRole(role);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone: phone ?? '',
          role: normalizedRole,
        },
      },
    });

    if (error) {
      return {
        success: false,
        message: friendlyAuthError(error),
      };
    }

    return {
      success: true,
      message: 'Account created successfully.',
      user: data.user ?? null,
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase || !hasSupabaseConfig) {
      return {
        success: false,
        message: 'Supabase is not configured yet. Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values.',
      };
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        message: 'Unable to sign out right now. Please try again.',
      };
    }

    setUser(null);
    setProfile(null);
    return { success: true, message: 'Signed out successfully.' };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshAuth,
    }),
    [loading, profile, refreshAuth, signIn, signOut, signUp, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
