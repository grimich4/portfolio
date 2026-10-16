// Fabrique data/paris-map.json (tracés SVG de la carte de Paris) à partir
// des 80 quartiers administratifs (data/paris-quartiers.geojson, Ville de
// Paris — opendata.paris.fr, licence ODbL).
//
// Quartiers 1-4 = 1er arrondissement, 5-8 = 2e, … 77-80 = 20e. On les
// regroupe topologiquement : les arrondissements partagent exactement leurs
// frontières, et la Seine se déduit des frontières rive gauche / rive droite.
//
// Le Bois de Vincennes (12e) est retiré : la carte s'arrête au périphérique
// de ce côté (voir cutWood). Le Bois de Boulogne (16e) est conservé.
//
// À relancer seulement si les données source changent :
//   node scripts/paris-map.mjs
import fs from "node:fs";
import path from "node:path";
import { geoMercator, geoPath } from "d3-geo";
import * as pc from "polyclip-ts";
import polylabel from "polylabel";
import { merge, mesh } from "topojson-client";
import { topology } from "topojson-server";

const W = 1000;
const src = JSON.parse(fs.readFileSync(path.join("data", "paris-quartiers.geojson"), "utf8"));

const arrOf = (f) => Math.ceil(f.properties.id / 4);

// Bois de Vincennes : coupe en ligne droite le long du périphérique, entre
// l'angle de la Porte Dorée (fin de la limite avec Saint-Mandé) et la Porte
// de Charenton (fin de la limite avec Charenton-le-Pont).
cutWood(12, [2.411549, 48.834076], [2.401662, 48.829413]);

const topo = topology({ q: src }, 1e6);
const geoms = topo.objects.q.geometries;

const proj = geoMercator().fitWidth(W, src);
const H = Math.ceil(geoPath(proj).bounds(src)[1][1]);
// Coordonnées arrondies au dixième de pixel (viewBox 1000 de large).
const path1 = geoPath(proj).digits(1);

const arrs = [];
for (let n = 1; n <= 20; n++) {
  const shape = merge(topo, geoms.filter((g) => arrOf(g) === n));
  const d = path1(shape);
  const [[x0, y0], [x1, y1]] = path1.bounds(shape);
  // Point d'étiquette : le point le plus « intérieur » du plus grand polygone,
  // calculé sur la partie urbaine pour le 16e (sans le Bois de Boulogne).
  const urban = n === 16 ? geoms.filter((g) => arrOf(g) === 16 && g.properties.id !== 63 && g.properties.id !== 61) : null;
  const lab = urban ? merge(topo, urban) : shape;
  const polys = lab.type === "MultiPolygon" ? lab.coordinates : [lab.coordinates];
  const big = polys
    .map((p) => p.map((ring) => ring.map((c) => proj(c))))
    .sort((a, b) => area(b[0]) - area(a[0]))[0];
  const [lx, ly] = polylabel(big, 0.5);
  arrs.push({
    n,
    d,
    label: [round(lx), round(ly)],
    box: [round(x0), round(y0), round(x1 - x0), round(y1 - y0)],
  });
}

const L = new Set([5, 6, 7, 13, 14, 15]); // rive gauche
const R = new Set([1, 4, 8, 12, 16]); // rive droite, en face
const out = {
  w: W,
  h: H,
  arrs,
  // Frontières entre quartiers d'un même arrondissement (trait très fin).
  quartiers: path1(mesh(topo, topo.objects.q, (a, b) => a !== b && arrOf(a) === arrOf(b))),
  // La Seine : frontière entre arrondissements de rives opposées.
  seine: lines([
    chain(
      parts(
        mesh(topo, topo.objects.q, (a, b) => {
          const x = arrOf(a), y = arrOf(b);
          return (L.has(x) && R.has(y)) || (R.has(x) && L.has(y));
        }),
      ),
    ),
  ]),
  // Tronçon de la Seine (15e / 16e) pour écrire son nom, orienté de gauche à droite.
  seineLabel: (() => {
    const m = mesh(topo, topo.objects.q, (a, b) => [arrOf(a), arrOf(b)].sort((x, y) => x - y).join() === "15,16");
    const line = stitch(parts(m), 12).sort((a, b) => b.length - a.length)[0];
    if (line[0][0] > line.at(-1)[0]) line.reverse();
    return lines([line]);
  })(),
  source: "Quartiers administratifs — Ville de Paris, opendata.paris.fr (ODbL)",
};

fs.writeFileSync(path.join("data", "paris-map.json"), JSON.stringify(out));
console.log(`data/paris-map.json : ${W}×${H}, ${(JSON.stringify(out).length / 1024).toFixed(0)} Ko`);

// Retire d'un arrondissement la partie située au-delà du segment [a, b] :
// on prend son contour extérieur, on le coupe aux deux sommets les plus
// proches de a et b, et l'arc qui part le plus à l'est forme le morceau à
// retirer de chacun de ses quartiers (différence exacte, mêmes sommets).
function cutWood(n, a, b) {
  const qs = src.features.filter((f) => arrOf(f) === n);
  const all = pc.union(...qs.map((f) => f.geometry.coordinates));
  const ring = all.sort((p, q) => ringArea(q[0]) - ringArea(p[0]))[0][0];
  const len = ring.length - 1; // anneau fermé : dernier = premier
  const near = (t) => {
    let k = 0;
    for (let i = 1; i < len; i++) if (dist(ring[i], t) < dist(ring[k], t)) k = i;
    return k;
  };
  const arc = (from, to) => {
    const out = [];
    for (let k = from; ; k = (k + 1) % len) {
      out.push(ring[k]);
      if (k === to) return out;
    }
  };
  const [i, j] = [near(a), near(b)];
  const [A, B] = [arc(i, j), arc(j, i)];
  const east = (r) => Math.max(...r.map((p) => p[0]));
  const wood = east(A) > east(B) ? A : B;
  const cut = [[...wood, wood[0]]];
  for (const f of qs) {
    const d = pc.difference(f.geometry.coordinates, cut);
    // Plus grand morceau seulement (écarte d'éventuelles miettes numériques).
    const keep = d.sort((p, q) => ringArea(q[0]) - ringArea(p[0]))[0];
    if (!keep) continue;
    // Même sens de parcours que la source (d3-geo inverse sinon le polygone
    // et le prend pour « toute la Terre sauf ce quartier »).
    const cw = signed(f.geometry.coordinates[0]) < 0;
    for (const r of keep) if (signed(r) < 0 !== cw) r.reverse();
    f.geometry = { type: "Polygon", coordinates: keep };
  }
}
function signed(r) {
  let s = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]);
  return -s / 2;
}
function dist(p, q) {
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}
function ringArea(r) {
  let s = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
  return Math.abs(s / 2);
}

// Tronçons projetés d'un maillage TopoJSON.
function parts(m) {
  return (m.type === "MultiLineString" ? m.coordinates : [m.coordinates]).map((l) => l.map((c) => proj(c)));
}
function lines(ls) {
  return ls.map((l) => "M" + l.map(([x, y]) => `${round(x)},${round(y)}`).join("L")).join("");
}

// Recolle des tronçons dont les extrémités se touchent ou presque (les arcs
// TopoJSON sont coupés à chaque jonction, et les données ont des micro-coupures).
function stitch(lines, tol = 1e-6) {
  const eq = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= tol;
  const out = lines.map((l) => [...l]);
  for (let merged = true; merged; ) {
    merged = false;
    for (let i = 0; i < out.length && !merged; i++)
      for (let j = 0; j < out.length && !merged; j++) {
        if (i === j) continue;
        const a = out[i], b = out[j];
        if (eq(a.at(-1), b[0])) out[i] = [...a, ...b.slice(1)];
        else if (eq(a.at(-1), b.at(-1))) out[i] = [...a, ...[...b].reverse().slice(1)];
        else if (eq(a[0], b.at(-1))) out[i] = [...b, ...a.slice(1)];
        else if (eq(a[0], b[0])) out[i] = [...[...b].reverse(), ...a.slice(1)];
        else continue;
        out.splice(j, 1);
        merged = true;
      }
  }
  return out;
}

// Une seule ligne continue d'amont (sud-est) en aval (sud-ouest) : on part
// du tronçon le plus à l'est et on enchaîne à chaque fois le plus proche.
function chain(segs) {
  const left = segs.map((l) => [...l]);
  left.sort((a, b) => Math.max(b[0][0], b.at(-1)[0]) - Math.max(a[0][0], a.at(-1)[0]));
  let line = left.shift();
  if (line[0][0] < line.at(-1)[0]) line.reverse();
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  while (left.length) {
    const end = line.at(-1);
    let best = 0, rev = false, bd = Infinity;
    left.forEach((l, i) => {
      for (const [p, r] of [[l[0], false], [l.at(-1), true]]) {
        if (d(end, p) < bd) {
          bd = d(end, p);
          best = i;
          rev = r;
        }
      }
    });
    const next = left.splice(best, 1)[0];
    if (rev) next.reverse();
    line = [...line, ...(bd < 1e-6 ? next.slice(1) : next)];
  }
  return line;
}

function round(v) {
  return Math.round(v * 10) / 10;
}
function area(ring) {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return Math.abs(s / 2);
}
