"use client";

import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { removeBasePlanPdf, uploadBasePlanPdf } from "@/app/actions/documents";
import { Button, buttonClass } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type PlanPdf = { url: string; fileName: string; sizeBytes: number; pageCount: number; dayPages: (number | null)[]; createdAt: string };

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * The owner's itinerary PDF: everyone can read it in the app (pages are drawn here, so it works on phones that
 * won't show a PDF inline), open it in the browser, or save it. Owners and editors attach, replace or remove it.
 */
export function BasePlanPdf({ tripId, pdf, ownerName, canManage, compact }: { tripId: string; pdf: PlanPdf | null; ownerName: string; canManage: boolean; compact?: boolean }) {
  const toast = useToast();
  const confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [viewing, setViewing] = useState<number | null>(null);

  const upload = (file: File) =>
    start(async () => {
      const form = new FormData();
      form.set("tripId", tripId);
      form.set("file", file);
      const r = await uploadBasePlanPdf(form);
      if (!r.ok) return toast({ tone: "error", title: r.error });
      toast({ tone: "success", title: "Itinerary PDF attached", description: r.daysFound ? `${r.pageCount} pages. Each day on the board links to its page.` : `${r.pageCount} pages. No "Day 1, Day 2…" headings were found, so days link to the first page.` });
    });

  const picker = canManage && (
    <>
      <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Itinerary PDF file" tabIndex={-1} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} />
      <Button size="sm" variant={pdf ? "ghost" : "primary"} disabled={pending} onClick={() => input.current?.click()}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {pending ? "Uploading…" : pdf ? "Replace PDF" : "Attach itinerary PDF"}
      </Button>
    </>
  );

  if (!pdf)
    return canManage ? (
      <div className={cn("flex flex-col gap-3 rounded-md border border-dashed border-line-strong bg-surface p-4 sm:flex-row sm:items-center sm:justify-between", compact && "p-3")}>
        <div className="flex items-start gap-3 text-sm">
          <FileText className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
          <div>
            <p className="font-semibold">Attach your itinerary PDF</p>
            <p className="text-muted">Everyone sees it next to the base plan, and each day links to its page. Up to 4 MB.</p>
          </div>
        </div>
        <div className="shrink-0">{picker}</div>
      </div>
    ) : null;

  return (
    <div className={cn("flex flex-col gap-3 rounded-md border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between", compact && "p-3")}>
      <div className="flex min-w-0 items-start gap-3 text-sm">
        <FileText className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold">{ownerName}'s itinerary (base plan)</p>
          <p className="truncate text-muted">{pdf.fileName} · {pdf.pageCount} pages · {mb(pdf.sizeBytes)}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <Button size="sm" onClick={() => setViewing(1)}><FileText className="size-4" />Read the PDF</Button>
        <a className={buttonClass("outline", "sm")} href={`${pdf.url}&download=1`} download aria-label="Download the itinerary PDF"><Download className="size-4" />Save</a>
        {picker}
        {canManage && (
          <Button size="sm" variant="ghost" className="text-bad" aria-label="Remove the itinerary PDF" disabled={pending}
            onClick={async () => (await confirm({ title: "Remove the itinerary PDF?", description: "The base plan on the board stays; only the attached file goes.", confirmLabel: "Remove", tone: "danger" })) && start(async () => { const r = await removeBasePlanPdf(tripId); toast(r.ok ? { tone: "success", title: "PDF removed" } : { tone: "error", title: r.error }); })}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      {viewing != null && <PdfViewer pdf={pdf} title={`${ownerName}'s itinerary`} page={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

/** "PDF p.4" link for a day: opens the viewer on the page where that day starts. */
export function DayPdfLink({ pdf, dayIndex, title, className }: { pdf: PlanPdf; dayIndex: number; title: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const page = pdf.dayPages[dayIndex] ?? null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn("inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline", className)} aria-label={`Day ${dayIndex + 1} in the itinerary PDF${page ? `, page ${page}` : ""}`}>
        <FileText className="size-3.5" aria-hidden />
        {page ? `PDF p.${page}` : "PDF"}
      </button>
      {open && <PdfViewer pdf={pdf} title={title} page={page ?? 1} onClose={() => setOpen(false)} />}
    </>
  );
}

type Doc = { numPages: number; getPage: (n: number) => Promise<PdfPage> };
type PdfPage = { getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvas: HTMLCanvasElement; viewport: unknown }) => { promise: Promise<void> } };

/** Draws the PDF's pages with PDF.js (loaded only when someone opens it) and scrolls to `page`. */
export function PdfViewer({ pdf, title, page, onClose }: { pdf: PlanPdf; title: string; page: number; onClose: () => void }) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ getDocumentProxy }, res] = await Promise.all([import("unpdf"), fetch(pdf.url, { credentials: "same-origin" })]);
        if (!res.ok) throw new Error(String(res.status));
        const proxy = (await getDocumentProxy(new Uint8Array(await res.arrayBuffer()))) as unknown as Doc;
        if (!cancelled) setDoc(proxy);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf.url]);

  return (
    <Dialog open onClose={onClose} title={title} description={`${pdf.pageCount} pages${page > 1 ? ` · opened at page ${page}` : ""}`} size="xl"
      footer={<a className={buttonClass("outline")} href={pdf.url} target="_blank" rel="noopener">Open in browser</a>}>
      {error ? (
        <p className="text-sm text-muted">The PDF couldn't be shown here. Use <strong>Open in browser</strong> instead.</p>
      ) : !doc ? (
        <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" />Loading the PDF…</p>
      ) : (
        <div className="space-y-4">
          {Array.from({ length: doc.numPages }, (_, i) => <PdfPageCanvas key={i} doc={doc} n={i + 1} scrollTo={i + 1 === page} />)}
        </div>
      )}
    </Dialog>
  );
}

function PdfPageCanvas({ doc, n, scrollTo }: { doc: Doc; n: number; scrollTo: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);
  const [ratio, setRatio] = useState("1 / 1.414");
  const draw = useCallback(async () => {
    const canvas = ref.current;
    if (!canvas || drawn) return;
    setDrawn(true);
    const p = await doc.getPage(n);
    const base = p.getViewport({ scale: 1 });
    const width = Math.min(1200, canvas.parentElement?.clientWidth ?? 800) * Math.min(2, window.devicePixelRatio || 1);
    const viewport = p.getViewport({ scale: width / base.width });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    setRatio(`${canvas.width} / ${canvas.height}`);
    await p.render({ canvas, viewport }).promise;
  }, [doc, n, drawn]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // Draw pages as they come into view, so a long PDF opens quickly.
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && void draw(), { rootMargin: "600px 0px" });
    io.observe(el);
    if (scrollTo) requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
    return () => io.disconnect();
  }, [draw, scrollTo]);
  return (
    <div ref={box} id={`pdf-page-${n}`} className="scroll-mt-2">
      <p className="mb-1 text-xs text-muted">Page {n}</p>
      <canvas ref={ref} className="h-auto w-full rounded-sm border border-line bg-white" style={{ aspectRatio: ratio }} aria-label={`Page ${n}`} role="img" />
    </div>
  );
}
