'use client';

import { useRef, forwardRef } from 'react';

interface ShareCardProps {
    content: string;
    fontSize: number;
    color: string;
    bgTheme: { bg: string; name: string };
    isColorMode: boolean;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(({
    content,
    fontSize,
    color,
    bgTheme,
    isColorMode
}, ref) => {
    return (
        <div
            ref={ref}
            style={{
                width: '1200px',
                height: '630px',
                background: 'linear-gradient(135deg, #18181b 0%, #000000 100%)',
                position: 'absolute',
                top: '-9999px',
                left: '-9999px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                fontFamily: 'Inter, sans-serif',
                overflow: 'hidden'
            }}
        >
            {/* Header / Branding */}
            <div className="w-full flex justify-between items-center mb-8 px-12">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                        <span className="text-black font-extrabold text-lg">A</span>
                    </div>
                    <span className="text-white text-2xl font-bold tracking-tight">AsciiArtbox</span>
                </div>
                <div className="text-zinc-500 font-mono text-sm">ascii.artbox.dev</div>
            </div>

            {/* Art Container */}
            <div
                className="relative rounded-xl overflow-hidden shadow-2xl border border-zinc-800"
                style={{
                    background: bgTheme.bg,
                    // Dynamic check for aspect ratio could go here, but for now max constraints
                    maxHeight: '440px',
                    maxWidth: '1000px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px'
                }}
            >
                {isColorMode ? (
                    <pre
                        className="font-mono whitespace-pre text-center"
                        style={{
                            fontSize: `${Math.max(6, fontSize * 1.5)}px`, // Scale up a bit for the card
                            lineHeight: '1.0',
                        }}
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                ) : (
                    <pre
                        className="font-mono whitespace-pre text-center"
                        style={{
                            fontSize: `${Math.max(6, fontSize * 1.5)}px`,
                            lineHeight: '1.0',
                            color: color
                        }}
                    >
                        {content}
                    </pre>
                )}
            </div>

            {/* Footer Tagline */}
            <div className="mt-8 text-zinc-600 text-sm font-medium tracking-wide uppercase">
                Create animated ASCII art in seconds
            </div>
        </div>
    );
});

ShareCard.displayName = 'ShareCard';
