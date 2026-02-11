
import { Command } from 'commander';
import { imageToAscii } from '@asciiweb/core';
import fs from 'fs';
import { promisify } from 'util';
import chalk from 'chalk';

const writeFile = promisify(fs.writeFile);

export function registerImageCommand(program: Command) {
    program
        .command('image <input>')
        .description('Convert an image to ASCII')
        .option('-w, --width <number>', 'Output width (characters)', parseInt)
        .option('-h, --height <number>', 'Output height (characters)', parseInt)
        .option('-c, --charset <string>', 'Characters to use for mapping')
        .option('-i, --invert', 'Invert brightness')
        .option('-o, --out <path>', 'Output file path')
        .action(async (input, options) => {
            try {
                console.log(chalk.blue(`Processing image: ${input}...`));

                const ascii = await imageToAscii(input, {
                    width: options.width,
                    height: options.height,
                    charset: options.charset,
                    invert: options.invert
                });

                if (options.out) {
                    await writeFile(options.out, ascii);
                    console.log(chalk.green(`Saved output to ${options.out}`));
                } else {
                    console.log(ascii);
                }
            } catch (error: any) {
                console.error(chalk.red('Error converting image:'), error.message);
                process.exit(1);
            }
        });
}
