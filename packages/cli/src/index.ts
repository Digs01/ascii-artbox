#!/usr/bin/env node
import { Command } from 'commander';
import { registerImageCommand } from './commands/image';
import { registerVideoCommand } from './commands/video';
import chalk from 'chalk';

const program = new Command();

program
    .name('ascii-cli')
    .description('CLI tool for converting images and videos to ASCII art')
    .version('0.1.0');

registerImageCommand(program);
registerVideoCommand(program);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
