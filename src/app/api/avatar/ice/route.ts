import { NextResponse } from 'next/server';

// =====================================================
// D-ID ICE Candidate relay
// Sends browser ICE candidates to D-ID for WebRTC negotiation
// =====================================================

const DID_BASE = 'https://api.d-id.com';

function getAuthHeader(): string {
    const key = process.env.DID_API_KEY;
    if (!key) throw new Error('DID_API_KEY not set');
    return `Basic ${key}`;
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { streamId, sessionId, candidate } = await request.json();

        if (!streamId || !sessionId || candidate === undefined) {
            return NextResponse.json(
                { error: 'Missing streamId, sessionId, or candidate' },
                { status: 400 }
            );
        }

        const res = await fetch(`${DID_BASE}/talks/streams/${streamId}/ice`, {
            method: 'POST',
            headers: {
                Authorization: getAuthHeader(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                candidate,
                session_id: sessionId,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('D-ID ICE error:', err);
            return NextResponse.json({ error: 'ICE relay failed', detail: err }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        console.error('ICE Endpoint Error:', e);
        return NextResponse.json({ error: 'ICE route error' }, { status: 500 });
    }
}
