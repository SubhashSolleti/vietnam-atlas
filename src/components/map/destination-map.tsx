"use client";

import { useMemo } from "react";
import { AtlasMap, type MapPin } from "./atlas-map";

export function DestinationMap({
  center,
  attractions,
}: {
  center: { lat: number; lng: number; name: string };
  attractions: { id: string; name: string; lat: number; lng: number; slug: string; kind: string }[];
}) {
  const pins = useMemo<MapPin[]>(
    () => [
      { id: "centre", lat: center.lat, lng: center.lng, kind: "destination", title: center.name, subtitle: "Destination centre" },
      ...attractions.map((a) => ({ id: a.id, lat: a.lat, lng: a.lng, kind: "attraction" as const, title: a.name, subtitle: a.kind.replace("_", " "), href: `/attractions/${a.slug}` })),
    ],
    [center, attractions],
  );
  return <AtlasMap pins={pins} cluster={false} embedded fitPadding={24} initialZoom={9} ariaLabel={`Map of ${center.name} and its attractions`} />;
}
