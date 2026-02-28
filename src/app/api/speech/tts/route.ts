import { NextResponse } from 'next/server';

// =====================================================
// ElevenLabs Text-to-Speech API Route
// Converts interviewer text responses to audio
// =====================================================

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// ElevenLabs voice IDs — these are free to use
// Rachel: calm, professional female voice — great for interviews
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

interface TTSRequest {
    text: string;
    voiceId?: string;
    stability?: number;
    similarityBoost?: number;
}

export async function POST(request: Request) {
    try {
        const {
            text,
            voiceId = DEFAULT_VOICE_ID,
            stability = 0.5,
            similarityBoost = 0.75,
        }: TTSRequest = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'Missing text' }, { status: 400 });
        }

        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            // Return a placeholder when no key is set — frontend will handle gracefully
            return NextResponse.json(
                { error: 'ElevenLabs API key not configured' },
                { status: 503 }
            );
        }

        const response = await fetch(
            `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey,
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability,
                        similarity_boost: similarityBoost,
                        style: 0.3,          // 0 = natural, 1 = more expressive
                        use_speaker_boost: true,
                    },
                }),
            }
        );

        if (!response.ok) {
            const err = await response.text();
            console.error('ElevenLabs error:', err);
            return NextResponse.json(
                { error: 'TTS generation failed' },
                { status: 500 }
            );
        }

        // Return the audio as a binary stream
        const audioBuffer = await response.arrayBuffer();
        return new Response(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('TTS route error:', error);
        return NextResponse.json(
            { error: 'TTS service error' },
            { status: 500 }
        );
    }
}
