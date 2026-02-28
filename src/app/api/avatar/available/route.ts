import { NextResponse } from 'next/server';

// D-ID avatar disabled — returns false until a valid plan + agent is configured.
// Re-enable by setting DID_ENABLED=true in .env.local (requires D-ID paid plan + Agent ID + Client Key)
export async function GET() {
    const enabled = process.env.DID_ENABLED === 'true' && !!process.env.DID_API_KEY;
    return NextResponse.json({ available: enabled });
}
