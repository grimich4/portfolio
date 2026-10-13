// Couleurs automatiques d'un projet, déduites de ses photos.
//
// Analyse en OKLCH (espace perceptuel) : luminosité, colorfulness et deux
// teintes dominantes. Règles de mise en page « éditoriale » :
// - photos neutres (noir et blanc, gris) → papier et encre, ou l'inverse si
//   les photos sont très sombres ;
// - teinte dominante chaude (sable, ocre, rouge) → fond clair teinté (jamais
//   un brun foncé, toujours boueux) et encre profonde, dans la seconde teinte
//   si elle contraste (sable + ciel → papier sable, encre bleu Nil) ;
// - teinte dominante froide (bleu, vert) → fond profond (nuit, forêt) et
//   texte crème, réchauffé par la seconde teinte si elle est chaude.
// Contraste toujours ≥ 7:1 (AAA).
//
// Écrit .mood.json dans le dossier du projet (lu par lib/projects.ts quand
// projet.json ne fixe pas de couleurs).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SAMPLE = 16; // photos analysées au maximum
const PX = 48; // côté de la vignette analysée

// ---------- Conversions sRGB ↔ OKLab / OKLCH ----------

const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

const rgb2lab = (r, g, b) => {
  [r, g, b] = [r, g, b].map((v) => lin(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

const lab2rgb = (L, a, b) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};

// OKLCH → sRGB, en réduisant la chroma jusqu'à rester dans le gamut.
const lch = (L, C, h) => {
  for (let c = C; c >= 0; c -= 0.002) {
    const rad = (h * Math.PI) / 180;
    const rgb = lab2rgb(L, c * Math.cos(rad), c * Math.sin(rad));
    if (rgb.every((v) => v >= -0.0005 && v <= 1.0005)) return rgb.map((v) => Math.round(gam(Math.min(1, Math.max(0, v))) * 255));
  }
  return lab2rgb(L, 0, 0).map((v) => Math.round(gam(Math.min(1, Math.max(0, v))) * 255));
};

const hex = (rgb) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => lin(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// ---------- Analyse ----------

const analyse = async (files) => {
  const step = Math.max(1, files.length / SAMPLE);
  const pick = Array.from({ length: Math.min(SAMPLE, files.length) }, (_, i) => files[Math.floor(i * step)]);
  const bins = new Float64Array(24); // secteurs de 15°
  const ax = new Float64Array(24);
  const ay = new Float64Array(24);
  let n = 0, L = 0, C = 0;

  for (const f of pick) {
    const { data } = await sharp(f).resize(PX, PX, { fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 3) {
      const [l, a, b] = rgb2lab(data[i], data[i + 1], data[i + 2]);
      const c = Math.hypot(a, b);
      n++;
      L += l;
      C += c;
      if (c < 0.03 || l < 0.15 || l > 0.97) continue; // gris, noirs, blancs
      const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
      const k = Math.floor(h / 15) % 24;
      bins[k] += c;
      ax[k] += a;
      ay[k] += b;
    }
  }

  // Teinte d'un groupe de secteurs voisins (±15°).
  const hueAt = (k) => {
    let x = 0, y = 0, w = 0;
    for (let d = -1; d <= 1; d++) {
      const j = (k + d + 24) % 24;
      x += ax[j];
      y += ay[j];
      w += bins[j];
    }
    return { h: ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360, w };
  };
  const order = [...bins.keys()].sort((a, b) => bins[b] - bins[a]);
  const a = hueAt(order[0]);
  // Seconde teinte : au moins 75° plus loin, et assez présente.
  const far = order.find((k) => {
    const d = Math.abs(k - order[0]);
    return Math.min(d, 24 - d) >= 5;
  });
  const b = far !== undefined ? hueAt(far) : null;

  return {
    L: L / n,
    C: C / n,
    colored: a.w / n,
    hue: a.h,
    hue2: b && b.w > a.w * 0.3 && b.w / n > 0.004 ? b.h : null,
  };
};

// ---------- Choix de la paire ----------

const warm = (h) => h < 115 || h > 345; // rouges, oranges, ocres, sables, jaunes
const cool = (h) => h >= 150 && h <= 300; // verts-bleus, bleus

// Ajuste la luminosité du texte jusqu'à un contraste de 7:1.
const legible = (bg, L, C, h, dir) => {
  let fg = lch(L, C, h);
  for (let i = 0; i < 60 && contrast(bg, fg) < 7; i++) {
    L = Math.max(0, Math.min(1, L + dir * 0.01));
    fg = lch(L, C, h);
  }
  return fg;
};

export const pair = (m) => {
  const neutral = m.C < 0.025 || m.colored < 0.008;
  const h = m.hue;
  const h2 = m.hue2;

  if (neutral) {
    // Noir et blanc : papier légèrement chaud et encre, ou l'inverse.
    if (m.L < 0.35) {
      const bg = lch(0.17, 0.004, 70);
      return [hex(bg), hex(legible(bg, 0.93, 0.01, 85, 1))];
    }
    const bg = lch(0.955, 0.006, 85);
    return [hex(bg), hex(legible(bg, 0.2, 0.006, 70, -1))];
  }

  if (cool(h) && !(m.L > 0.72)) {
    // Ambiance froide : fond profond (nuit, forêt), texte crème.
    const bg = lch(0.25, Math.min(0.07, 0.03 + m.C * 0.5), h);
    const th = h2 !== null && warm(h2) ? h2 : 85;
    return [hex(bg), hex(legible(bg, 0.93, 0.03, th, 1))];
  }

  if (warm(h) && m.L > 0.3) {
    // Ambiance chaude : papier teinté (sable, ivoire, rose poudré), encre profonde.
    // Teinte poussée vers le jaune et chroma retenue : sable/papier, pas pêche.
    const hb = h < 90 || h > 345 ? Math.min(90, ((h + 360) % 360 > 345 ? 30 : h) + 12) : h;
    const bg = lch(0.94, Math.min(0.03, 0.014 + m.C * 0.25), hb);
    const th = h2 !== null && !warm(h2) ? h2 : h;
    const tc = th === h ? 0.05 : 0.09;
    return [hex(bg), hex(legible(bg, 0.3, tc, th, -1))];
  }

  // Le reste (photos très sombres chaudes, magentas…) : fond profond sobre.
  const bg = lch(0.2, 0.035, h);
  return [hex(bg), hex(legible(bg, 0.92, 0.025, h2 ?? 85, 1))];
};

// ---------- Écriture ----------

// Calcule et écrit .mood.json pour un dossier projet. Renvoie true si modifié.
export const moodOf = async (dir) => {
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
    .map((f) => path.join(dir, f));
  const out = path.join(dir, ".mood.json");
  if (!files.length) {
    if (fs.existsSync(out)) {
      fs.rmSync(out);
      return true;
    }
    return false;
  }
  const couleurs = pair(await analyse(files));
  const s = JSON.stringify({ couleurs }, null, 2) + "\n";
  if (fs.existsSync(out) && fs.readFileSync(out, "utf8") === s) return false;
  fs.writeFileSync(out, s);
  return true;
};

// En ligne de commande : node scripts/mood.mjs  (tous les projets)
if (import.meta.url === `file://${process.argv[1]}`) {
  const root = path.join(process.cwd(), "public", "projets");
  for (const d of fs.readdirSync(root)) {
    const p = path.join(root, d);
    if (!fs.statSync(p).isDirectory()) continue;
    await moodOf(p);
    const files = fs.readdirSync(p).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).map((f) => path.join(p, f));
    const m = files.length ? await analyse(files) : null;
    const c = JSON.parse(fs.readFileSync(path.join(p, ".mood.json"), "utf8")).couleurs;
    console.log(`${d}: ${c.join(" / ")}`, m && `(L ${m.L.toFixed(2)}, C ${m.C.toFixed(3)}, teinte ${m.hue.toFixed(0)}°${m.hue2 !== null ? ` + ${m.hue2.toFixed(0)}°` : ""})`);
  }
}
