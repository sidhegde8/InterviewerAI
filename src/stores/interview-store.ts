import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
    InterviewConfig,
    InterviewPhase,
    InterviewSession,
    Message,
    Problem,
    CodeSubmission,
    InterviewFeedback,
} from '@/types/interview';

interface InterviewState {
    // Session state
    session: InterviewSession | null;
    feedback: InterviewFeedback | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    startSession: (config: InterviewConfig) => void;
    setPhase: (phase: InterviewPhase) => void;
    setProblem: (problem: Problem) => void;
    addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
    addCodeSubmission: (submission: Omit<CodeSubmission, 'timestamp'>) => void;
    setFeedback: (feedback: InterviewFeedback) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    endSession: () => void;
    reset: () => void;
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
    session: null,
    feedback: null,
    isLoading: false,
    error: null,

    startSession: (config: InterviewConfig) => {
        const session: InterviewSession = {
            id: uuidv4(),
            config,
            phase: 'greeting',
            currentProblem: null,
            messages: [],
            codeSubmissions: [],
            startedAt: Date.now(),
        };
        set({ session, feedback: null, error: null });
    },

    setPhase: (phase: InterviewPhase) => {
        const { session } = get();
        if (!session) return;
        set({ session: { ...session, phase } });
    },

    setProblem: (problem: Problem) => {
        const { session } = get();
        if (!session) return;
        set({ session: { ...session, currentProblem: problem } });
    },

    addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => {
        const { session } = get();
        if (!session) return;
        const newMessage: Message = {
            ...message,
            id: uuidv4(),
            timestamp: Date.now(),
        };
        set({
            session: {
                ...session,
                messages: [...session.messages, newMessage],
            },
        });
    },

    addCodeSubmission: (submission: Omit<CodeSubmission, 'timestamp'>) => {
        const { session } = get();
        if (!session) return;
        const newSubmission: CodeSubmission = {
            ...submission,
            timestamp: Date.now(),
        };
        set({
            session: {
                ...session,
                codeSubmissions: [...session.codeSubmissions, newSubmission],
            },
        });
    },

    setFeedback: (feedback: InterviewFeedback) => {
        set({ feedback });
    },

    setLoading: (isLoading: boolean) => {
        set({ isLoading });
    },

    setError: (error: string | null) => {
        set({ error });
    },

    endSession: () => {
        const { session } = get();
        if (!session) return;
        set({ session: { ...session, phase: 'debrief', endedAt: Date.now() } });
    },

    reset: () => {
        set({ session: null, feedback: null, isLoading: false, error: null });
    },
}));
