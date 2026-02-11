
import { Command } from 'commander';
import { videoToAscii } from '@asciiweb/core';
import chalk from 'chalk';
import path from 'path';

export function registerVideoCommand(program: Command) {
    program
        .command('video <input>')
        .description('Convert a video to a sequence of ASCII frames')
        .option('--fps <number>', 'Frames per second to extract', parseInt)
        .option('-w, --width <number>', 'Output width (characters)', parseInt)
        .option('-h, --height <number>', 'Output height (characters)', parseInt)
        .option('-o, --out <path>', 'Output directory path', './frames')
        .action(async (input, options) => {
            try {
                console.log(chalk.blue(`Processing video: ${input}...`));
                console.log(chalk.gray(`Output directory: ${path.resolve(options.out)}`));

                await videoToAscii(input, {
                    fps: options.fps,
                    width: options.width,
                    height: options.height,
                    outputDir: options.out
                });

                console.log(chalk.green('Video conversion complete!'));
            } catch (error: any) {
                console.error(chalk.red('Error converting video:'), error.message);
                process.exit(1);
            }
        });
}
