"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerImageCommand = registerImageCommand;
const core_1 = require("@asciiweb/core");
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const chalk_1 = __importDefault(require("chalk"));
const writeFile = (0, util_1.promisify)(fs_1.default.writeFile);
function registerImageCommand(program) {
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
            console.log(chalk_1.default.blue(`Processing image: ${input}...`));
            const ascii = await (0, core_1.imageToAscii)(input, {
                width: options.width,
                height: options.height,
                charset: options.charset,
                invert: options.invert
            });
            if (options.out) {
                await writeFile(options.out, ascii);
                console.log(chalk_1.default.green(`Saved output to ${options.out}`));
            }
            else {
                console.log(ascii);
            }
        }
        catch (error) {
            console.error(chalk_1.default.red('Error converting image:'), error.message);
            process.exit(1);
        }
    });
}
