import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// =====================================================
// Supabase Auth Middleware
// - Refreshes the user session cookie on every request
// - ALL routes require authentication except /login and /auth/*
// =====================================================

// Routes that DON'T require login
const PUBLIC_ROUTES = ['/login', '/auth'];
const PUBLIC_EXACT = ['/'];  // exact match only (not prefix)

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh the session — this is required by Supabase SSR
    const { data: { user } } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;

    const isPublicRoute = PUBLIC_ROUTES.some((r) => path.startsWith(r)) || PUBLIC_EXACT.includes(path);

    // Not logged in + not on a public route → redirect to login
    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirectTo', path);
        return NextResponse.redirect(url);
    }

    // Logged in + on login page → redirect to dashboard (or where they came from)
    if (user && path.startsWith('/login')) {
        const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/';
        const url = request.nextUrl.clone();
        url.pathname = redirectTo;
        url.search = '';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api).*)',
    ],
};
