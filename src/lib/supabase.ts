import { createBrowserClient } from '@supabase/ssr';

// =====================================================
// Supabase browser-side client
// Use this in Client Components (has 'use client')
// =====================================================

export function createSupabaseBrowserClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}
