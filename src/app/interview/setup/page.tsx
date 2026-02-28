'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInterviewStore } from '@/stores/interview-store';
import type {
    InterviewConfig,
    Difficulty,
    ProgrammingLanguage,
} from '@/types/interview';

const ROLES = [
    'Software Engineer',
    'Frontend Engineer',
    'Backend Engineer',
    'Full-Stack Engineer',
    'Machine Learning Engineer',
    'Data Engineer',
    'DevOps / SRE',
    'Mobile Engineer',
];

const DIFFICULTIES: { value: Difficulty; label: string; desc: string }[] = [
    {
        value: 'easy',
        label: 'Easy',
        desc: 'Warm-up level — fundamentals & basic data structures',
    },
    {
        value: 'medium',
        label: 'Medium',
        desc: 'Standard interview level — most common difficulty',
    },
    {
        value: 'hard',
        label: 'Hard',
        desc: "Challenge mode — FAANG-level hard questions",
    },
];

const LANGUAGES: { value: ProgrammingLanguage; label: string }[] = [
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'go', label: 'Go' },
];

const DURATIONS = [15, 30, 45, 60];

export default function InterviewSetupPage() {
    const router = useRouter();
    const startSession = useInterviewStore((s) => s.startSession);

    const [role, setRole] = useState(ROLES[0]);
    const [company, setCompany] = useState('');
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
    const [language, setLanguage] = useState<ProgrammingLanguage>('python');
    const [duration, setDuration] = useState(30);
    const [isStarting, setIsStarting] = useState(false);

    const handleStart = () => {
        setIsStarting(true);

        const config: InterviewConfig = {
            type: 'technical',
            role,
            company: company || undefined,
            difficulty,
            language,
            durationMinutes: duration,
        };

        startSession(config);

        // Navigate to the interview session
        setTimeout(() => {
            router.push('/interview/session');
        }, 600);
    };

    return (
        <main className="min-h-screen flex flex-col">
            {/* Setup Form */}
            <div className="flex-1 flex items-center justify-center px-6 pt-8 pb-16">
                <div
                    className={`w-full max-w-2xl transition-all duration-700 ${isStarting
                        ? 'opacity-0 scale-95 translate-y-4'
                        : 'opacity-100 scale-100 translate-y-0'
                        }`}
                >
                    <div className="text-center mb-10">
                        <h1 className="font-[var(--font-display)] text-3xl sm:text-4xl font-bold mb-3 tracking-tight text-white">
                            Configure Your{' '}
                            <span className="text-[var(--accent)]">Interview</span>
                        </h1>
                        <p className="text-[var(--muted)]">
                            Set up a technical mock interview tailored to your needs.
                        </p>
                    </div>

                    <div className="card space-y-8 p-8">
                        {/* Role Selection */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2 ml-1">
                                Target Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="input-field"
                            >
                                {ROLES.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Company (optional) */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2 ml-1">
                                Target Company{' '}
                                <span className="text-[var(--muted)] opacity-70 normal-case tracking-normal">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                placeholder="e.g. Google, Meta, Amazon..."
                                className="input-field"
                            />
                        </div>

                        {/* Difficulty */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3 ml-1">
                                Difficulty
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {DIFFICULTIES.map((d) => (
                                    <button
                                        key={d.value}
                                        onClick={() => setDifficulty(d.value)}
                                        className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${difficulty === d.value
                                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_15px_var(--accent-glow)]'
                                            : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--muted)] hover:bg-[var(--surface-hover)]'
                                            }`}
                                    >
                                        <div className={`font-[var(--font-display)] font-semibold text-sm mb-1 ${difficulty === d.value ? 'text-white' : 'text-[var(--foreground)]'}`}>
                                            {d.label}
                                        </div>
                                        <div className="text-xs text-[var(--muted)] leading-snug">
                                            {d.desc}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Language */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3 ml-1">
                                Programming Language
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.value}
                                        onClick={() => setLanguage(lang.value)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border ${language === lang.value
                                            ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]'
                                            : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-white'
                                            }`}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Duration */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3 ml-1">
                                Session Duration
                            </label>
                            <div className="flex gap-3">
                                {DURATIONS.map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setDuration(d)}
                                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border ${duration === d
                                            ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]'
                                            : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-white'
                                            }`}
                                    >
                                        {d} min
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="rounded-xl bg-[var(--background)] border border-[var(--border)] p-5">
                            <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-4 font-semibold">
                                Session Preview
                            </div>
                            <div className="grid grid-cols-2 gap-y-3 text-sm">
                                <span className="text-[var(--muted)]">Type</span>
                                <span className="text-right font-medium text-white">Technical</span>
                                <span className="text-[var(--muted)]">Role</span>
                                <span className="text-right font-medium text-white">{role}</span>
                                {company && (
                                    <>
                                        <span className="text-[var(--muted)]">Company</span>
                                        <span className="text-right font-medium text-white">{company}</span>
                                    </>
                                )}
                                <span className="text-[var(--muted)]">Difficulty</span>
                                <span className="text-right font-medium capitalize text-white">
                                    {difficulty}
                                </span>
                                <span className="text-[var(--muted)]">Language</span>
                                <span className="text-right font-medium capitalize text-white">
                                    {language}
                                </span>
                                <span className="text-[var(--muted)]">Duration</span>
                                <span className="text-right font-medium text-white">{duration} min</span>
                            </div>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={handleStart}
                            disabled={isStarting}
                            className="btn-primary w-full py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isStarting ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin">⏳</span> Loading
                                    Interview...
                                </span>
                            ) : (
                                '🎙️ Start Interview'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
