
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface AudioMetrics {
    bass: number;   // 0-1
    mid: number;    // 0-1
    treble: number; // 0-1
    volume: number; // 0-1
}

export function useAudioAnalyzer() {
    const [isListening, setIsListening] = useState(false);
    const [sourceType, setSourceType] = useState<'mic' | 'file' | 'none'>('none');

    // Audio Context Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);

    // File Audio Refs
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);

    // Stream Destination for Recording
    const streamDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

    // Initialize Audio Context
    const initAudio = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 512;
            analyserRef.current.smoothingTimeConstant = 0.8;

            gainNodeRef.current = audioContextRef.current.createGain();
            gainNodeRef.current.gain.value = 1.0;

            // Create Stream Destination for recording
            streamDestinationRef.current = audioContextRef.current.createMediaStreamDestination();

            // Connect Gain to Analyser AND Stream Destination
            gainNodeRef.current.connect(analyserRef.current);
            gainNodeRef.current.connect(streamDestinationRef.current);

            const bufferLength = analyserRef.current.frequencyBinCount;
            dataArrayRef.current = new Uint8Array(bufferLength);
        }
        return audioContextRef.current;
    }, []);

    const startMic = async () => {
        try {
            const ctx = initAudio();
            if (ctx.state === 'suspended') await ctx.resume();

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            if (sourceRef.current) sourceRef.current.disconnect();

            const source = ctx.createMediaStreamSource(stream);
            source.connect(gainNodeRef.current!);

            // Note: For mic, we DON'T connect to ctx.destination to avoid feedback loop
            // But it IS connected to streamDestinationRef via gainNode

            sourceRef.current = source;
            setSourceType('mic');
            setIsListening(true);
        } catch (err) {
            console.error("Failed to access microphone", err);
            setIsListening(false);
        }
    };

    const startFile = async (file: File) => {
        try {
            const ctx = initAudio();
            if (ctx.state === 'suspended') await ctx.resume();

            if (audioElementRef.current) {
                audioElementRef.current.pause();
                audioElementRef.current.src = '';
            }

            const url = URL.createObjectURL(file);
            const audio = new Audio(url);
            audio.crossOrigin = "anonymous";
            audio.loop = true;
            audioElementRef.current = audio;

            if (sourceRef.current) sourceRef.current.disconnect();

            const source = ctx.createMediaElementSource(audio);
            source.connect(gainNodeRef.current!);

            // For file, we ALSO connect to speakers
            gainNodeRef.current!.connect(ctx.destination);

            sourceRef.current = source;
            await audio.play();
            setSourceType('file');
            setIsListening(true);
        } catch (err) {
            console.error("Failed to play audio file", err);
            setIsListening(false);
        }
    };

    const stopAudio = () => {
        if (sourceRef.current) sourceRef.current.disconnect();
        if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current = null;
        }
        setSourceType('none');
        setIsListening(false);
    };

    const getAudioMetrics = useCallback((): AudioMetrics => {
        if (!analyserRef.current || !dataArrayRef.current || !isListening) {
            return { bass: 0, mid: 0, treble: 0, volume: 0 };
        }
        analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
        const data = dataArrayRef.current;
        const length = data.length;

        let bassSum = 0, midSum = 0, trebleSum = 0, totalSum = 0;
        for (let i = 0; i < 10; i++) bassSum += data[i];
        for (let i = 10; i < 60; i++) midSum += data[i];
        for (let i = 60; i < length; i++) trebleSum += data[i];
        for (let i = 0; i < length; i++) totalSum += data[i];

        const normalize = (val: number, count: number) => {
            const avg = val / count;
            return Math.min(1, Math.pow(avg / 255, 0.8) * 1.5);
        };

        return {
            bass: normalize(bassSum, 10),
            mid: normalize(midSum, 50),
            treble: normalize(trebleSum, length - 60),
            volume: normalize(totalSum, length)
        };
    }, [isListening]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    return useMemo(() => ({
        isListening,
        sourceType,
        startMic,
        startFile,
        stopAudio,
        getAudioMetrics,
        audioContext: audioContextRef.current,
        outputStream: streamDestinationRef.current?.stream
    }), [isListening, sourceType, startMic, startFile, stopAudio, getAudioMetrics]);
}

