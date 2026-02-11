
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
        <div className="space-y-2">
            <div className="flex justify-between items-center text-xs uppercase tracking-wider text-zinc-500">
                <label>{label}</label>
                <span className="font-mono text-zinc-300">{valueDisplay || value}</span>
            </div>
            <div className="relative h-2 bg-zinc-900 rounded-full overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full bg-white transition-all duration-150 ease-out"
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
