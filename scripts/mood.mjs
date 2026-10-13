// Couleurs automatiques d'un projet, déduites de ses photos.
//
// Analyse luminosité, saturation et teintes dominantes, puis choisit :
// - projet sombre   → fond très sombre teinté, texte clair
// - projet lumineux → fond « papier » teinté, texte encre
// - entre les deux  → fond profond coloré si les photos sont colorées,
//                     sinon anthracite et blanc cassé
// Si les photos ont deux teintes fortes et éloignées (sable + ciel…), le
// texte prend la seconde. Contraste toujours ≥ 7:1.
//
// Écrit .mood.json dans le dossier du projet (lu par lib/projects.ts quand
// projet.json ne fixe pas de couleurs).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SAMPLE = 16; // photos analysées au maximum
const PX = 48; // côté de la vignette analysée

const hsl2rgb = (h, s, l) => {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
};
const hex = (rgb) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// Statistiques sur un ensemble de photos.
const analyse = async (files) => {
  const step = Math.max(1, files.length / SAMPLE);
  const pick = Array.from({ length: Math.min(SAMPLE, files.length) }, (_, i) => files[Math.floor(i * step)]);
  const bins = new Float64Array(12); // 12 secteurs de 30°
  const hx = new Float64Array(12);
  const hy = new Float64Array(12);
  let n = 0, L = 0, C = 0;

  for (const f of pick) {
    const { data } = await sharp(f).resize(PX, PX, { fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn, l = (mx + mn) / 2;
      n++;
      L += l;
      C += c;
      if (c < 0.1 || l < 0.12 || l > 0.92) continue; // gris, noirs, blancs : sans teinte
      let h = mx === r ? ((g - b) / c) % 6 : mx === g ? (b - r) / c + 2 : (r - g) / c + 4;
      h = (h * 60 + 360) % 360;
      const k = Math.floor(h / 30) % 12;
      bins[k] += c;
      hx[k] += Math.cos((h * Math.PI) / 180) * c;
      hy[k] += Math.sin((h * Math.PI) / 180) * c;
    }
  }

  // Teinte moyenne d'un secteur élargi à ses voisins.
  const hueAt = (k) => {
    let x = 0, y = 0, w = 0;
    for (const j of [k - 1, k, k + 1].map((v) => (v + 12) % 12)) {
      x += hx[j];
      y += hy[j];
      w += bins[j];
    }
    return { h: ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360, w };
  };
  const order = [...bins.keys()].sort((a, b) => bins[b] - bins[a]);
  const a = hueAt(order[0]);
  const far = order.find((k) => Math.min(Math.abs(k - order[0]), 12 - Math.abs(k - order[0])) >= 3);
  const b = far !== undefined ? hueAt(far) : null;
  const colored = (a.w / n) || 0; // part « colorée » de l'image

  return {
    L: L / n,
    C: C / n,
    hue: a.h,
    colored,
    hue2: b && b.w > a.w * 0.35 && b.w / n > 0.015 ? b.h : null,
  };
};

// Ajuste la luminosité du texte jusqu'à un contraste de 7:1.
const legible = (bg, [h, s, l], up) => {
  let fg = hsl2rgb(h, s, l);
  for (let i = 0; i < 40 && contrast(bg, fg) < 7; i++) {
    l = Math.max(0, Math.min(1, l + (up ? 0.015 : -0.015)));
    fg = hsl2rgb(h, s, l);
  }
  return fg;
};

export const pair = (m) => {
  const neutral = m.C < 0.07 || m.colored < 0.02;
  const sat = neutral ? 0.05 : Math.min(0.42, 0.14 + m.C * 1.2);
  const h = m.hue;
  const h2 = m.hue2 ?? h;
  const warm = h < 75 || h > 300;

  let bg, fg;
  if (m.L < 0.4) {
    bg = hsl2rgb(h, neutral ? 0.04 : sat * 0.8, 0.075);
    fg = legible(bg, [h2, neutral ? 0.08 : 0.25, 0.9], true);
  } else if (m.L > 0.58) {
    bg = hsl2rgb(h, neutral ? 0.06 : sat, 0.92);
    fg = legible(bg, [h2, neutral ? 0.08 : 0.45, 0.16], false);
  } else if (neutral) {
    // Noir et blanc, tons gris : papier et encre.
    bg = hsl2rgb(warm ? 40 : 220, 0.1, 0.93);
    fg = hsl2rgb(warm ? 30 : 220, 0.08, 0.09);
  } else {
    bg = hsl2rgb(h, Math.min(0.55, sat + 0.14), 0.18);
    fg = legible(bg, [h2 === h ? (warm ? 38 : h) : h2, 0.35, 0.9], true);
  }
  return [hex(bg), hex(fg)];
};

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
    const m = JSON.parse(fs.readFileSync(path.join(p, ".mood.json"), "utf8"));
    console.log(`${d}: ${m.couleurs.join(" / ")}`);
  }
}
