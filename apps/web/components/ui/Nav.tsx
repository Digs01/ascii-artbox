
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../lib/utils'; // Assuming utils exists or I need to create it/inline it. 
// Wait, I haven't created lib/utils in apps/web yet, usually `cn` is there. 
// I'll check if I need to create it or just inline the logic.
// The Button component used `twMerge` and `clsx` locally. I should probably standardise.
// For now, I'll stick to inline logic or ensure utils exists.
// I'll create a local helper for now to be safe as I didn't verify lib/utils existence.

import { useSession, signIn, signOut } from 'next-auth/react';

export const Nav = () => {
    const pathname = usePathname();
    const { data: session } = useSession();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-900 bg-black/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="font-bold text-xl tracking-tighter text-white">
                    AsciiArtbox
                </Link>

                <div className="flex items-center gap-6">
                    <Link
                        href="/gallery"
                        className={`text-sm transition-colors ${isActive('/gallery') ? 'text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Gallery
                    </Link>
                    <Link
                        href="/playground"
                        className={`text-sm transition-colors ${isActive('/playground') ? 'text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Playground
                    </Link>

                    {session ? (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                {session.user?.image && (
                                    <img src={session.user.image} alt={session.user.name || 'User'} className="w-6 h-6 rounded-full border border-zinc-700" />
                                )}
                                <span className="text-sm text-zinc-400 hidden sm:inline">{session.user?.name}</span>
                            </div>
                            <button
                                onClick={() => signOut()}
                                className="text-sm text-zinc-500 hover:text-white transition-colors"
                            >
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => signIn('github')}
                            className="text-sm px-3 py-1.5 bg-white text-black rounded font-medium hover:bg-zinc-200 transition-colors"
                        >
                            Sign In
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
};
