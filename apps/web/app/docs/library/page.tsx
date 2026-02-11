
import { DocHeader, DocSection, CodeBlock } from '@/components/docs/DocComponents';

export default function LibraryPage() {
    return (
        <>
            <DocHeader
                title="Animation Library"
                description="A growing collection of procedurally generated ASCII assets, optimized for web usage."
            />

            <DocSection title="Overview">
                <p>
                    The <code className="text-zinc-300 font-mono">@asciiweb/library</code> package contains over 100 pre-generated animations across various categories.
                    These assets are tree-shakeable and can be imported directly or served via static CDN.
                </p>
            </DocSection>

            <DocSection title="Categories">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose mt-4">
                    <div className="p-4 border border-zinc-800 rounded bg-zinc-900/30">
                        <h3 className="font-bold text-white mb-1">Loaders</h3>
                        <p className="text-sm text-zinc-500">Spinners, progress bars, and waiting states.</p>
                        <div className="mt-3 flex gap-2">
                            <span className="text-[10px] px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-400">spinner</span>
                            <span className="text-[10px] px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-400">dots</span>
                        </div>
                    </div>
                    <div className="p-4 border border-zinc-800 rounded bg-zinc-900/30">
                        <h3 className="font-bold text-white mb-1">Technology</h3>
                        <p className="text-sm text-zinc-500">Devices, signals, and hardware icons.</p>
                        <div className="mt-3 flex gap-2">
                            <span className="text-[10px] px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-400">battery</span>
                            <span className="text-[10px] px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-400">wifi</span>
                        </div>
                    </div>
                    <div className="p-4 border border-zinc-800 rounded bg-zinc-900/30">
                        <h3 className="font-bold text-white mb-1">Geometric</h3>
                        <p className="text-sm text-zinc-500">Abstract 3D shapes and rotations.</p>
                        <div className="mt-3 flex gap-2">
                            <span className="text-[10px] px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-400">cube</span>
                            <span className="text-[10px] px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-400">donut</span>
                        </div>
                    </div>
                    <div className="p-4 border border-zinc-800 rounded bg-zinc-900/30">
                        <h3 className="font-bold text-white mb-1">Status</h3>
                        <p className="text-sm text-zinc-500">Success, error, and warning indicators.</p>
                        <div className="mt-3 flex gap-2">
                            <span className="text-[10px] px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-400">check</span>
                            <span className="text-[10px] px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-400">cross</span>
                        </div>
                    </div>
                </div>
            </DocSection>

            <DocSection title="Usage">
                <p>
                    Browse the <a href="/gallery" className="text-green-500 hover:text-green-400 underline decoration-green-500/50">Gallery</a> to find an animation ID, then load it:
                </p>
                <CodeBlock
                    lang="tsx"
                    code={`// Load via ID from your API/static folder
<AsciiAnimation src="/api/animation?id=cube-wireframe" />`}
                />
            </DocSection>
        </>
    );
}
