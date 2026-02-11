import { AsciiAnimation } from '@asciiweb/react';

// Example Donut Animation (Single Frame for simplicity, or we could include a small json)
const donutFrame = `
        $$$$$$$$$$$$        
      $$            $$      
    $$                $$    
   $                    $   
  $                      $  
 $                        $ 
 $                        $ 
$                          $
$                          $
$                          $
 $                        $ 
 $                        $ 
  $                      $  
   $                    $   
    $$                $$    
      $$            $$      
        $$$$$$$$$$$$        
`;

// Simple rotation effect
const frames = [
    donutFrame,
    donutFrame.replace(/\$/g, '#'),
    donutFrame.replace(/\$/g, '*'),
    donutFrame.replace(/\$/g, '+'),
    donutFrame.replace(/\$/g, ':'),
    donutFrame.replace(/\$/g, '.'),
];

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
                    Get started by editing&nbsp;
                    <code className="font-mono font-bold">app/page.tsx</code>
                </p>
            </div>

            <div className="relative flex place-items-center before:absolute before:h-[300px] before:w-[480px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-to-br before:from-transparent before:to-blue-700 before:opacity-10 before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-[240px] after:translate-x-1/3 after:bg-gradient-to-t after:from-blue-900 after:via-blue-800 after:opacity-40 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-900 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 before:lg:h-[360px]">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-8">AsciiWeb Starter</h1>
                    <div className="border border-white/20 p-8 rounded-xl bg-black/50 backdrop-blur-sm">
                        <AsciiAnimation
                            frames={frames}
                            fps={8}
                            color="#00ff00"
                        />
                    </div>
                </div>
            </div>

            <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left mt-12">
                <a
                    href="https://asciiweb.dev/docs" // Placeholder URL
                    className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <h2 className={`mb-3 text-2xl font-semibold`}>
                        Docs{' '}
                        <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                            -&gt;
                        </span>
                    </h2>
                    <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
                        Find in-depth information about AsciiWeb features and API.
                    </p>
                </a>
            </div>
        </main>
    );
}
