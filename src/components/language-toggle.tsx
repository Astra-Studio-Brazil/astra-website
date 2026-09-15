"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { getLang, getStoredLang, setLang, subscribeLang, type Lang } from "@/lib/lang";

const OPTIONS: Lang[] = ["en", "pt"];

export function LanguageToggle() {
  const lang = useSyncExternalStore(subscribeLang, getLang, (): Lang => "en");

  // Strict Mode's development remount resets the attributes the inline script
  // set on <html>; put the saved language back before paint.
  useLayoutEffect(() => {
    const stored = getStoredLang();
    if (stored && stored !== getLang()) setLang(stored);
  }, []);

  return (
    <div className="lang" role="group" aria-label="Idioma · Language">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          data-l={option}
          aria-pressed={lang === option}
          onClick={() => setLang(option)}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
