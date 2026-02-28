import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// =====================================================
// Save a completed behavioral interview session
// =====================================================

export async function POST(request: Request) {
    try {
        const { session, feedback } = await request.json();

        if (!session) {
            return NextResponse.json({ error: 'Missing session' }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Insert session row (strip resumeText from stored config to save space)
        const configToStore = { ...session.config, resumeText: null };

        const { data: sessionRow, error: sessionError } = await supabase
            .from('sessions')
            .insert({
                id: session.id,
                type: 'behavioral',
                config: configToStore,
                user_id: user?.id ?? null,
                started_at: new Date(session.startedAt).toISOString(),
                ended_at: session.endedAt ? new Date(session.endedAt).toISOString() : new Date().toISOString(),
                duration_secs: session.endedAt
                    ? Math.floor((session.endedAt - session.startedAt) / 1000)
                    : null,
            })
            .select('id')
            .single();

        if (sessionError) throw sessionError;

        // 2. Insert messages (batch)
        if (session.messages?.length) {
            const { error: msgError } = await supabase.from('messages').insert(
                session.messages.map((m: { id: string; role: string; content: string; type: string; timestamp: number }) => ({
                    id: m.id,
                    session_id: sessionRow.id,
                    role: m.role,
                    content: m.content,
                    type: m.type,
                    timestamp: m.timestamp,
                }))
            );
            if (msgError) throw msgError;
        }

        // 3. Insert feedback if available
        if (feedback) {
            const { error: fbError } = await supabase.from('feedback').insert({
                session_id: sessionRow.id,
                checklists: feedback.checklists,
                scores: feedback.scores,
                overall_score: feedback.overallScore,
                decision: feedback.decision,
                report: feedback.report,
            });
            if (fbError) throw fbError;
        }

        return NextResponse.json({ success: true, sessionId: sessionRow.id });
    } catch (error) {
        console.error('Save behavioral session error:', error);
        return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
    }
}
