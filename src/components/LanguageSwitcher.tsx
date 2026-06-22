import { useEffect, useRef, useState } from "react";
import { LANGUAGES, useTranslation, type Language } from "../i18n";

const LABEL_KEY: Record<Language, string> = {
  en: "language.english",
  hu: "language.hungarian",
};

const SHORT_LABEL: Record<Language, string> = {
  en: "EN",
  hu: "HU",
};

// Compact dropdown reused in both the authenticated Topbar and the public
// LandingNavbar. Closed state only ever shows the current language's short
// code ("HU"/"EN"), so the trigger button stays a fixed, narrow size
// regardless of language — unlike a native <select>, whose closed-state
// width follows the selected <option> text and previously made this
// control balloon to form-field size. Opening reveals the full language
// names ("Magyar"/"English") in a small menu, same interaction pattern as
// CustomSelect.tsx elsewhere in the app. i18n logic (useTranslation,
// setLanguage) and localStorage persistence are untouched — this is a
// pure presentation change.
export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("common.appName")}
        className="flex h-9 items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-white transition hover:bg-white/10"
      >
        {SHORT_LABEL[language]}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-32 overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              role="option"
              aria-selected={lang === language}
              onClick={() => {
                setLanguage(lang);
                setOpen(false);
              }}
              className={`flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-orange-500/10 hover:text-orange-400 ${
                lang === language ? "bg-orange-500/15 text-orange-400" : "text-slate-300"
              }`}
            >
              {t(LABEL_KEY[lang])}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
