import { type User } from '@supabase/supabase-js';
import { supabase, hasSupabaseConfig } from './supabase/client';
import { loginSchema, normalizeRole, signupSchema, type AppRole } from './validation/auth';

export type SessionStatus = 'ACTIVE' | 'SUSPENDED';

export interface SignupPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: AppRole | string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

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

const ensureSupabase = () => {
  if (!hasSupabaseConfig || !supabase) {
    return {
      success: false,
      message: 'Supabase is not configured yet. Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values.',
    } as const;
  }

  return null;
};

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

export async function signUpUser(input: SignupPayload) {
  const configError = ensureSupabase();
  if (configError) {
    return configError;
  }

  const parsed = signupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Please check the signup form and try again.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    } as const;
  }

  const { name, email, phone, password, role } = parsed.data;
  const normalizedRole = normalizeRole(role);

  const { data, error } = await supabase!.auth.signUp({
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
    } as const;
  }

  if (!data.user) {
    return {
      success: false,
      message: 'No user was created. Please try again.',
    } as const;
  }

  return {
    success: true,
    user: data.user,
    session: data.session,
    message: 'Account created successfully.',
  } as const;
}

export async function signInUser(input: LoginPayload) {
  const configError = ensureSupabase();
  if (configError) {
    return configError;
  }

  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Please check your login details.',
    } as const;
  }

  const { email, password } = parsed.data;

  const { data, error } = await supabase!.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      success: false,
      message: friendlyAuthError(error),
    } as const;
  }

  const user = data.user;
  const { data: profile, error: profileError } = await supabase!
    .from('profiles')
    .select('role, account_status')
    .eq('id', user?.id ?? '')
    .maybeSingle();

  if (profileError) {
    return {
      success: false,
      message: 'Your account could not be verified. Please try again.',
    } as const;
  }

  if (profile?.account_status === 'SUSPENDED') {
    return {
      success: false,
      message: 'This account has been suspended and cannot access the platform.',
    } as const;
  }

  return {
    success: true,
    user,
    session: data.session,
    profile,
    message: 'Signed in successfully.',
  } as const;
}

export async function signOutUser() {
  const configError = ensureSupabase();
  if (configError) {
    return configError;
  }

  const { error } = await supabase!.auth.signOut();

  if (error) {
    return {
      success: false,
      message: 'Unable to sign out right now. Please try again.',
    } as const;
  }

  return { success: true, message: 'Signed out successfully.' } as const;
}

export async function getCurrentUser(): Promise<User | null> {
  const configError = ensureSupabase();
  if (configError) {
    return null;
  }

  const { data, error } = await supabase!.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function getCurrentProfile(): Promise<ProfileRecord | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const configError = ensureSupabase();
  if (configError) {
    return null;
  }

  const { data, error } = await supabase!
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ProfileRecord;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Authentication required.');
  }

  return user;
}

export async function requireRole(requiredRoles: Array<AppRole | 'ADMIN'>) {
  const user = await requireUser();

  const profile = await getCurrentProfile();

  if (!profile || profile.account_status === 'SUSPENDED') {
    throw new Error('This account is not active and cannot access this area.');
  }

  if (!requiredRoles.includes(profile.role as AppRole | 'ADMIN')) {
    throw new Error('You do not have permission to access this page.');
  }

  return { user, profile };
}
