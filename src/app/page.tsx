'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

// =====================================================
// Home Page — Smart: marketing for visitors, dashboard for logged-in users
// =====================================================

/* ──────────────────────────────────────────────────────
   MARKETING PAGE (not logged in)
────────────────────────────────────────────────────── */

const FEATURES = [
  { icon: '🎯', title: 'Realistic Interviews', description: 'Face an AI interviewer with a lifelike avatar that asks questions, listens, and responds — just like a real interview.' },
  { icon: '💻', title: 'Live Code Editor', description: 'Problems appear character-by-character in a full-featured editor. Write, run, and debug your solutions in real time.' },
  { icon: '🔄', title: 'Adaptive Follow-Ups', description: "The interviewer adapts to your answers, asks follow-up questions, and probes for deeper understanding — no two sessions are alike." },
  { icon: '📄', title: 'Resume Grill', description: 'Upload your resume and face tough questions about your projects, internships, and experience.' },
  { icon: '🗣️', title: 'Behavioral Prep', description: 'Practice STAR-format answers, conflict resolution, and leadership stories with an AI that pushes back on vague responses.' },
  { icon: '📊', title: 'Detailed Feedback', description: 'Get a scorecard with communication, problem-solving, code quality, and optimization ratings plus actionable improvement tips.' },
];

function MarketingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Nav */}
      <nav className="glass-strong fixed top-0 inset-x-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="font-[var(--font-display)] text-xl font-bold text-white">InterviewerAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary text-sm px-4 py-2">Log in</Link>
            <Link href="/login" className="btn-primary text-sm px-4 py-2">Get started →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={`flex flex-col items-center justify-center text-center px-6 pt-40 pb-24 transition-all duration-1000 opacity-100 translate-y-0`}>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--accent-glow)] bg-[var(--accent)]/10 text-sm text-[var(--accent)] mb-6 font-medium tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"></span> Now powered by GPT-4o
        </div>
        <h1 className="font-[var(--font-display)] text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] max-w-4xl mb-6 text-white">
          Your AI <span className="gradient-text"> Mock Interviewer</span><br />Available 24/7
        </h1>
        <p className="text-lg sm:text-xl text-[var(--muted)] max-w-2xl mb-10 leading-relaxed">
          Practice technical coding interviews with a realistic AI interviewer that speaks, types problems, and gives you pointed follow-up questions — just like the real thing.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link href="/login" className="btn-primary text-base px-8 py-3.5">Start Practicing Free →</Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="px-6 pb-28">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-[var(--font-display)] text-3xl sm:text-4xl font-bold text-center mb-4 tracking-tight text-white">
            Everything You Need to <span className="text-[var(--accent)]">Ace the Interview</span>
          </h2>
          <p className="text-center text-[var(--muted)] mb-14 max-w-2xl mx-auto">
            No more begging friends for practice sessions. Get unlimited, personalized mock interviews any time you want.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 group cursor-default transition-colors hover:border-[var(--accent-glow)]">
                <div className="text-3xl mb-4 bg-[var(--surface-hover)] w-12 h-12 flex items-center justify-center rounded-lg border border-[var(--border)]">{f.icon}</div>
                <h3 className="font-semibold mb-2 group-hover:text-white transition-colors text-[var(--foreground)]">{f.title}</h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto text-center card py-16 px-8 relative overflow-hidden isolate">
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--accent)]/10 to-transparent -z-10" />
          <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold mb-4 tracking-tight text-white">Ready to Level Up?</h2>
          <p className="text-[var(--muted)] mb-8 max-w-lg mx-auto">Your next interview is closer than you think. Start practicing now and walk in with confidence.</p>
          <Link href="/login" className="btn-primary text-base px-10 py-4 shadow-lg shadow-[var(--accent)]/20">Create Free Account</Link>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-8 px-6 bg-[var(--background)]">
        <div className="max-w-7xl mx-auto text-sm text-[var(--muted)] flex justify-between items-center">
          <span>© 2026 InterviewerAI.</span>
          <span className="flex items-center gap-2">Built with <span className="text-[var(--foreground)]">Next.js & GPT-4o</span></span>
        </div>
      </footer>
    </main>
  );
}

/* ──────────────────────────────────────────────────────
   DASHBOARD OVERVIEW (logged in)
────────────────────────────────────────────────────── */

interface RecentSession {
  id: string;
  type: 'technical' | 'behavioral';
  config: Record<string, unknown>;
  created_at: string;
  duration_secs: number | null;
  feedback: { overall_score: number; decision: string } | null;
}



function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function DashboardHome({ user }: { user: User }) {
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [stats, setStats] = useState({ total: 0, avgScore: 0, hireRate: 0 });
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('sessions')
        .select('id, type, config, created_at, duration_secs, feedback(overall_score, decision)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!data) return;

      const sessions = data as unknown as RecentSession[];
      setRecentSessions(sessions.slice(0, 5));

      const total = sessions.length;
      const withFeedback = sessions.filter((s) => s.feedback);
      const avgScore = withFeedback.length
        ? withFeedback.reduce((sum, s) => sum + (s.feedback?.overall_score ?? 0), 0) / withFeedback.length
        : 0;
      const hires = withFeedback.filter((s) =>
        s.feedback?.decision === 'Hire' || s.feedback?.decision === 'Strong Hire'
      ).length;
      setStats({ total, avgScore, hireRate: withFeedback.length ? Math.round((hires / withFeedback.length) * 100) : 0 });
    }
    load();
  }, [supabase, user.id]);

  const firstName = user.email?.split('@')[0] ?? 'there';

  return (
    <div className="px-6 py-10 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500">
      {/* Greeting */}
      <div>
        <h1 className="font-[var(--font-display)] text-3xl font-bold mb-2 tracking-tight text-white">
          Hey, {firstName} <span className="text-[var(--accent)]">👋</span>
        </h1>
        <p className="text-[var(--muted)] text-sm">Ready to practice? Pick a mode below.</p>
      </div>

      {/* Quick-start cards */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Link href="/interview/setup" className="card group p-6 flex gap-5 items-start hover:border-[var(--accent-glow)] transition-all bg-[var(--surface)] hover:bg-[var(--surface-hover)]">
          <div className="w-12 h-12 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center shrink-0">
            <span className="text-2xl">💻</span>
          </div>
          <div>
            <h2 className="font-[var(--font-display)] font-semibold text-lg mb-1 group-hover:text-white transition-colors text-[var(--foreground)] tracking-tight">Technical Interview</h2>
            <p className="text-sm text-[var(--muted)] leading-relaxed">LeetCode-style problems with a live code editor, adaptive follow-ups, and detailed feedback.</p>
          </div>
        </Link>
        <Link href="/behavioral/setup" className="card group p-6 flex gap-5 items-start hover:border-[var(--accent-glow)] transition-all bg-[var(--surface)] hover:bg-[var(--surface-hover)]">
          <div className="w-12 h-12 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center shrink-0">
            <span className="text-2xl">🗣️</span>
          </div>
          <div>
            <h2 className="font-[var(--font-display)] font-semibold text-lg mb-1 group-hover:text-white transition-colors text-[var(--foreground)] tracking-tight">Behavioral Interview</h2>
            <p className="text-sm text-[var(--muted)] leading-relaxed">Resume grill, STAR-format behavioral, or a mixed mode. Evidence-backed scoring.</p>
          </div>
        </Link>
      </div>

      {/* Stats row */}
      {stats.total > 0 && (
        <div className="grid grid-cols-3 gap-5">
          {[
            { label: 'Total Sessions', value: stats.total },
            { label: 'Avg Score', value: stats.avgScore ? `${stats.avgScore.toFixed(1)}` : '—' },
            { label: 'Hire Rate', value: stats.hireRate ? `${stats.hireRate}%` : '—' },
          ].map((s) => (
            <div key={s.label} className="card p-5 flex flex-col justify-center bg-[var(--surface)] border border-[var(--border)]">
              <div className="text-[11px] font-medium text-[var(--muted)] mb-3">{s.label}</div>
              <div className="text-3xl font-[var(--font-display)] font-bold text-white tracking-tight">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-[var(--font-display)] font-semibold text-lg text-white">Recent Sessions</h2>
            <Link href="/dashboard" className="text-xs text-[var(--muted)] hover:text-white transition-colors">View all →</Link>
          </div>
          <div className="space-y-2">
            {recentSessions.map((s) => {
              const decision = s.feedback?.decision;
              // Clean linear aesthetic doesn't use strong colors for "No Hire", relying on muted tones instead
              const color = decision === 'Strong Hire' || decision === 'Hire' ? 'text-[var(--accent)]' : 'text-[var(--muted)]';
              const cfg = s.config as { mode?: string; role?: string };

              return (
                <Link key={s.id} href={`/dashboard/${s.id}`} className="card px-5 py-4 flex items-center justify-between group hover:border-[var(--accent-glow)] transition-all bg-[var(--surface)] hover:bg-[var(--surface-hover)]">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded bg-[var(--background)] border border-[var(--border)] flex items-center justify-center shrink-0">
                      <span className="text-lg">{s.type === 'technical' ? '💻' : '🗣️'}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--foreground)] truncate group-hover:text-white transition-colors">
                        {s.type === 'technical' ? 'Technical' : `Behavioral — ${cfg.mode?.replace('_', ' ')}`}
                        {cfg.role && <span className="ml-2 text-[var(--muted)] font-normal">· {cfg.role}</span>}
                      </div>
                      <div className="text-xs text-[var(--muted)] mt-1">{formatDate(s.created_at)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    {s.feedback && (
                      <div className="text-right flex items-center gap-3">
                        <div className={`text-[11px] font-medium border px-2 py-0.5 rounded ${color} border-current opacity-80`}>
                          {decision}
                        </div>
                        <span className="text-sm font-[var(--font-display)] font-bold text-white w-8 text-right">{s.feedback.overall_score}/10</span>
                      </div>
                    )}
                    <span className="text-[var(--muted)] group-hover:text-white transition-colors">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats.total === 0 && (
        <div className="card p-12 text-center flex flex-col items-center justify-center border-dashed border-[var(--border)] bg-transparent">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center mb-6">
            <span className="text-2xl opacity-50 grayscale">🎤</span>
          </div>
          <h3 className="font-[var(--font-display)] font-semibold text-lg text-white mb-2 tracking-tight">No sessions yet</h3>
          <p className="text-sm text-[var(--muted)] max-w-sm">Pick a mode above to start your first interview and we&apos;ll track your progress here.</p>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   ROOT EXPORT — switches between marketing and dashboard
────────────────────────────────────────────────────── */

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });
  }, [supabase]);

  if (isLoading) return null; // avoid flash

  if (!user) return <MarketingPage />;

  return <DashboardHome user={user} />;
}
