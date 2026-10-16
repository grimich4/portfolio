import Link from "next/link";
import MapControl from "@/components/MapControl";
import map from "@/data/paris-map.json";
import { ARR_NAMES, type Arr, ordinal, type Serie } from "@/lib/projects";

/*
 * Carte de la série Paris, rendue côté serveur (aucun tracé envoyé deux fois).
 * Les interactions (survol, couleurs, panneau) sont gérées par MapControl,
 * qui ne fait que poser des attributs `data-on` : tout le visuel est en CSS
 * (globals.css, section « Carte de Paris »).
 */

const pad = (n: number) => String(n).padStart(2, "0");
const sup = (n: number) => (n === 1 ? "er" : "e");

// Photo affichée dans l'arrondissement : la variante juste assez grande pour
// couvrir sa boîte (carte ~1100 px de large au plus, écran haute densité).
const fill = (a: Arr, box: number[]) => {
  const p = a.cover.desk;
  const need = Math.max(box[2], box[3] * (p.w / p.h)) * 1.1 * 2;
  const w = p.v ? (p.v.widths.find((x) => x >= need) ?? p.v.widths.at(-1)) : 0;
  return { href: p.v ? `${p.v.base}-${w}.webp` : p.src, blur: p.v?.blur };
};

export default function ParisMap({ arrs, serie }: { arrs: Arr[]; serie: Serie }) {
  const by = new Map(arrs.map((a) => [a.n, a]));
  const done = arrs.length;
  const vb = `0 0 ${map.w} ${map.h}`;

  return (
    <div data-pm className="pm">
      <MapControl />

      <section className="px-4 pt-[calc(var(--hh)+env(safe-area-inset-top))] md:grid md:h-svh md:grid-cols-[clamp(230px,22vw,340px)_1fr] md:gap-[4vw] md:px-8 md:pb-8">
        {/* Panneau : la série, ou l'arrondissement survolé (ordi). */}
        <div className="relative pt-[8vh] md:pt-[6vh]">
          <div className="pm-panel pm-default flex flex-col justify-between md:absolute md:inset-0 md:pt-[6vh]">
            <div>
              <p className="cap mb-4 opacity-50">Série en cours</p>
              <h1 className="font-serif text-[clamp(64px,7.5vw,128px)] leading-[0.86] tracking-[-0.02em]">{serie.title}</h1>
              {serie.text && <p className="mt-5 max-w-xs text-[14px] leading-relaxed opacity-70">{serie.text}</p>}
            </div>
            <div className="mt-8 md:mt-0">
              <p className="flex items-baseline gap-3">
                <span className="font-serif text-[clamp(48px,5vw,88px)] leading-none tabular-nums">{pad(done)}</span>
                <span className="cap opacity-50">/ 20 arrondissements</span>
              </p>
              <div className="mt-4 h-px w-full bg-current/15">
                <div className="h-px bg-current" style={{ width: `${(done / 20) * 100}%` }} />
              </div>
            </div>
          </div>

          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
            const a = by.get(n);
            return (
              <div key={n} data-panel={n} aria-hidden className="pm-panel pm-hover absolute inset-0 hidden flex-col justify-between pt-[6vh] md:flex">
                <div>
                  <p className="cap mb-4 opacity-50">Paris · {ARR_NAMES[n - 1]}</p>
                  <p className="font-serif text-[clamp(110px,12vw,200px)] leading-[0.78] tracking-[-0.03em]">
                    {n}
                    <span className="ml-1 align-top text-[0.32em] italic leading-none">{sup(n)}</span>
                  </p>
                  {a ? (
                    <>
                      <p className="mt-8 font-serif text-[clamp(28px,2.6vw,44px)] leading-[1] tracking-[-0.01em]">{a.title}</p>
                      <p className="cap mt-4 opacity-60">
                        {[a.support, a.year, `${pad(a.photos.length)} photos`].filter(Boolean).join(" · ")}
                      </p>
                    </>
                  ) : (
                    <p className="cap mt-8 opacity-50">À venir</p>
                  )}
                </div>
                {a && <p className="cap">Ouvrir →</p>}
              </div>
            );
          })}
        </div>

        {/* Carte */}
        {/* La carte tient toujours dans la hauteur d'écran restante (sinon elle
            passerait sous la barre du haut sur les écrans larges et bas). */}
        <div className="flex min-h-0 items-center justify-center py-8 md:py-[3vh]">
          <svg
            data-map
            viewBox={vb}
            className="pm-map block h-auto overflow-visible"
            style={{
              width: `min(100%, calc((100svh - var(--hh) - env(safe-area-inset-top) - 6vh - 2rem) * ${(map.w / map.h).toFixed(4)}))`,
              aspectRatio: `${map.w} / ${map.h}`,
            }}
            role="img"
            aria-label="Carte des vingt arrondissements de Paris"
          >
            <defs>
              {/* Découpe des photos : réutilise le contour (pas de tracé en double). */}
              {map.arrs
                .filter((g) => by.has(g.n))
                .map((g) => (
                  <clipPath key={g.n} id={`pm-c${g.n}`}>
                    <use href={`#pm-a${g.n}`} />
                  </clipPath>
                ))}
            </defs>

            {/* Photos, en fondu dans leur arrondissement. */}
            {map.arrs.map((g) => {
              const a = by.get(g.n);
              if (!a) return null;
              const [x, y, w, h] = g.box;
              const img = fill(a, g.box);
              return (
                // Apparition une fois le contour dessiné (enveloppe animée,
                // pour laisser l'opacité du survol à .pm-photo).
                <g key={g.n} className="pm-photo-in" style={{ animationDelay: `${500 + (g.n - 1) * 70}ms` }}>
                  <g data-n={g.n} className="pm-photo" clipPath={`url(#pm-c${g.n})`}>
                    {img.blur && <image href={img.blur} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" />}
                    <image href={img.href} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" />
                  </g>
                </g>
              );
            })}

            {/* Quartiers : filigrane. */}
            <path d={map.quartiers} className="pm-q" fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke" />

            {/* Arrondissements : contour, zone de survol, lien. */}
            {map.arrs.map((g) => {
              const a = by.get(g.n);
              const shape = (
                <path
                  id={`pm-a${g.n}`}
                  d={g.d}
                  pathLength={1}
                  data-n={g.n}
                  className={`pm-arr ${a ? "pm-done" : ""}`}
                  style={{ animationDelay: `${(g.n - 1) * 70}ms` }}
                />
              );
              return a ? (
                <Link
                  key={g.n}
                  href={`/paris/${a.slug}`}
                  data-n={g.n}
                  data-bg={a.colors.bg}
                  data-fg={a.colors.fg}
                  aria-label={`${ordinal(g.n)} arrondissement — ${a.title}${a.support ? `, ${a.support}` : ""}`}
                >
                  {shape}
                </Link>
              ) : (
                <g key={g.n} data-n={g.n}>
                  {shape}
                </g>
              );
            })}

            {/* La Seine : deux berges fines. */}
            <g className="pm-seine" fill="none" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
              <path d={map.seine} stroke="currentColor" strokeWidth={7.5} strokeOpacity={0.5} />
              <path d={map.seine} stroke="var(--bg)" strokeWidth={6} />
              <path id="pm-seine-l" d={map.seineLabel} stroke="none" />
              <text className="pm-seine-t" dy={-7}>
                <textPath href="#pm-seine-l" startOffset="50%" textAnchor="middle">
                  la Seine
                </textPath>
              </text>
            </g>

            {/* Numéros */}
            <g pointerEvents="none">
              {map.arrs.map((g) => (
                <text
                  key={g.n}
                  data-n={g.n}
                  x={g.label[0]}
                  y={g.label[1]}
                  className={`pm-num ${by.has(g.n) ? "pm-num-done" : ""}`}
                  style={{ animationDelay: `${600 + (g.n - 1) * 70}ms` }}
                >
                  {g.n}
                </text>
              ))}
            </g>
          </svg>
        </div>
      </section>

      {/* Index : les vingt arrondissements. */}
      <section className="px-4 pb-16 pt-6 md:px-8 md:pt-16">
        <p className="cap mb-6 opacity-50">Index</p>
        <ol className="grid grid-cols-2 gap-x-6 sm:grid-cols-4 md:grid-cols-5 md:gap-x-10">
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
            const a = by.get(n);
            const body = (
              <>
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-[28px] leading-none">
                    {n}
                    <span className="text-[0.5em] italic">{sup(n)}</span>
                  </span>
                  <span className="cap truncate opacity-50">{a ? (a.support ?? `${pad(a.photos.length)} photos`) : "à venir"}</span>
                </span>
                <span className="mt-2 block truncate text-[14px]">{a ? a.title : ARR_NAMES[n - 1]}</span>
              </>
            );
            return (
              <li key={n} data-n={n} className={`pm-item border-t border-current/15 pb-6 pt-3 ${a ? "" : "opacity-40"}`}>
                {a ? (
                  <Link href={`/paris/${a.slug}`} data-n={n} data-bg={a.colors.bg} data-fg={a.colors.fg} className="block">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ol>
        <p className="cap mt-10 opacity-40">Fond de carte : quartiers administratifs, Ville de Paris — opendata.paris.fr (ODbL)</p>
      </section>
    </div>
  );
}
