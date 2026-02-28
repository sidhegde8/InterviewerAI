'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { SkeletonCard } from '@/components/Skeleton';
import {
    Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis
} from 'recharts';
import {
    Terminal, MessagesSquare, ArrowRight, Activity, TrendingUp, CheckCircle2
} from 'lucide-react';

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
        month: 'short', day: 'numeric'
    });
}

const DECISION_COLOR: Record<string, string> = {
    'Strong Hire': 'text-[var(--accent)]',
    'Hire': 'text-[var(--accent)]',
    'No Hire': 'text-[var(--muted)]',
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

    // Stats & Chart Data
    const total = sessions.length;
    const technical = sessions.filter((s) => s.type === 'technical').length;
    const behavioral = sessions.filter((s) => s.type === 'behavioral').length;

    // Only count sessions that actually have a decision for the hire rate
    const sessionsWithFeedback = sessions.filter(s => s.feedback && s.feedback.decision);
    const hires = sessionsWithFeedback.filter((s) =>
        s.feedback?.decision === 'Hire' || s.feedback?.decision === 'Strong Hire'
    ).length;

    const hireRate = sessionsWithFeedback.length
        ? Math.round((hires / sessionsWithFeedback.length) * 100)
        : 0;

    const avgScore = sessionsWithFeedback.length
        ? (sessionsWithFeedback.reduce((sum, s) => sum + (s.feedback?.overall_score ?? 0), 0) / sessionsWithFeedback.length).toFixed(1)
        : '0.0';

    // Prepare chronological data for the chart (oldest to newest)
    const chartData = useMemo(() => {
        if (!sessions || sessions.length === 0) return [];

        return [...sessions]
            .reverse() // chronologically
            .filter(s => s.feedback?.overall_score != null)
            .map((s, index) => ({
                name: `Session ${index + 1}`,
                date: formatDate(s.created_at),
                score: s.feedback!.overall_score,
                type: s.type
            }));
    }, [sessions]);

    // Custom Tooltip for Recharts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[var(--surface)] border border-[var(--border)] p-3 rounded-lg shadow-xl">
                    <p className="text-[11px] text-[var(--muted)] font-medium mb-1">{payload[0].payload.date}</p>
                    <p className="text-sm text-white font-[var(--font-display)] font-semibold">
                        Score: <span className="text-[var(--accent)]">{payload[0].value}/10</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <main className="min-h-screen flex flex-col bg-[var(--background)] animate-in fade-in duration-500">
            <div className="flex-1 max-w-5xl mx-auto w-full px-6 pt-10 pb-20 space-y-10">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-[var(--font-display)] text-3xl font-bold mb-1 tracking-tight text-white">
                            Interview History
                        </h1>
                        <p className="text-[var(--muted)] text-sm">Track your performance and progress over time.</p>
                    </div>
                </div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                        </div>
                        <div className="h-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl animate-pulse" />
                    </div>
                ) : error ? (
                    <div className="card p-8 text-center border-red-900/50 bg-red-900/10 text-red-400 text-sm">⚠ {error}</div>
                ) : sessions.length === 0 ? (
                    <div className="card p-16 text-center flex flex-col items-center justify-center border-dashed border-[var(--border)] bg-transparent">
                        <div className="w-16 h-16 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center mb-6">
                            <Activity className="w-8 h-8 text-[var(--muted)] opacity-50" />
                        </div>
                        <h2 className="font-[var(--font-display)] text-xl font-semibold text-white mb-2 tracking-tight">No sessions yet</h2>
                        <p className="text-[var(--muted)] text-sm max-w-sm mb-8">Complete your first mock interview to start generating performance data and analytics.</p>
                        <Link href="/interview/setup" className="btn-primary px-8 py-3">Start Practicing</Link>
                    </div>
                ) : (
                    <>
                        {/* Stats grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                            {[
                                { label: 'Total Sessions', value: total, icon: Activity },
                                { label: 'Avg Score', value: `${avgScore}`, icon: TrendingUp },
                                { label: 'Hire Rate', value: `${hireRate}%`, icon: CheckCircle2 },
                                { label: 'Technical', value: technical, icon: Terminal },
                            ].map((stat, i) => (
                                <div key={i} className="card p-5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <stat.icon className="w-16 h-16" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--muted)] mb-3 uppercase tracking-wider">
                                            <stat.icon className="w-3.5 h-3.5" />
                                            {stat.label}
                                        </div>
                                        <div className="text-3xl font-[var(--font-display)] font-bold text-white tracking-tight">{stat.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Performance Chart */}
                        {chartData.length > 1 && (
                            <div className="card p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="font-[var(--font-display)] font-semibold text-white tracking-tight">Performance Trend</h2>
                                </div>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                domain={[0, 10]}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                                                dx={-10}
                                            />
                                            <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                            <Area
                                                type="monotone"
                                                dataKey="score"
                                                stroke="var(--accent)"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorScore)"
                                                activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--background)', strokeWidth: 2 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Session list */}
                        <div>
                            <h2 className="font-[var(--font-display)] font-semibold text-lg text-white mb-4 tracking-tight">Session Log</h2>
                            <div className="space-y-2">
                                {sessions.map((s) => {
                                    const decision = s.feedback?.decision;
                                    const colorClass = decision ? DECISION_COLOR[decision] || 'text-[var(--muted)]' : 'text-[var(--muted)]';
                                    const cfg = s.config as { mode?: string; difficulty?: string; role?: string; company?: string };

                                    return (
                                        <Link key={s.id} href={`/dashboard/${s.id}`} className="card p-5 flex items-center gap-5 hover:border-[var(--accent-glow)] transition-all cursor-pointer group bg-[var(--surface)] hover:bg-[var(--surface-hover)]">
                                            <div className="w-10 h-10 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center shrink-0">
                                                {s.type === 'technical' ? <Terminal className="w-5 h-5 text-[var(--accent)]" /> : <MessagesSquare className="w-5 h-5 text-[var(--accent)]" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className="font-semibold text-white text-sm capitalize tracking-tight">
                                                        {s.type === 'technical' ? 'Technical' : `Behavioral — ${cfg.mode?.replace('_', ' ')}`}
                                                    </span>
                                                    {cfg.role && <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--muted)] font-medium tracking-wide uppercase">{cfg.role}</span>}
                                                    {cfg.company && <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--muted)] font-medium tracking-wide uppercase">@ {cfg.company}</span>}
                                                </div>
                                                <div className="text-xs text-[var(--muted)] mt-1 flex items-center gap-1.5 truncate">
                                                    <span>{formatDate(s.created_at)}</span>
                                                    <span>•</span>
                                                    <span>{formatDuration(s.duration_secs)}</span>
                                                    {cfg.difficulty && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="capitalize">{cfg.difficulty}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 shrink-0">
                                                {s.feedback ? (
                                                    <div className="text-right flex items-center gap-4">
                                                        <div className={`text-[11px] font-medium border px-2 py-0.5 rounded ${colorClass} border-current opacity-80`}>
                                                            {decision}
                                                        </div>
                                                        <div className="text-xl font-[var(--font-display)] font-bold text-white w-10 text-right">
                                                            {s.feedback.overall_score}<span className="text-sm text-[var(--muted)] font-normal">/10</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-right text-sm text-[var(--accent)] font-medium text-opacity-80 animate-pulse w-24">In Progress</div>
                                                )}
                                                <ArrowRight className="w-4 h-4 text-[var(--muted)] group-hover:text-white transition-colors" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>

                            {total > 0 && (
                                <p className="text-center text-xs text-[var(--muted)] mt-6">
                                    {hires} of {sessionsWithFeedback.length} completed sessions with Hire or Strong Hire decision
                                </p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
