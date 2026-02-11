
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { AsciiAnimation } from './AsciiAnimation';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('AsciiAnimation', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const frames = ['frame1', 'frame2', 'frame3'];

    it('renders the first frame initially', () => {
        render(<AsciiAnimation frames={frames} />);
        expect(screen.getByRole('img')).toHaveTextContent('frame1');
    });

    it('advances frames over time', () => {
        render(<AsciiAnimation frames={frames} fps={1} />);
        expect(screen.getByRole('img')).toHaveTextContent('frame1');

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(screen.getByRole('img')).toHaveTextContent('frame2');

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(screen.getByRole('img')).toHaveTextContent('frame3');
    });

    it('loops by default', () => {
        render(<AsciiAnimation frames={frames} fps={1} />);
        act(() => {
            vi.advanceTimersByTime(3000); // frame1 -> frame2 -> frame3 -> frame1
        });
        expect(screen.getByRole('img')).toHaveTextContent('frame1');
    });
});
