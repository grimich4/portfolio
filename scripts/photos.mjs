// Optimise toutes les photos de public/projets/ et public/paris/ (voir optim.mjs).
// Lancé par GitHub Actions après un envoi de photos.
// En local : node scripts/photos.mjs
import fs from "node:fs";
import path from "node:path";
import { moodOf } from "./mood.mjs";
import { isPhoto, optimize } from "./optim.mjs";

let n = 0;

for (const root of ["projets", "paris"]) {
  const base = path.join(process.cwd(), "public", root);
  if (!fs.existsSync(base)) continue;
  for (const dir of fs.readdirSync(base)) {
    const d = path.join(base, dir);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d)) {
      if (!isPhoto(f)) continue;
      const r = await optimize(path.join(d, f));
      if (r?.changed) {
        console.log(`✓ ${root}/${dir}/${r.file}`);
        n++;
      }
    }
    if (await moodOf(d)) console.log(`◐ ${root}/${dir} : couleurs automatiques mises à jour`);
  }
}
console.log(n ? `${n} photo(s) optimisée(s).` : "Rien à optimiser.");
