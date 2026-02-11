
import { DocHeader, DocSection, CodeBlock } from '@/components/docs/DocComponents';

export default function DocsPage() {
    return (
        <>
            <DocHeader
                title="Introduction"
                description="AsciiWeb is a comprehensive toolkit for building high-performance ASCII animations in modern web applications."
            />

            <DocSection title="The Problem">
                <p>
                    Traditional ASCII art on the web is often static, reliant on heavy <code className="text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded text-sm font-mono border border-zinc-800">Pre</code> tags, or rendered inefficiently.
                    It rarely scales well, isn't responsive, and is difficult to animate without performance penalties.
                </p>
            </DocSection>

            <DocSection title="Our Solution">
                <p>
                    AsciiWeb provides a fully optimized pipeline that treats ASCII as a first-class media type:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 not-prose">
                    <div className="p-6 border border-zinc-800 rounded-xl bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
                        <div className="w-8 h-8 rounded bg-green-500/10 flex items-center justify-center mb-4 text-green-500">
                            ⚙️
                        </div>
                        <h3 className="font-bold text-white mb-2">Core Engine</h3>
                        <p className="text-sm text-zinc-500">Efficient pixel-to-glyph mapping with customizable density and gamma correction.</p>
                    </div>
                    <div className="p-6 border border-zinc-800 rounded-xl bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
                        <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center mb-4 text-blue-500">
                            💻
                        </div>
                        <h3 className="font-bold text-white mb-2">CLI Tool</h3>
                        <p className="text-sm text-zinc-500">Convert videos and images into optimized JSON manifests or raw text frames.</p>
                    </div>
                    <div className="p-6 border border-zinc-800 rounded-xl bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
                        <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center mb-4 text-amber-500">
                            ⚛️
                        </div>
                        <h3 className="font-bold text-white mb-2">React Renderer</h3>
                        <p className="text-sm text-zinc-500">Canvas-based rendering for high frame rates with zero layout thrashing.</p>
                    </div>
                    <div className="p-6 border border-zinc-800 rounded-xl bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
                        <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center mb-4 text-purple-500">
                            📚
                        </div>
                        <h3 className="font-bold text-white mb-2">Asset Library</h3>
                        <p className="text-sm text-zinc-500">100+ procedurally generated loops, icons, and loaders ready to drop in.</p>
                    </div>
                </div>
            </DocSection>
        </>
    );
}
