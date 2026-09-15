import {
  createMilkyWay,
  loadStars,
  siderealTime,
  TINT_COUNT,
  type Dust,
  type Stars,
} from "./astro";
import { NAMED_STARS } from "./star-catalog";

const DEG = Math.PI / 180;
const TINTS = [
  "190,210,255",
  "220,230,255",
  "248,246,255",
  "255,243,226",
  "255,224,188",
  "255,200,156",
];
const LANTERN_RADIUS = 170;

export type Meteor = {
  x: number;
  y: number;
  /** Unit direction of travel. */
  dx: number;
  dy: number;
  length: number;
  /** 0 → 1 over the meteor's life. */
  progress: number;
};

export type Frame = {
  /** The moment (ms since epoch) the sky should show. */
  time: number;
  /** Seconds since the sky appeared; drives the reveal and the twinkle. */
  elapsed: number;
  /** Length of the reveal in seconds; 0 shows everything at once. */
  reveal: number;
  twinkle: boolean;
  /** Pointer in CSS pixels, and how strongly it lights nearby stars (0–1). */
  pointerX: number;
  pointerY: number;
  lantern: number;
  /** Parallax offset in CSS pixels for the brightest (nearest-looking) stars. */
  shiftX: number;
  shiftY: number;
  /** 1 clears every frame; lower values let stars leave trails. */
  fade: number;
  meteor: Meteor | null;
};

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const easeOut = (n: number) => 1 - (1 - n) ** 3;
// Dims stars close to the horizon, as the atmosphere does.
const horizon = (up: number) => clamp01((up - 0.02) / 0.25);

/**
 * Draws the real sky above an observer: stereographic projection centred on
 * the zenith, north up and east to the left, as when looking straight up.
 */
export class SkyRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly stars: Stars = loadStars();
  private readonly dust: Dust = createMilkyWay(9000);
  private readonly byTint: number[][] = Array.from({ length: TINT_COUNT }, () => []);
  private readonly glows = TINTS.map((rgb) => sprite(rgb, [1, 0.95, 0.32, 0.07]));
  private readonly haze = sprite("214,220,245", [1, 0.7, 0.35, 0.1]);
  private readonly sinLat: number;
  private readonly cosLat: number;

  /** Where each star was last drawn, in CSS pixels (NaN when not drawn). */
  readonly screenX: Float32Array;
  readonly screenY: Float32Array;

  private width = 0;
  private height = 0;
  private dpr = 1;
  private scale = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    latitude: number,
    private readonly longitude: number,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.sinLat = Math.sin(latitude * DEG);
    this.cosLat = Math.cos(latitude * DEG);
    this.screenX = new Float32Array(this.stars.count).fill(NaN);
    this.screenY = new Float32Array(this.stars.count).fill(NaN);
    for (let i = 0; i < this.stars.count; i++) this.byTint[this.stars.tint[i]].push(i);
  }

  resize(width: number, height: number, dpr: number) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    // The longer side of the viewport spans 58° either side of the zenith.
    this.scale = Math.max(width, height) / 2 / Math.tan(29 * DEG);
  }

  draw(f: Frame) {
    const { ctx, stars, dust, sinLat, cosLat, scale, width, height } = this;
    const lst = siderealTime(f.time, this.longitude);
    const cosL = Math.cos(lst);
    const sinL = Math.sin(lst);
    const cx = width / 2;
    const cy = height / 2;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    if (f.fade >= 1) {
      ctx.clearRect(0, 0, width, height);
    } else {
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = f.fade;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.globalCompositeOperation = "lighter";

    // Faint stars appear last, the way eyes adapt to the dark.
    const progress = f.reveal > 0 ? easeOut(clamp01(f.elapsed / f.reveal)) : 1;
    const faintest = -1.5 + 8.2 * progress;
    // Trails accumulate light; dim each pass so long exposures don't burn out.
    const starGain = 0.55 + 0.45 * f.fade;
    const dustGain = 1.8 * f.fade * clamp01((progress - 0.35) / 0.65) ** 2;
    // While time runs fast, each star also strokes the path since its last
    // frame, batched by tint and brightness level.
    const trails = f.fade < 1 ? Array.from({ length: TINT_COUNT * 4 }, () => new Path2D()) : null;

    if (dustGain > 0.001) {
      ctx.fillStyle = "rgb(226,229,245)";
      const dx = f.shiftX * 0.12;
      const dy = f.shiftY * 0.12;
      for (let i = 0; i < dust.count; i++) {
        const u = dust.x[i] * cosL + dust.y[i] * sinL;
        const up = cosLat * u + sinLat * dust.z[i];
        if (up < 0.02) continue;
        const k = scale / (1 + up);
        const size = dust.size[i];
        const px = cx + (dust.x[i] * sinL - dust.y[i] * cosL) * k + dx - size / 2;
        const py = cy - (cosLat * dust.z[i] - sinLat * u) * k + dy - size / 2;
        if (px < -size || py < -size || px > width || py > height) continue;
        ctx.globalAlpha = dust.alpha[i] * dustGain * horizon(up);
        if (dust.soft[i]) ctx.drawImage(this.haze, px, py, size, size);
        else ctx.fillRect(px, py, size, size);
      }
    }

    const lanternR2 = LANTERN_RADIUS * LANTERN_RADIUS;
    for (let t = 0; t < TINT_COUNT; t++) {
      const ids = this.byTint[t];
      const glow = this.glows[t];
      ctx.fillStyle = `rgb(${TINTS[t]})`;

      for (let n = 0; n < ids.length; n++) {
        const i = ids[n];
        const mag = stars.mag[i];
        const visible = clamp01((faintest - mag) / 1.4);
        const u = stars.x[i] * cosL + stars.y[i] * sinL;
        const up = cosLat * u + sinLat * stars.z[i];
        const lastX = this.screenX[i];
        const lastY = this.screenY[i];
        this.screenX[i] = NaN;
        if (visible <= 0 || up < 0.02) continue;

        const k = scale / (1 + up);
        const depth = 1 - (mag + 1.5) / 9;
        const px = cx + (stars.x[i] * sinL - stars.y[i] * cosL) * k + f.shiftX * depth;
        const py = cy - (cosLat * stars.z[i] - sinLat * u) * k + f.shiftY * depth;
        if (px < -24 || py < -24 || px > width + 24 || py > height + 24) continue;
        this.screenX[i] = px;
        this.screenY[i] = py;

        let alpha = Math.min(1, Math.max(0.16, 1.1 - (mag + 1.5) * 0.12)) * visible;
        alpha *= horizon(up) * starGain;
        if (f.twinkle) {
          const depthOfTwinkle = 0.08 + 0.2 * clamp01((mag - 1) / 5);
          alpha *= 1 - depthOfTwinkle * (0.5 + 0.5 * Math.sin(f.elapsed * stars.speed[i] + stars.phase[i]));
        }

        let boost = 0;
        if (f.lantern > 0) {
          const ddx = px - f.pointerX;
          const ddy = py - f.pointerY;
          const q = 1 - (ddx * ddx + ddy * ddy) / lanternR2;
          if (q > 0) boost = q * q * f.lantern;
        }
        ctx.globalAlpha = Math.min(1, alpha + boost * 0.45);

        if (trails && !Number.isNaN(lastX)) {
          const dx = px - lastX;
          const dy = py - lastY;
          if (dx * dx + dy * dy < 40_000) {
            const path = trails[t * 4 + Math.min(3, (ctx.globalAlpha * 4) | 0)];
            path.moveTo(lastX, lastY);
            path.lineTo(px, py);
          }
        }

        if (mag < 2.5) {
          const size = (8 + (2.5 - mag) * 7) * (1 + boost * 0.35);
          ctx.drawImage(glow, px - size / 2, py - size / 2, size, size);
        } else {
          const r = (0.95 - (mag - 2.5) * 0.14) * (1 + boost * 0.6);
          ctx.fillRect(px - r, py - r, r * 2, r * 2);
        }
      }
    }

    if (trails) {
      ctx.lineCap = "round";
      trails.forEach((path, p) => {
        const level = p % 4;
        ctx.strokeStyle = `rgb(${TINTS[(p - level) / 4]})`;
        ctx.globalAlpha = (level + 1) * 0.22;
        ctx.lineWidth = 0.6 + level * 0.4;
        ctx.stroke(path);
      });
    }

    if (f.meteor) this.drawMeteor(f.meteor);
  }

  private drawMeteor({ x, y, dx, dy, length, progress }: Meteor) {
    const { ctx } = this;
    const hx = x + dx * length * 2.4 * progress;
    const hy = y + dy * length * 2.4 * progress;
    const tail = length * Math.min(1, progress * 3);
    const alpha = Math.sin(Math.PI * progress) * 0.75;
    const gradient = ctx.createLinearGradient(hx, hy, hx - dx * tail, hy - dy * tail);
    gradient.addColorStop(0, `rgba(255,250,240,${alpha})`);
    gradient.addColorStop(1, "rgba(255,250,240,0)");

    ctx.globalAlpha = 1;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx - dx * tail, hy - dy * tail);
    ctx.stroke();
  }

  /** The named star drawn closest to a point, within `radius` CSS pixels. */
  namedStarNear(x: number, y: number, radius: number) {
    let best: (typeof NAMED_STARS)[number] | null = null;
    let bestDistance = radius * radius;
    for (const entry of NAMED_STARS) {
      const dx = this.screenX[entry[0]] - x;
      const dy = this.screenY[entry[0]] - y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = entry;
      }
    }
    if (!best) return null;
    const [index, name, constellation] = best;
    return { index, name, constellation, x: this.screenX[index], y: this.screenY[index] };
  }
}

/** A soft radial light: white core fading through the tint. */
function sprite(rgb: string, stops: [number, number, number, number]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, `rgba(255,255,255,${stops[0]})`);
  gradient.addColorStop(0.07, `rgba(${rgb},${stops[1]})`);
  gradient.addColorStop(0.18, `rgba(${rgb},${stops[2]})`);
  gradient.addColorStop(0.45, `rgba(${rgb},${stops[3]})`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return canvas;
}
