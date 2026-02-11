
import React from 'react';
import { cn } from '@/lib/utils';

export function DocHeader({ title, description }: { title: string, description: string }) {
    return (
        <div className="mb-10 pb-6 border-b border-zinc-800">
            <h1 className="text-4xl font-bold tracking-tight text-white mb-3">{title}</h1>
            <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed">{description}</p>
        </div>
    );
}

export function DocSection({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) {
    return (
        <div className={cn("mb-12", className)}>
            <h2 className="text-2xl font-semibold text-white mb-4 tracking-tight flex items-center gap-2">
                <span className="text-green-500/50">#</span> {title}
            </h2>
            <div className="text-zinc-400 leading-7 space-y-4">
                {children}
            </div>
        </div>
    );
}

export function CodeBlock({ code, lang = 'bash' }: { code: string, lang?: string }) {
    return (
        <div className="my-6 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 to-zinc-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
                    <span className="text-xs font-mono text-zinc-500 uppercase">{lang}</span>
                    <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-zinc-800" />
                        <div className="w-2 h-2 rounded-full bg-zinc-800" />
                        <div className="w-2 h-2 rounded-full bg-zinc-800" />
                    </div>
                </div>
                <pre className="p-4 overflow-x-auto text-sm font-mono text-zinc-300">
                    {code}
                </pre>
            </div>
        </div>
    );
}
