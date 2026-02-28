import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
    BehavioralConfig,
    BehavioralPhase,
    BehavioralSession,
    BehavioralMessage,
    BehavioralFeedback,
} from '@/types/behavioral';

interface BehavioralState {
    session: BehavioralSession | null;
    feedback: BehavioralFeedback | null;
    isLoading: boolean;
    error: string | null;

    startSession: (config: BehavioralConfig) => void;
    setPhase: (phase: BehavioralPhase) => void;
    addMessage: (message: Omit<BehavioralMessage, 'id' | 'timestamp'>) => void;
    incrementQuestionCount: () => void;
    setFeedback: (feedback: BehavioralFeedback) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    endSession: () => void;
    reset: () => void;
}

export const useBehavioralStore = create<BehavioralState>((set, get) => ({
    session: null,
    feedback: null,
    isLoading: false,
    error: null,

    startSession: (config: BehavioralConfig) => {
        const session: BehavioralSession = {
            id: uuidv4(),
            config,
            phase: 'greeting',
            messages: [],
            questionCount: 0,
            startedAt: Date.now(),
        };
        set({ session, feedback: null, error: null });
    },

    setPhase: (phase: BehavioralPhase) => {
        const { session } = get();
        if (!session) return;
        set({ session: { ...session, phase } });
    },

    addMessage: (message: Omit<BehavioralMessage, 'id' | 'timestamp'>) => {
        const { session } = get();
        if (!session) return;
        const newMessage: BehavioralMessage = {
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

    incrementQuestionCount: () => {
        const { session } = get();
        if (!session) return;
        set({ session: { ...session, questionCount: session.questionCount + 1 } });
    },

    setFeedback: (feedback: BehavioralFeedback) => {
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
