import axios from "axios";
import { Audio } from "expo-av";
import { useState } from "react";

export const useVoiceToText = (setRequest: (text: string) => void) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY;

  const startRecording = async () => {
    try {
      console.log("🎤 Start recording");
      await Audio.requestPermissionsAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error("Start recording error:", err);
    }
  };

  const stopRecording = async () => {
    console.log("⏹ Stop recording");

    if (!recording) return;

    setIsRecording(false);
    setIsProcessing(true);

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();

    if (uri) {
      await convertSpeechToText(uri);
    }

    setRecording(null);
    setIsProcessing(false);
  };

  const convertSpeechToText = async (uri: string) => {
    try {
      console.log("🚀 Sending to API...");
      const formData = new FormData();

      formData.append("file", {
        uri,
        name: "audio.m4a",
        type: "audio/m4a",
      } as any);

      formData.append("model", "whisper-1");

      const response = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer OPENAI_API_KEY`,
          },
        },
      );

      const text = response.data.text;

      if (text) {
        setRequest(text); // 🔥 AUTO FILL INPUT
      }
    } catch (error) {
      console.error("Speech to text error:", error);
    }
  };

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
  };
};
