"use client";

import { useEffect, useRef } from "react";
import { getLang, subscribeLang } from "@/lib/lang";
import { SITE } from "@/lib/site";
import { skyTime } from "@/lib/sky-time";
import { CONSTELLATIONS } from "./constellations";
import { SkyRenderer, type Meteor } from "./renderer";

const REVEAL_SECONDS = 4.2;
/** Sky seconds per real second while the visitor holds the pointer down. */
const TIMELAPSE_RATE = 3600;
const HOLD_DELAY_MS = 200;
const PARALLAX_PX = 14;
const LABEL_RADIUS_PX = 28;

/**
 * The sky above Rua Quatá, 200 right now. Stars near the pointer brighten and
 * named ones reveal themselves; holding the pointer down runs time forward,
 * leaving star trails, and letting go rewinds to the present.
 */
export function Sky() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const constellationRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const label = labelRef.current!;
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sky = new SkyRenderer(canvas, SITE.latitude, SITE.longitude);
    const reveal = reducedMotion ? 0 : root.dataset.intro === "short" ? 1.2 : REVEAL_SECONDS;

    const pointer = { x: 0, y: 0, inside: false, lantern: 0, shiftX: 0, shiftY: 0 };
    let holding = false;
    let holdTimer = 0;
    let touchTimer = 0;
    let offset = 0; // seconds ahead of now
    let velocity = 0; // extra sky seconds per real second
    let meteor: Meteor | null = null;
    let meteorStart = 0;
    let meteorLife = 0;
    let nextMeteor = 12 + Math.random() * 20;
    let labelled = -1;
    let frame = 0;
    const start = performance.now();
    let last = start;

    const drawStatic = () =>
      sky.draw({
        time: Date.now(),
        elapsed: 0,
        reveal: 0,
        twinkle: false,
        pointerX: 0,
        pointerY: 0,
        lantern: 0,
        shiftX: 0,
        shiftY: 0,
        fade: 1,
        meteor: null,
      });

    const resize = () => {
      sky.resize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 2));
      if (reducedMotion) drawStatic();
    };

    const updateLabel = () => {
      const star =
        pointer.inside && offset === 0
          ? sky.namedStarNear(pointer.x, pointer.y, LABEL_RADIUS_PX)
          : null;
      if (!star) {
        label.classList.remove("is-visible");
        return;
      }
      if (star.index !== labelled) {
        labelled = star.index;
        nameRef.current!.textContent = star.name;
        constellationRef.current!.textContent = CONSTELLATIONS[star.constellation]?.[getLang()] ?? "";
      }
      label.classList.toggle("is-flipped", star.x > window.innerWidth - 260);
      label.style.transform = `translate3d(${star.x}px, ${star.y}px, 0)`;
      label.classList.add("is-visible");
    };

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      const elapsed = (now - start) / 1000;
      last = now;

      if (holding) {
        velocity += (TIMELAPSE_RATE - velocity) * (1 - Math.exp(-dt * 2.5));
      } else if (offset > 0) {
        // Critically damped spring back to the present.
        velocity += (-16 * offset - 8 * velocity) * dt;
      }
      offset += velocity * dt;
      if (!holding && (offset <= 0 || (offset < 30 && Math.abs(velocity) < 60))) {
        offset = 0;
        velocity = 0;
      }
      skyTime.offset = offset * 1000;

      const ease = 1 - Math.exp(-dt * 4);
      pointer.lantern += ((pointer.inside ? 1 : 0) - pointer.lantern) * ease;
      const towardX = pointer.inside ? pointer.x / window.innerWidth - 0.5 : 0;
      const towardY = pointer.inside ? pointer.y / window.innerHeight - 0.5 : 0;
      pointer.shiftX += (-towardX * 2 * PARALLAX_PX - pointer.shiftX) * ease;
      pointer.shiftY += (-towardY * 2 * PARALLAX_PX - pointer.shiftY) * ease;

      if (!meteor && offset === 0 && elapsed > nextMeteor) {
        const angle = (Math.random() < 0.5 ? 18 : 142) + Math.random() * 20;
        meteor = {
          x: window.innerWidth * (0.15 + Math.random() * 0.7),
          y: window.innerHeight * (0.05 + Math.random() * 0.4),
          dx: Math.cos((angle * Math.PI) / 180),
          dy: Math.sin((angle * Math.PI) / 180),
          length: 90 + Math.random() * 110,
          progress: 0,
        };
        meteorStart = elapsed;
        meteorLife = 0.7 + Math.random() * 0.5;
      }
      if (meteor) {
        meteor.progress = (elapsed - meteorStart) / meteorLife;
        if (meteor.progress >= 1) {
          meteor = null;
          nextMeteor = elapsed + 25 + Math.random() * 35;
        }
      }

      sky.draw({
        time: Date.now() + skyTime.offset,
        elapsed,
        reveal,
        twinkle: true,
        pointerX: pointer.x,
        pointerY: pointer.y,
        lantern: pointer.lantern,
        shiftX: pointer.shiftX,
        shiftY: pointer.shiftY,
        fade: Math.max(0.05, 1 - Math.abs(velocity) / 900),
        meteor,
      });
      updateLabel();
      frame = requestAnimationFrame(render);
    };

    const release = () => {
      window.clearTimeout(holdTimer);
      holding = false;
      root.classList.remove("is-holding");
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.inside = true;
      if (reducedMotion) updateLabel();
    };

    const onPointerDown = (event: PointerEvent) => {
      onPointerMove(event);
      window.clearTimeout(touchTimer);
      const target = event.target as Element;
      if (reducedMotion || event.button !== 0 || target.closest("a, button, [data-hover]")) return;
      holdTimer = window.setTimeout(() => {
        holding = true;
        root.classList.add("is-holding");
      }, HOLD_DELAY_MS);
    };

    const onPointerUp = (event: PointerEvent) => {
      release();
      // Touch has no hover: keep the tapped star lit for a moment.
      if (event.pointerType !== "mouse") {
        touchTimer = window.setTimeout(() => {
          pointer.inside = false;
          if (reducedMotion) updateLabel();
        }, 2500);
      }
    };

    const onPointerLeave = () => {
      pointer.inside = false;
      release();
      if (reducedMotion) updateLabel();
    };

    const onContextMenu = (event: Event) => {
      if (holding) event.preventDefault();
    };

    const onVisibilityChange = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reducedMotion) {
        last = performance.now();
        frame = requestAnimationFrame(render);
      }
    };

    const unsubscribeLang = subscribeLang(() => {
      labelled = -1;
      updateLabel();
    });

    resize();
    if (!reducedMotion) frame = requestAnimationFrame(render);

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", onPointerLeave);
    window.addEventListener("contextmenu", onContextMenu);
    root.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    console.log(
      "%cASTRA STUDIO%c\nPer aspera ad astra.",
      "font: 300 14px Georgia, serif; letter-spacing: 0.4em",
      "font: italic 12px Georgia, serif; color: #8a8a8a",
    );

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(holdTimer);
      window.clearTimeout(touchTimer);
      unsubscribeLang();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", onPointerLeave);
      window.removeEventListener("contextmenu", onContextMenu);
      root.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      root.classList.remove("is-holding");
      skyTime.offset = 0;
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="sky" aria-hidden="true" />
      <div ref={labelRef} className="star-label" aria-hidden="true">
        <span ref={nameRef} className="star-label__name" />
        <span ref={constellationRef} className="star-label__constellation" />
      </div>
    </>
  );
}
