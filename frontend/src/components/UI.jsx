import { useVoiceLang } from "../context/VoiceLangContext";
import { useSpeechToText } from "../hooks/useSpeechToText";

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon, accent = "primary" }) {
  const accentMap = {
    primary: "bg-primary-50 text-primary-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <Card className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${accentMap[accent]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </Card>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-primary-600 hover:bg-primary-700 text-white",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700",
    danger: "bg-red-50 hover:bg-red-100 text-red-600",
  };
  return (
    <button
      className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="text-sm font-medium text-slate-700 mb-1 block">{label}</span>}
      <input
        className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`}
        {...props}
      />
    </label>
  );
}

// A text Input with a built-in microphone button for voice dictation (English/Marathi,
// toggled globally via the language switcher in the Navbar). Falls back to a plain
// input with no mic icon in browsers that don't support the Web Speech API.
export function VoiceInput({ label, className = "", value, onChange, name, ...props }) {
  const { lang } = useVoiceLang();
  const { isListening, isSupported, error, startListening } = useSpeechToText();

  const handleMicClick = () => {
    startListening(lang, (transcript) => {
      // Append to existing text rather than overwrite, so users can dictate in a few bursts.
      const next = value ? `${value} ${transcript}` : transcript;
      onChange({ target: { name, value: next } });
    });
  };

  return (
    <label className="block">
      {label && <span className="text-sm font-medium text-slate-700 mb-1 block">{label}</span>}
      <div className="flex gap-2 items-stretch">
        <input
          name={name}
          value={value}
          onChange={onChange}
          className={`flex-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`}
          {...props}
        />
        {isSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            title={isListening ? "Listening..." : "Speak to fill this field"}
            className={`shrink-0 w-10 rounded-lg flex items-center justify-center text-lg transition ${
              isListening
                ? "bg-red-100 text-red-600 animate-pulse"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            🎤
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </label>
  );
}

export function Select({ label, children, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="text-sm font-medium text-slate-700 mb-1 block">{label}</span>}
      <select
        className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ children, color = "slate" }) {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}
