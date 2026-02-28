'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';

// =====================================================
// Sidebar — Persistent navigation for authenticated pages
// Desktop: 240px left sidebar
// Mobile: fixed bottom tab bar
// =====================================================

const NAV_ITEMS = [
    { href: '/', icon: '🏠', label: 'Home' },
    { href: '/interview/setup', icon: '💻', label: 'Technical' },
    { href: '/behavioral/setup', icon: '🗣️', label: 'Behavioral' },
    { href: '/dashboard', icon: '📊', label: 'History' },
];

interface SidebarProps {
    userEmail?: string | null;
}

export function Sidebar({ userEmail }: SidebarProps) {
    const pathname = usePathname();
    const supabase = createSupabaseBrowserClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* ── Desktop Sidebar ── */}
            <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[220px] z-40 border-r border-[oklch(1_0_0/0.06)] bg-[oklch(0.15_0.02_260/0.95)] backdrop-blur-2xl">
                {/* Logo */}
                <div className="px-5 py-5 border-b border-[oklch(1_0_0/0.06)]">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <span className="text-2xl">🤖</span>
                        <span className="font-[var(--font-display)] text-lg font-bold gradient-text leading-none">
                            InterviewerAI
                        </span>
                    </Link>
                </div>

                {/* Nav items */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV_ITEMS.map(({ href, icon, label }) => {
                        const active = isActive(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${active
                                    ? 'bg-[oklch(0.55_0.18_250/0.15)] text-[oklch(0.85_0.01_260)]'
                                    : 'text-[oklch(0.5_0.01_260)] hover:text-[oklch(0.75_0.01_260)] hover:bg-[oklch(1_0_0/0.04)]'
                                    }`}
                            >
                                {/* Active indicator bar */}
                                {active && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-[oklch(0.55_0.18_250)]" />
                                )}
                                <span className="text-base">{icon}</span>
                                <span>{label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom: user info + sign out */}
                <div className="px-3 py-4 border-t border-[oklch(1_0_0/0.06)] space-y-1">
                    {userEmail && (
                        <div className="px-3 py-2 text-[11px] text-[oklch(0.4_0.01_260)] truncate">
                            {userEmail}
                        </div>
                    )}
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[oklch(0.45_0.01_260)] hover:text-[oklch(0.65_0.01_260)] hover:bg-[oklch(1_0_0/0.04)] transition-all cursor-pointer"
                    >
                        <span>🚪</span>
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* ── Mobile Bottom Tab Bar ── */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-[oklch(1_0_0/0.08)] bg-[oklch(0.15_0.02_260/0.97)] backdrop-blur-2xl flex">
                {NAV_ITEMS.map(({ href, icon, label }) => {
                    const active = isActive(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-[10px] font-medium transition-all ${active
                                ? 'text-[oklch(0.75_0.12_250)]'
                                : 'text-[oklch(0.4_0.01_260)]'
                                }`}
                        >
                            <span className="text-xl leading-none">{icon}</span>
                            <span>{label}</span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
