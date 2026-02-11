"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerVideoCommand = registerVideoCommand;
const core_1 = require("@asciiweb/core");
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
function registerVideoCommand(program) {
    program
        .command('video <input>')
        .description('Convert a video to a sequence of ASCII frames')
        .option('--fps <number>', 'Frames per second to extract', parseInt)
        .option('-w, --width <number>', 'Output width (characters)', parseInt)
        .option('-h, --height <number>', 'Output height (characters)', parseInt)
        .option('-o, --out <path>', 'Output directory path', './frames')
        .action(async (input, options) => {
        try {
            console.log(chalk_1.default.blue(`Processing video: ${input}...`));
            console.log(chalk_1.default.gray(`Output directory: ${path_1.default.resolve(options.out)}`));
            await (0, core_1.videoToAscii)(input, {
                fps: options.fps,
                width: options.width,
                height: options.height,
                outputDir: options.out
            });
            console.log(chalk_1.default.green('Video conversion complete!'));
        }
        catch (error) {
            console.error(chalk_1.default.red('Error converting video:'), error.message);
            process.exit(1);
        }
    });
}
