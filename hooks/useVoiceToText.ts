// import Voice from "@react-native-voice/voice";
// import { useEffect, useState } from "react";

// export const useVoiceToText = (setRequest: (text: string) => void) => {
//   const [isRecording, setIsRecording] = useState(false);

//   useEffect(() => {
//     Voice.onSpeechResults = (event) => {
//       const text = event.value?.[0];
//       if (text) {
//         setRequest(text); // 🔥 LIVE TEXT UPDATE
//       }
//     };

//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

//   const startRecording = async () => {
//     setIsRecording(true);
//     await Voice.start("en-US"); // or "en-IN"
//   };

//   const stopRecording = async () => {
//     setIsRecording(false);
//     await Voice.stop();
//   };

//   return {
//     isRecording,
//     startRecording,
//     stopRecording,
//   };
// };
