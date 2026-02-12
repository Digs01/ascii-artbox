"use client";

import React from 'react';
import { useAsciiPlayer, UseAsciiPlayerProps } from './useAsciiPlayer';

export interface AsciiAnimationProps extends UseAsciiPlayerProps {
    color?: string;
    backgroundColor?: string;
    className?: string;
    style?: React.CSSProperties;
    prefersReducedMotion?: boolean;
}

export const AsciiAnimation: React.FC<AsciiAnimationProps> = ({
    frames = [],
    fps,
    loop,
    autoPlay,
    onFrame,
    onEnd,
    color,
    backgroundColor,
    className,
    style,
    prefersReducedMotion = false
}) => {
    // Respect reduced motion preference by disabling autoPlay if requested
    const shouldAutoPlay = prefersReducedMotion ? false : autoPlay;

    const { currentFrame, toggle } = useAsciiPlayer({
        frames,
        fps,
        loop,
        autoPlay: shouldAutoPlay,
        onFrame,
        onEnd
    });

    const styles: React.CSSProperties = {
        fontFamily: 'monospace',
        whiteSpace: 'pre',
        lineHeight: '1em',
        overflow: 'hidden',
        display: 'inline-block',
        color: color || 'inherit',
        backgroundColor: backgroundColor || 'transparent',
        ...style
    };

    // Check if frame contains HTML (e.g. for color support)
    const isHtml = typeof currentFrame === 'string' && (currentFrame.includes('<span') || currentFrame.includes('<div'));

    return (
        <pre
            className={className}
            style={styles}
            onClick={toggle}
            role="img"
            aria-label="ASCII Animation"
            {...(isHtml ? { dangerouslySetInnerHTML: { __html: currentFrame } } : { children: currentFrame })}
        />
    );
};
