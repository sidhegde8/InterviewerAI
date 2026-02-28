'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useBehavioralStore } from '@/stores/behavioral-store';
import type { BehavioralConfig, BehavioralMode } from '@/types/behavioral';
import { extractTextFromPDF } from '@/lib/resume-parser';

const ROLES = [
    'Software Engineer',
    'Frontend Engineer',
    'Backend Engineer',
    'Full-Stack Engineer',
    'Machine Learning Engineer',
    'Data Engineer',
    'DevOps / SRE',
    'Mobile Engineer',
    'Product Manager',
    'Engineering Manager',
];

const MODES: { value: BehavioralMode; icon: string; label: string; desc: string }[] = [
    {
        value: 'resume_grill',
        icon: '🔬',
        label: 'Resume Grill',
        desc: 'Technical deep-dive into your projects, internships, and work experience. The AI will challenge your claims.',
    },
    {
        value: 'behavioral',
        icon: '💬',
        label: 'Behavioral',
        desc: 'Classic behavioral questions — "Tell me about a time…", strengths, weaknesses, conflict resolution.',
    },
    {
        value: 'mixed',
        icon: '🔀',
        label: 'Mixed',
        desc: 'A blend of resume probing and behavioral questions interleaved, like a real phone screen.',
    },
];

const DURATIONS = [15, 20, 30, 45];

export default function BehavioralSetupPage() {
    const router = useRouter();
    const startSession = useBehavioralStore((s) => s.startSession);

    const [mode, setMode] = useState<BehavioralMode>('mixed');
    const [role, setRole] = useState(ROLES[0]);
    const [company, setCompany] = useState('');
    const [duration, setDuration] = useState(20);
    const [isStarting, setIsStarting] = useState(false);

    // Resume state
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [resumeText, setResumeText] = useState<string | null>(null);
    const [isParsingResume, setIsParsingResume] = useState(false);
    const [resumeError, setResumeError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const requiresResume = mode === 'resume_grill';
    const showResumeUpload = mode !== 'behavioral';

    const handleFileSelect = useCallback(async (file: File) => {
        if (file.type !== 'application/pdf') {
            setResumeError('Please upload a PDF file.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setResumeError('File too large. Maximum 10MB.');
            return;
        }

        setResumeFile(file);
        setResumeError(null);
        setIsParsingResume(true);

        try {
            const text = await extractTextFromPDF(file);
            if (!text || text.length < 50) {
                setResumeError('Could not extract text from this PDF. Try a different file.');
                setResumeText(null);
            } else {
                setResumeText(text);
            }
        } catch {
            setResumeError('Failed to parse PDF. Please try a different file.');
            setResumeText(null);
        } finally {
            setIsParsingResume(false);
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFileSelect(file);
        },
        [handleFileSelect]
    );

    const handleStart = () => {
        if (requiresResume && !resumeText) return;

        setIsStarting(true);

        const config: BehavioralConfig = {
            mode,
            role,
            company: company || undefined,
            durationMinutes: duration,
            resumeText: resumeText,
        };

        startSession(config);

        setTimeout(() => {
            router.push('/behavioral/session');
        }, 600);
    };

    const canStart = !isStarting && !(requiresResume && !resumeText);

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
                            Behavioral{' '}
                            <span className="text-[var(--accent)]">Interview</span>
                        </h1>
                        <p className="text-[var(--muted)]">
                            Practice behavioral questions, resume deep-dives, or a mix of both.
                        </p>
                    </div>

                    <div className="card space-y-8 p-8">
                        {/* Mode Selection */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3 ml-1">
                                Interview Mode
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {MODES.map((m) => (
                                    <button
                                        key={m.value}
                                        onClick={() => setMode(m.value)}
                                        className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${mode === m.value
                                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_15px_var(--accent-glow)]'
                                            : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--muted)] hover:bg-[var(--surface-hover)]'
                                            }`}
                                    >
                                        <div className="text-2xl mb-2">{m.icon}</div>
                                        <div className={`font-[var(--font-display)] font-semibold text-sm mb-1 ${mode === m.value ? 'text-white' : 'text-[var(--foreground)]'}`}>
                                            {m.label}
                                        </div>
                                        <div className="text-[10px] text-[var(--muted)] leading-snug">
                                            {m.desc}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Resume Upload */}
                        {showResumeUpload && (
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2 ml-1">
                                    Resume Upload{' '}
                                    {requiresResume ? (
                                        <span className="text-red-400 normal-case tracking-normal opacity-90">(required)</span>
                                    ) : (
                                        <span className="text-[var(--muted)] normal-case tracking-normal opacity-70">(optional — enables resume-specific questions)</span>
                                    )}
                                </label>
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={(e) => e.preventDefault()}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${resumeText
                                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                                        : resumeError
                                            ? 'border-red-500/50 bg-red-500/5'
                                            : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--muted)] hover:bg-[var(--surface-hover)]'
                                        }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileSelect(file);
                                        }}
                                    />

                                    {isParsingResume ? (
                                        <div className="text-[var(--muted)] font-medium text-sm">
                                            <span className="animate-spin inline-block mr-2">⏳</span>
                                            Parsing resume...
                                        </div>
                                    ) : resumeText ? (
                                        <div>
                                            <div className="text-[var(--accent)] font-medium text-sm mb-1">
                                                ✅ {resumeFile?.name}
                                            </div>
                                            <div className="text-[10px] text-[var(--muted)] font-medium">
                                                {resumeText.length.toLocaleString()} characters extracted — click to replace
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="text-3xl mb-2">📄</div>
                                            <div className="text-sm font-medium text-[var(--muted)]">
                                                Drop your resume PDF here or click to upload
                                            </div>
                                            <div className="text-[10px] uppercase tracking-wide font-semibold text-[var(--muted)] mt-1 opacity-70">
                                                PDF only — max 10MB
                                            </div>
                                        </div>
                                    )}

                                    {resumeError && (
                                        <div className="text-xs text-red-400 font-medium mt-2">
                                            ⚠ {resumeError}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

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
                                <span className="text-[var(--muted)]">Mode</span>
                                <span className="text-right font-medium capitalize text-white">
                                    {MODES.find((m) => m.value === mode)?.label}
                                </span>
                                <span className="text-[var(--muted)]">Role</span>
                                <span className="text-right font-medium text-white">{role}</span>
                                {company && (
                                    <>
                                        <span className="text-[var(--muted)]">Company</span>
                                        <span className="text-right font-medium text-white">{company}</span>
                                    </>
                                )}
                                <span className="text-[var(--muted)]">Resume</span>
                                <span className="text-right font-medium text-white">
                                    {resumeText ? '✅ Uploaded' : 'None'}
                                </span>
                                <span className="text-[var(--muted)]">Duration</span>
                                <span className="text-right font-medium text-white">{duration} min</span>
                            </div>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={handleStart}
                            disabled={!canStart}
                            className="btn-primary w-full py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isStarting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin">⏳</span> Loading
                                    Interview...
                                </span>
                            ) : requiresResume && !resumeText ? (
                                '📄 Upload resume to continue'
                            ) : (
                                '🎙️ Start Behavioral Interview'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
