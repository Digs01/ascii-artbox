
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
            <div className="flex justify-between items-center text-xs uppercase tracking-wider text-text-muted group-hover:text-text-secondary transition-colors font-medium">
                <label>{label}</label>
                <span className="font-mono text-text-primary">{valueDisplay || value}</span>
            </div>
            <div className="relative h-1.5 bg-surface-active rounded-full overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full bg-accent-primary transition-all duration-150 ease-out"
                    style={{ width: `${((value - min) / (max - min)) * 100}%` }}
                />
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
