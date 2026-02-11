
import { DocHeader, DocSection, CodeBlock } from '@/components/docs/DocComponents';

export default function ReactPage() {
    return (
        <>
            <DocHeader
                title="React Component"
                description="A high-performance renderer for ASCII animations, capable of handling 60fps playback with zero layout thrashing."
            />

            <DocSection title="Basic Usage">
                <p>
                    The <code className="text-zinc-300 font-mono">AsciiAnimation</code> component is the primary interface. It accepts either a raw text frame array or a URL to a manifest.
                </p>
                <CodeBlock
                    lang="tsx"
                    code={`import { AsciiAnimation } from '@asciiweb/react';

// 1. Using a fetched manifest (Recommended for long animations)
<AsciiAnimation 
    src="/animations/matrix-rain/manifest.json" 
    scale={0.8}
/>

// 2. Using raw frames (Best for short loops or generated content)
const frames = ["(^_^)", "(-_-)", "(^_^)"];
<AsciiAnimation 
    frames={frames} 
    fps={2} 
    color="#00ff00" 
/>`}
                />
            </DocSection>

            <DocSection title="Props">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800 text-zinc-400">
                                <th className="py-2 pr-4 font-mono">Prop</th>
                                <th className="py-2 pr-4">Type</th>
                                <th className="py-2 pr-4">Description</th>
                            </tr>
                        </thead>
                        <tbody className="text-zinc-300">
                            <tr className="border-b border-zinc-800/50">
                                <td className="py-3 pr-4 font-mono text-purple-400">frames</td>
                                <td className="py-3 pr-4 font-mono text-xs text-zinc-500">string[]</td>
                                <td className="py-3">Array of text frames to render. Required if `src` is missing.</td>
                            </tr>
                            <tr className="border-b border-zinc-800/50">
                                <td className="py-3 pr-4 font-mono text-purple-400">src</td>
                                <td className="py-3 pr-4 font-mono text-xs text-zinc-500">string</td>
                                <td className="py-3">URL to a JSON manifest.</td>
                            </tr>
                            <tr className="border-b border-zinc-800/50">
                                <td className="py-3 pr-4 font-mono text-purple-400">fps</td>
                                <td className="py-3 pr-4 font-mono text-xs text-zinc-500">number</td>
                                <td className="py-3">Playback speed. Defaults to 12.</td>
                            </tr>
                            <tr className="border-b border-zinc-800/50">
                                <td className="py-3 pr-4 font-mono text-purple-400">color</td>
                                <td className="py-3 pr-4 font-mono text-xs text-zinc-500">string</td>
                                <td className="py-3">CSS color string (hex, rgb, etc). Defaults to "white".</td>
                            </tr>
                            <tr className="border-b border-zinc-800/50">
                                <td className="py-3 pr-4 font-mono text-purple-400">loop</td>
                                <td className="py-3 pr-4 font-mono text-xs text-zinc-500">boolean</td>
                                <td className="py-3">Whether to loop the animation. Defaults to true.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </DocSection>

            <DocSection title="Ref Methods">
                <p>
                    You can control playback imperatively using a ref.
                </p>
                <CodeBlock
                    lang="tsx"
                    code={`const ref = useRef<AsciiAnimationRef>(null);

// Pause
ref.current?.pause();

// Play
ref.current?.play();

// Seek to frame
ref.current?.seek(10);`}
                />
            </DocSection>
        </>
    );
}
