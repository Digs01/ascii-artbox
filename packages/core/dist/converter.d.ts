import { AsciiOptions } from './utils';
/**
 * Standard ASCII conversion (luminance → character).
 */
export declare function imageToAscii(input: Buffer | string, options?: AsciiOptions): Promise<string>;
