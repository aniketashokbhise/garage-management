import { useAuth } from "../context/AuthContext";
import { useVoiceLang, VOICE_LANGUAGES } from "../context/VoiceLangContext";

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { lang, setLang } = useVoiceLang();

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <button
        className="lg:hidden text-2xl text-slate-600"
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        ☰
      </button>
      <div className="hidden lg:block text-sm text-slate-500">
        {user?.workshopName}
      </div>
      <div className="flex items-center gap-3">
        <label className="text-xs text-slate-500 flex items-center gap-1.5">
          <span className="hidden sm:inline">🎤 Voice:</span>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {VOICE_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <span className="text-sm font-medium text-slate-700 hidden sm:inline">
          {user?.name}
        </span>
        <button
          onClick={logout}
          className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
