// Prépare, avant le build, toutes les tailles de chaque photo en WebP
// + un aperçu flou minuscule (intégré à la page, affiché instantanément).
//
//   public/projets/02-voyage/IMG_1.jpg
//     → public/_img/02-voyage/IMG_1.<empreinte>-480.webp … -2400.webp
//     → public/_img/manifest.json : { "02-voyage/IMG_1.jpg": { w, h, widths, blur, name } }
//
// Les fichiers sont ensuite servis tels quels par le CDN : aucune
// transformation à la demande, donc aucune attente à la première visite.
// Cache entre deux builds dans .next/cache/variants (conservé par Vercel) :
// seules les photos nouvelles ou modifiées sont recalculées.
//
// Lancé automatiquement par `npm run build` (prebuild).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

export const WIDTHS = [480, 828, 1200, 1680, 2400];
const Q = [78, 72, 66, 60, 54, 48]; // qualité de départ, puis réductions si trop lourd
// Budget de poids (octets par pixel) : les photos très détaillées (galets,
// feuillages, foule) sont ré-encodées un peu plus bas pour rester légères.
const BUDGET = (w, h) => Math.round(w * h * 0.11);

const ROOT = path.join(process.cwd(), "public", "projets");
const OUT = path.join(process.cwd(), "public", "_img");
const CACHE = path.join(process.cwd(), ".next", "cache", "variants");
const IMG = /\.(jpe?g|png|webp)$/i;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

const manifest = {};
let made = 0, reused = 0;
const t0 = Date.now();

const jobs = [];
for (const dir of fs.existsSync(ROOT) ? fs.readdirSync(ROOT) : []) {
  const d = path.join(ROOT, dir);
  if (!fs.statSync(d).isDirectory()) continue;
  for (const f of fs.readdirSync(d)) if (IMG.test(f)) jobs.push([dir, f]);
}

const one = async ([dir, f]) => {
  const src = path.join(ROOT, dir, f);
  const buf = fs.readFileSync(src);
  const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 16);
  const stem = f.replace(/\.[^.]+$/, "");
  const cdir = path.join(CACHE, hash);
  const meta = path.join(cdir, "meta.json");
  fs.mkdirSync(path.join(OUT, dir), { recursive: true });

  let m;
  if (fs.existsSync(meta)) {
    m = JSON.parse(fs.readFileSync(meta, "utf8"));
    reused++;
  } else {
    fs.mkdirSync(cdir, { recursive: true });
    const img = sharp(buf).rotate();
    const { width: W, height: H } = await img.metadata().then((x) =>
      (x.orientation ?? 1) >= 5 ? { width: x.height, height: x.width } : x,
    );
    const widths = WIDTHS.filter((w) => w < W);
    widths.push(Math.min(W, WIDTHS.at(-1))); // toujours la plus grande utile
    const uniq = [...new Set(widths)].sort((a, b) => a - b);
    for (const w of uniq) {
      const { data: px, info } = await sharp(buf).rotate().resize({ width: w }).toBuffer({ resolveWithObject: true });
      let out;
      for (const q of Q) {
        out = await sharp(px).webp({ quality: q, effort: 4 }).toBuffer();
        if (out.length <= BUDGET(info.width, info.height)) break;
      }
      fs.writeFileSync(path.join(cdir, `${w}.webp`), out);
    }
    const tiny = await sharp(buf).rotate().resize({ width: 24 }).blur(0.6).webp({ quality: 50 }).toBuffer();
    m = { w: W, h: H, widths: uniq, blur: `data:image/webp;base64,${tiny.toString("base64")}` };
    fs.writeFileSync(meta, JSON.stringify(m));
    made++;
  }
  // Nom avec empreinte du contenu : cache CDN « immuable » sans risque de
  // servir une ancienne version si une photo est remplacée.
  const name = `${stem}.${hash.slice(0, 8)}`;
  for (const w of m.widths) fs.copyFileSync(path.join(cdir, `${w}.webp`), path.join(OUT, dir, `${name}-${w}.webp`));
  manifest[`${dir}/${f}`] = { ...m, name };
};

// Un peu de parallélisme, sans saturer la machine de build.
const queue = [...jobs];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) await one(queue.shift());
  }),
);

fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest));
console.log(`Variantes : ${jobs.length} photos (${made} calculées, ${reused} en cache) en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
