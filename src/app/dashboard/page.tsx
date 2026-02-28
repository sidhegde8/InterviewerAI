'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

// =====================================================
// Interview History Dashboard
// Shows only the current user's sessions via RLS
// =====================================================

interface SessionRow {
    id: string;
    type: 'technical' | 'behavioral';
    config: Record<string, unknown>;
    started_at: string;
    ended_at: string | null;
    duration_secs: number | null;
    created_at: string;
    feedback: {
        overall_score: number;
        decision: string;
        scores: Record<string, number>;
    } | null;
}

function formatDuration(secs: number | null) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

const DECISION_COLOR: Record<string, string> = {
    'Strong Hire': 'oklch(0.72_0.17_165)',
    'Hire': 'oklch(0.65_0.14_165)',
    'No Hire': 'oklch(0.63_0.22_25)',
};

export default function DashboardPage() {
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (!user) {
                setIsLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('sessions')
                .select(`*, feedback (overall_score, decision, scores)`)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) setError('Failed to load sessions.');
            else setSessions((data as SessionRow[]) ?? []);
            setIsLoading(false);
        }
        load();
    }, [supabase]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    // Stats
    const total = sessions.length;
    const technical = sessions.filter((s) => s.type === 'technical').length;
    const behavioral = sessions.filter((s) => s.type === 'behavioral').length;
    const hires = sessions.filter((s) =>
        s.feedback?.decision === 'Hire' || s.feedback?.decision === 'Strong Hire'
    ).length;
    const avgScore = sessions.length
        ? (sessions.reduce((sum, s) => sum + (s.feedback?.overall_score ?? 0), 0) / sessions.length).toFixed(1)
        : '—';

    return (
        <main className="min-h-screen flex flex-col">
            <div className="flex-1 max-w-5xl mx-auto w-full px-6 pt-8 pb-16 space-y-8">
                <div>
                    <h1 className="font-[var(--font-display)] text-3xl font-bold mb-1">
                        Interview <span className="gradient-text">History</span>
                    </h1>
                    {user && (
                        <p className="text-[oklch(0.5_0.01_260)] text-sm">{user.email}</p>
                    )}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Sessions', value: total },
                        { label: 'Technical', value: technical },
                        { label: 'Behavioral', value: behavioral },
                        { label: 'Avg Score', value: total ? `${avgScore}/10` : '—' },
                    ].map((stat) => (
                        <div key={stat.label} className="card p-4 text-center">
                            <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                            <div className="text-[10px] uppercase tracking-wider text-[oklch(0.5_0.01_260)] mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Session list */}
                {isLoading ? (
                    <div className="text-center py-24 text-[oklch(0.4_0.01_260)]">
                        <span className="animate-spin inline-block text-3xl mb-4">⏳</span>
                        <p>Loading sessions…</p>
                    </div>
                ) : error ? (
                    <div className="card p-8 text-center text-[oklch(0.63_0.22_25)]">⚠ {error}</div>
                ) : sessions.length === 0 ? (
                    <div className="card p-16 text-center space-y-4">
                        <div className="text-5xl">🎤</div>
                        <h2 className="font-[var(--font-display)] text-xl font-semibold">No sessions yet</h2>
                        <p className="text-[oklch(0.5_0.01_260)] text-sm">Complete an interview and it&apos;ll show up here.</p>
                        <Link href="/interview/setup" className="btn-primary inline-block">Start an Interview</Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sessions.map((s) => {
                            const decision = s.feedback?.decision;
                            const color = decision ? DECISION_COLOR[decision] : 'oklch(0.4_0.01_260)';
                            const cfg = s.config as { mode?: string; difficulty?: string; role?: string; company?: string };

                            return (
                                <Link key={s.id} href={`/dashboard/${s.id}`} className="card p-5 flex items-center gap-5 hover:border-[oklch(1_0_0/0.15)] transition-all cursor-pointer">
                                    <div className="shrink-0 text-2xl">{s.type === 'technical' ? '💻' : '🗣️'}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-[oklch(0.8_0.01_260)] text-sm capitalize">
                                                {s.type === 'technical' ? 'Technical' : `Behavioral — ${cfg.mode?.replace('_', ' ')}`}
                                            </span>
                                            {cfg.role && <span className="text-[10px] px-2 py-0.5 rounded bg-[oklch(0.22_0.02_260)] text-[oklch(0.55_0.01_260)]">{cfg.role}</span>}
                                            {cfg.company && <span className="text-[10px] px-2 py-0.5 rounded bg-[oklch(0.22_0.02_260)] text-[oklch(0.55_0.01_260)]">@ {cfg.company}</span>}
                                        </div>
                                        <div className="text-xs text-[oklch(0.4_0.01_260)] mt-1">
                                            {formatDate(s.created_at)} · {formatDuration(s.duration_secs)}
                                            {cfg.difficulty && ` · ${cfg.difficulty}`}
                                        </div>
                                    </div>
                                    {s.feedback && (
                                        <div className="shrink-0 text-right">
                                            <div className="text-xl font-bold text-[oklch(0.8_0.01_260)]">
                                                {s.feedback.overall_score}<span className="text-sm text-[oklch(0.4_0.01_260)]">/10</span>
                                            </div>
                                            <div className="text-[10px] font-semibold mt-0.5" style={{ color }}>{decision}</div>
                                        </div>
                                    )}
                                    <div className="shrink-0 text-[oklch(0.3_0.01_260)]">→</div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {total > 0 && (
                    <p className="text-center text-xs text-[oklch(0.35_0.01_260)]">
                        {hires} of {total} sessions with Hire or Strong Hire decision
                    </p>
                )}
            </div>
        </main>
    );
}
