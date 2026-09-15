"use client";

import { useEffect, useRef, useState } from "react";
import { T } from "@/components/t";
import { SITE } from "@/lib/site";

/** Copies the email address to the clipboard; the address shows on hover. */
export function Contact() {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  async function copy() {
    if (!(await copyText(SITE.email))) return;
    setCopied(true);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), 2400);
  }

  return (
    <div className="contact" data-copied={copied || undefined}>
      <button type="button" className="contact__button" onClick={copy}>
        <span className="contact__roll">
          <span className="contact__label">
            <T en="Write to us" pt="Escreva para nós" />
          </span>
          <span className="contact__email">{SITE.email}</span>
        </span>
        <svg className="contact__icon" viewBox="0 0 16 16" aria-hidden="true">
          <path className="contact__icon-copy" d="M5.5 5.5h7v7h-7zM3.5 10.5v-7h7" />
          <path className="contact__icon-check" d="M3 8.5l3.2 3L13 4.5" />
        </svg>
        <span className="sr-only">
          <T en="Copy email" pt="Copiar e-mail" />
        </span>
      </button>
      <span className="contact__status" role="status">
        {copied && <T en="Email copied" pt="E-mail copiado" />}
      </span>
    </div>
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // No Clipboard API (e.g. plain http): copy through a temporary selection.
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  }
}
