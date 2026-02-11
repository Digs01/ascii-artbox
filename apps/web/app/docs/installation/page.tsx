
import { DocHeader, DocSection, CodeBlock } from '@/components/docs/DocComponents';

export default function InstallationPage() {
    return (
        <>
            <DocHeader
                title="Installation"
                description="Get up and running with AsciiWeb in your React or Next.js project."
            />

            <DocSection title="Prerequisites">
                <p>
                    AsciiWeb is designed for modern React stacks. You'll need:
                </p>
                <ul className="list-disc list-inside space-y-2 mt-2 ml-2">
                    <li>React 18 or later</li>
                    <li>Node.js 18 or later</li>
                </ul>
            </DocSection>

            <DocSection title="Install Packages">
                <p>
                    Install the renderer and core utilities via your package manager:
                </p>
                <CodeBlock
                    lang="bash"
                    code="npm install @asciiweb/react @asciiweb/core"
                />
                <p className="text-sm text-zinc-500 italic">
                    Note: @asciiweb/cli is usually installed globally or run via npx.
                </p>
            </DocSection>

            <DocSection title="Quick Start">
                <p>
                    Import the component and drop it into your page. It works best with monospaced fonts, but the renderer handles spacing automatically.
                </p>
                <CodeBlock
                    lang="tsx"
                    code={`import { AsciiAnimation } from '@asciiweb/react';

export default function Page() {
  return (
    <AsciiAnimation
      src="/api/animation?id=wave"
      fps={30}
      color="white"
      scale={1}
    />
  );
}`}
                />
            </DocSection>
        </>
    );
}
