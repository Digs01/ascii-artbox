
import { DocHeader, DocSection, CodeBlock } from '@/components/docs/DocComponents';

export default function CliPage() {
    return (
        <>
            <DocHeader
                title="CLI Usage"
                description="The AsciiWeb CLI is your swiss-army knife for converting media into optimized ASCII artifacts."
            />

            <DocSection title="Global Installation">
                <p>
                    We recommend running the CLI via <code className="text-zinc-300 font-mono">npx</code> for the latest version, but you can also install it globally.
                </p>
                <CodeBlock
                    lang="bash"
                    code="npm install -g @asciiweb/cli"
                />
            </DocSection>

            <DocSection title="Convert Images">
                <p>
                    Convert a static image into a raw text file. Supports PNG, JPEG, and WebP.
                </p>
                <CodeBlock
                    lang="bash"
                    code="# Basic usage (outputs to console)
ascii image input.jpg

# Set width to 100 chars and save to file
ascii image input.jpg --width 100 --out art.txt

# Invert colors for light backgrounds
ascii image logo.png --invert"
                />
            </DocSection>

            <DocSection title="Convert Video">
                <p>
                    Extract frames from a video file into a JSON manifest optimized for the React renderer.
                </p>
                <CodeBlock
                    lang="bash"
                    code="# Convert video at 12fps with 80 char width
ascii video clip.mp4 --fps 12 --width 80

# Output to specific directory
ascii video clip.mp4 --out ./public/animations/clip"
                />
            </DocSection>

            <DocSection title="Options Reference">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800 text-zinc-400">
                                <th className="py-2 pr-4 font-mono">Flag</th>
                                <th className="py-2 pr-4">Description</th>
                                <th className="py-2">Default</th>
                            </tr>
                        </thead>
                        <tbody className="text-zinc-300">
                            <tr className="border-b border-zinc-800/50">
                                <td className="py-3 pr-4 font-mono text-green-500">--width, -w</td>
                                <td className="py-3 pr-4">Output width in characters</td>
                                <td className="py-3 text-zinc-500">100</td>
                            </tr>
                            <tr className="border-b border-zinc-800/50">
                                <td className="py-3 pr-4 font-mono text-green-500">--height, -h</td>
                                <td className="py-3 pr-4">Output height (preserves aspect if omitted)</td>
                                <td className="py-3 text-zinc-500">Auto</td>
                            </tr>
                            <tr className="border-b border-zinc-800/50">
                                <td className="py-3 pr-4 font-mono text-green-500">--fps</td>
                                <td className="py-3 pr-4">Frames per second (video only)</td>
                                <td className="py-3 text-zinc-500">12</td>
                            </tr>
                            <tr className="border-b border-zinc-800/50">
                                <td className="py-3 pr-4 font-mono text-green-500">--invert</td>
                                <td className="py-3 pr-4">Invert luminance mapping</td>
                                <td className="py-3 text-zinc-500">False</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </DocSection>
        </>
    );
}
