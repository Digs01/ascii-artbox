
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Nav } from '@/components/ui/Nav';

const items = [
    {
        title: 'Getting Started',
        links: [
            { href: '/docs', label: 'Introduction' },
            { href: '/docs/installation', label: 'Installation' },
        ],
    },
    {
        title: 'Core Reference',
        links: [
            { href: '/docs/cli', label: 'CLI Usage' },
            { href: '/docs/react', label: 'React Component' },
        ],
    },
    {
        title: 'Content',
        links: [
            { href: '/docs/library', label: 'Animation Library' },
            { href: '/docs/library', label: 'UI Interactions' }, // Update link when page exists
        ],
    },
];

export function DocsSidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed top-16 bottom-0 left-0 z-20 w-64 border-r border-zinc-800 bg-black/95 backdrop-blur-sm lg:block hidden overflow-y-auto">
            <div className="flex flex-col gap-8 p-6">
                {items.map((section) => (
                    <div key={section.title}>
                        <h4 className="font-mono text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">
                            {section.title}
                        </h4>
                        <ul className="space-y-1">
                            {section.links.map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <li key={link.href}>
                                        <Link
                                            href={link.href}
                                            className={cn(
                                                "block text-sm py-1.5 px-3 -mx-3 rounded transition-all duration-200",
                                                isActive
                                                    ? "text-green-500 bg-green-500/10 font-medium"
                                                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                                            )}
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </div>
        </aside>
    );
}
