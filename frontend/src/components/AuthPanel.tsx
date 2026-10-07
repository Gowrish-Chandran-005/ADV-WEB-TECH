import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { signInUser, signUpUser, type ProfileRecord } from '../lib/auth';

interface AuthPanelProps {
  user: User | null;
  profile: ProfileRecord | null;
  loading: boolean;
  onAuthChange: () => Promise<void>;
  onLogout: () => Promise<void>;
}

export function AuthPanel({ user, profile, loading, onAuthChange, onLogout }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'RENTER',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="rounded-[24px] border border-[#bfc8c6] bg-white/70 p-4 text-sm text-[#404947]">
        Checking your session...
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#bfc8c6] bg-white p-4 shadow-[0_8px_30px_rgba(12,32,28,0.04)]">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#6b7773]">Signed in</p>
          <p className="mt-1 text-base font-semibold text-[#094d48]">{profile?.name ?? user.email}</p>
          <p className="text-sm text-[#404947]">{profile?.role ?? 'ROLE UNAVAILABLE'} · {profile?.account_status ?? 'ACTIVE'}</p>
        </div>

        <button
          type="button"
          onClick={async () => {
            setError(null);
            setMessage(null);
            await onLogout();
            await onAuthChange();
          }}
          className="inline-flex items-center justify-center bg-[#094d48] text-white font-label-btn text-sm px-4 py-2 rounded-full shadow-[0_4px_0_0_#0e4f4b] hover:translate-y-0.5 hover:shadow-[0_2px_0_0_#0e4f4b] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
        >
          Log out
        </button>
      </div>
    );
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await signInUser({
      email: loginForm.email,
      password: loginForm.password,
    });

    if (!result.success) {
      setError(result.message);
      setSubmitting(false);
      return;
    }

    setMessage(result.message);
    await onAuthChange();
    setSubmitting(false);
  };

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await signUpUser({
      name: signupForm.name,
      email: signupForm.email,
      phone: signupForm.phone,
      password: signupForm.password,
      role: signupForm.role,
    });

    if (!result.success) {
      setError(result.message);
      setSubmitting(false);
      return;
    }

    setMessage('Signup successful. Check your email for the verification link, then sign in.');
    setMode('login');
    setSignupForm({ name: '', email: '', phone: '', password: '', role: 'RENTER' });
    setSubmitting(false);
  };

  return (
    <div className="rounded-[24px] border border-[#bfc8c6] bg-white p-4 shadow-[0_8px_30px_rgba(12,32,28,0.04)]">
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            mode === 'login' ? 'bg-[#094d48] text-white' : 'bg-[#f2efe9] text-[#404947]'
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            mode === 'signup' ? 'bg-[#094d48] text-white' : 'bg-[#f2efe9] text-[#404947]'
          }`}
        >
          Sign up
        </button>
      </div>

      {message && (
        <div className="mb-3 rounded-xl border border-[#bad9d5] bg-[#edf9f7] px-3 py-2 text-sm text-[#094d48]">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-xl border border-[#f0d0c5] bg-[#fff2ee] px-3 py-2 text-sm text-[#994531]">
          {error}
        </div>
      )}

      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Email</label>
            <input
              type="email"
              value={loginForm.email}
              onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
              className="w-full rounded-2xl border border-[#dfe3df] bg-[#f7f3eb] px-3 py-2.5 text-[#1c1c17] outline-none focus:border-[#094d48]"
              placeholder="you@campus.edu"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Password</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
              className="w-full rounded-2xl border border-[#dfe3df] bg-[#f7f3eb] px-3 py-2.5 text-[#1c1c17] outline-none focus:border-[#094d48]"
              placeholder="Password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#094d48] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {submitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignup} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Name</label>
            <input
              type="text"
              value={signupForm.name}
              onChange={(event) => setSignupForm({ ...signupForm, name: event.target.value })}
              className="w-full rounded-2xl border border-[#dfe3df] bg-[#f7f3eb] px-3 py-2.5 text-[#1c1c17] outline-none focus:border-[#094d48]"
              placeholder="Full name"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Email</label>
            <input
              type="email"
              value={signupForm.email}
              onChange={(event) => setSignupForm({ ...signupForm, email: event.target.value })}
              className="w-full rounded-2xl border border-[#dfe3df] bg-[#f7f3eb] px-3 py-2.5 text-[#1c1c17] outline-none focus:border-[#094d48]"
              placeholder="you@campus.edu"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Phone</label>
            <input
              type="tel"
              value={signupForm.phone}
              onChange={(event) => setSignupForm({ ...signupForm, phone: event.target.value })}
              className="w-full rounded-2xl border border-[#dfe3df] bg-[#f7f3eb] px-3 py-2.5 text-[#1c1c17] outline-none focus:border-[#094d48]"
              placeholder="(optional)"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Password</label>
            <input
              type="password"
              value={signupForm.password}
              onChange={(event) => setSignupForm({ ...signupForm, password: event.target.value })}
              className="w-full rounded-2xl border border-[#dfe3df] bg-[#f7f3eb] px-3 py-2.5 text-[#1c1c17] outline-none focus:border-[#094d48]"
              placeholder="Minimum 8 characters"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-[#6b7773]">Role</label>
            <select
              value={signupForm.role}
              onChange={(event) => setSignupForm({ ...signupForm, role: event.target.value })}
              className="w-full rounded-2xl border border-[#dfe3df] bg-[#f7f3eb] px-3 py-2.5 text-[#1c1c17] outline-none focus:border-[#094d48]"
            >
              <option value="RENTER">RENTER</option>
              <option value="OWNER">OWNER</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#094d48] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      )}
    </div>
  );
}
