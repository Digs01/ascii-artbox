import { useState, useRef, useCallback, useEffect } from 'react';

// Polyfill types for Region Capture
declare global {
    class CropTarget {
        static fromElement(element: Element): Promise<CropTarget>;
    }
    interface MediaStreamTrack {
        cropTo(cropTarget: CropTarget | null): Promise<void>;
    }
}

interface UseScreenRecorderProps {
    cropTargetRef?: React.RefObject<HTMLElement>;
    externalStream?: MediaStream | null; // For canvas recording
    audioStream?: MediaStream | null; // For direct audio injection
}

interface UseScreenRecorderReturn {
    isRecording: boolean;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    recordingTime: number; // in seconds
    recordingError: string | null;
}

export function useScreenRecorder({ cropTargetRef, externalStream, audioStream }: UseScreenRecorderProps = {}): UseScreenRecorderReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordingError, setRecordingError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startRecording = useCallback(async () => {
        try {
            let stream: MediaStream;

            if (externalStream) {
                // Use provided stream (Canvas)
                if (!externalStream.active) {
                    setRecordingError("Internal Canvas Stream is inactive. Try checking generator.");
                    return;
                }
                stream = externalStream;
                streamRef.current = stream;
                setRecordingError(null);
                console.log("Using External Canvas Stream for recording.");
            } else {
                // Request Screen Share (Legacy/Fallback)
                const displayMediaOptions: DisplayMediaStreamOptions = {
                    video: { frameRate: 60 },
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                    },
                    // @ts-ignore
                    preferCurrentTab: true,
                    selfBrowserSurface: 'include',
                    // @ts-ignore
                    cursor: "never"
                };

                stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
                streamRef.current = stream;

                // ... Region Capture Logic ...
                const track = stream.getVideoTracks()[0];
                const settings = track.getSettings();

                if (settings.displaySurface !== 'browser') {
                    const msg = "⚠️ WRONG SELECTION: You selected '" + settings.displaySurface + "'. You MUST select 'This Tab' to record just the art.";
                    // We can't use the hook here easily if this function is outside component scope or if hook rules apply.
                    // But useScreenRecorder IS a hook, so we can call useToast at top level.
                    // However, I need to check if useScreenRecorder imports useToast.
                    setRecordingError(msg);
                    return; // Return early instead of alert
                }

                if (cropTargetRef?.current && (window as any).CropTarget) {
                    try {
                        // @ts-ignore
                        const cropTarget = await CropTarget.fromElement(cropTargetRef.current);
                        // @ts-ignore
                        await track.cropTo(cropTarget);
                        console.log("Region Capture applied.");
                        setRecordingError(null);
                    } catch (cropError) {
                        console.warn("Region Capture failed:", cropError);
                        if (settings.displaySurface === 'browser') {
                            setRecordingError("Auto-crop failed internally: " + cropError);
                        }
                    }
                }
            }
            const track = stream.getVideoTracks()[0];
            const settings = track.getSettings();

            console.log("Region Capture Debug:", {
                supported: !!(window as any).CropTarget,
                ref: !!cropTargetRef?.current,
                surface: settings.displaySurface
            });

            // Check if user selected the correct surface type for Region Capture
            if (settings.displaySurface !== 'browser') {
                const msg = "⚠️ WRONG SELECTION: You selected '" + settings.displaySurface + "'. You MUST select 'This Tab' to record just the art.";
                alert(msg);
                setRecordingError(msg);
            }

            // --- REGION CAPTURE IMPLEMENTATION ---
            if (cropTargetRef?.current && (window as any).CropTarget) {
                try {
                    // Only attempt crop if we think it's possible (or just try anyway)
                    // Create a CropTarget from the DOM element
                    // @ts-ignore
                    const cropTarget = await CropTarget.fromElement(cropTargetRef.current);

                    // Apply cropping to the video track
                    // @ts-ignore
                    await track.cropTo(cropTarget);

                    console.log("Region Capture applied successfully.");
                    setRecordingError(null); // Clear any previous errors if successful
                } catch (cropError) {
                    console.warn("Region Capture failed:", cropError);
                    alert("Region Capture Error: " + cropError);
                    // It's possible the user selected "This Tab" but something else went wrong.
                    // But usually displaySurface check catches the main user error.
                    if (settings.displaySurface === 'browser') {
                        setRecordingError("Auto-crop failed internally: " + cropError);
                    }
                }
            } else {
                if (!(window as any).CropTarget) {
                    const msg = "Your browser does not support Region Capture (Auto-Crop). Please use latest Chrome/Edge.";
                    alert(msg);
                    setRecordingError(msg);
                } else if (!cropTargetRef?.current) {
                    alert("Internal Error: Capture Target not found.");
                }
            }
            // -------------------------------------

            // Handle user stopping via browser UI
            stream.getVideoTracks()[0].onended = () => {
                stopRecording();
            };

            // Combine video from screen/canvas with audio from audioStream if available
            let recordingStream = stream;
            if (audioStream && audioStream.getAudioTracks().length > 0) {
                const audioTracks = audioStream.getAudioTracks();
                const videoTracks = stream.getVideoTracks();

                // Create a new stream mixing both
                recordingStream = new MediaStream([...videoTracks, ...audioTracks]);
                console.log("Audio tracks mixed into recording stream:", audioTracks.length);
            }

            const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
                ? 'video/webm; codecs=vp9'
                : 'video/webm';

            const mediaRecorder = new MediaRecorder(recordingStream, {
                mimeType,
                videoBitsPerSecond: 8000000 // 8 Mbps high quality
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                const url = URL.createObjectURL(blob);

                // Trigger Download
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `ascii-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
                document.body.appendChild(a);
                a.click();

                // Cleanup
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                // Stop all tracks ONLY if we created them (screen share)
                if (streamRef.current && !externalStream) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                streamRef.current = null;

                setRecordingTime(0);
                setIsRecording(false);
                if (timerRef.current) clearInterval(timerRef.current);
            };

            mediaRecorder.start(100); // Collect 100ms chunks
            setIsRecording(true);

            // Start Timer
            const startTime = Date.now();
            timerRef.current = setInterval(() => {
                setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);

        } catch (err) {
            console.error("Error starting screen recording:", err);
            setRecordingError("Failed to start recording: " + err);
            setIsRecording(false);
        }
    }, [cropTargetRef, externalStream, audioStream]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) clearInterval(timerRef.current);
    }, []);

    return {
        isRecording,
        startRecording,
        stopRecording,
        recordingTime,
        recordingError
    };
}
