import { default as React } from 'react';
import { UseAsciiPlayerProps } from './useAsciiPlayer';

export interface AsciiAnimationProps extends UseAsciiPlayerProps {
    color?: string;
    backgroundColor?: string;
    className?: string;
    style?: React.CSSProperties;
    prefersReducedMotion?: boolean;
}
export declare const AsciiAnimation: React.FC<AsciiAnimationProps>;
