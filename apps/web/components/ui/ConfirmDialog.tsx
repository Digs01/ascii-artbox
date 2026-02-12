'use client';

import React, { useEffect, useCallback } from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    variant?: 'danger' | 'neutral';
}

export function ConfirmDialog({
    isOpen,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isLoading = false,
    variant = 'neutral'
}: ConfirmDialogProps) {
    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isLoading) onCancel();
    }, [onCancel, isLoading]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={!isLoading ? onCancel : undefined}
            />

            {/* Modal */}
            <div className="relative bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-200 p-6">
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                    {description}
                </p>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variant === 'danger'
                                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-900/20'
                                : 'bg-white text-black hover:bg-zinc-200'
                            }`}
                    >
                        {isLoading && (
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        )}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
