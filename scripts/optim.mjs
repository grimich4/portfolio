// Optimisation d'une photo, partagée par photos.mjs et drive.mjs :
// HEIC → JPEG, 3000 px max, rotation EXIF appliquée, métadonnées (GPS…)
// retirées, extension en minuscules. Renvoie { file, changed } ou null.
import fs from "node:fs";
import path from "node:path";
import convert from "heic-convert";
import sharp from "sharp";

export const MAX = 3000;
const OK = [".jpg", ".jpeg", ".png", ".webp"];
const HEIC = [".heic", ".heif"];

export const isPhoto = (f) => [...OK, ...HEIC].includes(path.extname(f).toLowerCase());

// Avertissement visible dans l'onglet Actions de GitHub (annotation).
export const warn = (msg) => console.warn(process.env.GITHUB_ACTIONS ? `::warning title=Photo::${msg}` : `⚠ ${msg}`);

// HEIC (iPhone) : décodé en JavaScript pur (libheif compilé en WebAssembly),
// sans outil système. La rotation de l'iPhone est déjà appliquée au décodage :
// on ré-encode sans EXIF pour éviter une double rotation.
const fromHeic = async (src) => {
  let jpg;
  try {
    jpg = await convert({ buffer: fs.readFileSync(src), format: "JPEG", quality: 0.94 });
  } catch (e) {
    warn(`${path.basename(src)} : HEIC illisible (${e.message}).`);
    return null;
  }
  const out = src.replace(/\.[^.]+$/, ".jpg");
  const buf = await sharp(Buffer.from(jpg))
    .resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  fs.unlinkSync(src);
  fs.writeFileSync(out, buf);
  return path.basename(out);
};

export const optimize = async (src) => {
  const ext = path.extname(src);
  const low = ext.toLowerCase();
  if (HEIC.includes(low)) {
    const f = await fromHeic(src);
    return f && { file: f, changed: true };
  }
  if (!OK.includes(low)) return null;

  const norm = low === ".jpeg" ? ".jpg" : low;
  const out = path.join(path.dirname(src), path.basename(src, ext) + norm);
  let m;
  try {
    m = await sharp(src).metadata();
  } catch (e) {
    warn(`${path.basename(src)} : image illisible (${e.message}).`);
    return null;
  }
  const big = Math.max(m.width ?? 0, m.height ?? 0) > MAX;
  if (!big && !m.exif && !m.iptc && !m.xmp && src === out) return { file: path.basename(out), changed: false };

  let img = sharp(src).rotate().resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true });
  img =
    norm === ".png"
      ? img.png({ compressionLevel: 9 })
      : norm === ".webp"
        ? img.webp({ quality: 88 })
        : img.jpeg({ quality: 86, mozjpeg: true });
  const buf = await img.toBuffer();
  if (src !== out) fs.unlinkSync(src);
  fs.writeFileSync(out, buf);
  return { file: path.basename(out), changed: true };
};
