
import { DocsSidebar } from '@/components/docs/DocsSidebar';
import { Nav } from '@/components/ui/Nav';

export default function DocsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-green-500/30 selection:text-green-200">
            <Nav />

            <div className="max-w-[1400px] mx-auto">
                <DocsSidebar />

                <main className="lg:pl-72 pt-24 pb-20 px-6 lg:pr-12 min-h-screen">
                    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
