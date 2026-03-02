import { NextResponse } from 'next/server';

// =====================================================
// D-ID Speak — Sends text to the avatar to say
// The avatar lip-syncs using ElevenLabs TTS internally
// OR using D-ID's built-in TTS as fallback
// =====================================================

const DID_BASE = 'https://api.d-id.com';

// ElevenLabs voice ID for Rachel (professional female voice)
const ELEVENLABS_VOICE_ID =
    process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

function getAuthHeader(): string {
    const key = process.env.DID_API_KEY;
    if (!key) throw new Error('DID_API_KEY not set');
    return `Basic ${key}`;
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { streamId, sessionId, text } = await request.json();

        if (!streamId || !sessionId || !text) {
            return NextResponse.json(
                { error: 'Missing streamId, sessionId, or text' },
                { status: 400 }
            );
        }

        // Build script config — prefer ElevenLabs if key is available
        const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

        const provider = elevenLabsKey
            ? {
                type: 'elevenlabs' as const,
                voice_id: ELEVENLABS_VOICE_ID,
                api_key: elevenLabsKey,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.3,
                    use_speaker_boost: true,
                },
            }
            : {
                type: 'microsoft' as const,
                voice_id: 'en-US-JennyNeural',
            };

        const res = await fetch(`${DID_BASE}/talks/streams/${streamId}/clips`, {
            method: 'POST',
            headers: {
                Authorization: getAuthHeader(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                script: {
                    type: 'text',
                    input: text,
                    provider,
                },
                config: {
                    fluent: true,
                    pad_audio: 0.0,
                    stitch: true,
                },
                session_id: sessionId,
                background: {
                    color: '#0f1014', // Match our dark surface color
                },
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('D-ID speak error:', err);
            return NextResponse.json({ error: 'Speak failed', detail: err }, { status: 500 });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (e: unknown) {
        console.error('Speak Endpoint Error:', e);
        return NextResponse.json({ error: 'Speak route error' }, { status: 500 });
    }
}
