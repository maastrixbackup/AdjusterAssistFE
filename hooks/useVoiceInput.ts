import { Audio } from "expo-av";
import { useCallback, useRef, useState } from "react";

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY ?? "";

export function useVoiceInput() {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [meteringLevel, setMeteringLevel] = useState(0);
    const recordingRef = useRef<Audio.Recording | null>(null);
    const cancelledRef = useRef(false); // ✅ ref instead of state

    const start = useCallback(async () => {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) throw new Error("Permission denied");

        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync({
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
            isMeteringEnabled: true,
        });

        recording.setOnRecordingStatusUpdate((status) => {
            if (status.metering !== undefined) {
                const normalized = Math.max(0, (status.metering + 60) / 60);
                setMeteringLevel(normalized);
            }
        });
        recording.setProgressUpdateInterval(100);

        recordingRef.current = recording;
        cancelledRef.current = false; // ✅ reset on every new recording
        setIsRecording(true);
    }, []);

    const stop = useCallback(async (): Promise<string | null> => {
        setIsRecording(false);
        const recording = recordingRef.current;
        if (!recording) return null;

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        recordingRef.current = null;
        setMeteringLevel(0);

        console.log("cancelled:", cancelledRef.current, "uri:", uri);

        if (cancelledRef.current || !uri) return null; // ✅ reads ref directly

        setIsTranscribing(true);
        try {
            const formData = new FormData();
            formData.append("file", {
                uri,
                type: "audio/m4a",
                name: "voice.m4a",
            } as any);
            formData.append("model", "whisper-1");

            console.log("calling whisper with key:", OPENAI_KEY.slice(0, 10));

            const res = await fetch(
                "https://api.openai.com/v1/audio/transcriptions",
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
                    body: formData,
                },
            );
            const data = await res.json();
            console.log("whisper response:", data);
            return data.text ?? null;
        } catch (err) {
            console.error("transcription error:", err);
            return null;
        } finally {
            setIsTranscribing(false);
        }
    }, []);

    const cancel = useCallback(async () => {
        cancelledRef.current = true; // ✅ set ref, not state
        setIsRecording(false);
        setMeteringLevel(0);
        if (recordingRef.current) {
            await recordingRef.current.stopAndUnloadAsync();
            recordingRef.current = null;
        }
    }, []);

    return { isRecording, isTranscribing, meteringLevel, start, stop, cancel };
}