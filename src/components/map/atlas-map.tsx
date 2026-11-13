"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { useEffect, useRef } from "react";
import { cn, optimizedImage } from "@/lib/utils";

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  kind: "destination" | "attraction" | "activity" | "stop";
  title: string;
  subtitle?: string;
  href?: string;
  image?: string | null;
  label?: string; // e.g. itinerary order number
  tone?: "brand" | "accent" | "ochre" | "good";
  meta?: string;
}

export interface MapRoute {
  id: string;
  points: [number, number][];
  dashed?: boolean;
  label?: string;
}

const TONES = { brand: "#173F35", accent: "#C96F50", ochre: "#B8892F", good: "#377A61" };

function pinHtml(p: MapPin, selected: boolean) {
  const color = TONES[p.tone ?? (p.kind === "destination" ? "brand" : p.kind === "attraction" ? "ochre" : p.kind === "stop" ? "accent" : "good")];
  const size = p.kind === "destination" || p.kind === "stop" ? 30 : 22;
  const inner = p.label ? `<span style="color:#fff;font:600 12px Inter Variable, sans-serif">${p.label}</span>` : "";
  return `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)${selected ? ",0 0 0 4px rgba(201,111,80,.45)" : ""};display:grid;place-items:center;transform:translate(-50%,-50%)">${inner}</div>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function popupHtml(p: MapPin) {
  const img = p.image ? `<img src="${escapeHtml(optimizedImage(p.image, 640))}" alt="" loading="lazy" style="width:100%;height:120px;object-fit:cover;border-radius:8px 8px 0 0;display:block" />` : "";
  const link = p.href ? `<a href="${escapeHtml(p.href)}" style="display:inline-block;margin-top:8px;font-weight:600;color:var(--accent)">Open details →</a>` : "";
  return `${img}<div style="padding:10px 12px 12px"><div style="font:600 10px Inter Variable,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-muted)">${escapeHtml(p.kind === "stop" ? "Itinerary stop" : p.kind)}</div><div style="font:600 15px Inter Variable,sans-serif;margin-top:2px;color:var(--ink)">${escapeHtml(p.title)}</div>${p.subtitle ? `<div style="font-size:12.5px;color:var(--ink-muted);margin-top:2px">${escapeHtml(p.subtitle)}</div>` : ""}${p.meta ? `<div style="font-size:12px;margin-top:6px;color:var(--ink)">${escapeHtml(p.meta)}</div>` : ""}${link}</div>`;
}

/**
 * Interactive Leaflet map with OpenStreetMap tiles, clustering, popups and routes.
 * Data is local; map tiles are fetched from tile.openstreetmap.org (needs internet).
 */
export function AtlasMap({
  pins,
  routes = [],
  selectedId,
  onSelect,
  className,
  cluster = true,
  fitPadding = 40,
  initialZoom,
  center,
  ariaLabel = "Map of Vietnam",
  embedded = false,
}: {
  pins: MapPin[];
  routes?: MapRoute[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  cluster?: boolean;
  fitPadding?: number;
  initialZoom?: number;
  center?: [number, number];
  ariaLabel?: string;
  /** A map inside a scrolling page: on touch screens one-finger drags scroll the page (pinch still zooms). */
  embedded?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markersRef = useRef(new Map<string, import("leaflet").Marker>());
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Init once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      (window as unknown as { L: typeof L }).L = L;
      await import("leaflet.markercluster");
      if (cancelled || !el.current || mapRef.current) return;
      LRef.current = L;
      const touch = window.matchMedia("(pointer: coarse)").matches;
      const map = L.map(el.current, { zoomControl: true, scrollWheelZoom: !embedded, dragging: !(embedded && touch), attributionControl: true }).setView(center ?? [16.2, 106.3], initialZoom ?? 5);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 50);
      draw();
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = () => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    layerRef.current?.remove();
    markersRef.current.clear();
    const group: import("leaflet").LayerGroup = cluster
      ? (L as unknown as { markerClusterGroup: (o: object) => import("leaflet").LayerGroup }).markerClusterGroup({
          showCoverageOnHover: false,
          maxClusterRadius: 42,
          iconCreateFunction: (c: { getChildCount: () => number }) =>
            L.divIcon({ html: `<div>${c.getChildCount()}</div>`, className: "marker-cluster-atlas", iconSize: L.point(40, 40) }),
        })
      : L.layerGroup();
    for (const r of routes) {
      L.polyline(r.points, { color: "#C96F50", weight: 3, opacity: 0.9, dashArray: r.dashed ? "6 8" : undefined }).addTo(group);
    }
    for (const p of pins) {
      const m = L.marker([p.lat, p.lng], {
        icon: L.divIcon({ html: pinHtml(p, p.id === selectedId), className: "atlas-pin", iconSize: [0, 0] }),
        title: p.title,
        alt: p.title,
        keyboard: true,
        riseOnHover: true,
      });
      m.bindPopup(popupHtml(p), { closeButton: true, maxWidth: 280, minWidth: 240 });
      m.on("click", () => onSelectRef.current?.(p.id));
      m.addTo(group);
      markersRef.current.set(p.id, m);
    }
    group.addTo(map);
    layerRef.current = group;
    const pts = [...pins.map((p) => [p.lat, p.lng] as [number, number]), ...routes.flatMap((r) => r.points)];
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [fitPadding, fitPadding], maxZoom: 11 });
    else if (pts.length === 1) map.setView(pts[0]!, initialZoom ?? 9);
  };

  useEffect(draw, [pins, routes, cluster]); // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight + open selected
  useEffect(() => {
    if (!selectedId) return;
    const m = markersRef.current.get(selectedId);
    const map = mapRef.current;
    if (!m || !map) return;
    const group = layerRef.current as unknown as { zoomToShowLayer?: (m: unknown, cb: () => void) => void };
    if (group?.zoomToShowLayer) group.zoomToShowLayer(m, () => m.openPopup());
    else {
      map.setView(m.getLatLng(), Math.max(map.getZoom(), 9));
      m.openPopup();
    }
  }, [selectedId]);

  return <div ref={el} role="region" aria-label={ariaLabel} className={cn("relative z-0 h-full w-full overflow-hidden rounded-md bg-surface-2", className)} />;
}
