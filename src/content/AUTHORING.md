# Vietnam Atlas: content authoring brief

You are writing seed data files for a premium Vietnam tourism platform. These files are
loaded into a relational database by `src/db/seed`. Read `src/content/types.ts` (the contract)
and `src/content/helpers.ts` (helpers) before writing anything.

## File format

One file per destination (or tightly related cluster) in `src/content/catalog/<slug>.ts`:

```ts
import type { DestinationBundle } from "../types";
import { months, VNAT_TRAVEL, wiki, wikivoyage, official, provider, BRING, WEAR } from "../helpers";

const bundle: DestinationBundle = {
  destinations: [ /* DestinationSeed */ ],
  attractions: [ /* AttractionSeed */ ],
  activities: [ /* ActivitySeed */ ],
};
export default bundle;
```

You may define local `const` helpers inside the file (e.g. a shared `sources` array, a
`base` object you spread into similar activities) to keep it concise, but every activity
must end up as its own complete record.

Validate with: `npx tsx scripts/check-content.ts <file-slug-fragment>` and
`npx tsc --noEmit -p tsconfig.json` must not report errors in your files. Cross-file reference
warnings (nearby destinations / alternatives in another author's file) are fine when checking a
single file; the canonical destination slugs are listed below so you can reference them.

## Canonical destination slugs (use exactly these)

South: `phu-quoc`, `ho-chi-minh-city`, `mekong-delta`, `can-tho`, `ben-tre`, `chau-doc`, `cai-be`, `tra-su`, `mui-ne`, `con-dao`
Central: `da-lat`, `da-nang`, `hoi-an`, `hue`, `phong-nha`, `nha-trang`
North: `hanoi`, `sa-pa`, `ninh-binh`, `ha-long-bay`, `lan-ha-bay`, `cat-ba`, `ha-giang`, `cao-bang`, `mai-chau`, `pu-luong`

(Mui Ne and Nha Trang are on the south-central coast; use region `south` for Mui Ne and `central` for Nha Trang, Da Lat → `central`.)

Activity slugs: `<destination-slug>-<activity>` e.g. `phu-quoc-three-island-snorkelling`.
Attraction slugs: `<destination-slug>-<attraction>` e.g. `hanoi-temple-of-literature`.

## 2025 administrative reform: use current provinces

Vietnam merged its 63 provinces into 34 provincial-level units effective 1 July 2025.
Use the CURRENT province in `province` and the old one in `formerProvince`. Mention in
`practical.regulations` or `practical.howToReach` that many maps/booking sites still show old names.

| Destination | province (current) | formerProvince |
|---|---|---|
| Phu Quoc (special zone) | An Giang | Kien Giang |
| Ho Chi Minh City | Ho Chi Minh City |, (absorbed Binh Duong & Ba Ria–Vung Tau) |
| Can Tho | Can Tho |, |
| Ben Tre | Vinh Long | Ben Tre |
| Chau Doc | An Giang |, |
| Cai Be | Dong Thap | Tien Giang |
| Tra Su | An Giang |, |
| Da Lat | Lam Dong |, |
| Mui Ne | Lam Dong | Binh Thuan |
| Da Nang | Da Nang |, |
| Hoi An | Da Nang | Quang Nam |
| Hue | Hue (centrally-run city) | Thua Thien Hue |
| Phong Nha | Quang Tri | Quang Binh |
| Nha Trang | Khanh Hoa |, |
| Hanoi | Hanoi |: |
| Sa Pa | Lao Cai |, |
| Ninh Binh | Ninh Binh |, |
| Ha Long Bay | Quang Ninh |, |
| Lan Ha Bay, Cat Ba | Hai Phong |, |
| Ha Giang | Tuyen Quang | Ha Giang |
| Cao Bang | Cao Bang |, |
| Mai Chau | Phu Tho | Hoa Binh |
| Pu Luong | Thanh Hoa |, |
| Con Dao (special zone) | Ho Chi Minh City | Ba Ria–Vung Tau |

## Accuracy rules: the most important part

1. **Prices**: estimated VND ranges with `status: "estimated"` and an honest `basis`
   (e.g. "Indicative range for shared group tours seen across several operators; varies by operator and season.").
   Only use `verified_official` if you are quoting a published official tariff you are confident about,
   and then cite the official source. When unsure, `estimated` or `needs_verification`.
2. **Opening hours / entrance fees for attractions**: if you are not confident, write
   `text: "Not verified: check the official site or ask locally before visiting"` with status `needs_verification`.
   It's fine to say "Typically open daytime; hours not verified".
3. **No ratings, no reviews, no booking links invented**. `providerLinks` only for official
   operator homepages you are confident exist (e.g. https://sunworld.vn, https://vinwonders.com,
   https://oxalis.com.vn). Leave the array empty otherwise. `booking` is free text guidance.
4. **Sources**: use `VNAT_TRAVEL` for destination-level info, `wiki("Exact_Article_Title")`
   and `wikivoyage("Title")` for background (only titles you are confident exist), and
   `official()`/`provider()` only for homepages you are confident about. Do not guess deep URLs.
   Every record needs at least one source.
5. **Seasonality honesty**: The trip that seeds the demo is **12–25 December 2026**.
   Set `decemberStatus` and `decemberNote` thoughtfully: central Vietnam (Hue, Hoi An, Da Nang,
   Phong Nha) is in its rainy/flood season Oct–Dec, cave and river activities may suspend.
   Northern mountains (Sa Pa, Ha Giang, Cao Bang) are cold in December. Phu Quoc and the
   south are dry season. Nha Trang's rainy season tails into December. Con Dao seas can be rough.
   Never mark an activity as available simply because it exists. Use `availability:
   "weather_dependent"` / `"seasonal"` / `"not_verified"` where appropriate.
6. **Events/festivals**: do not state specific 2026 dates unless verified. Say "dates not verified".
7. **Safety**: be practical and specific (licensed operators, life jackets, motorbike risks,
   Indian travellers cannot legally ride motorbikes in Vietnam on an Indian licence + Indian IDP
recommend passenger tours with licensed drivers).
8. **Vegetarian notes**: the demo group is Indian; dietary notes should help vegetarians
   (chay restaurants, "an chay", fish sauce in many dishes).
9. Tone: editorial, specific, useful. No emoji. No marketing fluff. British/International English.

## Field guidance

- `summary` ≤ 160 chars. `description` 3–6 sentences, concrete.
- `whatYouDo` 3–6 bullets; `steps` 3–7 chronological steps.
- `duration.hours` is a number used for itinerary maths (e.g. half day ≈ 4, full day ≈ 8, overnight ≈ 20).
- `intensity` 1–5 and `difficulty` should agree (easy≈1–2, moderate≈2–3, challenging≈4, extreme≈5).
- `themes` drive homepage categories: water, mountain, island, beach, extreme, scenic, hidden_gem, heritage.
- `freeAlternatives` / `paidAlternatives`: slugs of activities (prefer same destination). Must exist.
- `imageQuery`: a Wikimedia Commons search phrase that will likely find a real photo of that place,
  e.g. "Sao Beach Phu Quoc", "Trang An boat Ninh Binh", "Fansipan cable car". Prefer place names over generic words.
- `months`: use `months("333322110123")` (Jan..Dec, 0 avoid … 3 excellent).
- Mark 1–3 standout activities per destination with `featured: true`.
- Free/public activities belong in `activities` with `priceTier: "free"` and price 0/0.
  "Low-cost" (`priceTier: "low"`) means roughly under 150,000 VND per person.
