'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase';

// =====================================================
// Login / Sign-up Page
// Email + password auth with Supabase
// =====================================================

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirectTo') || '/dashboard';

    const [tab, setTab] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const supabase = createSupabaseBrowserClient();

    // If already logged in, redirect
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) router.replace(redirectTo);
        });
    }, [supabase, router, redirectTo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);
        setIsLoading(true);

        try {
            if (tab === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                router.push(redirectTo);
                router.refresh();
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setSuccessMsg('✅ Account created! Please check your email (and spam folder) for a confirmation link to verify your account.');
                setTab('login');
            }
        } catch (err: unknown) {
            const errorMessage = (err as { message?: string })?.message || 'Something went wrong.';
            if (errorMessage.toLowerCase().includes('rate limit')) {
                setError('Too many sign-up attempts. If you are testing, please wait an hour or increase the email limit in your Supabase Dashboard settings.');
            } else {
                setError(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
            },
        });
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 mb-10">
                <span className="text-3xl">🤖</span>
                <span className="font-[var(--font-display)] text-2xl font-bold gradient-text">
                    InterviewerAI
                </span>
            </Link>

            <div className="w-full max-w-sm space-y-6">
                <div className="text-center">
                    <h1 className="font-[var(--font-display)] text-2xl font-bold mb-1 text-white tracking-tight">
                        {tab === 'login' ? 'Welcome back' : 'Create account'}
                    </h1>
                    <p className="text-sm text-[var(--muted)]">
                        {tab === 'login'
                            ? 'Sign in to see your interview history.'
                            : 'Start tracking your interview progress.'}
                    </p>
                </div>

                {/* Tab switcher */}
                <div className="flex rounded-xl bg-[var(--surface)] border border-[var(--border)] p-1">
                    {(['login', 'signup'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setError(null); setSuccessMsg(null); }}
                            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === t
                                ? 'bg-[var(--surface-hover)] text-white shadow-sm border border-[var(--border)]'
                                : 'text-[var(--muted)] hover:text-white border border-transparent'
                                }`}
                        >
                            {t === 'login' ? 'Log in' : 'Sign up'}
                        </button>
                    ))}
                </div>

                <div className="card p-6 space-y-4">
                    {/* Google sign-in */}
                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-all text-sm font-medium text-[var(--foreground)]"
                    >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-[var(--border)]" />
                        <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider font-semibold">or</span>
                        <div className="flex-1 h-px bg-[var(--border)]" />
                    </div>

                    {/* Email / password form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold tracking-wide uppercase text-[var(--muted)] mb-1.5 ml-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="input-field w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold tracking-wide uppercase text-[var(--muted)] mb-1.5 ml-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                className="input-field w-full"
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 leading-relaxed">
                                ⚠ {error}
                            </p>
                        )}
                        {successMsg && (
                            <p className="text-xs text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg px-3 py-2 leading-relaxed">
                                {successMsg}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full py-2.5 text-sm disabled:opacity-50 mt-2"
                        >
                            {isLoading
                                ? 'Loading…'
                                : tab === 'login'
                                    ? 'Log in'
                                    : 'Create account'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-[var(--muted)]">
                    {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
                    <button
                        onClick={() => setTab(tab === 'login' ? 'signup' : 'login')}
                        className="text-[var(--accent)] hover:underline cursor-pointer font-medium"
                    >
                        {tab === 'login' ? 'Sign up' : 'Log in'}
                    </button>
                </p>

                <p className="text-center">
                    <Link href="/" className="text-xs text-[var(--muted)] hover:text-white transition-colors">
                        ← Back to home
                    </Link>
                </p>
            </div>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[var(--muted)]">Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
