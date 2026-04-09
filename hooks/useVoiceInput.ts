import { Audio } from "expo-av";
import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import { BASE_URL } from "../lib/config/apiConfig";

const BACKEND_URL = `${BASE_URL}/transcribe`;

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [meteringLevel, setMeteringLevel] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const cancelledRef = useRef(false);

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
    cancelledRef.current = false;
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

    if (cancelledRef.current || !uri) return null;

    setIsTranscribing(true);
    try {
      const formData = new FormData();
      const isAndroid = Platform.OS === "android";

      // Constructing the file object for the backend Multer 'file' field
      formData.append("file", {
        uri,
        type: isAndroid ? "audio/mp4" : "audio/m4a",
        name: isAndroid ? "voice.mp4" : "voice.m4a",
      } as any);

      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: {
          // Content-Type is OMITTED here so the boundary is set correctly
          Accept: "application/json",
        },
        body: formData,
      });

      const data = await res.json();

      // Your backend returns the same structure as OpenAI (response.data)
      return data.text ?? null;
    } catch (err) {
      console.error("Transcription error via backend:", err);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const cancel = useCallback(async () => {
    cancelledRef.current = true;
    setIsRecording(false);
    setMeteringLevel(0);
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }
  }, []);

  return { isRecording, isTranscribing, meteringLevel, start, stop, cancel };
}
