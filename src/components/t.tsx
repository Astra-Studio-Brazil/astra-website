import type { ReactNode } from "react";

/** Renders both languages; CSS shows the one matching <html data-lang>. */
export function T({ pt, en }: { pt: ReactNode; en: ReactNode }) {
  return (
    <span className="t">
      <span lang="pt-BR" data-l="pt">
        {pt}
      </span>
      <span lang="en" data-l="en">
        {en}
      </span>
    </span>
  );
}
