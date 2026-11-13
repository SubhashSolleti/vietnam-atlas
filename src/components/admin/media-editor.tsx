"use client";

import { Star, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { updateImageLink, uploadImage } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

type Img = { linkId: string; src: string; alt: string; role: string; author: string | null; license: string | null };

export function MediaEditor({ entityType, entityId, images }: { entityType: "destination" | "attraction" | "activity" | "region"; entityId: string; images: Img[] }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string>();
  return (
    <section>
      <h2 className="mb-3 text-2xl">Images</h2>
      {images.length ? (
        <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((i) => (
            <li key={i.linkId} className="overflow-hidden rounded-md border border-line bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.src} alt={i.alt} className="aspect-[3/2] w-full object-cover" />
              <div className="p-2 text-xs">
                <p className="line-clamp-2">{i.alt}</p>
                <p className="mt-1 text-muted">{i.author ?? "Unknown"} · {i.license ?? "no licence recorded"}</p>
                <div className="mt-2 flex gap-1">
                  <Button size="xs" variant={i.role === "hero" ? "secondary" : "ghost"} disabled={pending || i.role === "hero"} onClick={() => start(async () => void (await updateImageLink(i.linkId, { role: "hero" })))}><Star className="size-3.5" />{i.role === "hero" ? "Hero" : "Make hero"}</Button>
                  <Button size="xs" variant="ghost" className="ml-auto text-bad" disabled={pending} aria-label="Remove image" onClick={() => start(async () => void (await updateImageLink(i.linkId, { remove: true })))}><Trash2 className="size-3.5" /></Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No images linked. The public page falls back to related destination imagery, labelled as representative.</p>
      )}
      <form
        ref={formRef}
        className="mt-4 grid gap-3 rounded-md border border-line bg-surface p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("entityType", entityType);
          fd.set("entityId", entityId);
          start(async () => {
            const r = await uploadImage(fd);
            if (r.ok) { formRef.current?.reset(); setError(undefined); toast({ tone: "success", title: "Image uploaded" }); }
            else { setError(r.error); }
          });
        }}
      >
        <div className="sm:col-span-2">
          <label htmlFor="img-file" className="mb-1.5 block text-sm font-medium">Image file (JPEG, PNG, WebP or AVIF · ≥ 600px wide · ≤ 12 MB)</label>
          <input id="img-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required className="block w-full text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-surface-2 file:px-3 file:py-2" />
        </div>
        <div className="sm:col-span-2"><Field label="Alt text (describe what's in the photo)" name="alt" error={error}>{(p) => <Input {...p} required minLength={5} maxLength={240} />}</Field></div>
        <Field label="Photographer / author" name="author">{(p) => <Input {...p} />}</Field>
        <Field label="Licence" name="license">{(p) => <Input {...p} placeholder="e.g. CC BY-SA 4.0, own photo, provider permission" />}</Field>
        <Field label="Source page URL" name="sourceUrl">{(p) => <Input {...p} type="url" placeholder="https://" />}</Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input name="representative" type="checkbox" className="size-4 accent-[var(--brand)]" />Representative (not the exact venue/operator)</label>
        <div><Button type="submit" disabled={pending}>{pending ? "Uploading…" : "Upload image"}</Button></div>
      </form>
    </section>
  );
}
