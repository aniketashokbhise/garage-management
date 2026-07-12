import { useCallback, useRef, useState } from "react";

// Wraps the browser's built-in SpeechRecognition API (Web Speech API).
// This runs entirely in the browser — no API keys, no server calls, and it
// works out of the box in Chrome / Edge on desktop and Android.
// NOTE: Safari and Firefox have little/no support for this API as of writing;
// callers should check `isSupported` and hide/disable the mic button if false.
export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);

  const SpeechRecognitionCtor =
    typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const isSupported = Boolean(SpeechRecognitionCtor);

  // lang: BCP-47 code, e.g. "en-IN" for English (India) or "mr-IN" for Marathi.
  // onResult: called with the final recognized text once speech ends.
  const startListening = useCallback(
    (lang, onResult) => {
      if (!isSupported) {
        setError("Voice input isn't supported in this browser. Try Chrome or Edge.");
        return;
      }
      if (isListening) return;

      const recognition = new SpeechRecognitionCtor();
      recognition.lang = lang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setError("");
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join(" ")
          .trim();
        if (transcript) onResult(transcript);
      };

      recognition.onerror = (event) => {
        if (event.error === "no-speech") {
          setError("Didn't catch that — try again.");
        } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setError("Microphone access was blocked. Allow mic access and try again.");
        } else {
          setError("Voice input failed. Please try again.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    },
    [isListening, isSupported, SpeechRecognitionCtor]
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { isListening, isSupported, error, startListening, stopListening };
}
