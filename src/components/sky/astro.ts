import { STAR_COUNT, STAR_DATA } from "./star-catalog";

const DEG = Math.PI / 180;

/** Deterministic PRNG (mulberry32), so the sky looks the same on every visit. */
export function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Local sidereal time in radians, for a longitude in degrees (east positive). */
export function siderealTime(ms: number, longitude: number) {
  const daysSinceJ2000 = ms / 86_400_000 - 10_957.5;
  const degrees = 280.46061837 + 360.98564736629 * daysSinceJ2000 + longitude;
  return (((degrees % 360) + 360) % 360) * DEG;
}

/** Points on the celestial sphere as unit vectors in the J2000 equatorial frame. */
type Sphere = {
  count: number;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
};

export type Stars = Sphere & {
  mag: Float32Array;
  /** Colour bucket from B−V, blue-white (0) to amber (5). */
  tint: Uint8Array;
  /** Twinkle phase (rad) and speed (rad/s). */
  phase: Float32Array;
  speed: Float32Array;
};

export type Dust = Sphere & {
  alpha: Float32Array;
  /** Diameter in CSS pixels. */
  size: Float32Array;
  /** 1 for wide soft glows, 0 for fine grains. */
  soft: Uint8Array;
};

export const TINT_COUNT = 6;
const TINT_LIMITS = [-0.1, 0.15, 0.45, 0.8, 1.3];

function sphere(count: number): Sphere {
  return {
    count,
    x: new Float32Array(count),
    y: new Float32Array(count),
    z: new Float32Array(count),
  };
}

export function loadStars(): Stars {
  const bytes = Uint8Array.from(atob(STAR_DATA), (c) => c.charCodeAt(0));
  const rand = random(7);
  const stars: Stars = {
    ...sphere(STAR_COUNT),
    mag: new Float32Array(STAR_COUNT),
    tint: new Uint8Array(STAR_COUNT),
    phase: new Float32Array(STAR_COUNT),
    speed: new Float32Array(STAR_COUNT),
  };

  for (let i = 0; i < STAR_COUNT; i++) {
    const o = i * 6;
    const ra = (((bytes[o] << 8) | bytes[o + 1]) / 65536) * 2 * Math.PI;
    const dec = (((bytes[o + 2] << 8) | bytes[o + 3]) / 65535 - 0.5) * Math.PI;
    const bv = bytes[o + 5] / 100 - 0.4;
    const tint = TINT_LIMITS.findIndex((limit) => bv < limit);

    stars.x[i] = Math.cos(dec) * Math.cos(ra);
    stars.y[i] = Math.cos(dec) * Math.sin(ra);
    stars.z[i] = Math.sin(dec);
    stars.mag[i] = bytes[o + 4] / 32 - 1.5;
    stars.tint[i] = tint === -1 ? TINT_COUNT - 1 : tint;
    stars.phase[i] = rand() * 2 * Math.PI;
    stars.speed[i] = 0.4 + rand() * 1.6;
  }

  return stars;
}

// IAU galactic → J2000 equatorial rotation, row by row.
const GALACTIC = [
  -0.0548755604, 0.4941094279, -0.867666149,
  -0.8734370902, -0.44482963, -0.1980763734,
  -0.4838350155, 0.7469822445, 0.4559837762,
];

/**
 * A procedural Milky Way laid along the real galactic plane: denser and wider
 * towards the galactic centre, split by the Great Rift, with the Coalsack
 * beside the Southern Cross.
 */
export function createMilkyWay(count: number): Dust {
  const rand = random(1987);
  const gaussian = () =>
    Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const dust: Dust = {
    ...sphere(count),
    alpha: new Float32Array(count),
    size: new Float32Array(count),
    soft: new Uint8Array(count),
  };

  for (let i = 0; i < count; ) {
    const l = rand() * 360 - 180;
    const core = Math.exp(-(l * l) / 5000);
    if (rand() > 0.25 + 0.75 * core) continue;

    const b = gaussian() * (3 + 5 * core);
    if (inDarkLane(l, b) && rand() < 0.85) continue;

    const gx = Math.cos(b * DEG) * Math.cos(l * DEG);
    const gy = Math.cos(b * DEG) * Math.sin(l * DEG);
    const gz = Math.sin(b * DEG);
    const soft = rand() < 0.35;

    dust.x[i] = GALACTIC[0] * gx + GALACTIC[1] * gy + GALACTIC[2] * gz;
    dust.y[i] = GALACTIC[3] * gx + GALACTIC[4] * gy + GALACTIC[5] * gz;
    dust.z[i] = GALACTIC[6] * gx + GALACTIC[7] * gy + GALACTIC[8] * gz;
    dust.soft[i] = soft ? 1 : 0;
    dust.size[i] = soft ? 8 + rand() * 18 : 0.4 + rand() * 0.6;
    dust.alpha[i] =
      (soft ? 0.012 + rand() * 0.02 : 0.05 + rand() * 0.14) * (0.45 + 0.55 * core);
    i++;
  }

  return dust;
}

function inDarkLane(l: number, b: number) {
  // Great Rift: the dust lane running from Cygnus down to Scorpius.
  if (l > 8 && l < 80 && Math.abs(b - 1.5) < 2.4) return true;
  // Coalsack Nebula (l = 301°, b = −1°).
  return (l + 59) ** 2 + (b + 1) ** 2 < 14;
}
