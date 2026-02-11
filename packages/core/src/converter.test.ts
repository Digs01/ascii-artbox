import { imageToAscii } from './converter';
import sharp from 'sharp';

describe('converter', () => {
    it('should convert a simple black image to spaces', async () => {
        // Create 10x10 black image
        const buffer = await sharp({
            create: {
                width: 10,
                height: 10,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 255 }
            }
        }).png().toBuffer();

        const ascii = await imageToAscii(buffer, { width: 10, height: 10 });
        const lines = ascii.trim().split('\n');
        expect(lines.length).toBe(10);
        // Expect last char of SIMPLE_CHARSET (@)
        expect(lines[0]).toMatch(/^@+$/);
    });
});
