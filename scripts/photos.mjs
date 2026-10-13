// Optimise les photos de public/projets/ : 3000 px max, rotation EXIF
// appliquée, métadonnées (GPS…) retirées, extension en minuscules.
// Lancé automatiquement par GitHub Actions après un envoi de photos.
// En local : node scripts/photos.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(process.cwd(), "public", "projets");
const MAX = 3000;
let done = 0;

for (const dir of fs.readdirSync(ROOT)) {
  const d = path.join(ROOT, dir);
  if (!fs.statSync(d).isDirectory()) continue;

  for (const f of fs.readdirSync(d)) {
    const ext = path.extname(f);
    const low = ext.toLowerCase();
    if (low === ".heic" || low === ".heif") {
      console.warn(`⚠ ${dir}/${f} : format HEIC non pris en charge, envoie la photo en JPEG.`);
      continue;
    }
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(low)) continue;

    const src = path.join(d, f);
    const out = path.join(d, path.basename(f, ext) + (low === ".jpeg" ? ".jpg" : low));
    const m = await sharp(src).metadata();
    const big = Math.max(m.width ?? 0, m.height ?? 0) > MAX;
    if (!big && !m.exif && !m.iptc && !m.xmp && src === out) continue;

    let img = sharp(src).rotate().resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true });
    img = low === ".png" ? img.png({ compressionLevel: 9 }) : low === ".webp" ? img.webp({ quality: 88 }) : img.jpeg({ quality: 86, mozjpeg: true });
    const buf = await img.toBuffer();
    if (src !== out) fs.unlinkSync(src);
    fs.writeFileSync(out, buf);
    console.log(`✓ ${dir}/${path.basename(out)} (${(buf.length / 1e6).toFixed(1)} Mo)`);
    done++;
  }
}
console.log(done ? `${done} photo(s) optimisée(s).` : "Rien à optimiser.");
