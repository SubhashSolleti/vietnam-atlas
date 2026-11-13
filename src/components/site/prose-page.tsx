import type { ReactNode } from "react";

export function ProsePage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="container-x max-w-3xl pt-12">
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h1 className="text-4xl md:text-5xl">{title}</h1>
      {intro && <p className="mt-4 text-lg text-muted">{intro}</p>}
      <div className="prose-atlas mt-8 text-[1.02rem] [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-2xl">{children}</div>
    </div>
  );
}
