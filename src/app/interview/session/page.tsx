'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInterviewStore } from '@/stores/interview-store';
import { useTTS } from '@/hooks/useTTS';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { useDIDAvatar } from '@/hooks/useDIDAvatar';
import type { Message } from '@/types/interview';
import { v4 as uuidv4 } from 'uuid';

// Use standard import instead of next/dynamic to avoid Vercel edge/lambda compilation issues
import MonacoEditor from '@monaco-editor/react';

const LANG_MONACO: Record<string, string> = {
    python: 'python',
    javascript: 'javascript',
    typescript: 'typescript',
    java: 'java',
    cpp: 'cpp',
    go: 'go',
};

//  Avatar Component (Animated gradient  no D-ID) 
function AvatarPanel({ isSpeaking, isThinking }: { isSpeaking: boolean; isThinking: boolean }) {
    return (
        <div className="flex flex-col items-center gap-4 py-6 px-4 border-b border-[oklch(1_0_0/0.06)]">
            <div className="relative">
                {isSpeaking && (
                    <>
                        <div className="absolute -inset-3 rounded-full border-2 border-[oklch(0.55_0.18_250/0.4)] animate-ping" style={{ animationDuration: '1.8s' }} />
                        <div className="absolute -inset-5 rounded-full border border-[oklch(0.55_0.18_250/0.15)] animate-ping" style={{ animationDuration: '1.8s', animationDelay: '0.6s' }} />
                    </>
                )}
                <div
                    className={`w-24 h-24 rounded-full relative shadow-2xl transition-all duration-500 ${isSpeaking ? 'shadow-[0_0_30px_oklch(0.55_0.18_250/0.5)]' : ''}`}
                    style={{
                        background: isSpeaking
                            ? 'conic-gradient(from 0deg, oklch(0.55 0.18 250), oklch(0.48 0.2 280), oklch(0.62 0.15 230), oklch(0.55 0.18 250))'
                            : 'conic-gradient(from 180deg, oklch(0.35 0.08 260), oklch(0.28 0.06 240), oklch(0.38 0.09 270), oklch(0.35 0.08 260))',
                    }}
                >
                    <div className="absolute inset-1 rounded-full bg-[oklch(0.15_0.03_260)] flex flex-col items-center justify-center gap-0.5">
                        <span className="text-2xl font-bold font-[var(--font-display)] text-white">AI</span>
                        <span className="text-[8px] font-medium text-[oklch(0.6_0.08_250)] tracking-widest uppercase">Alex</span>
                    </div>
                    {isSpeaking && (
                        <div className="absolute -inset-0.5 rounded-full animate-spin" style={{ background: 'conic-gradient(from 0deg, transparent 60%, oklch(0.72 0.17 165), transparent)', animationDuration: '3s' }} />
                    )}
                </div>
                <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[oklch(0.15_0.03_260)] ${isSpeaking ? 'bg-[oklch(0.72_0.17_165)]' : isThinking ? 'bg-[oklch(0.75_0.18_85)] animate-pulse' : 'bg-[oklch(0.45_0.01_260)]'}`} />
            </div>

            <div className="text-center space-y-1.5">
                <div className="font-[var(--font-display)] font-semibold text-sm tracking-wide">Alex &mdash; AI Interviewer</div>
                {isSpeaking ? (
                    <div className="flex items-center justify-center gap-0.5 h-4">
                        {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7].map((h, i) => (
                            <div key={i} className="w-0.5 rounded-full bg-[oklch(0.55_0.18_250)] animate-pulse"
                                style={{ height: `${h * 100}%`, animationDelay: `${i * 0.12}s`, animationDuration: '0.8s' }} />
                        ))}
                    </div>
                ) : (
                    <div className="text-xs text-[oklch(0.5_0.01_260)]">
                        {isThinking ? 'Thinking...' : 'Listening'}
                    </div>
                )}
            </div>
        </div>
    );
}



//  Run Result Component 
interface RunResult {
    success: boolean;
    output: string;
    error?: string;
    executionTime?: string;
    statusDescription: string;
}

function RunResultPanel({ result }: { result: RunResult | null }) {
    if (!result) return null;
    return (
        <div
            className={`mx-3 mb-2 rounded-lg p-3 text-xs font-mono border ${result.success
                ? 'bg-[oklch(0.15_0.05_145/0.3)] border-[oklch(0.72_0.17_165/0.3)]'
                : 'bg-[oklch(0.15_0.05_25/0.3)] border-[oklch(0.63_0.22_25/0.3)]'
                }`}
        >
            <div className="flex items-center justify-between mb-1.5">
                <span
                    className={
                        result.success
                            ? 'text-[oklch(0.72_0.17_165)]'
                            : 'text-[oklch(0.63_0.22_25)]'
                    }
                >
                    {result.success ? '' : ''} {result.statusDescription}
                </span>
                {result.executionTime && (
                    <span className="text-[oklch(0.5_0.01_260)]">
                        ⏱ {result.executionTime}s
                    </span>
                )}
            </div>
            {result.output && (
                <pre className="text-[oklch(0.80_0.01_260)] whitespace-pre-wrap">
                    {result.output}
                </pre>
            )}
            {result.error && (
                <pre className="text-[oklch(0.70_0.15_25)] whitespace-pre-wrap">
                    {result.error}
                </pre>
            )}
        </div>
    );
}

//  Main Session Page 


export default function InterviewSessionPage() {
    const router = useRouter();
    const session = useInterviewStore((s) => s.session);
    const feedback = useInterviewStore((s) => s.feedback);
    const setPhase = useInterviewStore((s) => s.setPhase);
    const addMessage = useInterviewStore((s) => s.addMessage);
    const setProblem = useInterviewStore((s) => s.setProblem);
    const setFeedback = useInterviewStore((s) => s.setFeedback);
    const endSession = useInterviewStore((s) => s.endSession);

    const [code, setCode] = useState('');
    const [typedProblem, setTypedProblem] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [candidateInput, setCandidateInput] = useState('');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [runResult, setRunResult] = useState<RunResult | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [isRequestingHint, setIsRequestingHint] = useState(false);

    const { speak, stop: stopSpeaking } = useTTS({
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
    });

    const chatEndRef = useRef<HTMLDivElement>(null);
    const hasStarted = useRef(false);

    // D-ID avatar (disabled by default unless DID_ENABLED=true in .env.local)
    const avatar = useDIDAvatar({
        onStatusChange: (s) => {
            if (s === 'speaking') setIsSpeaking(true);
            else if (s === 'connected') setIsSpeaking(false);
        },
    });


    const {
        isListening,
        isSupported: speechSupported,
        interimTranscript,
        toggleListening,
    } = useSpeechInput({
        onStop: (fullTranscript) => {
            // When user stops mic (Ctrl+Space or button), auto-send everything they said
            if (fullTranscript.trim()) {
                handleSend(fullTranscript.trim());
            }
        },
    });

    // Ctrl+Space toggles the mic
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.code !== 'Space' || !speechSupported) return;
            const active = document.activeElement as HTMLElement | null;
            // Never intercept Space when focus is inside an input, textarea,
            // or anywhere inside the Monaco editor
            if (
                !active ||
                active.tagName.toLowerCase() === 'input' ||
                active.tagName.toLowerCase() === 'textarea' ||
                active.isContentEditable ||
                active.closest('.monaco-editor')
            ) return;
            e.preventDefault();
            toggleListening();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [speechSupported, toggleListening]);

    // Redirect if no session
    useEffect(() => {
        if (!session) {
            router.push('/interview/setup');
        }
    }, [session, router]);

    // Auto-connect D-ID avatar when session is available
    useEffect(() => {
        if (!session) return;
        (async () => {
            try {
                const res = await fetch('/api/avatar/available');
                const { available } = await res.json();
                if (available) {
                    avatar.connect();
                }
            } catch {
                // D-ID not configured  silently skip
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.id]);


    // Timer
    useEffect(() => {
        if (!session || session.phase === 'debrief') return;
        const timer = setInterval(() => setElapsedSeconds((p) => p + 1), 1000);
        return () => clearInterval(timer);
    }, [session]);

    // Warn when approaching limit
    const timeLimit = (session?.config.durationMinutes || 30) * 60;
    const timeWarning =
        elapsedSeconds > 0 &&
        elapsedSeconds >= timeLimit - 120 &&
        elapsedSeconds < timeLimit;

    // Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [session?.messages, streamingText]);

    //  Typewriter 
    const typeText = useCallback((text: string, onComplete?: () => void) => {
        setIsTyping(true);
        setTypedProblem('');
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                const char = text[i]; // capture by value before i increments
                i++;
                setTypedProblem((prev) => prev + char);
            } else {
                clearInterval(interval);
                setIsTyping(false);
                onComplete?.();
            }
        }, 20);
        return () => clearInterval(interval);
    }, []);

    //  Streaming LLM response 
    const streamResponse = useCallback(
        async (
            action: string,
            extraCode?: string,
            newMessage?: Message // Optional fresh message to append during this render cycle
        ): Promise<string> => {
            if (!session) return '';

            setStreamingText('');
            let fullText = '';

            // Construct up-to-date messages array
            const currentMessages = [...session.messages];
            if (newMessage) {
                currentMessages.push(newMessage);
            }

            try {
                const res = await fetch('/api/interview/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        config: session.config,
                        messages: currentMessages,
                        problem: session.currentProblem,
                        code: extraCode || code,
                        action,
                    }),
                });

                if (!res.ok || !res.body) {
                    throw new Error('Stream failed');
                }

                const reader = res.body.getReader();
                const dec = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = dec.decode(value);
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') break;
                            try {
                                const { text } = JSON.parse(data);
                                if (text) {
                                    fullText += text;
                                    setStreamingText(fullText);
                                }
                            } catch {
                                // ignore parse errors
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Streaming error:', err);
            }

            setStreamingText('');
            return fullText;
        },
        [session, code]
    );

    //  API helper 
    const callAPI = useCallback(async (endpoint: string, body: object) => {
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) return null;
            return await res.json();
        } catch {
            return null;
        }
    }, []);

    //  Speak and add message — awaits TTS completion so callers can sequence messages 
    const interviewerSay = useCallback(
        async (content: string, type: Message['type'] = 'question') => {
            addMessage({ role: 'interviewer', content, type });
            if (avatar.isConnected) {
                avatar.speak(content);
            } else {
                await speak(content); // speak() now resolves when audio ENDS
            }
        },
        [addMessage, speak, avatar]
    );


    //  Request a hint 
    const handleHint = async () => {
        if (!session || isRequestingHint) return;
        setIsRequestingHint(true);
        setIsThinking(true);

        const hintMsg: Message = {
            id: uuidv4(),
            role: 'candidate',
            content: 'Can I get a hint?',
            timestamp: Date.now(),
            type: 'answer'
        };
        addMessage(hintMsg);

        const response = await streamResponse('hint', undefined, hintMsg);
        if (response) {
            await interviewerSay(response, 'hint');
        }

        setIsThinking(false);
        setIsRequestingHint(false);
    };

    //  Start interview — sequential, waits for each TTS to finish before next 
    useEffect(() => {
        if (!session || hasStarted.current) return;
        hasStarted.current = true;

        (async () => {
            setIsThinking(true);

            // 1. Brief greeting
            const greetingData = await callAPI('/api/interview/greeting', {
                config: session.config,
            });
            if (greetingData?.greeting) {
                await interviewerSay(greetingData.greeting, 'greeting');
            }

            // 2. Generate and present the problem
            setPhase('questioning');
            const problemData = await callAPI('/api/interview/problem', {
                config: session.config,
            });

            if (problemData?.problem) {
                const prob = problemData.problem;
                setProblem(prob);
                setPhase('code_share');

                const starterCode = prob.starterCode?.[session.config.language] || '';
                setCode(starterCode);

                // Type out the problem, then prompt the candidate
                typeText(prob.description, async () => {
                    setPhase('candidate_coding');
                    await interviewerSay(
                        "Take your time to read through the problem. Feel free to ask me any clarifying questions before you start.",
                        'question'
                    );
                });
            }

            setIsThinking(false);
        })();
    }, [session, callAPI, interviewerSay, setPhase, setProblem, typeText]);


    //  Handle candidate message 
    const handleSend = async (text?: string) => {
        const content = (text || candidateInput).trim();
        if (!content || !session) return;

        const candidateMsg: Message = {
            id: uuidv4(),
            role: 'candidate',
            content,
            timestamp: Date.now(),
            type: 'answer'
        };
        addMessage(candidateMsg);

        setCandidateInput('');
        setIsThinking(true);

        const response = await streamResponse('follow_up', undefined, candidateMsg);
        if (response) {
            await interviewerSay(response, 'follow_up');
        }

        setIsThinking(false);
    };

    //  Handle code submission 
    const handleSubmitCode = async () => {
        if (!session || !code.trim()) return;

        const candidateMsg: Message = {
            id: uuidv4(),
            role: 'candidate',
            content: `I've completed my solution.`,
            timestamp: Date.now(),
            type: 'answer',
        };
        addMessage(candidateMsg);

        setPhase('follow_up');
        setIsThinking(true);

        const response = await streamResponse('evaluate_code', code, candidateMsg);
        if (response) {
            await interviewerSay(response, 'follow_up');
        }

        setIsThinking(false);
    };

    //  Run code 
    const handleRunCode = async () => {
        if (!session || !code.trim()) return;
        setIsRunning(true);
        setRunResult(null);

        const result = await callAPI('/api/code/run', {
            code,
            language: session.config.language,
        });

        setRunResult(result);
        setIsRunning(false);
    };

    //  End interview 
    const handleEndInterview = async () => {
        if (!session) return;
        stopSpeaking();
        endSession();
        setIsThinking(true);

        const feedbackData = await callAPI('/api/interview/feedback', {
            config: session.config,
            messages: session.messages,
            code,
        });

        if (feedbackData) {
            setFeedback({ sessionId: session.id, ...feedbackData });
            // Fire-and-forget save to Supabase
            fetch('/api/sessions/technical', {
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

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (!session) return null;

    // """""""""""""""""""""""""""""""""""""""""""""""
    // DEBRIEF VIEW
    // """""""""""""""""""""""""""""""""""""""""""""""
    if (session.phase === 'debrief' && feedback) {
        const ScoreCard = ({ label, score }: { label: string; score: number }) => (
            <div className="card p-4 text-center flex flex-col items-center justify-center gap-2 border border-[oklch(1_0_0/0.05)] bg-[oklch(0.12_0.02_260)]">
                <span className="text-[10px] text-[oklch(0.5_0.01_260)] uppercase tracking-wider font-semibold">{label}</span>
                <span className="text-3xl font-bold text-[oklch(0.8_0.01_260)]">
                    {score}<span className="text-lg text-[oklch(0.3_0.01_260)]">/5</span>
                </span>
            </div>
        );

        const ChecklistItem = ({ label, item }: { label: string; item: import('@/types/interview').ChecklistItem }) => (
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
                        "{item.evidence}"
                    </p>
                )}
            </li>
        );

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
                    </div>
                </nav>

                <div className="flex-1 flex flex-col items-center px-6 pt-28 pb-16">
                    <div className="w-full max-w-5xl space-y-8">
                        {/* Header: Score & Decision */}
                        <div className="text-center mb-10">
                            <h1 className="font-[var(--font-display)] text-4xl font-bold mb-4">
                                Decision:{' '}
                                <span className={
                                    feedback.decision === 'Strong Hire' ? 'text-[oklch(0.72_0.17_165)]' :
                                        feedback.decision === 'Hire' ? 'text-[oklch(0.7_0.1_250)]' :
                                            'text-[oklch(0.65_0.2_25)]'
                                }>
                                    {feedback.decision}
                                </span>
                            </h1>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-6xl font-bold gradient-text">
                                    {feedback.overallScore}
                                </span>
                                <span className="text-[oklch(0.4_0.01_260)] text-2xl font-medium">/ 10</span>
                            </div>
                            <p className="text-sm text-[oklch(0.5_0.01_260)] mt-3">
                                Interview Duration: {formatTime(elapsedSeconds)}
                            </p>
                        </div>

                        {/* 1-5 Scores Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <ScoreCard label="Problem Solving" score={feedback.scores.problemSolving} />
                            <ScoreCard label="DSA Knowledge" score={feedback.scores.dsa} />
                            <ScoreCard label="Communication" score={feedback.scores.communication} />
                            <ScoreCard label="Coding Skills" score={feedback.scores.coding} />
                            <ScoreCard label="Speed" score={feedback.scores.speed} />
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 items-start">
                            {/* Detailed Report (Takes up 2 columns) */}
                            <div className="md:col-span-2 card p-6 bg-[oklch(0.12_0.02_260)]/50">
                                <h2 className="font-[var(--font-display)] font-semibold text-lg mb-4 text-[oklch(0.8_0.01_260)] flex items-center gap-2">
                                    <span className="text-xl">📝</span> Interviewer Report
                                </h2>
                                <div className="text-[oklch(0.7_0.01_260)] leading-relaxed whitespace-pre-wrap text-sm font-sans">
                                    {feedback.report}
                                </div>
                            </div>

                            {/* Checklists (Takes up 1 column, stacked) */}
                            <div className="space-y-4">
                                {/* Before Coding */}
                                <div className="card p-5 bg-[oklch(0.12_0.02_260)]/50">
                                    <h3 className="font-[var(--font-display)] font-semibold text-xs uppercase tracking-wider mb-4 text-[oklch(0.6_0.05_250)]">
                                        Before Coding
                                    </h3>
                                    <ul className="space-y-3">
                                        <ChecklistItem label="Restated the problem" item={feedback.checklists.beforeCoding.restatedProblem} />
                                        <ChecklistItem label="Asked about constraints/edge cases" item={feedback.checklists.beforeCoding.askedClarifyingQuestions} />
                                        <ChecklistItem label="Discussed at least 2 approaches" item={feedback.checklists.beforeCoding.discussedApproaches} />
                                        <ChecklistItem label="Stated time/space complexity" item={feedback.checklists.beforeCoding.statedComplexity} />
                                        <ChecklistItem label="Got go-ahead before coding" item={feedback.checklists.beforeCoding.gotGoAhead} />
                                    </ul>
                                </div>

                                {/* During Coding */}
                                <div className="card p-5 bg-[oklch(0.12_0.02_260)]/50">
                                    <h3 className="font-[var(--font-display)] font-semibold text-xs uppercase tracking-wider mb-4 text-[oklch(0.6_0.05_250)]">
                                        During Coding
                                    </h3>
                                    <ul className="space-y-3">
                                        <ChecklistItem label="Talked through what they wrote" item={feedback.checklists.duringCoding.talkedThroughCode} />
                                        <ChecklistItem label="Used meaningful variable names" item={feedback.checklists.duringCoding.meaningfulVariableNames} />
                                        <ChecklistItem label="Wrote modular/clean code" item={feedback.checklists.duringCoding.cleanModularCode} />
                                        <ChecklistItem label="Handled edge cases" item={feedback.checklists.duringCoding.handledEdgeCases} />
                                    </ul>
                                </div>

                                {/* After Coding */}
                                <div className="card p-5 bg-[oklch(0.12_0.02_260)]/50">
                                    <h3 className="font-[var(--font-display)] font-semibold text-xs uppercase tracking-wider mb-4 text-[oklch(0.6_0.05_250)]">
                                        After Coding
                                    </h3>
                                    <ul className="space-y-3">
                                        <ChecklistItem label="Walked through code with example" item={feedback.checklists.afterCoding.walkedThroughExample} />
                                        <ChecklistItem label="Tested edge cases manually" item={feedback.checklists.afterCoding.testedEdgeCasesManually} />
                                        <ChecklistItem label="Identified and fixed bugs" item={feedback.checklists.afterCoding.identifiedFixedBugs} />
                                        <ChecklistItem label="Discussed potential optimizations" item={feedback.checklists.afterCoding.discussedOptimizations} />
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 justify-center pt-8 border-t border-[oklch(1_0_0/0.05)]">
                            <Link href="/interview/setup" className="btn-primary">
                                Practice Again
                            </Link>
                            <Link href="/" className="btn-secondary">
                                Back Home
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // """""""""""""""""""""""""""""""""""""""""""""""
    // SESSION VIEW
    // """""""""""""""""""""""""""""""""""""""""""""""
    return (
        <main className="h-screen flex flex-col overflow-hidden">
            {/* Top Bar */}
            <header className="glass-strong flex items-center justify-between px-5 py-3 border-b border-[oklch(1_0_0/0.08)] shrink-0">
                <div className="flex items-center gap-3">
                    <span className="font-[var(--font-display)] font-bold gradient-text hidden sm:block">
                        InterviewerAI
                    </span>
                    <div className="flex gap-1.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[oklch(0.55_0.18_250/0.15)] text-[oklch(0.76_0.10_250)] border border-[oklch(0.55_0.18_250/0.3)]">
                            {session.config.difficulty.toUpperCase()}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[oklch(0.22_0.02_260)] text-[oklch(0.6_0.01_260)]">
                            {session.config.role}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Timer */}
                    <div
                        className={`font-mono text-sm px-3 py-1 rounded-lg ${timeWarning
                            ? 'bg-[oklch(0.75_0.18_85/0.15)] text-[oklch(0.75_0.18_85)] border border-[oklch(0.75_0.18_85/0.3)] animate-pulse'
                            : 'text-[oklch(0.6_0.01_260)]'
                            }`}
                    >
                        ⏱ {formatTime(elapsedSeconds)}{' '}
                        <span className="text-[oklch(0.4_0.01_260)]">
                            / {session.config.durationMinutes}:00
                        </span>
                    </div>
                    <button
                        onClick={handleEndInterview}
                        className="btn-secondary text-xs py-1.5 px-3 border-[oklch(0.63_0.22_25/0.3)] text-[oklch(0.63_0.22_25)] hover:bg-[oklch(0.63_0.22_25/0.1)]"
                    >
                        End Interview
                    </button>
                </div>
            </header>

            {/* Two-Panel Layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] overflow-hidden">
                {/*  Left: Avatar + Chat  */}
                <div className="flex flex-col border-r border-[oklch(1_0_0/0.06)] overflow-hidden">
                    <AvatarPanel isSpeaking={isSpeaking} isThinking={isThinking} />


                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                        {session.messages.map((msg: Message) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'
                                    }`}
                            >
                                <div
                                    className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'candidate'
                                        ? 'bg-[oklch(0.55_0.18_250)] text-white rounded-br-sm'
                                        : msg.type === 'hint'
                                            ? 'bg-[oklch(0.22_0.08_85/0.3)] text-[oklch(0.80_0.01_260)] border border-[oklch(0.75_0.18_85/0.2)] rounded-bl-sm'
                                            : 'bg-[oklch(0.22_0.02_260)] text-[oklch(0.85_0.01_260)] rounded-bl-sm'
                                        }`}
                                >
                                    {msg.type === 'hint' && (
                                        <div className="text-xs text-[oklch(0.75_0.18_85)] font-medium mb-1">
                                            Hint
                                        </div>
                                    )}
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {/* Streaming text */}
                        {streamingText && (
                            <div className="flex justify-start">
                                <div className="max-w-[88%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm text-sm leading-relaxed bg-[oklch(0.22_0.02_260)] text-[oklch(0.85_0.01_260)]">
                                    {streamingText}
                                    <span className="typewriter-cursor" />
                                </div>
                            </div>
                        )}

                        {/* Thinking dots */}
                        {isThinking && !streamingText && (
                            <div className="flex justify-start">
                                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-[oklch(0.22_0.02_260)]">
                                    <div className="flex gap-1">
                                        {[0, 1, 2].map((i) => (
                                            <div
                                                key={i}
                                                className="w-2 h-2 rounded-full bg-[oklch(0.5_0.01_260)] animate-bounce"
                                                style={{ animationDelay: `${i * 0.15}s` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="px-4 py-3 border-t border-[oklch(1_0_0/0.06)] space-y-2">
                        {/* Hint row */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleHint}
                                disabled={isRequestingHint || isThinking || !session.currentProblem}
                                className="text-xs px-3 py-1.5 rounded-lg bg-[oklch(0.22_0.08_85/0.3)] text-[oklch(0.75_0.18_85)] border border-[oklch(0.75_0.18_85/0.3)] hover:bg-[oklch(0.22_0.08_85/0.5)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Ask for a hint without revealing the answer"
                            >
                                {isRequestingHint ? '⏳ Getting hint...' : '💡 I\'m stuck'}
                            </button>
                            <span className="text-xs text-[oklch(0.4_0.01_260)]">Ask for a nudge without spoiling the answer</span>
                        </div>

                        {/* Voice recording overlay — shown instead of the text box while listening */}
                        {isListening ? (
                            <div className="flex items-center gap-3">
                                {/* Mic stop button */}
                                {speechSupported && (
                                    <button
                                        onClick={toggleListening}
                                        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-[oklch(0.63_0.22_25)] animate-pulse"
                                        title="Stop recording (Space)"
                                    >
                                        ⏹
                                    </button>
                                )}
                                {/* Live transcript pill */}
                                <div className="flex-1 min-h-[40px] rounded-xl bg-[oklch(0.18_0.02_260)] border border-[oklch(0.63_0.22_25/0.5)] px-4 py-2 flex items-center">
                                    <span className="text-sm text-[oklch(0.75_0.01_260)] italic leading-snug">
                                        {interimTranscript
                                            ? `"${interimTranscript}…"`
                                            : <span className="text-[oklch(0.4_0.01_260)]">Listening… speak now</span>
                                        }
                                    </span>
                                </div>
                                {/* Ctrl+Space hint */}
                                <span className="text-[10px] text-[oklch(0.35_0.01_260)] shrink-0">Ctrl+Space<br />to stop</span>
                            </div>
                        ) : (
                            /* Normal typed-input row */
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
                                    Send
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/*  Right: Problem + Code Editor  */}
                <div className="flex flex-col overflow-hidden">
                    {/* Problem Panel */}
                    {(typedProblem || session.currentProblem) && (
                        <div className="flex flex-col border-b border-[oklch(1_0_0/0.06)] max-h-[42%] overflow-hidden">
                            {/* Problem header */}
                            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[oklch(1_0_0/0.04)] shrink-0">
                                <span className="text-xs px-2 py-0.5 rounded bg-[oklch(0.22_0.02_260)] font-mono text-[oklch(0.72_0.17_165)]">
                                    {session.config.language}
                                </span>
                                <h3 className="font-[var(--font-display)] font-semibold text-sm truncate">
                                    {session.currentProblem?.title || 'Loading problem...'}
                                </h3>
                                {session.currentProblem?.difficulty && (
                                    <span
                                        className={`text-xs ml-auto shrink-0 ${session.currentProblem.difficulty === 'easy'
                                            ? 'text-[oklch(0.72_0.17_165)]'
                                            : session.currentProblem.difficulty === 'medium'
                                                ? 'text-[oklch(0.75_0.18_85)]'
                                                : 'text-[oklch(0.63_0.22_25)]'
                                            }`}
                                    >
                                        {'• '}
                                        {session.currentProblem.difficulty.charAt(0).toUpperCase() +
                                            session.currentProblem.difficulty.slice(1)}
                                    </span>
                                )}
                            </div>

                            {/* Problem body */}
                            <div className="flex-1 overflow-y-auto px-4 py-3">
                                <p className="text-sm text-[oklch(0.7_0.01_260)] leading-relaxed whitespace-pre-wrap mb-3">
                                    {typedProblem}
                                    {isTyping && <span className="typewriter-cursor" />}
                                </p>
                                {/* The Problem's Examples and Constraints are deliberately hidden from the UI so the candidate must ask the conversational AI for them */}
                            </div>
                        </div>
                    )}

                    {/* Monaco Editor */}
                    <div className="flex-1 min-h-0">
                        <MonacoEditor
                            height="100%"
                            language={LANG_MONACO[session.config.language] || 'python'}
                            theme="vs-dark"
                            value={code}
                            onChange={(v) => setCode(v || '')}
                            options={{
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                minimap: { enabled: false },
                                padding: { top: 12 },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                wordWrap: 'on',
                                tabSize: 4,
                                lineNumbers: 'on',
                                renderLineHighlight: 'line',
                                cursorBlinking: 'smooth',
                                bracketPairColorization: { enabled: true },
                                suggest: { preview: true },
                            }}
                        />
                    </div>

                    {/* Run Result */}
                    <RunResultPanel result={runResult} />

                    {/* Editor Actions */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-[oklch(1_0_0/0.06)] shrink-0">
                        <div className="flex gap-2">
                            <button
                                onClick={handleRunCode}
                                disabled={isRunning || !code.trim()}
                                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
                            >
                                {isRunning ? '⏳ Running...' : ' Run Code'}
                            </button>
                            <button
                                onClick={() => {
                                    const starter =
                                        session.currentProblem?.starterCode?.[
                                        session.config.language
                                        ] || '';
                                    setCode(starter);
                                    setRunResult(null);
                                }}
                                className="btn-secondary text-xs py-1.5 px-3"
                            >
                                Reset
                            </button>
                        </div>
                        <button
                            onClick={handleSubmitCode}
                            disabled={isThinking || !code.trim()}
                            className="btn-primary text-xs py-1.5 px-4 disabled:opacity-40"
                        >
                            Submit Solution
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}


