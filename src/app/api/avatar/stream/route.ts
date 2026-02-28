import { NextResponse } from 'next/server';

// =====================================================
// D-ID Streaming API — Create & manage avatar streams
// Docs: https://docs.d-id.com/reference/createstream
//
// Auth: D-ID says to send the key DIRECTLY as:
//   Authorization: Basic <YOUR KEY>
//   No additional base64 encoding — the key from the studio
//   is already in the correct format.
//
// Image requirements:
//   - Publicly reachable URL (D-ID servers must be able to GET it)
//   - Contains a clear frontal face
//   - JPEG or PNG, ideally 400x400+
// =====================================================

const DID_BASE = 'https://api.d-id.com';

function getAuthHeader(): string {
    const key = process.env.DID_API_KEY;
    if (!key) throw new Error('DID_API_KEY not set');
    // D-ID docs: Authorization: Basic <YOUR KEY> — use directly, no re-encoding
    return `Basic ${key}`;
}

// ── POST /api/avatar/stream ────────────────────────────────────
export async function POST() {
    try {
        const auth = getAuthHeader();

        // randomuser.me is consistently accessible by external servers and contains real faces
        // Override via DID_PRESENTER_URL in .env.local with any publicly reachable image URL
        const PRESENTER_URL =
            process.env.DID_PRESENTER_URL ||
            'https://randomuser.me/api/portraits/women/44.jpg';

        const res = await fetch(`${DID_BASE}/talks/streams`, {
            method: 'POST',
            headers: {
                Authorization: auth,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // Use D-ID's built-in clip presenter — no external image URL needed
                // Override presenter via DID_PRESENTER_ID env var
                presenter_type: 'clip',
                presenter_id: process.env.DID_PRESENTER_ID || 'amy-Aq6OmGZnMt',
                driver_id: 'mXra4jY38i',
                config: {
                    stitch: true,
                    result_format: 'mp4',
                },
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('D-ID create stream error:', res.status, err);
            return NextResponse.json(
                { error: 'Failed to create stream', detail: err, httpStatus: res.status },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('D-ID stream route error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// ── DELETE /api/avatar/stream ──────────────────────────────────
export async function DELETE(request: Request) {
    try {
        const { streamId } = await request.json();
        if (!streamId) return NextResponse.json({ error: 'Missing streamId' }, { status: 400 });

        await fetch(`${DID_BASE}/talks/streams/${streamId}`, {
            method: 'DELETE',
            headers: { Authorization: getAuthHeader() },
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: 'Failed to close stream' }, { status: 500 });
    }
}
