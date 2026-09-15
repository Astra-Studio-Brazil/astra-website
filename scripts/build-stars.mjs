// Builds src/components/sky/star-catalog.ts from the Yale Bright Star
// Catalogue (5th Revised Ed., Hoffleit & Warren 1991 — CDS catalogue V/50).
//
//   node scripts/build-stars.mjs            # downloads the catalogue from CDS
//   node scripts/build-stars.mjs ./catalog  # uses a local, uncompressed copy
//
// Every star down to magnitude 6 (the naked-eye limit) is packed into 6 bytes,
// brightest first: RA (u16), Dec (u16), V magnitude (u8), B−V colour (u8).

import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const SOURCE = "https://cdsarc.cds.unistra.fr/ftp/V/50/catalog.gz";
const OUTPUT = new URL("../src/components/sky/star-catalog.ts", import.meta.url);
const MAG_LIMIT = 6;

// IAU proper names, keyed by Bayer designation as written in the catalogue
// ("Alp1 Cen" = α¹ Centauri).
const NAMES = {
  "Alp CMa": "Sirius",
  "Alp Car": "Canopus",
  "Alp1 Cen": "Rigil Kentaurus",
  "Alp Boo": "Arcturus",
  "Alp Lyr": "Vega",
  "Alp Aur": "Capella",
  "Bet Ori": "Rigel",
  "Alp CMi": "Procyon",
  "Alp Eri": "Achernar",
  "Alp Ori": "Betelgeuse",
  "Bet Cen": "Hadar",
  "Alp Aql": "Altair",
  "Alp1 Cru": "Acrux",
  "Alp Tau": "Aldebaran",
  "Alp Vir": "Spica",
  "Alp Sco": "Antares",
  "Bet Gem": "Pollux",
  "Alp PsA": "Fomalhaut",
  "Alp Cyg": "Deneb",
  "Bet Cru": "Mimosa",
  "Alp Leo": "Regulus",
  "Eps CMa": "Adhara",
  "Alp Gem": "Castor",
  "Gam Cru": "Gacrux",
  "Lam Sco": "Shaula",
  "Gam Ori": "Bellatrix",
  "Bet Tau": "Elnath",
  "Bet Car": "Miaplacidus",
  "Eps Ori": "Alnilam",
  "Alp Gru": "Alnair",
  "Zet Ori": "Alnitak",
  "Eps UMa": "Alioth",
  "Alp Per": "Mirfak",
  "Alp UMa": "Dubhe",
  "Del CMa": "Wezen",
  "Eps Sgr": "Kaus Australis",
  "Eps Car": "Avior",
  "Eta UMa": "Alkaid",
  "The Sco": "Sargas",
  "Bet Aur": "Menkalinan",
  "Alp TrA": "Atria",
  "Gam Gem": "Alhena",
  "Alp Pav": "Peacock",
  "Del Vel": "Alsephina",
  "Bet CMa": "Mirzam",
  "Alp Hya": "Alphard",
  "Alp UMi": "Polaris",
  "Gam1 Leo": "Algieba",
  "Alp Ari": "Hamal",
  "Bet Cet": "Diphda",
  "Sig Sgr": "Nunki",
  "The Cen": "Menkent",
  "Alp And": "Alpheratz",
  "Bet And": "Mirach",
  "Kap Ori": "Saiph",
  "Bet UMi": "Kochab",
  "Alp Oph": "Rasalhague",
  "Bet Per": "Algol",
  "Bet Leo": "Denebola",
  "Lam Vel": "Suhail",
  "Zet Pup": "Naos",
  "Iot Car": "Aspidiske",
  "Del Ori": "Mintaka",
  "Bet1 Sco": "Acrab",
  "Del Sco": "Dschubba",
  "Sig Sco": "Alniyat",
  "Ups Sco": "Lesath",
  "Kap Sco": "Girtab",
  "Eta Oph": "Sabik",
  "Zet Sgr": "Ascella",
  "Del Sgr": "Kaus Media",
  "Lam Sgr": "Kaus Borealis",
  "Gam2 Sgr": "Alnasl",
  "Bet Lib": "Zubeneschamali",
  "Alp2 Lib": "Zubenelgenubi",
  "Alp Col": "Phact",
  "Alp Lep": "Arneb",
  "Bet Eri": "Cursa",
  "The1 Eri": "Acamar",
  "Alp Phe": "Ankaa",
  "Gam Crv": "Gienah",
  "Bet Crv": "Kraz",
  "Del Crv": "Algorab",
  "Alp Peg": "Markab",
  "Bet Peg": "Scheat",
  "Gam Peg": "Algenib",
  "Eps Peg": "Enif",
  "Alp Aqr": "Sadalmelik",
  "Bet Aqr": "Sadalsuud",
  "Del Cap": "Deneb Algedi",
  "Alp Cet": "Menkar",
  "Omi Cet": "Mira",
  "Eta Tau": "Alcyone",
  "Del Cru": "Imai",
  "Eps Cru": "Ginan",
  "Eta CMa": "Aludra",
  "Gam Vir": "Porrima",
  "Eps Vir": "Vindemiatrix",
  "Alp CrB": "Alphecca",
  "Alp Ser": "Unukalhai",
  "Gam Aql": "Tarazed",
  "Bet1 Cyg": "Albireo",
  "Gam Cyg": "Sadr",
  "Bet Ari": "Sheratan",
  "Gam1 And": "Almach",
  "Del Leo": "Zosma",
  "Eta Boo": "Muphrid",
  "Eps Boo": "Izar",
  "Bet UMa": "Merak",
  "Gam UMa": "Phecda",
  "Zet UMa": "Mizar",
};

async function loadCatalogue(path) {
  if (path) return readFile(path, "latin1");
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Could not download ${SOURCE}: ${res.status}`);
  return gunzipSync(Buffer.from(await res.arrayBuffer())).toString("latin1");
}

const field = (line, from, to) => line.slice(from - 1, to).trim();
const clampByte = (n) => Math.min(255, Math.max(0, Math.round(n)));

const stars = [];
for (const line of (await loadCatalogue(process.argv[2])).split("\n")) {
  const vmag = field(line, 103, 107);
  const raHours = field(line, 76, 77);
  // Novae and extragalactic objects kept for numbering have no data.
  if (!vmag || !raHours) continue;

  const mag = Number(vmag);
  if (mag > MAG_LIMIT) continue;

  const ra =
    (Number(raHours) + Number(field(line, 78, 79)) / 60 + Number(field(line, 80, 83)) / 3600) * 15;
  const dec =
    (line[83] === "-" ? -1 : 1) *
    (Number(field(line, 85, 86)) + Number(field(line, 87, 88)) / 60 + Number(field(line, 89, 90)) / 3600);
  const bv = field(line, 110, 114);
  const greek = field(line, 8, 10);

  stars.push({
    ra,
    dec,
    mag,
    bv: bv ? Number(bv) : 0.6,
    bayer: greek ? `${greek}${field(line, 11, 11)} ${field(line, 12, 14)}` : null,
  });
}

stars.sort((a, b) => a.mag - b.mag);

const bytes = new Uint8Array(stars.length * 6);
const named = [];
const seen = new Set();

stars.forEach((star, i) => {
  const ra = Math.round((star.ra / 360) * 65536) % 65536;
  const dec = Math.round(((star.dec + 90) / 180) * 65535);
  bytes.set([ra >> 8, ra & 255, dec >> 8, dec & 255], i * 6);
  bytes[i * 6 + 4] = clampByte((star.mag + 1.5) * 32);
  bytes[i * 6 + 5] = clampByte((star.bv + 0.4) * 100);

  // Components share a designation; the brightest one carries the name.
  const name = star.bayer && NAMES[star.bayer];
  if (name && !seen.has(star.bayer)) {
    seen.add(star.bayer);
    named.push([i, name, star.bayer.slice(-3)]);
  }
});

const missing = Object.keys(NAMES).filter((key) => !seen.has(key));
if (missing.length) {
  console.warn(`Designations not found in the catalogue: ${missing.join(", ")}`);
}

await writeFile(
  OUTPUT,
  `// Generated by scripts/build-stars.mjs — do not edit by hand.
// Source: Yale Bright Star Catalogue, 5th Revised Ed. (Hoffleit & Warren 1991), CDS V/50.

/** Stars down to magnitude ${MAG_LIMIT}, brightest first. */
export const STAR_COUNT = ${stars.length};

/** Base64, 6 bytes per star: RA (u16), Dec (u16), (V + 1.5) × 32 (u8), (B−V + 0.4) × 100 (u8). */
export const STAR_DATA =
  "${Buffer.from(bytes).toString("base64")}";

/** [index into STAR_DATA, IAU proper name, constellation abbreviation] */
export const NAMED_STARS: ReadonlyArray<readonly [number, string, string]> = ${JSON.stringify(named)};
`,
);

console.log(`Wrote ${stars.length} stars (${named.length} named) to ${OUTPUT.pathname}`);
