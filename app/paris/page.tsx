import type { Metadata } from "next";
import ParisMap from "@/components/ParisMap";
import Theme from "@/components/Theme";
import { arrs, serie } from "@/lib/projects";

export const metadata: Metadata = {
  title: serie.title,
  description: serie.text,
};

export default function Paris() {
  return (
    <main>
      <Theme bg={serie.colors.bg} fg={serie.colors.fg} />
      <ParisMap arrs={arrs} serie={serie} />
    </main>
  );
}
