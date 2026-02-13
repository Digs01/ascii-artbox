import { useState, useCallback, useMemo } from 'react';

interface HistoryState<T> {
    past: T[];
    present: T;
    future: T[];
}

export function useHistory<T>(initialPresent: T) {
    const [state, setState] = useState<HistoryState<T>>({
        past: [],
        present: initialPresent,
        future: [],
    });

    const canUndo = state.past.length > 0;
    const canRedo = state.future.length > 0;

    const undo = useCallback(() => {
        setState((currentState) => {
            const { past, present, future } = currentState;
            if (past.length === 0) return currentState;

            const newPresent = past[past.length - 1];
            const newPast = past.slice(0, past.length - 1);

            return {
                past: newPast,
                present: newPresent,
                future: [present, ...future],
            };
        });
    }, []);

    const redo = useCallback(() => {
        setState((currentState) => {
            const { past, present, future } = currentState;
            if (future.length === 0) return currentState;

            const newPresent = future[0];
            const newFuture = future.slice(1);

            return {
                past: [...past, present],
                present: newPresent,
                future: newFuture,
            };
        });
    }, []);

    const set = useCallback((newPresent: T | ((curr: T) => T)) => {
        setState((currentState) => {
            const { past, present } = currentState;
            const value = newPresent instanceof Function ? newPresent(present) : newPresent;

            if (value === present) return currentState;

            return {
                past: [...past, present],
                present: value,
                future: [],
            };
        });
    }, []);

    const replace = useCallback((newPresent: T | ((curr: T) => T)) => {
        setState((currentState) => {
            const { past, present, future } = currentState;
            const value = newPresent instanceof Function ? newPresent(present) : newPresent;

            return {
                past,
                present: value,
                future,
            };
        });
    }, []);

    const reset = useCallback((newPresent: T) => {
        setState({
            past: [],
            present: newPresent,
            future: []
        })
    }, []);

    return { state: state.present, set, replace, undo, redo, canUndo, canRedo, reset, historyState: state };
}
