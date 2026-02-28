'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase';

// =====================================================
// Session Replay / Detail Page
// Shows full transcript + feedback for a past session
// =====================================================

interface MessageRow {
    id: string;
    role: 'interviewer' | 'candidate';
    content: string;
    type: string;
    timestamp: number;
}

interface FeedbackRow {
    checklists: Record<string, Record<string, { passed: boolean; evidence: string | null }>>;
    scores: Record<string, number>;
    overall_score: number;
    decision: string;
    report: string;
}

interface SessionDetail {
    id: string;
    type: 'technical' | 'behavioral';
    config: Record<string, unknown>;
    started_at: string;
    ended_at: string | null;
    duration_secs: number | null;
    messages: MessageRow[];
    feedback: FeedbackRow | FeedbackRow[] | null;
}

function formatDuration(secs: number | null) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

const DECISION_COLOR: Record<string, string> = {
    'Strong Hire': 'oklch(0.72_0.17_165)',
    'Hire': 'oklch(0.65_0.14_165)',
    'No Hire': 'oklch(0.63_0.22_25)',
};

export default function SessionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.id as string;

    const [session, setSession] = useState<SessionDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'transcript' | 'feedback'>('transcript');

    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            const { data, error } = await supabase
                .from('sessions')
                .select(`
                    *,
                    messages (id, role, content, type, timestamp),
                    feedback (checklists, scores, overall_score, decision, report)
                `)
                .eq('id', sessionId)
                .eq('user_id', user.id)
                .single();

            if (error || !data) {
                setError('Session not found.');
            } else {
                // Sort messages by timestamp
                const sorted = { ...data, messages: (data.messages ?? []).sort((a: MessageRow, b: MessageRow) => a.timestamp - b.timestamp) };
                setSession(sorted as SessionDetail);
            }
            setIsLoading(false);
        }
        load();
    }, [supabase, sessionId, router]);

    if (isLoading) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="text-center text-[oklch(0.4_0.01_260)]">
                    <span className="animate-spin inline-block text-3xl mb-4">⏳</span>
                    <p>Loading session…</p>
                </div>
            </main>
        );
    }

    if (error || !session) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="card p-12 text-center space-y-4">
                    <div className="text-4xl">😕</div>
                    <h2 className="font-[var(--font-display)] text-lg font-semibold">Session not found</h2>
                    <Link href="/dashboard" className="btn-primary inline-block">← Back to Dashboard</Link>
                </div>
            </main>
        );
    }

    const fb: FeedbackRow | null = session.feedback
        ? Array.isArray(session.feedback) ? session.feedback[0] ?? null : session.feedback
        : null;
    const cfg = session.config as { role?: string; company?: string; difficulty?: string; mode?: string; language?: string };
    const decisionColor = fb ? DECISION_COLOR[fb.decision] ?? 'oklch(0.5_0.01_260)' : '';

    return (
        <main className="min-h-screen flex flex-col">
            <div className="flex-1 max-w-4xl mx-auto w-full px-6 pt-8 pb-16 space-y-6">
                {/* Session header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{session.type === 'technical' ? '💻' : '🗣️'}</span>
                            <h1 className="font-[var(--font-display)] text-2xl font-bold">
                                {session.type === 'technical'
                                    ? 'Technical Interview'
                                    : `Behavioral — ${cfg.mode?.replace('_', ' ') ?? ''}`}
                            </h1>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            {cfg.role && (
                                <span className="px-2 py-1 rounded bg-[oklch(0.22_0.02_260)] text-[oklch(0.6_0.01_260)]">{cfg.role}</span>
                            )}
                            {cfg.company && (
                                <span className="px-2 py-1 rounded bg-[oklch(0.22_0.02_260)] text-[oklch(0.6_0.01_260)]">@ {cfg.company}</span>
                            )}
                            {cfg.difficulty && (
                                <span className="px-2 py-1 rounded bg-[oklch(0.22_0.02_260)] text-[oklch(0.6_0.01_260)] capitalize">{cfg.difficulty}</span>
                            )}
                            {cfg.language && (
                                <span className="px-2 py-1 rounded bg-[oklch(0.22_0.02_260)] text-[oklch(0.6_0.01_260)] capitalize">{cfg.language}</span>
                            )}
                            <span className="px-2 py-1 rounded bg-[oklch(0.22_0.02_260)] text-[oklch(0.45_0.01_260)]">
                                {formatDate(session.started_at)} · {formatDuration(session.duration_secs)}
                            </span>
                        </div>
                    </div>

                    {/* Score badge */}
                    {fb && (
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-3xl font-bold text-[oklch(0.85_0.01_260)]">
                                    {fb.overall_score}<span className="text-lg text-[oklch(0.35_0.01_260)]">/10</span>
                                </div>
                                <div className="text-xs font-semibold mt-0.5" style={{ color: decisionColor }}>
                                    {fb.decision}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tab switcher */}
                <div className="flex rounded-xl bg-[oklch(0.16_0.02_260)] p-1 w-fit">
                    {(['transcript', 'feedback'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setActiveTab(t)}
                            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer capitalize ${activeTab === t
                                ? 'bg-[oklch(0.22_0.02_260)] text-white shadow'
                                : 'text-[oklch(0.5_0.01_260)] hover:text-[oklch(0.7_0.01_260)]'
                                }`}
                        >
                            {t === 'transcript' ? '💬 Transcript' : '📊 Feedback'}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {activeTab === 'transcript' ? (
                    <div className="card p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        {session.messages.length === 0 ? (
                            <p className="text-center text-[oklch(0.4_0.01_260)] py-8">No messages recorded.</p>
                        ) : (
                            session.messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'interviewer'
                                        ? 'bg-[oklch(0.18_0.02_260)] border border-[oklch(1_0_0/0.06)] text-[oklch(0.82_0.01_260)]'
                                        : 'bg-[oklch(0.35_0.12_250)] text-white'
                                        }`}>
                                        <div className="text-[9px] uppercase tracking-wider mb-1 opacity-50">
                                            {msg.role === 'interviewer' ? '🤖 Interviewer' : '👤 You'}
                                        </div>
                                        {msg.content}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : fb ? (
                    <div className="space-y-6">
                        {/* Scores */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {Object.entries(fb.scores).map(([key, val]) => (
                                <div key={key} className="card p-4 text-center border border-[oklch(1_0_0/0.05)] bg-[oklch(0.12_0.02_260)]">
                                    <span className="text-[10px] text-[oklch(0.5_0.01_260)] uppercase tracking-wider font-semibold block mb-1">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                    <span className="text-2xl font-bold text-[oklch(0.8_0.01_260)]">
                                        {val}<span className="text-sm text-[oklch(0.3_0.01_260)]">/5</span>
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Report */}
                        <div className="card p-6 bg-[oklch(0.12_0.02_260)]/50">
                            <h2 className="font-[var(--font-display)] font-semibold text-lg mb-4 text-[oklch(0.8_0.01_260)] flex items-center gap-2">
                                <span className="text-xl">📝</span> Interview Report
                            </h2>
                            <div className="text-[oklch(0.7_0.01_260)] leading-relaxed whitespace-pre-wrap text-sm">
                                {fb.report}
                            </div>
                        </div>

                        {/* Checklists */}
                        {fb.checklists && Object.entries(fb.checklists).map(([section, items]) => (
                            <div key={section} className="card p-5 bg-[oklch(0.12_0.02_260)]/50">
                                <h3 className="font-[var(--font-display)] font-semibold text-xs uppercase tracking-wider mb-4 text-[oklch(0.6_0.05_250)]">
                                    {section.replace(/([A-Z])/g, ' $1').trim()}
                                </h3>
                                <ul className="space-y-3">
                                    {Object.entries(items).map(([key, item]) => (
                                        <li key={key} className="space-y-1">
                                            <div className="flex items-start gap-3 text-sm">
                                                <div className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center border ${item.passed
                                                    ? 'bg-[oklch(0.6_0.15_150)] border-[oklch(0.6_0.15_150)] text-black'
                                                    : 'border-[oklch(0.3_0.02_260)] text-transparent'}`}>
                                                    <svg viewBox="0 0 14 14" fill="none" className="w-2.5 h-2.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 7.5 6 10.5 11 3.5" />
                                                    </svg>
                                                </div>
                                                <span className={item.passed ? 'text-[oklch(0.7_0.01_260)]' : 'text-[oklch(0.4_0.01_260)] line-through'}>
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                            </div>
                                            {item.passed && item.evidence && (
                                                <p className="ml-7 text-[10px] text-[oklch(0.55_0.05_250)] italic leading-snug border-l-2 border-[oklch(0.55_0.05_250/0.4)] pl-2">
                                                    &quot;{item.evidence}&quot;
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card p-12 text-center text-[oklch(0.4_0.01_260)]">
                        No feedback available for this session.
                    </div>
                )}
            </div>
        </main>
    );
}
