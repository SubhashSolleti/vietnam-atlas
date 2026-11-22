"use client";

import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { removeBasePlanPdf, uploadBasePlanPdf } from "@/app/actions/documents";
import { Button, buttonClass } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { MAX_PLAN_PDF_BYTES, pageForDay } from "@/lib/pdf-days";
import { cn } from "@/lib/utils";

export type PlanPdf = { url: string; fileName: string; sizeBytes: number; pageCount: number; dayPages: (number | null)[]; dayTexts: (string | null)[]; createdAt: string };

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

  const upload = (file: File) => {
    // Checked here too: the host refuses big uploads before the server can explain why.
    if (file.size > MAX_PLAN_PDF_BYTES) return toast({ tone: "error", title: `That PDF is ${mb(file.size)}. PDFs must be 4 MB or smaller.`, description: "Export it again with smaller images, or use Print → Save as PDF." });
    start(async () => {
      const form = new FormData();
      form.set("tripId", tripId);
      form.set("file", file);
      const r = await uploadBasePlanPdf(form).catch(() => ({ ok: false as const, error: "The upload didn't go through. Check your connection and try again." }));
      if (!r.ok) return toast({ tone: "error", title: r.error });
      toast({
        tone: "success",
        title: "Itinerary PDF attached",
        description:
          r.daysFound === r.dayCount
            ? `${r.pageCount} pages. Each day on the board links to its page.`
            : r.daysFound
              ? `${r.pageCount} pages. Found where ${r.daysFound} of the ${r.dayCount} days start; the others open at the page before.`
              : `${r.pageCount} pages. No "Day 1, Day 2…" headings were found, so days open at the first page.`,
      });
    });
  };

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
        <a className={buttonClass("outline", "sm")} href={`${pdf.url}&download=1`} download><Download className="size-4" />Save PDF</a>
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
  const { page, exact } = pageForDay(pdf.dayPages, dayIndex);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn("-my-1.5 inline-flex min-h-8 items-center gap-1 px-1 text-xs font-medium underline-offset-2 hover:underline", className)} aria-label={`Day ${dayIndex + 1} in the itinerary PDF, page ${page}`}>
        <FileText className="size-3.5" aria-hidden />
        PDF p.{page}
      </button>
      {open && <PdfViewer pdf={pdf} title={title} page={page} note={exact ? undefined : "this day's own heading wasn't found"} onClose={() => setOpen(false)} />}
    </>
  );
}

type Doc = { numPages: number; getPage: (n: number) => Promise<PdfPage> };
type PdfPage = { getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvas: HTMLCanvasElement; viewport: unknown }) => { promise: Promise<void> } };

/** Draws the PDF's pages with PDF.js (loaded only when someone opens it) and scrolls to `page`. */
export function PdfViewer({ pdf, title, page, note, onClose }: { pdf: PlanPdf; title: string; page: number; note?: string; onClose: () => void }) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
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

  // The phone's Back button closes the viewer instead of leaving the page.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    history.pushState({ ...history.state, atlasPdf: true }, "");
    const onPop = () => closeRef.current();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const close = () => (history.state?.atlasPdf ? history.back() : onClose());

  const zoomBtn = "inline-flex size-10 items-center justify-center rounded-full border border-line text-lg font-medium hover:border-ink disabled:opacity-40";
  return (
    <Dialog open onClose={close} title={title} description={`${pdf.pageCount} pages${page > 1 ? ` · opened at page ${page}` : ""}${note ? ` (${note})` : ""}`} size="xl" className="max-sm:w-[calc(100%-1rem)]" bodyClassName="max-sm:px-2"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-1.5" role="group" aria-label="Zoom">
            <button type="button" className={zoomBtn} aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>−</button>
            <span className="w-12 text-center text-sm tabular-nums">{Math.round(zoom * 100)}%</span>
            <button type="button" className={zoomBtn} aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom((z) => Math.min(3, z + 0.5))}>+</button>
          </div>
          <a className={buttonClass("outline")} href={pdf.url} target="_blank" rel="noopener">Open in browser</a>
        </div>
      }>
      {error ? (
        <p className="text-sm text-muted">The PDF couldn't be shown here. Use <strong>Open in browser</strong> instead.</p>
      ) : !doc ? (
        <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" />Loading the PDF…</p>
      ) : (
        <div className="space-y-4 overflow-x-auto">
          {Array.from({ length: doc.numPages }, (_, i) => <PdfPageCanvas key={i} doc={doc} n={i + 1} zoom={zoom} scrollTo={i + 1 === page} />)}
        </div>
      )}
    </Dialog>
  );
}

function PdfPageCanvas({ doc, n, zoom, scrollTo }: { doc: Doc; n: number; zoom: number; scrollTo: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const drawnAt = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [ratio, setRatio] = useState("1 / 1.414");
  const draw = useCallback(async () => {
    const canvas = ref.current;
    if (!canvas || drawnAt.current === zoom) return;
    drawnAt.current = zoom;
    const p = await doc.getPage(n);
    const base = p.getViewport({ scale: 1 });
    const cssWidth = Math.min(1200, box.current?.clientWidth ?? 800) * zoom;
    const width = cssWidth * Math.min(3, window.devicePixelRatio || 1);
    const viewport = p.getViewport({ scale: width / base.width });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    setRatio(`${canvas.width} / ${canvas.height}`);
    await p.render({ canvas, viewport }).promise;
  }, [doc, n, zoom]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // Draw pages as they come into view, so a long PDF opens quickly.
    const io = new IntersectionObserver((entries) => setVisible(entries.some((e) => e.isIntersecting)), { rootMargin: "600px 0px" });
    io.observe(el);
    if (scrollTo) requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
    return () => io.disconnect();
  }, [scrollTo]);
  useEffect(() => {
    if (visible) void draw();
  }, [visible, draw]);
  return (
    <div ref={box} id={`pdf-page-${n}`} className="scroll-mt-2">
      <p className="mb-1 text-xs text-muted">Page {n}</p>
      <canvas ref={ref} className="h-auto max-w-none rounded-sm border border-line bg-white" style={{ aspectRatio: ratio, width: `${zoom * 100}%` }} aria-label={`Page ${n}`} role="img" />
    </div>
  );
}
