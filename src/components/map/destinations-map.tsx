"use client";

import { useMemo } from "react";
import { AtlasMap, type MapPin } from "./atlas-map";

export function DestinationsMap({ items }: { items: { id: string; slug: string; name: string; lat: number; lng: number; tagline: string; image: string | null; activityCount: number }[] }) {
  const pins = useMemo<MapPin[]>(
    () => items.map((d) => ({ id: d.id, lat: d.lat, lng: d.lng, kind: "destination", title: d.name, subtitle: d.tagline, href: `/destinations/${d.slug}`, image: d.image, meta: `${d.activityCount} experiences` })),
    [items],
  );
  return <AtlasMap pins={pins} cluster={false} embedded ariaLabel="Map of destinations matching your filters" />;
}
