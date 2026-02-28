import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// =====================================================
// Supabase server-side client (for API routes + Server Components)
// Uses Next.js cookie store to maintain session
// =====================================================

export async function createSupabaseServerClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // setAll may be called from a Server Component — ignore
                    }
                },
            },
        }
    );
}

/**
 * Returns the authenticated user from the current session, or null.
 */
export async function getUser() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}
