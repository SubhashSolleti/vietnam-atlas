import { describe, expect, it } from "vitest";
import { assignActivityImages } from "@/lib/image-pool";

const img = (id: string) => ({ id });
const act = (id: string, attractionId: string | null = null) => ({ id, destinationId: "d1", attractionId });

describe("assignActivityImages", () => {
  it("uses an activity's own photo when it has one", () => {
    const out = assignActivityImages([act("a1")], new Map([["a1", [img("own")]]]), new Map(), new Map([["d1", [img("hero")]]]));
    expect(out.get("a1")).toEqual({ image: { id: "own" }, borrowed: false });
  });

  it("prefers the activity's attraction photo over destination imagery", () => {
    const out = assignActivityImages([act("a1", "t1")], new Map(), new Map([["t1", [img("attr")]]]), new Map([["d1", [img("hero"), img("g1")]]]));
    expect(out.get("a1")).toEqual({ image: { id: "attr" }, borrowed: true });
  });

  it("spreads borrowed photos so cards in one destination don't repeat while the pool allows", () => {
    const acts = ["a1", "a2", "a3", "a4"].map((id) => act(id));
    const out = assignActivityImages(acts, new Map(), new Map(), new Map([["d1", [img("hero"), img("g1"), img("g2"), img("g3"), img("g4")]]]));
    const ids = acts.map((a) => out.get(a.id)!.image.id);
    expect(new Set(ids).size).toBe(4);
    // The destination hero is already on the destination card, so it is used last.
    expect(ids).not.toContain("hero");
  });

  it("does not reuse another activity's own photo", () => {
    const out = assignActivityImages([act("a1"), act("a2")], new Map([["a1", [img("g1")]]]), new Map(), new Map([["d1", [img("hero"), img("g1"), img("g2")]]]));
    expect(out.get("a2")!.image.id).toBe("g2");
  });

  it("leaves an activity without any imagery unassigned", () => {
    const out = assignActivityImages([{ id: "a1", destinationId: "dx", attractionId: null }], new Map(), new Map(), new Map());
    expect(out.has("a1")).toBe(false);
  });
});

describe("assignActivityImages: destination landmarks", () => {
  const attrDest = new Map([["t1", "d1"], ["t2", "d1"]]);
  const attrImgs = new Map([["t1", [img("t1-photo")]], ["t2", [img("t2-photo")]]]);

  it("lets a general experience borrow a landmark once the gallery is used up", () => {
    const acts = [act("a1"), act("a2")];
    const out = assignActivityImages(acts, new Map(), attrImgs, new Map([["d1", [img("hero"), img("g1")]]]), attrDest);
    expect(out.get("a1")!.image.id).toBe("g1");
    expect(["t1-photo", "t2-photo"]).toContain(out.get("a2")!.image.id);
  });

  it("never shows a different venue for a venue-specific experience", () => {
    const acts = [act("a1", "t1"), act("a2", "t1"), act("a3", "t1")];
    const out = assignActivityImages(acts, new Map(), attrImgs, new Map([["d1", [img("hero")]]]), attrDest);
    expect(out.get("a1")!.image.id).toBe("t1-photo");
    for (const a of acts) expect(out.get(a.id)?.image.id).not.toBe("t2-photo");
  });
});

describe("assignActivityImages: no repeats", () => {
  it("gives later cards no image rather than repeating a borrowed photo", () => {
    const acts = [act("a1"), act("a2"), act("a3")];
    const out = assignActivityImages(acts, new Map(), new Map(), new Map([["d1", [img("hero"), img("g1")]]]));
    expect(out.get("a1")!.image.id).toBe("g1");
    expect(out.has("a2")).toBe(false);
    expect(out.has("a3")).toBe(false);
  });
});
