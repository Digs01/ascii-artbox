/**
 * Simple Zero-Width Steganography Utility
 * Encodes text into invisible characters (Zero-Width Non-Joiner and Zero-Width Joiner)
 * wrapped in Zero-Width Space delimiters.
 */

// Characters used for encoding
const ZERO_WIDTH_SPACE = '\u200B'; // Delimiter
const ZERO_WIDTH_NON_JOINER = '\u200C'; // Represents binary 0
const ZERO_WIDTH_JOINER = '\u200D'; // Represents binary 1

export const steganography = {
    /**
     * Encodes a secret string into invisible zero-width characters.
     * @param secret The message to hide.
     * @returns A string of invisible characters containing the encoded message.
     */
    encode: (secret: string): string => {
        if (!secret) return '';

        const binary = secret
            .split('')
            .map((char) => {
                const bin = char.charCodeAt(0).toString(2);
                return '0'.repeat(8 - bin.length) + bin; // Pad to 8 bits
            })
            .join('');

        const encoded = binary
            .split('')
            .map((bit) => (bit === '0' ? ZERO_WIDTH_NON_JOINER : ZERO_WIDTH_JOINER))
            .join('');

        // Wrap in delimiters to detect start/end easily
        return `${ZERO_WIDTH_SPACE}${encoded}${ZERO_WIDTH_SPACE}`;
    },

    /**
     * Decodes a hidden zero-width string back into text.
     * Scans the input for the specific invisible delimiters.
     * @param text The text containing the hidden message.
     * @returns The decoded secret message, or null if none found.
     */
    decode: (text: string): string | null => {
        if (!text) return null;

        // Regex to find content between Zero-Width Space delimiters
        // Matches any sequence of ZWNJ and ZWJ
        const pattern = new RegExp(`${ZERO_WIDTH_SPACE}([${ZERO_WIDTH_NON_JOINER}${ZERO_WIDTH_JOINER}]+)${ZERO_WIDTH_SPACE}`);
        const match = text.match(pattern);

        if (!match) return null;

        const encodedBinary = match[1];
        let binaryString = '';

        for (const char of encodedBinary) {
            if (char === ZERO_WIDTH_NON_JOINER) binaryString += '0';
            if (char === ZERO_WIDTH_JOINER) binaryString += '1';
        }

        // Split into 8-bit chunks and convert to characters
        const bytes = binaryString.match(/.{1,8}/g);
        if (!bytes) return null;

        return bytes.map((byte) => String.fromCharCode(parseInt(byte, 2))).join('');
    },

    /**
     * Embeds a secret message into a cover text (appends it).
     * @param coverText The visible ASCII art or text.
     * @param secret The message to hide.
     */
    embed: (coverText: string, secret: string): string => {
        const hidden = steganography.encode(secret);
        return coverText + hidden;
    }
};
