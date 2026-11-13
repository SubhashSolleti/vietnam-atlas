import type { MonthScore, SourceRef } from "./types";

/**
 * Build a 12-month suitability array.
 *   months("1112333332 11")  -> not allowed; use digits only:
 *   months("332211001233")   -> Jan..Dec
 */
export function months(pattern: string): MonthScore[] {
  const clean = pattern.replace(/\s+/g, "");
  if (!/^[0-3]{12}$/.test(clean)) throw new Error(`months(): expected 12 digits 0-3, got "${pattern}"`);
  return clean.split("").map((c) => Number(c) as MonthScore);
}

/** Official Vietnam tourism website run by the Vietnam National Authority of Tourism. */
export const VNAT_TRAVEL: SourceRef = {
  title: "Vietnam Travel: official tourism website",
  url: "https://vietnam.travel",
  publisher: "Vietnam National Authority of Tourism",
  kind: "official_tourism",
  checked: "Destination overview and positioning",
  status: "reference",
  confidence: "medium",
};

export const VNAT_GOV: SourceRef = {
  title: "Vietnam National Authority of Tourism",
  url: "https://vietnamtourism.gov.vn",
  publisher: "Vietnam National Authority of Tourism",
  kind: "government",
  checked: "National tourism authority information",
  status: "reference",
  confidence: "medium",
};

/** English Wikipedia reference (community-maintained; use for geography/history context only). */
export function wiki(title: string, checked = "Geography and background"): SourceRef {
  return {
    title: `${title.replace(/_/g, " ")}Wikipedia`,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    publisher: "Wikipedia",
    kind: "reference",
    checked,
    status: "community",
    confidence: "medium",
  };
}

/** Wikivoyage travel guide (community-maintained; practical travel context). */
export function wikivoyage(title: string, checked = "Practical travel context"): SourceRef {
  return {
    title: `${title.replace(/_/g, " ")}Wikivoyage`,
    url: `https://en.wikivoyage.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    publisher: "Wikivoyage",
    kind: "reference",
    checked,
    status: "community",
    confidence: "medium",
  };
}

/**
 * Official operator / authority homepage, cited as an authoritative *reference*. Citing a homepage does not
 * verify the specific prices, hours or details on our page, so it is never labelled "verified".
 */
export function official(
  title: string,
  url: string,
  publisher: string,
  checked: string,
  kind: SourceRef["kind"] = "attraction_official",
): SourceRef {
  return { title, url, publisher, kind, checked, status: "reference", confidence: "medium" };
}

/** A provider/operator page you believe exists but whose details were not re-checked. */
export function provider(title: string, url: string, publisher: string, checked: string): SourceRef {
  return { title, url, publisher, kind: "provider", checked, status: "needs_verification", confidence: "medium" };
}

/** Common packing lists to keep seed files concise. */
export const BRING = {
  beach: ["Reef-safe sunscreen", "Swimwear", "Quick-dry towel", "Water", "Waterproof phone pouch"],
  boat: ["Motion-sickness tablets if prone", "Sunscreen", "Hat", "Waterproof bag", "Cash (VND) for extras"],
  trek: ["2L water", "Rain jacket", "Snacks", "Small first-aid kit", "Power bank"],
  city: ["Water", "Small cash notes (VND)", "Phone with offline map", "Light rain jacket"],
  temple: ["Scarf or shawl to cover shoulders", "Water", "Small cash for donations"],
  cave: ["Head torch (often provided: confirm)", "Water", "Dry bag", "Change of clothes"],
  night: ["ID / passport photocopy", "Small cash notes", "Charged phone", "Ride-hailing app installed"],
  cold: ["Warm layers", "Windproof jacket", "Gloves and beanie (Dec–Jan)", "Thermos/hot drink"],
};

export const WEAR = {
  beach: ["Swimwear", "Sandals", "Sun hat", "Light cover-up"],
  water: ["Swimwear", "Rash guard", "Water shoes"],
  trek: ["Trekking shoes with grip", "Quick-dry layers", "Long trousers (leeches/vegetation)"],
  city: ["Comfortable walking shoes", "Breathable clothing"],
  temple: ["Clothing covering shoulders and knees", "Easily removable shoes"],
  cave: ["Closed shoes with grip", "Quick-dry clothes that can get muddy"],
  cold: ["Thermal base layer", "Fleece", "Warm jacket", "Closed shoes"],
  night: ["Smart-casual clothing", "Closed shoes for clubs"],
};
