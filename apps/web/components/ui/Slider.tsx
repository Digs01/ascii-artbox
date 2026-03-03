
import React from 'react';

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (val: number) => void;
    valueDisplay?: string;
}

export const Slider: React.FC<SliderProps> = ({ label, value, min, max, step = 1, onChange, valueDisplay }) => {
    return (
        <div className="space-y-2 group">
            <div className="flex justify-between items-center text-xs uppercase tracking-wider text-text-muted group-hover:text-text-secondary transition-colors font-bold">
                <label>{label}</label>
                <span className="font-mono text-text-primary bg-black px-1.5 py-0.5 rounded text-[10px]">{valueDisplay || value}</span>
            </div>

            {/* Custom slider track and thumb */}
            <div className="relative h-2 bg-surface-active rounded-full overflow-visible group-hover:bg-surface-hover/80 transition-colors">
                {/* Track fill */}
                <div
                    className="absolute top-0 left-0 h-full bg-accent-primary transition-all duration-150 ease-out rounded-full"
                    style={{ width: `${((value - min) / (max - min)) * 100}%` }}
                />

                {/* Thumb */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-accent-primary pointer-events-none transition-transform group-hover:scale-110"
                    style={{ left: `calc(${((value - min) / (max - min)) * 100}% - 8px)` }}
                />

                {/* Invisible native input for interaction */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
            </div>
        </div>
    );
};
