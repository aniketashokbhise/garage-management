import { createContext, useContext, useEffect, useState } from "react";

const VoiceLangContext = createContext(null);

export const VOICE_LANGUAGES = [
  { code: "en-IN", label: "English" },
  { code: "mr-IN", label: "मराठी" },
];

const STORAGE_KEY = "voiceInputLang";

export function VoiceLangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem(STORAGE_KEY) || "en-IN");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  return (
    <VoiceLangContext.Provider value={{ lang, setLang }}>{children}</VoiceLangContext.Provider>
  );
}

export function useVoiceLang() {
  const ctx = useContext(VoiceLangContext);
  if (!ctx) throw new Error("useVoiceLang must be used within a VoiceLangProvider");
  return ctx;
}
