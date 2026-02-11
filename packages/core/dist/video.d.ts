import { AsciiOptions } from './utils';
export interface VideoConvertOptions extends AsciiOptions {
    fps?: number;
    outputDir?: string;
    returnFrames?: boolean;
    frameDiff?: boolean;
}
export declare function videoToAscii(inputPath: string, options: VideoConvertOptions): Promise<string[] | void>;
