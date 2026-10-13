// Flèche fine, 1 px, couleur du texte.
const paths = {
  down: { vb: "0 0 14 22", d: "M7 0v21M1 15l6 6 6-6", w: 14, h: 22 },
  up: { vb: "0 0 14 22", d: "M7 22V1M1 7l6-6 6 6", w: 14, h: 22 },
  left: { vb: "0 0 22 14", d: "M22 7H1M7 1L1 7l6 6", w: 22, h: 14 },
};

export default function Arrow({ dir }: { dir: keyof typeof paths }) {
  const p = paths[dir];
  return (
    <svg width={p.w} height={p.h} viewBox={p.vb} fill="none" stroke="currentColor" strokeWidth="1" aria-hidden className="block">
      <path d={p.d} />
    </svg>
  );
}
