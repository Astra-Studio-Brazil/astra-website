"use client";

import { useEffect, useRef } from "react";
import { SITE } from "@/lib/site";
import { skyNow, skyTime } from "@/lib/sky-time";

const TIME = new Intl.DateTimeFormat("pt-BR", {
  timeZone: SITE.timeZone,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** São Paulo time. Runs ahead with the sky while the visitor holds it. */
export function Clock() {
  const timeRef = useRef<HTMLTimeElement>(null);
  const offsetRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const time = TIME.format(skyNow());
      const offset = formatOffset(skyTime.offset);
      if (timeRef.current && timeRef.current.textContent !== time) {
        timeRef.current.textContent = time;
      }
      if (offsetRef.current && offsetRef.current.textContent !== offset) {
        offsetRef.current.textContent = offset;
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <time ref={timeRef} className="clock" suppressHydrationWarning>
        --:--:--
      </time>
      <span ref={offsetRef} className="clock__offset" aria-hidden="true" />
    </>
  );
}

function formatOffset(ms: number) {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "";
  return `+${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}
