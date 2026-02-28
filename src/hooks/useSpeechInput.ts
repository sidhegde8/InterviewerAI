'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// =====================================================
// useSpeechInput — Web Speech API Hook (Continuous Mode)
// Keeps listening until the user manually stops.
// Auto-restarts on browser-imposed timeouts/silence.
// Fires onStop(fullTranscript) when user clicks stop.
// =====================================================

interface SpeechInputOptions {
    language?: string;
    onInterim?: (text: string) => void;
    onFinal?: (text: string) => void;
    onStop?: (fullTranscript: string) => void;
    onError?: (error: string) => void;
}

interface SpeechInputState {
    isListening: boolean;
    isSupported: boolean;
    interimTranscript: string;
}

export function useSpeechInput({
    language = 'en-US',
    onInterim,
    onFinal,
    onStop,
    onError,
}: SpeechInputOptions = {}) {
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const manuallyStoppedRef = useRef(false);
    const accumulatedRef = useRef(''); // running full transcript for this session

    const [state, setState] = useState<SpeechInputState>({
        isListening: false,
        isSupported: false,
        interimTranscript: '',
    });

    // Check browser support
    useEffect(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR) setState((s) => ({ ...s, isSupported: true }));
    }, []);

    // --- Core: build and start a recognition session ---
    const createAndStart = useCallback(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            onError?.('Speech recognition is not supported in this browser.');
            return;
        }

        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { }
        }

        const r = new SR();
        r.lang = language;
        r.continuous = true;      // Don't stop on pauses
        r.interimResults = true;  // Show live transcription
        r.maxAlternatives = 1;

        r.onstart = () => {
            setState((s) => ({ ...s, isListening: true, interimTranscript: '' }));
        };

        r.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    accumulatedRef.current = (accumulatedRef.current + ' ' + t).trim();
                    onFinal?.(t);
                } else {
                    interim += t;
                }
            }
            setState((s) => ({ ...s, interimTranscript: interim }));
            onInterim?.(interim);
        };

        r.onerror = (event: SpeechRecognitionErrorEvent) => {
            // 'no-speech' is expected during pauses in continuous mode — ignore it silently
            if (event.error === 'no-speech') return;
            const msgs: Record<string, string> = {
                'not-allowed': 'Microphone access denied. Please allow access.',
                'network': 'Network error. Check your connection.',
                'audio-capture': 'No microphone found.',
                'service-not-allowed': 'Speech service not available.',
            };
            onError?.(msgs[event.error] ?? `Speech error: ${event.error}`);
        };

        r.onend = () => {
            // If user manually stopped, fire onStop and clean up
            if (manuallyStoppedRef.current) {
                setState((s) => ({ ...s, isListening: false, interimTranscript: '' }));
                onStop?.(accumulatedRef.current);
                accumulatedRef.current = '';
                manuallyStoppedRef.current = false;
                return;
            }
            // Otherwise the browser timed out — auto-restart to keep listening
            try { r.start(); } catch { }
        };

        recognitionRef.current = r;
        r.start();
    }, [language, onInterim, onFinal, onStop, onError]);

    const startListening = useCallback(() => {
        manuallyStoppedRef.current = false;
        accumulatedRef.current = '';
        createAndStart();
    }, [createAndStart]);

    const stopListening = useCallback(() => {
        manuallyStoppedRef.current = true;
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { }
            recognitionRef.current = null;
        }
        // onStop is fired in the onend handler once the browser confirms it stopped
    }, []);

    const toggleListening = useCallback(() => {
        if (state.isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [state.isListening, startListening, stopListening]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            manuallyStoppedRef.current = true;
            recognitionRef.current?.stop();
        };
    }, []);

    return {
        ...state,
        startListening,
        stopListening,
        toggleListening,
    };
}
