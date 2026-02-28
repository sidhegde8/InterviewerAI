'use client';

import { useCallback, useRef } from 'react';

// =====================================================
// useTTS — Text-to-Speech Hook
// Plays interviewer responses via ElevenLabs or
// falls back to browser Web Speech Synthesis
// speak() returns a Promise that resolves when audio ENDS
// so callers can await it properly.
// =====================================================

interface TTSOptions {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: string) => void;
}

export function useTTS(options: TTSOptions = {}) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    // Keep latest options in a ref so callbacks always see up-to-date values
    const optionsRef = useRef(options);
    optionsRef.current = options;

    /**
     * Play audio from ElevenLabs TTS API.
     * Returns a Promise that resolves to true when playback ENDS,
     * or false if ElevenLabs is unavailable (caller should fall back).
     */
    const speakWithElevenLabs = useCallback(async (text: string): Promise<boolean> => {
        try {
            const res = await fetch('/api/speech/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            if (!res.ok) return false;

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            // Stop any current audio
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }

            const audio = new Audio(url);
            audioRef.current = audio;

            return new Promise<boolean>((resolve) => {
                audio.onplay = () => optionsRef.current.onStart?.();
                audio.onended = () => {
                    URL.revokeObjectURL(url);
                    optionsRef.current.onEnd?.();
                    resolve(true);
                };
                audio.onerror = () => {
                    URL.revokeObjectURL(url);
                    optionsRef.current.onError?.('Audio playback failed');
                    resolve(false); // resolve false so caller falls back
                };
                audio.play().catch(() => resolve(false));
            });
        } catch {
            return false;
        }
    }, []);

    /**
     * Fall back to browser Web Speech Synthesis.
     * Returns a Promise that resolves when utterance ENDS.
     */
    const speakWithBrowser = useCallback((text: string): Promise<void> => {
        return new Promise((resolve) => {
            if (!('speechSynthesis' in window)) {
                optionsRef.current.onError?.('Text-to-speech not supported in this browser.');
                resolve();
                return;
            }

            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utteranceRef.current = utterance;

            const voices = window.speechSynthesis.getVoices();
            const preferred = voices.find(
                (v) =>
                    v.name.includes('Samantha') ||
                    v.name.includes('Karen') ||
                    v.name.includes('Female') ||
                    (v.lang.startsWith('en') && v.name.includes('f'))
            );
            if (preferred) utterance.voice = preferred;

            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            utterance.lang = 'en-US';

            utterance.onstart = () => optionsRef.current.onStart?.();
            utterance.onend = () => {
                optionsRef.current.onEnd?.();
                resolve();
            };
            utterance.onerror = (e) => {
                optionsRef.current.onError?.(e.error);
                resolve(); // resolve so callers don't hang
            };

            window.speechSynthesis.speak(utterance);
        });
    }, []);

    /**
     * Main speak function.
     * Tries ElevenLabs first, falls back to browser TTS.
     * Returns a Promise that resolves when speech ENDS.
     */
    const speak = useCallback(
        async (text: string): Promise<void> => {
            if (!text.trim()) return;
            const usedElevenLabs = await speakWithElevenLabs(text);
            if (!usedElevenLabs) {
                await speakWithBrowser(text);
            }
        },
        [speakWithElevenLabs, speakWithBrowser]
    );

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }
        window.speechSynthesis?.cancel();
    }, []);

    return { speak, stop };
}
