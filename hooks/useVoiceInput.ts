import { Audio } from "expo-av";
import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";

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
            isMeteringEnabled: true,
            android: {
                extension: ".mp4",
                outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                audioEncoder: Audio.AndroidAudioEncoder.AAC,
                sampleRate: 16000,
                numberOfChannels: 1,
                bitRate: 128000,
            },
            ios: {
                extension: ".m4a",
                outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
                audioQuality: Audio.IOSAudioQuality.HIGH,
                sampleRate: 44100,
                numberOfChannels: 1,
                bitRate: 128000,
                linearPCMBitDepth: 16,
                linearPCMIsBigEndian: false,
                linearPCMIsFloat: false,
            },
            web: {},
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

        console.log("uri:", uri);
        if (cancelledRef.current || !uri) return null;

        setIsTranscribing(true);
        try {
            const formData = new FormData();
            const isAndroid = Platform.OS === "android";
            formData.append("file", {
                uri,
                type: isAndroid ? "audio/mp4" : "audio/m4a",
                name: isAndroid ? "voice.mp4" : "voice.m4a",
            } as any);
            formData.append("model", "whisper-1"); // ✅ already there

            console.log("sending to whisper...");
            const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${OPENAI_KEY}`,
                    "Content-Type": "multipart/form-data", // ✅ add this
                },
                body: formData,
            });

            const data = await res.json();
            console.log("whisper response:", JSON.stringify(data));
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