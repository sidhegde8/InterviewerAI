import { NextResponse } from 'next/server';

// =====================================================
// D-ID SDP Exchange — WebRTC negotiation
// After browser creates its SDP answer, send it to D-ID
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
        const { streamId, sessionId, answer } = await request.json();

        if (!streamId || !sessionId || !answer) {
            return NextResponse.json(
                { error: 'Missing streamId, sessionId, or answer' },
                { status: 400 }
            );
        }

        const res = await fetch(`${DID_BASE}/talks/streams/${streamId}/sdp`, {
            method: 'POST',
            headers: {
                Authorization: getAuthHeader(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                answer,
                session_id: sessionId,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('D-ID SDP error:', err);
            return NextResponse.json({ error: 'SDP exchange failed', detail: err }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ error: 'SDP route error' }, { status: 500 });
    }
}
