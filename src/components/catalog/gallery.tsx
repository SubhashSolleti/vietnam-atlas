"use client";

import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AtlasImage, type AtlasImageData } from "./atlas-image";

/** Editorial mosaic gallery (mixed aspect ratios) with an accessible lightbox. */
export function Gallery({ images, title, className }: { images: AtlasImageData[]; title: string; className?: string }) {
  const [index, setIndex] = useState<number | null>(null);
  if (!images.length) return null;
  const shown = images.slice(0, 5);
  return (
    <>
      <div className={cn("grid h-[52vw] max-h-[520px] min-h-[260px] grid-cols-4 grid-rows-2 gap-2", className)}>
        {shown.map((img, i) => (
          <button
            key={img.src + i}
            type="button"
            onClick={() => setIndex(i)}
            className={cn(
              "group relative overflow-hidden rounded-sm bg-surface-2",
              i === 0 ? "col-span-4 row-span-2 md:col-span-2" : "hidden md:block",
              shown.length === 2 && i === 1 && "md:col-span-2 md:row-span-2",
              shown.length === 3 && i > 0 && "md:col-span-2",
              shown.length === 4 && i === 3 && "md:col-span-2",
            )}
            aria-label={`Open photo ${i + 1} of ${images.length}: ${img.alt}`}
          >
            <AtlasImage image={img} fallbackLabel={title} sizes={i === 0 ? "(min-width: 768px) 50vw, 100vw" : "25vw"} priority={i === 0} credit="none" className="transition-transform duration-500 group-hover:scale-[1.03]" />
            {i === shown.length - 1 && (
              <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-sm bg-white/95 px-3 py-1.5 text-xs font-semibold text-charcoal shadow">
                <Expand className="size-3.5" /> {images.length} photos
              </span>
            )}
          </button>
        ))}
      </div>
      {index !== null && <Lightbox images={images} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />}
    </>
  );
}

export function Lightbox({ images, index, onIndex, onClose }: { images: AtlasImageData[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const img = images[index]!;
  const prev = useCallback(() => onIndex((index - 1 + images.length) % images.length), [index, images.length, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % images.length), [index, images.length, onIndex]);
  useEffect(() => {
    ref.current?.showModal();
    const d = ref.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d?.addEventListener("keydown", onKey);
    d?.addEventListener("cancel", onCancel);
    return () => {
      d?.removeEventListener("keydown", onKey);
      d?.removeEventListener("cancel", onCancel);
    };
  }, [prev, next, onClose]);
  let touchX = 0;
  return (
    <dialog ref={ref} aria-label="Photo viewer" className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white">
      <div
        className="relative flex h-full flex-col"
        onTouchStart={(e) => (touchX = e.touches[0]!.clientX)}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0]!.clientX - touchX;
          if (Math.abs(dx) > 50) (dx > 0 ? prev : next)();
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="tabular-nums text-white/70">
            {index + 1} / {images.length}
          </span>
          <button type="button" onClick={onClose} aria-label="Close photo viewer" className="grid size-10 place-items-center rounded-full hover:bg-white/10">
            <X className="size-5" />
          </button>
        </div>
        <div className="relative flex-1">
          <Image src={img.src} alt={img.alt} fill sizes="100vw" className="object-contain" />
          {images.length > 1 && (
            <>
              <button type="button" onClick={prev} aria-label="Previous photo" className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                <ChevronLeft className="size-6" />
              </button>
              <button type="button" onClick={next} aria-label="Next photo" className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                <ChevronRight className="size-6" />
              </button>
            </>
          )}
        </div>
        <div className="px-4 py-3 text-center text-xs text-white/70">
          <p className="text-sm text-white/90">{img.alt}</p>
          {img.author && (
            <p className="mt-1">
              Photo: {img.author}
              {img.license && ` · ${img.license}`}
              {img.sourceUrl && (
                <>
                  {" · "}
                  <a href={img.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    Source
                  </a>
                </>
              )}
              {img.representative && " · Representative image"}
            </p>
          )}
        </div>
      </div>
    </dialog>
  );
}
