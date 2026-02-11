import { getLuminance, getGlyph, SIMPLE_CHARSET } from './utils';

describe('utils', () => {
    describe('getLuminance', () => {
        it('should calculate correct luminance for white', () => {
            expect(getLuminance(255, 255, 255)).toBeCloseTo(255);
        });

        it('should calculate correct luminance for black', () => {
            expect(getLuminance(0, 0, 0)).toBe(0);
        });

        it('should weight green highest', () => {
            const r = getLuminance(255, 0, 0);
            const g = getLuminance(0, 255, 0);
            const b = getLuminance(0, 0, 255);
            expect(g).toBeGreaterThan(r);
            expect(g).toBeGreaterThan(b);
        });
    });

    describe('getGlyph', () => {
        it('should return first char for 0 luminance', () => {
            expect(getGlyph(0, SIMPLE_CHARSET)).toBe(SIMPLE_CHARSET[0]);
        });

        it('should return last char for 255 luminance', () => {
            expect(getGlyph(255, SIMPLE_CHARSET)).toBe(SIMPLE_CHARSET[SIMPLE_CHARSET.length - 1]);
        });

        it('should handle invert', () => {
            expect(getGlyph(0, SIMPLE_CHARSET, true)).toBe(SIMPLE_CHARSET[SIMPLE_CHARSET.length - 1]);
        });
    });
});
