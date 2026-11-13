"use client";

import { Info, ImageOff } from "lucide-react";
import Image from "next/image";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AtlasImageData {
  src: string;
  alt: string;
  width?: number | null;
  height?: number | null;
  author?: string | null;
  license?: string | null;
  sourceUrl?: string | null;
  representative?: boolean;
}

/**
 * Responsive, lazy-loaded image with licence attribution and a graceful fallback.
 * The parent must establish the box (aspect ratio or fixed height); the image fills it.
 */
export function AtlasImage({
  image,
  fallbackLabel,
  sizes = "(min-width: 1024px) 33vw, 100vw",
  priority,
  className,
  credit = "corner",
  placeholderIcon,
}: {
  image: AtlasImageData | null | undefined;
  fallbackLabel: string;
  /** Icon for the designed placeholder shown when there is no photo (defaults to an "image unavailable" icon). */
  placeholderIcon?: ReactNode;
  sizes?: string;
  priority?: boolean;
  className?: string;
  credit?: "corner" | "none" | "inline";
}) {
  const [failed, setFailed] = useState(false);
  const patternId = useId();
  if (!image || failed) {
    return (
      <div className={cn("absolute inset-0 grid place-items-center overflow-hidden bg-[linear-gradient(135deg,var(--color-forest),var(--color-jade))] text-white/80", className)} role="img" aria-label={`${fallbackLabel}image not available`}>
        <svg className="absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden>
          <defs>
            <pattern id={patternId} width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M0 30 Q15 10 30 30 T60 30" fill="none" stroke="white" strokeWidth="1" />
              <path d="M0 50 Q15 30 30 50 T60 50" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
        <span className="relative flex flex-col items-center gap-1 px-4 text-center font-serif text-lg">
          {placeholderIcon ?? <ImageOff className="size-5 opacity-60" aria-hidden />}
          {fallbackLabel}
        </span>
      </div>
    );
  }
  return (
    <>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        onError={() => setFailed(true)}
        className={cn("object-cover", className)}
      />
      {credit === "corner" && <ImageCredit image={image} />}
    </>
  );
}

export function ImageCredit({ image, className }: { image: AtlasImageData; className?: string }) {
  const [open, setOpen] = useState(false);
  if (!image.author && !image.license) return null;
  return (
    <span className={cn("absolute right-2 bottom-2 z-[2]", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label="Photo credit"
        aria-expanded={open}
        className="grid size-6 place-items-center rounded-full bg-black/45 text-white/90 backdrop-blur hover:bg-black/65"
      >
        <Info className="size-3.5" />
      </button>
      {open && (
        <span className="absolute right-0 bottom-8 w-64 rounded-md bg-charcoal/95 p-3 text-left text-[0.7rem] leading-snug text-white shadow-lg" role="note">
          <span className="block font-semibold">Photo: {image.author ?? "Unknown"}</span>
          {image.license && <span className="block opacity-80">Licence: {image.license}</span>}
          {image.representative && <span className="mt-1 block opacity-80">Representative image: may not show this exact operator or venue.</span>}
          {image.sourceUrl && (
            <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block underline" onClick={(e) => e.stopPropagation()}>
              View on Wikimedia Commons
            </a>
          )}
        </span>
      )}
    </span>
  );
}
