'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBehavioralStore } from '@/stores/behavioral-store';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { useTTS } from '@/hooks/useTTS';
import type {
    BehavioralMessage,
    BehavioralChecklistItem,
} from '@/types/behavioral';
import { v4 as uuidv4 } from 'uuid';

// =====================================================
// Behavioral Interview Session Page
// Full-width chat with voice input — no code editor
// =====================================================

const ScoreCard = ({ label, score }: { label: string; score: number }) => (
    <div className="card p-4 text-center flex flex-col items-center justify-center gap-2 border border-[oklch(1_0_0/0.05)] bg-[oklch(0.12_0.02_260)]">
        <span className="text-[10px] text-[oklch(0.5_0.01_260)] uppercase tracking-wider font-semibold">{label}</span>
        <span className="text-3xl font-bold text-[oklch(0.8_0.01_260)]">
            {score}<span className="text-lg text-[oklch(0.3_0.01_260)]">/5</span>
        </span>
    </div>
);

const CheckItem = ({ label, item }: { label: string; item: BehavioralChecklistItem }) => (
    <li className="space-y-1">
        <div className="flex items-start gap-3 text-sm">
            <div className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center border ${item.passed ? 'bg-[oklch(0.6_0.15_150)] border-[oklch(0.6_0.15_150)] text-black' : 'border-[oklch(0.3_0.02_260)] text-transparent'}`}>
                <svg viewBox="0 0 14 14" fill="none" className="w-2.5 h-2.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 7.5 6 10.5 11 3.5" />
                </svg>
            </div>
            <span className={item.passed ? 'text-[oklch(0.7_0.01_260)]' : 'text-[oklch(0.4_0.01_260)] line-through'}>
                {label}
            </span>
        </div>
        {item.passed && item.evidence && (
            <p className="ml-7 text-[10px] text-[oklch(0.55_0.05_250)] italic leading-snug border-l-2 border-[oklch(0.55_0.05_250/0.4)] pl-2">
                &quot;{item.evidence}&quot;
            </p>
        )}
    </li>
);

function BehavioralSessionContent() {
    const router = useRouter();
    const {
        session,
        feedback,
        setPhase,
        addMessage,
        setFeedback,
        endSession,
    } = useBehavioralStore();

    const [isThinking, setIsThinking] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [candidateInput, setCandidateInput] = useState('');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const { speak } = useTTS({
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
    });

    const chatEndRef = useRef<HTMLDivElement>(null);
    const hasStarted = useRef(false);

    // ── Voice input ──
    const {
        isListening,
        isSupported: speechSupported,
        interimTranscript,
        toggleListening,
    } = useSpeechInput({
        onStop: (fullTranscript) => {
            if (fullTranscript.trim()) {
                handleSend(fullTranscript.trim());
            }
        },
    });

    // Space to toggle mic (not in inputs)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.code !== 'Space' || !speechSupported) return;
            const active = document.activeElement as HTMLElement | null;
            if (
                !active ||
                active.tagName.toLowerCase() === 'input' ||
                active.tagName.toLowerCase() === 'textarea' ||
                active.isContentEditable
            ) return;
            e.preventDefault();
            toggleListening();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [speechSupported, toggleListening]);

    // ── Redirect if no session ──
    useEffect(() => {
        if (!session) {
            router.push('/behavioral/setup');
        }
    }, [session, router]);

    // ── Timer ──
    useEffect(() => {
        if (!session || session.phase === 'debrief') return;
        const timer = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - session.startedAt) / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, [session]);

    // ── Auto-scroll ──
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [session?.messages, isThinking]);

    // ── Helpers ──
    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const callAPI = useCallback(
        async (url: string, body: object) => {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                return await res.json();
            } catch (err) {
                console.error(`API call failed: ${url}`, err);
                return null;
            }
        },
        []
    );

    const interviewerSay = useCallback(
        async (text: string, type: BehavioralMessage['type']) => {
            const msg: BehavioralMessage = {
                id: uuidv4(),
                role: 'interviewer',
                content: text,
                timestamp: Date.now(),
                type,
            };
            addMessage(msg);
            await speak(text);
        },
        [addMessage, speak]
    );

    // Stream response from behavioral API
    const streamResponse = useCallback(
        async (action: string, extraMsg?: BehavioralMessage): Promise<string> => {
            if (!session) return '';

            const allMessages = extraMsg
                ? [...session.messages, extraMsg]
                : session.messages;

            const res = await fetch('/api/behavioral/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: session.config,
                    messages: allMessages,
                    action,
                }),
            });

            if (!res.ok || !res.body) return '';

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                for (const line of chunk.split('\n')) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') break;
                        try {
                            const { text } = JSON.parse(data);
                            if (text) fullText += text;
                        } catch { }
                    }
                }
            }

            return fullText.trim();
        },
        [session]
    );

    // ── Start interview ──
    useEffect(() => {
        if (!session || hasStarted.current) return;
        hasStarted.current = true;

        (async () => {
            setIsThinking(true);

            // 1. Greeting
            const greetingData = await callAPI('/api/behavioral/greeting', {
                config: session.config,
            });
            if (greetingData?.greeting) {
                await interviewerSay(greetingData.greeting, 'greeting');
            }

            // 2. First question
            setPhase('questioning');
            const firstQ = await streamResponse('first_question');
            if (firstQ) {
                await interviewerSay(firstQ, 'question');
            }

            setIsThinking(false);
        })();
    }, [session, callAPI, interviewerSay, setPhase, streamResponse]);

    // ── Handle candidate message ──
    const handleSend = async (text?: string) => {
        const content = (text || candidateInput).trim();
        if (!content || !session) return;

        const candidateMsg: BehavioralMessage = {
            id: uuidv4(),
            role: 'candidate',
            content,
            timestamp: Date.now(),
            type: 'answer',
        };
        addMessage(candidateMsg);

        setCandidateInput('');
        setIsThinking(true);

        const response = await streamResponse('follow_up', candidateMsg);
        if (response) {
            await interviewerSay(response, 'follow_up');
        }

        setIsThinking(false);
    };

    // ── End interview ──
    const handleEndInterview = async () => {
        if (!session) return;

        setIsThinking(true);

        // Wrap-up message
        const wrapUp = await streamResponse('wrap_up');
        if (wrapUp) {
            await interviewerSay(wrapUp, 'feedback');
        }

        endSession();

        // Generate feedback
        const feedbackData = await callAPI('/api/behavioral/feedback', {
            config: session.config,
            messages: session.messages,
        });

        if (feedbackData) {
            setFeedback({ sessionId: session.id, ...feedbackData });
            // Fire-and-forget save to Supabase
            fetch('/api/sessions/behavioral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session: { ...session, phase: 'debrief', endedAt: Date.now() },
                    feedback: { ...feedbackData, sessionId: session.id },
                }),
            }).catch(console.error);
        }

        setIsThinking(false);
    };

    if (!session) return null;

    const modeLabel =
        session.config.mode === 'resume_grill'
            ? '🔬 Resume Grill'
            : session.config.mode === 'behavioral'
                ? '💬 Behavioral'
                : '🔀 Mixed';

    const totalSeconds = session.config.durationMinutes * 60;
    const timeLeft = totalSeconds - elapsedSeconds;
    const isOvertime = timeLeft < 0;

    // ═══════════════════════════════════════
    // DEBRIEF VIEW
    // ═══════════════════════════════════════
    if (session.phase === 'debrief' && feedback) {
        const decisionColor =
            feedback.decision === 'Strong Hire'
                ? 'oklch(0.72_0.17_165)'
                : feedback.decision === 'Hire'
                    ? 'oklch(0.72_0.17_165)'
                    : 'oklch(0.63_0.22_25)';

        const isResumeMode = session.config.mode !== 'behavioral';

        return (
            <main className="min-h-screen flex flex-col overflow-y-auto">
                <nav className="glass-strong fixed top-0 inset-x-0 z-50 px-6 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2">
                            <span className="text-2xl">🤖</span>
                            <span className="font-[var(--font-display)] text-xl font-bold gradient-text">
                                InterviewerAI
                            </span>
                        </Link>
                        <span className="text-sm text-[oklch(0.5_0.01_260)]">
                            Behavioral Debrief
                        </span>
                    </div>
                </nav>

                <div className="flex-1 max-w-5xl mx-auto w-full px-6 pt-28 pb-16 space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <h1 className="font-[var(--font-display)] text-3xl sm:text-4xl font-bold">
                            Interview <span className="gradient-text">Complete</span>
                        </h1>
                        <div className="flex items-center justify-center gap-4 flex-wrap">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `color-mix(in oklch, ${decisionColor}, transparent 85%)`, color: decisionColor }}>
                                {feedback.decision}
                            </span>
                            <span className="text-4xl font-bold text-[oklch(0.85_0.01_260)]">
                                {feedback.overallScore}<span className="text-xl text-[oklch(0.3_0.01_260)]">/10</span>
                            </span>
                        </div>
                    </div>

                    {/* Scores */}
                    <div className="grid grid-cols-5 gap-3">
                        <ScoreCard label="Communication" score={feedback.scores.communication} />
                        <ScoreCard label="Storytelling" score={feedback.scores.storytelling} />
                        <ScoreCard label="Technical Depth" score={feedback.scores.technicalDepth} />
                        <ScoreCard label="Self-Awareness" score={feedback.scores.selfAwareness} />
                        <ScoreCard label="Leadership" score={feedback.scores.leadershipTeamwork} />
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 items-start">
                        {/* Report */}
                        <div className="md:col-span-2 card p-6 bg-[oklch(0.12_0.02_260)]/50">
                            <h2 className="font-[var(--font-display)] font-semibold text-lg mb-4 text-[oklch(0.8_0.01_260)] flex items-center gap-2">
                                <span className="text-xl">📝</span> Interviewer Report
                            </h2>
                            <div className="text-[oklch(0.7_0.01_260)] leading-relaxed whitespace-pre-wrap text-sm font-sans">
                                {feedback.report}
                            </div>
                        </div>

                        {/* Checklists */}
                        <div className="space-y-4">
                            {/* Answer Quality */}
                            <div className="card p-5 bg-[oklch(0.12_0.02_260)]/50">
                                <h3 className="font-[var(--font-display)] font-semibold text-xs uppercase tracking-wider mb-4 text-[oklch(0.6_0.05_250)]">
                                    Answer Quality
                                </h3>
                                <ul className="space-y-3">
                                    <CheckItem label="Gave specific examples" item={feedback.checklists.answerQuality.gaveSpecificExamples} />
                                    <CheckItem label="Used STAR structure" item={feedback.checklists.answerQuality.usedSTARStructure} />
                                    <CheckItem label="Quantified impact" item={feedback.checklists.answerQuality.quantifiedImpact} />
                                    <CheckItem label="Showed ownership" item={feedback.checklists.answerQuality.showedOwnership} />
                                    <CheckItem label="Addressed follow-ups" item={feedback.checklists.answerQuality.addressedFollowUps} />
                                </ul>
                            </div>

                            {/* Resume Depth (only for resume/mixed modes) */}
                            {isResumeMode && (
                                <div className="card p-5 bg-[oklch(0.12_0.02_260)]/50">
                                    <h3 className="font-[var(--font-display)] font-semibold text-xs uppercase tracking-wider mb-4 text-[oklch(0.6_0.05_250)]">
                                        Resume Depth
                                    </h3>
                                    <ul className="space-y-3">
                                        <CheckItem label="Technical accuracy" item={feedback.checklists.resumeDepth.technicalAccuracy} />
                                        <CheckItem label="Depth of understanding" item={feedback.checklists.resumeDepth.depthOfUnderstanding} />
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4 justify-center pt-8 border-t border-[oklch(1_0_0/0.05)]">
                        <Link href="/behavioral/setup" className="btn-primary">
                            Practice Again
                        </Link>
                        <Link href="/" className="btn-secondary">
                            Back Home
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // ═══════════════════════════════════════
    // INTERVIEW SESSION VIEW
    // ═══════════════════════════════════════
    return (
        <main className="min-h-screen flex flex-col">
            {/* Nav */}
            <nav className="glass-strong fixed top-0 inset-x-0 z-50 px-4 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2">
                            <span className="text-xl">🤖</span>
                            <span className="font-[var(--font-display)] text-lg font-bold gradient-text hidden sm:inline">
                                InterviewerAI
                            </span>
                        </Link>
                        <span className="text-xs px-2 py-0.5 rounded bg-[oklch(0.22_0.02_260)] text-[oklch(0.72_0.17_165)]">
                            {modeLabel}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Timer */}
                        <span className={`font-mono text-sm ${isOvertime ? 'text-[oklch(0.63_0.22_25)]' : timeLeft < 120 ? 'text-[oklch(0.75_0.18_85)]' : 'text-[oklch(0.5_0.01_260)]'}`}>
                            {isOvertime ? `+${formatTime(Math.abs(timeLeft))}` : formatTime(timeLeft)}
                        </span>
                        <button
                            onClick={handleEndInterview}
                            disabled={isThinking}
                            className="text-xs px-3 py-1.5 rounded-lg bg-[oklch(0.22_0.08_25/0.3)] text-[oklch(0.75_0.18_25)] border border-[oklch(0.75_0.18_25/0.3)] hover:bg-[oklch(0.22_0.08_25/0.5)] transition-all disabled:opacity-40"
                        >
                            End Interview
                        </button>
                    </div>
                </div>
            </nav>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col pt-16 max-w-3xl mx-auto w-full">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                    {session.messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'interviewer'
                                    ? 'bg-[oklch(0.18_0.02_260)] border border-[oklch(1_0_0/0.06)] text-[oklch(0.82_0.01_260)]'
                                    : 'bg-[oklch(0.35_0.12_250)] text-white'
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {/* Thinking indicator */}
                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="bg-[oklch(0.18_0.02_260)] border border-[oklch(1_0_0/0.06)] rounded-2xl px-4 py-3">
                                <div className="flex gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[oklch(0.4_0.01_260)] animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 rounded-full bg-[oklch(0.4_0.01_260)] animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 rounded-full bg-[oklch(0.4_0.01_260)] animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Speaking indicator */}
                    {isSpeaking && !isThinking && (
                        <div className="flex justify-start">
                            <div className="text-[10px] text-[oklch(0.4_0.01_260)] flex items-center gap-2 px-2">
                                <span className="animate-pulse">🔊</span> Speaking...
                            </div>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="px-4 py-3 border-t border-[oklch(1_0_0/0.06)] space-y-2">
                    {/* Voice recording overlay */}
                    {isListening ? (
                        <div className="flex items-center gap-3">
                            {speechSupported && (
                                <button
                                    onClick={toggleListening}
                                    className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-[oklch(0.63_0.22_25)] animate-pulse"
                                    title="Stop recording (Space)"
                                >
                                    ⏹
                                </button>
                            )}
                            <div className="flex-1 min-h-[40px] rounded-xl bg-[oklch(0.18_0.02_260)] border border-[oklch(0.63_0.22_25/0.5)] px-4 py-2 flex items-center">
                                <span className="text-sm text-[oklch(0.75_0.01_260)] italic leading-snug">
                                    {interimTranscript
                                        ? `"${interimTranscript}…"`
                                        : <span className="text-[oklch(0.4_0.01_260)]">Listening… speak now</span>
                                    }
                                </span>
                            </div>
                            <span className="text-[10px] text-[oklch(0.35_0.01_260)] shrink-0">Space<br />to stop</span>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            {speechSupported && (
                                <button
                                    onClick={toggleListening}
                                    className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-[oklch(0.22_0.02_260)] hover:bg-[oklch(0.28_0.02_260)]"
                                    title="Start speaking (Space)"
                                >
                                    🎙
                                </button>
                            )}
                            <input
                                type="text"
                                value={candidateInput}
                                onChange={(e) => setCandidateInput(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && !e.shiftKey && handleSend()
                                }
                                placeholder="Type a response, or press Space to speak…"
                                className="input-field flex-1 py-2 text-sm"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!candidateInput.trim() || isThinking}
                                className="btn-primary px-4 py-2 text-sm shrink-0 disabled:opacity-40"
                            >
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

export default function BehavioralSessionPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading Session...</div>}>
            <BehavioralSessionContent />
        </Suspense>
    );
}
