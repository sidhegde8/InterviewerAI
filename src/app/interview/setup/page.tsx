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
                        <h1 className="font-[var(--font-display)] text-3xl sm:text-4xl font-bold mb-3">
                            Configure Your{' '}
                            <span className="gradient-text">Interview</span>
                        </h1>
                        <p className="text-[oklch(0.55_0.01_260)]">
                            Set up a technical mock interview tailored to your needs.
                        </p>
                    </div>

                    <div className="card space-y-8 p-8">
                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-[oklch(0.7_0.01_260)] mb-2">
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
                            <label className="block text-sm font-medium text-[oklch(0.7_0.01_260)] mb-2">
                                Target Company{' '}
                                <span className="text-[oklch(0.4_0.01_260)]">(optional)</span>
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
                            <label className="block text-sm font-medium text-[oklch(0.7_0.01_260)] mb-3">
                                Difficulty
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {DIFFICULTIES.map((d) => (
                                    <button
                                        key={d.value}
                                        onClick={() => setDifficulty(d.value)}
                                        className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${difficulty === d.value
                                            ? 'border-[oklch(0.55_0.18_250/0.6)] bg-[oklch(0.55_0.18_250/0.1)] glow-brand'
                                            : 'border-[oklch(1_0_0/0.08)] bg-[oklch(0.13_0.02_260)] hover:border-[oklch(1_0_0/0.15)]'
                                            }`}
                                    >
                                        <div className="font-[var(--font-display)] font-semibold text-sm mb-1">
                                            {d.label}
                                        </div>
                                        <div className="text-xs text-[oklch(0.5_0.01_260)] leading-snug">
                                            {d.desc}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Language */}
                        <div>
                            <label className="block text-sm font-medium text-[oklch(0.7_0.01_260)] mb-2">
                                Programming Language
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.value}
                                        onClick={() => setLanguage(lang.value)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${language === lang.value
                                            ? 'bg-[oklch(0.55_0.18_250)] text-white'
                                            : 'bg-[oklch(0.22_0.02_260)] text-[oklch(0.7_0.01_260)] hover:bg-[oklch(0.28_0.02_260)]'
                                            }`}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Duration */}
                        <div>
                            <label className="block text-sm font-medium text-[oklch(0.7_0.01_260)] mb-2">
                                Session Duration
                            </label>
                            <div className="flex gap-3">
                                {DURATIONS.map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setDuration(d)}
                                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${duration === d
                                            ? 'bg-[oklch(0.55_0.18_250)] text-white'
                                            : 'bg-[oklch(0.22_0.02_260)] text-[oklch(0.7_0.01_260)] hover:bg-[oklch(0.28_0.02_260)]'
                                            }`}
                                    >
                                        {d} min
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="rounded-xl bg-[oklch(0.13_0.02_260)] border border-[oklch(1_0_0/0.06)] p-4">
                            <div className="text-xs text-[oklch(0.5_0.01_260)] uppercase tracking-wider mb-3 font-medium">
                                Session Preview
                            </div>
                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <span className="text-[oklch(0.5_0.01_260)]">Type</span>
                                <span className="text-right font-medium">Technical</span>
                                <span className="text-[oklch(0.5_0.01_260)]">Role</span>
                                <span className="text-right font-medium">{role}</span>
                                {company && (
                                    <>
                                        <span className="text-[oklch(0.5_0.01_260)]">Company</span>
                                        <span className="text-right font-medium">{company}</span>
                                    </>
                                )}
                                <span className="text-[oklch(0.5_0.01_260)]">Difficulty</span>
                                <span className="text-right font-medium capitalize">
                                    {difficulty}
                                </span>
                                <span className="text-[oklch(0.5_0.01_260)]">Language</span>
                                <span className="text-right font-medium capitalize">
                                    {language}
                                </span>
                                <span className="text-[oklch(0.5_0.01_260)]">Duration</span>
                                <span className="text-right font-medium">{duration} min</span>
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
