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

function MarketingPage({ mounted }: { mounted: boolean }) {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="glass-strong fixed top-0 inset-x-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="font-[var(--font-display)] text-xl font-bold gradient-text">InterviewerAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary text-sm">Log in</Link>
            <Link href="/login" className="btn-primary text-sm">Get started →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={`flex flex-col items-center justify-center text-center px-6 pt-40 pb-24 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[oklch(1_0_0/0.1)] bg-[oklch(0.17_0.02_260/0.6)] text-sm text-[oklch(0.72_0.17_165)] mb-6">
          <span className="animate-pulse">●</span> Now powered by GPT-4o
        </div>
        <h1 className="font-[var(--font-display)] text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight max-w-4xl mb-6">
          Your AI <span className="gradient-text"> Mock Interviewer</span><br />Available 24/7
        </h1>
        <p className="text-lg sm:text-xl text-[oklch(0.65_0.01_260)] max-w-2xl mb-10 leading-relaxed">
          Practice technical coding interviews with a realistic AI interviewer that speaks, types problems, and gives you pointed follow-up questions — just like the real thing.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link href="/login" className="btn-primary text-base px-8 py-3.5">🚀 Start Practicing Free</Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="px-6 pb-28">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-[var(--font-display)] text-3xl sm:text-4xl font-bold text-center mb-4">
            Everything You Need to <span className="gradient-text">Ace the Interview</span>
          </h2>
          <p className="text-center text-[oklch(0.55_0.01_260)] mb-14 max-w-2xl mx-auto">
            No more begging friends for practice sessions. Get unlimited, personalized mock interviews any time you want.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="card group cursor-default">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-[var(--font-display)] text-lg font-semibold mb-2 group-hover:text-[oklch(0.76_0.10_250)] transition-colors">{f.title}</h3>
                <p className="text-sm text-[oklch(0.55_0.01_260)] leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto text-center card glow-accent py-12 px-8">
          <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold mb-4">Ready to Level Up?</h2>
          <p className="text-[oklch(0.55_0.01_260)] mb-8 max-w-lg mx-auto">Your next interview is closer than you think. Start practicing now and walk in with confidence.</p>
          <Link href="/login" className="btn-primary text-base px-10 py-4">🚀 Create Free Account</Link>
        </div>
      </section>

      <footer className="border-t border-[oklch(1_0_0/0.06)] py-8 px-6">
        <div className="max-w-7xl mx-auto text-sm text-[oklch(0.4_0.01_260)]">
          © 2026 InterviewerAI. Built with 💻 &amp; GPT-4o.
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

const DECISION_COLOR: Record<string, string> = {
  'Strong Hire': 'oklch(0.72_0.17_165)',
  'Hire': 'oklch(0.65_0.14_165)',
  'No Hire': 'oklch(0.63_0.22_25)',
};

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
    <div className="px-6 py-8 max-w-4xl mx-auto space-y-10">
      {/* Greeting */}
      <div>
        <h1 className="font-[var(--font-display)] text-3xl font-bold mb-1">
          Hey, <span className="gradient-text">{firstName}</span> 👋
        </h1>
        <p className="text-[oklch(0.5_0.01_260)] text-sm">Ready to practice? Pick a mode below.</p>
      </div>

      {/* Quick-start cards */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Link href="/interview/setup" className="card group p-6 flex gap-5 items-start hover:border-[oklch(0.55_0.18_250/0.5)] transition-all">
          <span className="text-4xl">💻</span>
          <div>
            <h2 className="font-[var(--font-display)] font-semibold text-lg mb-1 group-hover:text-[oklch(0.76_0.10_250)] transition-colors">Technical Interview</h2>
            <p className="text-sm text-[oklch(0.5_0.01_260)]">LeetCode-style problems with a live code editor, adaptive follow-ups, and detailed feedback.</p>
          </div>
        </Link>
        <Link href="/behavioral/setup" className="card group p-6 flex gap-5 items-start hover:border-[oklch(0.55_0.18_250/0.5)] transition-all">
          <span className="text-4xl">🗣️</span>
          <div>
            <h2 className="font-[var(--font-display)] font-semibold text-lg mb-1 group-hover:text-[oklch(0.76_0.10_250)] transition-colors">Behavioral Interview</h2>
            <p className="text-sm text-[oklch(0.5_0.01_260)]">Resume grill, STAR-format behavioral, or a mixed mode. Evidence-backed scoring.</p>
          </div>
        </Link>
      </div>

      {/* Stats row */}
      {stats.total > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Sessions', value: stats.total },
            { label: 'Avg Score', value: stats.avgScore ? `${stats.avgScore.toFixed(1)}/10` : '—' },
            { label: 'Hire Rate', value: stats.hireRate ? `${stats.hireRate}%` : '—' },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <div className="text-2xl font-bold gradient-text">{s.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-[oklch(0.5_0.01_260)] mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-[var(--font-display)] font-semibold text-lg">Recent Sessions</h2>
            <Link href="/dashboard" className="text-xs text-[oklch(0.5_0.01_260)] hover:text-[oklch(0.7_0.01_260)] transition-colors">View all →</Link>
          </div>
          <div className="space-y-2">
            {recentSessions.map((s) => {
              const decision = s.feedback?.decision;
              const color = decision ? DECISION_COLOR[decision] ?? '' : '';
              const cfg = s.config as { mode?: string; role?: string };
              return (
                <Link key={s.id} href={`/dashboard/${s.id}`} className="card px-5 py-3.5 flex items-center gap-4 hover:border-[oklch(1_0_0/0.15)] transition-all">
                  <span className="text-xl shrink-0">{s.type === 'technical' ? '💻' : '🗣️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[oklch(0.75_0.01_260)] truncate">
                      {s.type === 'technical' ? 'Technical' : `Behavioral — ${cfg.mode?.replace('_', ' ')}`}
                      {cfg.role && <span className="ml-2 text-[oklch(0.45_0.01_260)]">· {cfg.role}</span>}
                    </div>
                    <div className="text-xs text-[oklch(0.4_0.01_260)] mt-0.5">{formatDate(s.created_at)}</div>
                  </div>
                  {s.feedback && (
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-bold text-[oklch(0.8_0.01_260)]">{s.feedback.overall_score}/10</span>
                      <div className="text-[10px] font-semibold" style={{ color }}>{decision}</div>
                    </div>
                  )}
                  <span className="text-[oklch(0.3_0.01_260)] shrink-0">→</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats.total === 0 && (
        <div className="card p-10 text-center space-y-3">
          <div className="text-4xl">🎤</div>
          <h3 className="font-[var(--font-display)] font-semibold text-lg">No sessions yet</h3>
          <p className="text-sm text-[oklch(0.5_0.01_260)]">Pick a mode above to start your first interview.</p>
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
  const [mounted, setMounted] = useState(false);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });
  }, [supabase]);

  if (isLoading) return null; // avoid flash

  if (!user) return <MarketingPage mounted={mounted} />;

  return <DashboardHome user={user} />;
}
