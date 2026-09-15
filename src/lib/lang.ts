export type Lang = "pt" | "en";

const STORAGE_KEY = "astra:lang";
const listeners = new Set<() => void>();

/**
 * Inline <head> script. Every text on the page is rendered in both languages
 * and CSS shows the one matching <html data-lang>, so restoring the saved
 * choice before the first paint is all it takes to avoid a flash.
 */
export const LANG_SCRIPT = `try{if(localStorage.getItem("${STORAGE_KEY}")==="pt"){document.documentElement.dataset.lang="pt";document.documentElement.lang="pt-BR"}}catch(e){}`;

export function getLang(): Lang {
  return document.documentElement.dataset.lang === "pt" ? "pt" : "en";
}

export function getStoredLang(): Lang | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "pt" || stored === "en" ? stored : null;
  } catch {
    return null;
  }
}

export function setLang(lang: Lang) {
  const root = document.documentElement;
  root.dataset.lang = lang;
  root.lang = lang === "en" ? "en" : "pt-BR";
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Private mode: the choice just won't persist.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeLang(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
