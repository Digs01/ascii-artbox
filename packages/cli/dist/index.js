#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const image_1 = require("./commands/image");
const video_1 = require("./commands/video");
const program = new commander_1.Command();
program
    .name('ascii-cli')
    .description('CLI tool for converting images and videos to ASCII art')
    .version('0.1.0');
(0, image_1.registerImageCommand)(program);
(0, video_1.registerVideoCommand)(program);
program.parse(process.argv);
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
