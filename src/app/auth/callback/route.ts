import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// =====================================================
// OAuth callback handler
// Supabase redirects here after Google sign-in
// Exchanges the code for a session and redirects the user
// =====================================================

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const redirectTo = searchParams.get('redirectTo') || '/dashboard';

    if (code) {
        const supabase = await createSupabaseServerClient();
        await supabase.auth.exchangeCodeForSession(code);
    }

    return NextResponse.redirect(`${origin}${redirectTo}`);
}
