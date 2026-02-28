'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Sidebar } from './Sidebar';
import type { User } from '@supabase/supabase-js';

// =====================================================
// AppShell — Root layout wrapper for authenticated pages
// Shows sidebar + content area, OR full-screen for sessions
// =====================================================

// Routes where the sidebar should be hidden (full-screen focus mode)
const FULLSCREEN_ROUTES = ['/interview/session', '/behavioral/session'];
// Routes that don't need the app shell at all
const SHELL_EXEMPT = ['/login', '/auth'];

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
            setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    // Don't wrap login/auth pages with the shell
    const isExempt = SHELL_EXEMPT.some((r) => pathname.startsWith(r));
    if (isExempt) return <>{children}</>;

    // Full-screen mode during active interviews (no sidebar)
    const isFullscreen = FULLSCREEN_ROUTES.some((r) => pathname.startsWith(r));
    if (isFullscreen) return <>{children}</>;

    // Not logged in — render children directly (landing page handles its own layout)
    if (!isLoading && !user) return <>{children}</>;

    // Loading — avoid layout flash
    if (isLoading) return <>{children}</>;

    // ── Authenticated App Shell ──
    return (
        <div className="flex min-h-screen">
            <Sidebar userEmail={user?.email} />

            {/* Main content — offset by sidebar width on desktop, add padding-bottom on mobile for tab bar */}
            <main className="flex-1 md:ml-[240px] min-h-screen pb-20 md:pb-0">
                {children}
            </main>
        </div>
    );
}
