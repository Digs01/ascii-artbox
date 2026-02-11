export interface RenderOptions {
    width?: number;
    height?: number;
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    fontFamily?: string;
    lineHeight?: number;
}
export declare function renderAsciiFrameToBuffer(text: string, options?: RenderOptions): Promise<Buffer>;
/**
 * Creates an MP4 video from ASCII frames.
 * Returns the path to the generated video file.
 * The caller is responsible for deleting the file after use.
 */
export declare function createAsciiVideo(frames: string[], fps: number, options?: RenderOptions): Promise<string>;
