/**
 * Vietnam Atlas: A to Z travel guide (direction.md section 13).
 *
 * Written for the demo audience (Indian passport holders arriving Phu Quoc, departing Hanoi,
 * December 2026) but phrased generally enough for any visitor.
 *
 * Accuracy conventions:
 *  - kind "official_requirement" = law / regulation, always backed by an official primary source.
 *  - kind "travel_advice" = practical guidance, not legal advice.
 *  - kind "mixed" = both, separated in the body by "### Official requirement" / "### Travel advice".
 *  - keyFact status "verified_official" only where the value was read on a government / embassy page
 *    on or shortly before lastVerified. News-reported or unconfirmed values are "needs_verification".
 *  - No live exchange rates are hardcoded: the app's currency widget shows a stored reference rate
 *    with its timestamp.
 */
import type { GuideSectionSeed } from "./guide-types";
import type { SourceRef } from "./types";
import { VNAT_TRAVEL, official, provider, wiki, wikivoyage } from "./helpers";

const CHECKED = "2026-11-12";

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

const EVISA_PORTAL = official(
  "Vietnam National Electronic Visa system (official e-visa portal)",
  "https://evisa.gov.vn",
  "Immigration Department, Ministry of Public Security of Viet Nam",
  "Official e-visa application portal (also reachable at thithucdientu.gov.vn)",
  "government",
);

const IMMIGRATION_DEPT = official(
  "Immigration Department (Cục Quản lý xuất nhập cảnh)",
  "https://xuatnhapcanh.gov.vn",
  "Immigration Department, Ministry of Public Security of Viet Nam",
  "Immigration authority homepage, notices and contact details",
  "government",
);

const VN_EMBASSY_INDIA_EVISA: SourceRef = official(
  "E-VISA: frequently asked questions",
  "https://vietnamembassydelhi.in/?p=4552",
  "Embassy of the Socialist Republic of Viet Nam in India",
  "Official portal domains (evisa.gov.vn / thithucdientu.gov.vn), USD 25–50 fee, max 90 days, 6-month passport validity, photo and passport-scan requirements, any e-visa checkpoint may be used, Phu Quoc exemption only when entry and exit are both Phu Quoc",
  "government",
);

const VN_EMBASSY_INDIA_GATES: SourceRef = official(
  "Vietnam adds 41 international border gates allowing entry and exit with e-visas",
  "https://vietnamembassydelhi.in/?p=6565",
  "Embassy of the Socialist Republic of Viet Nam in India",
  "Resolution 389/NQ-CP (2 Dec 2025): 83 e-visa border gates in total (17 airports, 27 land, 39 sea)",
  "government",
);

const INDIA_EMBASSY_HANOI = official(
  "Embassy of India, Hanoi",
  "https://www.indembassyhanoi.gov.in",
  "Ministry of External Affairs, Government of India",
  "Consular help for Indian nationals in northern/central Vietnam, emergency contact, lost-passport procedure",
  "government",
);

const INDIA_EMBASSY_VISITOR_INFO = official(
  "Information for Indian visitors to Vietnam",
  "https://www.indembassyhanoi.gov.in/page/information-for-indian-visitors-to-vietnam/",
  "Embassy of India, Hanoi",
  "Indian nationals need a pre-approved visa or e-visa; emergency numbers +84-913089165 (Hanoi) and +84-917180776 (HCMC); lost-passport steps",
  "government",
);

const INDIA_CONSULATE_HCMC = official(
  "Consulate General of India, Ho Chi Minh City",
  "https://www.cgihcmc.gov.in",
  "Ministry of External Affairs, Government of India",
  "Consular help for Indian nationals in southern Vietnam including Phu Quoc",
  "government",
);

const PREARRIVAL_PORTAL = official(
  "Pre-Arrival Information (PAI) portal",
  "https://prearrival.immigration.gov.vn",
  "Immigration Department, Ministry of Public Security of Viet Nam",
  "Official online pre-arrival declaration; generates a QR code for passport control",
  "government",
);

const PREARRIVAL_SG_MFA = official(
  "Pre-arrival declaration for foreign travellers entering Vietnam",
  "https://hanoi.mfa.gov.sg/mission-updates/pre-arrival-declaration-for-foreign-travellers-entering-vietnam/",
  "Embassy of the Republic of Singapore in Hanoi",
  "Notice (25 Jun 2026) listing Noi Bai, Tan Son Nhat, Da Nang, Nha Trang (Cam Ranh) and Phu Quoc airports; complete on arrival or up to 3 days before",
  "government",
);

const PREARRIVAL_MPS = official(
  "Immigration Department launches Pre-arrival Information System",
  "https://en.mps.gov.vn/article/immigration-department-launches-pre-arrival-information-system-1778670404",
  "Ministry of Public Security of Viet Nam",
  "Launch of the pre-arrival information system (pilot at Tan Son Nhat from 15 Apr 2026)",
  "government",
);

const PHU_QUOC_ADVISORY_NEWS: SourceRef = {
  title: "India issues advisory for citizens traveling to Phu Quoc under visa-free scheme",
  url: "https://e.vnexpress.net/news/travel/visa/india-issues-advisory-for-citizens-traveling-to-phu-quoc-under-visa-free-scheme-5059413.html",
  publisher: "VnExpress International",
  kind: "publisher",
  checked: "Embassy of India Hanoi advisory (6 Apr 2026): obtain a Vietnam visa even for Phu Quoc-only trips; exemption covers the island only",
  status: "verified_provider",
  confidence: "high",
};

const EVISA_FEE_NEWS: SourceRef = {
  title: "Multiple-entry visa costs $50: immigration department",
  url: "https://e.vnexpress.net/news/travel/multiple-entry-visa-costs-50-immigration-department-4644153.html",
  publisher: "VnExpress International",
  kind: "publisher",
  checked: "Immigration Department fee split: multiple entry USD 50, double the single-entry fee (Aug 2023)",
  status: "verified_provider",
  confidence: "high",
};

const ROAD_LAW_2024: SourceRef = {
  title: "Law on Road Traffic Order and Safety No. 36/2024/QH15 (English translation)",
  url: "https://english.luatvietnam.vn/an-ninh-trat-tu/law-on-road-traffic-order-and-safety-2024-no-36-2024-qh15-360844-d1.html",
  publisher: "LuatVietnam (legal database)",
  kind: "reference",
  checked: "Article 9(2): driving with any alcohol concentration in blood or breath is prohibited; law in force from 1 Jan 2025",
  status: "verified_provider",
  confidence: "high",
};

const ZERO_ALCOHOL_NEWS: SourceRef = {
  title: "New traffic law enshrines zero alcohol limit for drivers",
  url: "https://e.vnexpress.net/news/news/traffic/new-traffic-law-enshrines-zero-alcohol-limit-for-drivers-4763247.html",
  publisher: "VnExpress International",
  kind: "publisher",
  checked: "Zero alcohol limit for all motor-vehicle drivers",
  status: "verified_provider",
  confidence: "high",
};

const IDP_NEWS: SourceRef = {
  title: "Using the roads in Viet Nam as a foreigner",
  url: "https://ovietnam.vietnamnews.vn/using-the-roads-in-viet-nam-as-a-foreigner-post403523.html",
  publisher: "Viet Nam News (Vietnam News Agency)",
  kind: "publisher",
  checked: "Viet Nam is party to the 1968 Vienna Convention, not the 1949 Geneva Convention; 1949-only IDPs are not valid; tourist/business visa holders cannot convert a licence (May 2026)",
  status: "verified_provider",
  confidence: "high",
};

const PARIVAHAN = official(
  "Parivahan Sewa: International Driving Permit services",
  "https://parivahan.gov.in",
  "Ministry of Road Transport and Highways, Government of India",
  "Indian IDP application and convention printed on the permit",
  "government",
);

const DRONE_DECREE: SourceRef = {
  title: "Decree 288/2025/ND-CP on management of unmanned aircraft and other aerial vehicles",
  url: "https://english.luatvietnam.vn/decree-no-288-2025-nd-cp-dated-november-5-2025-of-the-government-providing-the-management-of-unmanned-aircraft-and-other-aerial-vehicles-418028-doc1.html",
  publisher: "LuatVietnam (legal database)",
  kind: "reference",
  checked: "Drone rules apply to Vietnamese and foreign individuals; registration and flight licensing regime",
  status: "verified_provider",
  confidence: "medium",
};

const VAPE_BAN_NEWS: SourceRef = {
  title: "E-cigarette users face up to $190 fines in Vietnam",
  url: "https://e.vnexpress.net/news/news/e-cigarette-users-face-up-to-190-fines-in-vietnam-5001033.html",
  publisher: "VnExpress International",
  kind: "publisher",
  checked: "Ban on use of e-cigarettes and heated tobacco products enforced from 31 Dec 2025, fines for users",
  status: "verified_provider",
  confidence: "high",
};

const SIM_FOREIGNERS_NEWS: SourceRef = {
  title: "Subscribers are abroad, but SIM cards in Vietnam can still be locked if not verified",
  url: "https://news.laodong.vn/cong-nghe/chu-thue-bao-o-nuoc-ngoai-nhung-sim-o-viet-nam-van-co-the-bi-khoa-neu-khong-xac-thuc-1685772.ldo",
  publisher: "Lao Dong",
  kind: "publisher",
  checked: "Foreigners register SIMs with passport; data matched with facial check (Decree 163/2024, Circular 08/2026)",
  status: "verified_provider",
  confidence: "medium",
};

const SIM_FACE_NEWS: SourceRef = {
  title: "Vietnam introduces facial authentication for SIM users switching devices",
  url: "https://vietnamnet.vn/en/vietnam-introduces-facial-authentication-for-sim-users-switching-devices-2526025.html",
  publisher: "VietNamNet",
  kind: "publisher",
  checked: "Circular 08/2026 effective 15 Apr 2026: facial re-authentication when a SIM moves to a new device",
  status: "verified_provider",
  confidence: "medium",
};

const VIETTEL = official("Viettel", "https://viettel.com.vn", "Viettel Group", "Mobile operator: plans and eSIM", "provider");
const VINAPHONE = official("VinaPhone", "https://vinaphone.com.vn", "VNPT VinaPhone", "Mobile operator: plans and eSIM", "provider");
const MOBIFONE = official("MobiFone", "https://www.mobifone.vn", "MobiFone Corporation", "Mobile operator: plans and eSIM", "provider");

const SBV = official(
  "State Bank of Vietnam",
  "https://www.sbv.gov.vn",
  "State Bank of Vietnam",
  "Central bank: official VND reference exchange rate and foreign-exchange regulation",
  "government",
);

const GRAB = official("Grab Vietnam", "https://www.grab.com/vn/en/", "Grab", "Ride-hailing, food delivery, car types", "provider");
const BE = official("Be", "https://be.com.vn", "Be Group", "Vietnamese ride-hailing app", "provider");
const XANH_SM = official("Xanh SM", "https://www.xanhsm.com", "GSM (Green and Smart Mobility)", "Electric taxi and bike-taxi service", "provider");
const VN_RAILWAYS = official("Vietnam Railways: official ticketing", "https://dsvn.vn", "Vietnam Railways (VNR)", "Train schedules and online tickets", "transport");
const VIETNAM_AIRLINES = official("Vietnam Airlines", "https://www.vietnamairlines.com", "Vietnam Airlines", "Domestic and international flights", "transport");
const VIETJET = official("Vietjet Air", "https://www.vietjetair.com", "Vietjet", "Domestic and international flights", "transport");
const VIETRAVEL_AIR = official("Vietravel Airlines", "https://www.vietravelairlines.com", "Vietravel Airlines", "Domestic flights", "transport");
const SUN_PQ_AIR = official("Sun PhuQuoc Airways", "https://www.sunphuquocairways.com", "Sun PhuQuoc Airways", "Domestic flights incl. Phu Quoc routes (began Nov 2025)", "transport");
const BAMBOO = provider("Bamboo Airways", "https://www.bambooairways.com", "Bamboo Airways", "Domestic flights: reduced network; site unreachable when checked");
const MAI_LINH = official("Mai Linh Taxi", "https://mailinh.vn", "Mai Linh Group", "Metered taxi company", "provider");
const VINASUN = official("Vinasun Taxi", "https://vinasun.vn", "Vinasun Corp", "Metered taxi company (mainly southern Vietnam)", "provider");

const EMERGENCY_NUMBERS = wiki("Telephone_numbers_in_Vietnam", "Emergency numbers 113 police, 114 fire/rescue, 115 ambulance, 112 search and rescue");
const WV_VIETNAM = wikivoyage("Vietnam", "Practical travel context");

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export const guideSections: GuideSectionSeed[] = [
  // =========================================================================
  // A. VISA AND IMMIGRATION
  // =========================================================================
  {
    slug: "visa-and-immigration",
    letter: "A",
    title: "Visa and immigration",
    summary:
      "E-visa for Indian passport holders, the Phu Quoc exemption trap, entry and exit airports, the official portal, the pre-arrival QR declaration and arrival steps.",
    icon: "Stamp",
    articles: [
      {
        slug: "vietnam-e-visa-for-indian-passport-holders",
        title: "Vietnam e-visa for Indian passport holders",
        kind: "official_requirement",
        summary:
          "Indian nationals need a visa for Vietnam. The e-visa (up to 90 days, single or multiple entry) is applied for only on the official government portal.",
        body: `Indian passport holders are not visa-exempt for mainland Vietnam. The Embassy of India in Hanoi states that Indian nationals should hold a pre-approved visa before entry, either from a Vietnamese embassy/consulate or as an e-visa.

### What the e-visa is
- Issued by the Immigration Department of the Ministry of Public Security.
- Available to citizens of all countries and territories since Resolution 127/NQ-CP (August 2023).
- Valid for a maximum of 90 days.
- Single entry or multiple entry; you choose on the form.
- Government fee: USD 25 (single entry) or USD 50 (multiple entry). Fees are non-refundable, even if the application is refused.

### Official portal: the only place to apply
- evisa.gov.vn (the same system is also reachable at thithucdientu.gov.vn).
- The Vietnamese Embassy in New Delhi states that all other websites are invalid. Many look-alike sites charge several times the government fee, and some are outright scams.
- The older address evisa.xuatnhapcanh.gov.vn still appears in older guides; use evisa.gov.vn.

### Dates on the visa
- You choose a "valid from" and "valid to" date. Your arrival date and your departure date must both fall inside that window.
- For a 12–25 December 2026 trip, choose a window that starts on or before 12 December and ends on or after 25 December, with a few days of margin for flight disruption.
- Overstaying is an administrative violation with fines and can affect future visas.

### Processing time
- The embassy FAQ gives varying processing ranges (from about 5 working days up to longer at peak). Do not rely on a fast turnaround: apply at least 3–4 weeks before departure, and much earlier if your passport has unusual name formatting.

### Print it
- Carry a printed copy of the approved e-visa together with your passport. The embassy FAQ states a printed e-visa is presented at the checkpoint.`,
        keyFacts: [
          { label: "Visa needed (Indian passport, mainland)", value: "Yes: e-visa or embassy visa", status: "verified_official" },
          { label: "Maximum stay", value: "Up to 90 days", status: "verified_official" },
          { label: "Fee: single entry", value: "USD 25 (non-refundable)", status: "verified_official" },
          { label: "Fee: multiple entry", value: "USD 50 (non-refundable)", status: "verified_official" },
          { label: "Official portal", value: "evisa.gov.vn (mirror: thithucdientu.gov.vn)", status: "verified_official" },
          { label: "Typical processing", value: "Several working days; apply 3–4 weeks ahead", status: "needs_verification" },
        ],
        warnings: [
          "Never apply through a site other than evisa.gov.vn / thithucdientu.gov.vn, look-alike sites rank highly in search results.",
          "The fee is non-refundable: double-check every field before paying.",
          "Make sure the visa window covers both your first day in Vietnam and your departure day.",
        ],
        sources: [EVISA_PORTAL, VN_EMBASSY_INDIA_EVISA, INDIA_EMBASSY_VISITOR_INFO, EVISA_FEE_NEWS, IMMIGRATION_DEPT],
        lastVerified: CHECKED,
      },
      {
        slug: "phu-quoc-visa-exemption",
        title: "Phu Quoc 30-day visa exemption: and why your group still needs an e-visa",
        kind: "mixed",
        summary:
          "Phu Quoc has a visa-free scheme, but it covers the island only. Anyone continuing to the mainland (e.g. departing Hanoi) must hold a Vietnam visa.",
        body: `### Official requirement
Foreigners arriving at Phu Quoc can stay on the island without a visa for up to 30 days under Vietnam's special-zone exemption. The exemption is limited to Phu Quoc: it does not allow travel to the mainland.

The Vietnamese Embassy in New Delhi summarises it as: no visa is required if your entry and exit are both through Phu Quoc.

On 6 April 2026 the Embassy of India in Hanoi issued an advisory recommending that Indian nationals obtain a Vietnam visa before travelling to Phu Quoc even if the itinerary is limited to the island, after several Indian travellers ran into legal problems by travelling on to the mainland.

### Travel advice
- If your trip is Phu Quoc → Ho Chi Minh City / Da Nang / Hanoi and you fly home from Hanoi, you need an e-visa before you leave India. Do not rely on the island exemption.
- Even for a Phu Quoc-only holiday, get the e-visa: a medical evacuation, a cancelled international flight re-routed via Ho Chi Minh City, or a change of plan would otherwise leave you stuck.
- When you land at Phu Quoc with an e-visa, present the e-visa at immigration. Do not let anyone process you under the island exemption.
- Phu Quoc is now a special zone of An Giang province (formerly Kien Giang) following the July 2025 administrative reform; some booking sites still show the old province name.`,
        keyFacts: [
          { label: "Island-only exemption", value: "Up to 30 days, Phu Quoc only", status: "needs_verification" },
          { label: "Covers mainland travel?", value: "No", status: "verified_official" },
          { label: "Indian Embassy advice", value: "Get a Vietnam visa even for Phu Quoc-only trips (6 Apr 2026)", status: "verified_provider" },
        ],
        warnings: [
          "Arriving Phu Quoc and departing Hanoi without an e-visa is not covered by the exemption.",
          "Airline check-in staff in India may deny boarding if your onward itinerary leaves Phu Quoc and you hold no visa.",
        ],
        sources: [VN_EMBASSY_INDIA_EVISA, PHU_QUOC_ADVISORY_NEWS, INDIA_EMBASSY_HANOI, EVISA_PORTAL],
        lastVerified: CHECKED,
      },
      {
        slug: "passport-photo-and-application-checklist",
        title: "Passport requirements, photo, scans and application checklist",
        kind: "mixed",
        summary:
          "Six months' passport validity, a white-background portrait photo and a full data-page scan. Field-by-field checklist to avoid rejections.",
        body: `### Official requirement
- Passport valid for at least 6 months beyond your date of arrival in Vietnam.
- Portrait photo: 4x6 cm proportion, white background, face straight on, no glasses.
- Scan/photo of the full passport data page, including the two machine-readable (ICAO) lines at the bottom.
- Payment online by card on the official portal.
- An e-visa does not cover employment. Coming to Vietnam to work requires a different visa category and a work permit.

### Travel advice: application checklist
- Passport: at least two blank pages (practical, not a stated rule) and no damage to the data page.
- Name: enter it exactly as in the machine-readable lines. Indian passports with a single given name and no surname are a common source of mismatch, follow the order printed on the passport and do not invent a surname.
- Date of birth, sex, nationality and passport number: re-read twice; a single wrong digit means a new paid application.
- Intended entry checkpoint: choose Phu Quoc International Airport (PQC) if you land there; exit checkpoint: Noi Bai International Airport (HAN). The embassy FAQ states you may use any e-visa checkpoint even if it differs from what you entered, but filling in the real airports avoids questions.
- Address in Vietnam: the first hotel address (Phu Quoc).
- Purpose: tourism.
- Email: one you check regularly: the result and the registration code arrive there. Save the registration code; you need it to look up your status.
- Photo file: plain JPEG, evenly lit, no shadows, no filters, ears and full face visible.
- After approval: download the PDF, check every field against the passport, and print two copies per person.
- For a group of 7: each person applies individually. Keep a shared spreadsheet of registration codes and status so nobody is missed.`,
        keyFacts: [
          { label: "Passport validity", value: "≥ 6 months beyond arrival date", status: "verified_official" },
          { label: "Photo", value: "4x6, white background, no glasses", status: "verified_official" },
          { label: "Passport scan", value: "Full data page including ICAO lines", status: "verified_official" },
        ],
        warnings: [
          "Do not upload a selfie with a coloured background or glasses, a common reason for rejection.",
          "Errors after approval cannot be fixed by the embassy; a corrected e-visa usually means a new paid application.",
        ],
        sources: [VN_EMBASSY_INDIA_EVISA, EVISA_PORTAL, INDIA_EMBASSY_VISITOR_INFO],
        lastVerified: CHECKED,
      },
      {
        slug: "entry-exit-airports-and-entry-types",
        title: "Entry and exit airports, single vs multiple entry",
        kind: "mixed",
        summary:
          "E-visa holders can use 83 international border gates including Phu Quoc and Noi Bai. Choose multiple entry only if you will leave Vietnam and come back.",
        body: `### Official requirement
- E-visa holders may enter and exit through designated international border gates. After Resolution 389/NQ-CP (2 December 2025) there are 83 such gates: 17 international airports, 27 land border crossings and 39 seaports.
- The major international airports (including Phu Quoc (PQC), Tan Son Nhat / Ho Chi Minh City (SGN), Da Nang (DAD), Cam Ranh / Nha Trang (CXR) and Noi Bai / Hanoi (HAN)) are e-visa gates.
- The Vietnamese Embassy in New Delhi states that the gate you enter on the application does not have to match the gate you actually use.

### Travel advice: single or multiple entry?
- A single-entry e-visa (USD 25) is enough for a trip that enters once and leaves once, such as PQC in / HAN out.
- Domestic flights inside Vietnam do not count as an exit; you do not need multiple entry to fly Phu Quoc → Hanoi.
- Choose multiple entry (USD 50) only if you plan a side trip outside Vietnam (for example Siem Reap in Cambodia or Luang Prabang in Laos) and then come back in.
- Validity starts on the date you choose, not the date of approval. Leave 2–3 days of margin on both ends for flight changes.`,
        keyFacts: [
          { label: "E-visa border gates", value: "83 (17 airports, 27 land, 39 sea)", status: "verified_official" },
          { label: "PQC and HAN accept e-visas", value: "Yes", status: "verified_official" },
          { label: "Domestic flights count as exit?", value: "No", status: "verified_official" },
        ],
        sources: [VN_EMBASSY_INDIA_GATES, VN_EMBASSY_INDIA_EVISA, EVISA_PORTAL],
        lastVerified: CHECKED,
      },
      {
        slug: "arrival-process-and-pre-arrival-declaration",
        title: "Arrival process and the pre-arrival QR declaration",
        kind: "mixed",
        summary:
          "Fill the free online pre-arrival declaration (up to 3 days before), then passport control with passport + printed e-visa, baggage, customs.",
        body: `### Official requirement
- Since 15 April 2026 Vietnam's Immigration Department has operated a Pre-Arrival Information (PAI) system at prearrival.immigration.gov.vn. You submit personal and travel details online and receive a QR code to show at passport control.
- It started at Tan Son Nhat (Ho Chi Minh City) and has been extended to other international airports. A Singapore Embassy notice of 25 June 2026 lists Noi Bai, Tan Son Nhat, Da Nang, Nha Trang (Cam Ranh) and Phu Quoc.
- The declaration is free and may be completed up to 3 days before arrival or on arrival via QR code in the arrival hall. It does not replace the visa.
- Whether it is strictly mandatory at every airport has been reported differently (news reports describe it as mandatory at Phu Quoc from 1 June 2026); treat it as required and complete it in advance.

### Travel advice: step by step at Phu Quoc (PQC)
- Before the flight: complete the pre-arrival declaration for each traveller (within 3 days of arrival), screenshot the QR code, and keep the printed e-visa with the passport.
- Hyderabad departure: airline staff will check that you hold a visa for Vietnam. Show the printed e-visa.
- On landing: follow signs to immigration (foreign passports). Present passport, printed e-visa and the PAI QR code. Remove caps and sunglasses for the photo.
- Officers stamp the passport. Check the stamp date before leaving the counter.
- Baggage, then customs (green channel if nothing to declare).
- Arrivals hall: SIM/eSIM kiosks, currency exchange and ATMs, then taxis / Grab pick-up.
- Departure from Hanoi (HAN): arrive at least 3 hours before an international flight; exit immigration checks that you have not overstayed.`,
        keyFacts: [
          { label: "Pre-arrival portal", value: "prearrival.immigration.gov.vn", status: "verified_official" },
          { label: "Submission window", value: "Up to 3 days before arrival, or on arrival", status: "verified_official" },
          { label: "Cost", value: "Free", status: "verified_official" },
          { label: "Mandatory at PQC", value: "Reported mandatory from 1 Jun 2026", status: "needs_verification" },
        ],
        warnings: [
          "The pre-arrival declaration is free: ignore any site that charges for it.",
          "The declaration is not a visa: you still need the e-visa.",
        ],
        sources: [PREARRIVAL_PORTAL, PREARRIVAL_SG_MFA, PREARRIVAL_MPS, VN_EMBASSY_INDIA_EVISA],
        lastVerified: CHECKED,
      },
      {
        slug: "immigration-common-mistakes-and-rules",
        title: "Common mistakes, rules and restrictions",
        kind: "mixed",
        summary:
          "Fake visa sites, wrong dates, overstays, lost passports and the registration rules every visitor should know.",
        body: `### Official requirement
- Stay within the dates on your e-visa. Overstaying is penalised with fines and can affect future entry.
- Foreigners must carry their passport (or be able to produce it) and their accommodation must register the stay with local police, hotels do this automatically when they take your passport details at check-in. If you stay in a private home or some Airbnbs, ask the host whether they have declared your stay.
- Lost passport (Indian nationals): report immediately to the local police where it was lost and obtain a stamped police report, then contact the Embassy of India Hanoi (58–60 Tran Hung Dao) or Consulate General of India Ho Chi Minh City (214 Vo Thi Sau, District 3) for an Emergency Certificate. You will also need Vietnamese immigration exit formalities. Budget several working days.
- Work requires a work permit and an appropriate visa; an e-visa is for tourism/short visits.

### Travel advice: common mistakes
- Applying on a look-alike site and paying USD 80–150 instead of USD 25.
- Visa window that ends on the departure date with no margin, a delayed flight then means an overstay.
- Name order swapped between given name and surname.
- Assuming the Phu Quoc exemption covers the mainland.
- Not printing the e-visa (phone battery dead at the counter).
- Leaving passports as a deposit with motorbike rental shops. Never do this.
- Not keeping digital copies: store passport, e-visa, insurance and tickets in an offline folder shared within the group.`,
        warnings: [
          "Never hand over your passport as rental collateral.",
          "Save the Indian Embassy (+84-913089165) and HCMC Consulate (+84-917180776) emergency numbers before you fly.",
        ],
        keyFacts: [
          { label: "Embassy of India Hanoi: emergency", value: "+84-913089165", status: "verified_official" },
          { label: "Consulate General of India HCMC: emergency", value: "+84-917180776", status: "verified_official" },
        ],
        sources: [INDIA_EMBASSY_VISITOR_INFO, INDIA_EMBASSY_HANOI, INDIA_CONSULATE_HCMC, IMMIGRATION_DEPT, VN_EMBASSY_INDIA_EVISA],
        lastVerified: CHECKED,
      },
    ],
  },

  // =========================================================================
  // B. CURRENCY AND PAYMENTS
  // =========================================================================
  {
    slug: "currency-and-payments",
    letter: "B",
    title: "Currency and payments",
    summary:
      "Vietnamese dong, INR/USD conversion, exchange, ATMs, cards, cash habits and fees. Live rates are shown in the app's currency widget.",
    icon: "Wallet",
    articles: [
      {
        slug: "vietnamese-dong-and-conversion",
        title: "The Vietnamese dong (VND) and converting from INR and USD",
        kind: "mixed",
        summary:
          "Prices are in VND with many zeros. Use the app's currency widget for the current INR→VND and USD→VND reference rate and its timestamp.",
        body: `### Official requirement
- The legal currency is the Vietnamese dong (VND, ₫). As a rule, goods and services in Vietnam are priced and paid in VND; some hotels and tour operators quote in USD but should charge in VND.
- The State Bank of Vietnam publishes the official central reference rate; commercial banks set their own buy/sell rates around it.

### Travel advice
- Exchange rates move daily, so this guide does not print a rate. The app's currency widget shows a stored INR→VND and USD→VND reference rate together with the time it was last updated. Use it for estimates, and expect banks and exchange counters to give a slightly worse rate.
- Notes in circulation run from small denominations up to 500,000 VND. Coins are effectively unused.
- Easy mental maths: drop three zeros and think in "thousands"a 45,000 VND bowl of pho is "45k". Shops and menus often write 45K.
- Confusing notes: 10,000 and 100,000 look similar, as do 20,000 and 500,000 (both bluish). Count notes deliberately when paying in dim light or in a hurry.
- INR is not widely exchangeable in Vietnam. The practical routes are: bring USD cash (clean, new-series notes, larger denominations get better rates), use a multi-currency forex card, or withdraw VND from ATMs.`,
        keyFacts: [
          { label: "Currency", value: "Vietnamese dong (VND)", status: "verified_official" },
          { label: "Exchange rate", value: "See live currency widget (shows timestamp)", status: "estimated" },
          { label: "INR exchangeable locally?", value: "Rarely: bring USD or use card/ATM", status: "needs_verification" },
        ],
        sources: [SBV, WV_VIETNAM],
        lastVerified: CHECKED,
      },
      {
        slug: "exchange-atm-and-cards",
        title: "Exchange options, ATMs and international cards",
        kind: "travel_advice",
        summary:
          "Where to change money, how ATM fees and limits work, which Indian cards work, and how to keep foreign-exchange fees down.",
        body: `### Exchanging money
- Banks (Vietcombank, BIDV, VietinBank, Techcombank and others) exchange USD at posted rates; bring your passport.
- Licensed exchange counters at airports are convenient but usually offer weaker rates, change only what you need for the first day.
- In Hanoi's Old Quarter and Ho Chi Minh City's District 1, gold shops and licensed counters often give good USD rates. Only use places that display a rate board and give a receipt.
- Clean, undamaged USD notes get the best rate; torn or heavily marked notes may be refused.

### ATMs
- ATMs are everywhere in cities and on Phu Quoc; fewer in Ha Giang / rural Sa Pa. Carry cash before heading to the mountains.
- Per-withdrawal limits are commonly a few million VND and vary by bank and card. The Vietnamese bank charges a per-withdrawal fee, and your Indian bank adds its own foreign-transaction and ATM fee, fewer, larger withdrawals are cheaper.
- When the ATM or card terminal offers to charge you in INR ("dynamic currency conversion"), decline and choose VND.
- Use ATMs inside bank branches or malls during daytime.

### International debit and credit cards
- Visa and Mastercard are accepted in hotels, malls, supermarkets, many restaurants and airlines; small eateries, street food, markets and taxis are mostly cash or local QR.
- RuPay international acceptance in Vietnam is limited. Carry a Visa/Mastercard as the primary card.
- Notify your Indian bank of travel dates and enable international usage (in many Indian banking apps this is a toggle).
- Indian cards typically add a foreign-currency markup plus GST on the markup, compare with a zero-markup forex card.

### Forex cards
- A multi-currency forex card loaded with USD works at Vietnamese ATMs and card terminals; check the issuer's ATM fee and whether VND is a supported wallet currency.`,
        warnings: [
          "Decline dynamic currency conversion: always pay in VND.",
          "Carry a backup card stored separately from your main wallet.",
        ],
        keyFacts: [
          { label: "ATM fees and limits", value: "Vary by bank: check your card's foreign-usage charges", status: "estimated" },
          { label: "Card acceptance", value: "Good in hotels/malls; cash for street food & markets", status: "estimated" },
        ],
        sources: [SBV, WV_VIETNAM],
        lastVerified: CHECKED,
      },
      {
        slug: "cash-and-everyday-payments",
        title: "Cash, QR payments and typical everyday payment methods",
        kind: "mixed",
        summary:
          "How Vietnamese people pay, what works for tourists, cash planning for a group of seven, tipping and customs limits on cash.",
        body: `### Official requirement
- Customs: carrying cash above a set threshold (widely cited as USD 5,000 or 15,000,000 VND equivalent) into or out of Vietnam must be declared. Verify the current threshold with Vietnam Customs before travelling with large amounts.
- Indian side: RBI rules limit how much Indian rupee cash you may take out of India; check the current RBI limit before departure. Foreign currency for travel should be bought from authorised dealers.

### Travel advice
- Vietnamese locals pay mostly by bank-app QR codes (VietQR). Without a Vietnamese bank account, most tourists cannot use these QR codes; some foreign wallets and cards are gradually being linked. Ask before relying on it.
- Ride-hailing apps (Grab, Be, Xanh SM) accept international cards in-app, useful for limiting cash use.
- Cash plan for 7 people: nominate one "treasurer" who keeps a shared float in VND for group meals, boat tips, entry fees and markets; reconcile daily in a split-expenses app.
- Keep small notes (10k–50k) for street food, parking, toilets and tips; large notes (500k) are hard to change at street stalls.
- Tipping is not mandatory but appreciated for guides, drivers, boat crews and spa staff. Many upscale restaurants add a service charge. Check the bill.
- Bargaining is normal at markets and with cyclo/boat touts; fixed prices apply in supermarkets, malls, chain cafés and apps.`,
        keyFacts: [
          { label: "Cash declaration threshold", value: "Commonly cited: USD 5,000 / VND 15m", status: "needs_verification" },
          { label: "RBI INR cash export limit", value: "Check current RBI limit", status: "needs_verification" },
        ],
        sources: [SBV, GRAB, WV_VIETNAM],
        lastVerified: CHECKED,
      },
    ],
  },

  // =========================================================================
  // C. SIM AND CONNECTIVITY
  // =========================================================================
  {
    slug: "sim-and-connectivity",
    letter: "C",
    title: "SIM and connectivity",
    summary:
      "Viettel, VinaPhone and MobiFone; physical SIM vs eSIM; tourist plans; passport and face registration rules; coverage and where to buy.",
    icon: "Smartphone",
    articles: [
      {
        slug: "operators-and-coverage",
        title: "Viettel, VinaPhone, MobiFone and data coverage",
        kind: "travel_advice",
        summary:
          "Three national operators with 4G nationwide and 5G in cities. Viettel generally has the widest rural and mountain coverage.",
        body: `### The operators
- Viettel: the largest network, widely regarded as having the best coverage in rural and mountainous areas (Ha Giang loop, Sa Pa valleys, Phong Nha, Pu Luong).
- VinaPhone (VNPT): strong in cities and along main routes.
- MobiFone: strong in cities; competitive tourist bundles.

### Coverage in practice
- 4G is available in all cities and most tourist areas; 5G is being rolled out in major cities.
- Expect weak or no signal in parts of the Ha Giang loop, inside caves, on some Ha Long / Lan Ha Bay cruise routes and in remote trekking valleys. Download offline maps and booking confirmations beforehand.
- Hotel, café and restaurant Wi-Fi is almost universal and usually fast.
- For a group: put at least two people on different networks (e.g. one Viettel, one VinaPhone) so the group is less likely to be out of signal at the same time.`,
        sources: [VIETTEL, VINAPHONE, MOBIFONE, WV_VIETNAM],
        lastVerified: CHECKED,
      },
      {
        slug: "sim-vs-esim-and-tourist-plans",
        title: "Physical SIM vs eSIM, tourist plans, airport vs city purchase",
        kind: "travel_advice",
        summary:
          "eSIMs bought before departure are simplest. Airport SIM kiosks are convenient; city shops are cheaper. Check your phone is unlocked and eSIM-capable.",
        body: `### eSIM
- Pros: set up before leaving India, active the moment you land, no queue, keep your Indian SIM in the phone for OTPs.
- Options: international eSIM apps (data-only, sometimes routed via a Vietnamese network) or local operator eSIMs (Viettel, VinaPhone, MobiFone offer eSIM; tourist eSIMs may require registration with passport and a face check).
- Check that your phone supports eSIM and is carrier-unlocked.

### Physical SIM
- Sold at operator kiosks in the arrivals halls of Phu Quoc, Tan Son Nhat, Da Nang and Noi Bai, and at operator stores in cities.
- Airport kiosks: convenient, staff speak English, will register the SIM with your passport on the spot. Prices are higher than in town.
- City stores (official Viettel/VinaPhone/MobiFone shops): cheaper, but registration still requires your passport, and staff may speak little English.
- Avoid unregistered SIMs from street sellers; they can be locked at any time.

### Tourist plans
- Typical tourist bundles are 7, 15 or 30 days with a large daily or total data allowance; some include local call minutes. Prices change frequently: check the operator's site or the airport kiosk board.
- For a 14-day trip, a 15-day or 30-day plan is safest.
- Keep your Indian number reachable for banking OTPs: either keep the Indian SIM in a dual-SIM phone with international roaming for SMS only, or confirm your bank can send OTPs abroad.

### Other connectivity tips
- Install WhatsApp/Zalo: Zalo is the dominant messaging app in Vietnam, hotels, drivers and tour guides often prefer it.
- Carry a power bank; long bus and boat days drain phones quickly.`,
        warnings: [
          "Turn off data roaming on your Indian SIM unless you have a roaming pack, Indian roaming charges can be very high.",
        ],
        sources: [VIETTEL, VINAPHONE, MOBIFONE],
        lastVerified: CHECKED,
      },
      {
        slug: "sim-passport-and-face-registration",
        title: "Passport and face registration rules for SIMs",
        kind: "official_requirement",
        summary:
          "Every SIM in Vietnam must be registered to a verified identity. Foreigners register with a passport and a face check; unverified SIMs can be locked.",
        body: `Vietnam requires every mobile subscription to be registered to a verified identity.

- Foreigners register with their passport (or other valid entry/exit document). Under Decree 163/2024/ND-CP and Circular 08/2026 (effective 15 April 2026), subscriber details are matched against identity data and a facial image.
- When a registered SIM is moved to a different phone, the subscriber must complete facial re-authentication; otherwise the line can be restricted.
- SIMs that are not properly verified can be blocked from calls and data.

What this means for visitors:
- Buy SIMs or local eSIMs from official operator kiosks or stores, which complete passport + face registration at purchase.
- Insert the SIM in the phone you will actually use. Swapping it into another handset can trigger re-verification.
- Do not buy pre-activated SIMs registered in someone else's name.

Detailed tourist-specific procedures are not spelled out in English by the operators; rules have changed several times since 2024, so confirm at the counter.`,
        keyFacts: [
          { label: "Registration document", value: "Passport", status: "verified_provider" },
          { label: "Face check", value: "Required for registration / device change", status: "verified_provider" },
          { label: "Legal basis", value: "Decree 163/2024/ND-CP; Circular 08/2026", status: "needs_verification" },
        ],
        sources: [SIM_FOREIGNERS_NEWS, SIM_FACE_NEWS, VIETTEL, VINAPHONE, MOBIFONE],
        lastVerified: CHECKED,
      },
    ],
  },

  // =========================================================================
  // D. TRANSPORTATION
  // =========================================================================
  {
    slug: "transportation",
    letter: "D",
    title: "Transportation",
    summary:
      "Ride-hailing (Grab, Be, Xanh SM), taxis, buses, trains, sleeper buses, domestic flights, ferries, group vans, and why you should not ride a motorbike on an Indian IDP.",
    icon: "Bus",
    articles: [
      {
        slug: "ride-hailing-and-taxis",
        title: "Grab, Be, Xanh SM and local taxis",
        kind: "travel_advice",
        summary:
          "Ride-hailing gives fixed upfront fares and card payment. Xanh SM runs all-electric taxis. For metered taxis use Mai Linh or Vinasun.",
        body: `### Grab
- The most widely used app in Vietnam for cars, motorbike taxis (GrabBike) and food delivery. Upfront price, card payment, English interface.
- For 7 people with luggage you will normally need two 4-seat cars or one 7-seat car plus one 4-seat, or book a van separately (see group vans).

### Be
- Vietnamese ride-hailing app (car and bike). Often slightly cheaper than Grab; English interface available.

### Xanh SM
- All-electric taxi and bike-taxi service (VinFast vehicles) operating in most major cities and on Phu Quoc. Book via app or hail a green-and-blue car on the street. Uniformed drivers, metered or upfront app fare.

### Local taxis
- Reputable metered companies: Mai Linh (green, nationwide) and Vinasun (white, mainly southern Vietnam). Check the meter is on and the company name and phone number on the car match exactly, fake look-alike brands exist.
- Avoid unmarked cars and drivers soliciting inside arrival halls.

### Tips
- Pick-up points at airports are usually signposted for each app.
- Screenshot the driver plate and share the trip with the group chat.
- Late-night: prefer app rides to street-hailed cars.`,
        warnings: [
          "Do not take taxis from touts inside the terminal.",
          "Check the plate number in the app matches the car before getting in.",
        ],
        sources: [GRAB, BE, XANH_SM, MAI_LINH, VINASUN],
        lastVerified: CHECKED,
      },
      {
        slug: "domestic-flights",
        title: "Internal flights",
        kind: "travel_advice",
        summary:
          "Vietnam Airlines, Vietjet, Vietravel Airlines, Bamboo Airways and Sun PhuQuoc Airways. Fly the long hops (PQC–HAN, SGN–DAD–HAN) and book early for December.",
        body: `### Airlines
- Vietnam Airlines: national carrier, full-service, checked bag usually included on standard fares.
- Vietjet Air: low-cost, largest domestic network; base fares often exclude checked baggage and seat selection.
- Vietravel Airlines: smaller network, expanding in 2026.
- Bamboo Airways: sharply reduced network after 2024 restructuring; check the current schedule directly and avoid tight connections.
- Sun PhuQuoc Airways: newest entrant (commercial flights from November 2025), with routes from Phu Quoc to Ho Chi Minh City, Hanoi and Da Nang.

### Practical advice
- Phu Quoc → Hanoi is about a 2-hour flight; Phu Quoc → Ho Chi Minh City under an hour; Ho Chi Minh City → Hanoi about 2 hours.
- December is high season and Christmas week fills up; book domestic sectors for 7 people as soon as the itinerary is fixed.
- Book all 7 on one PNR (booking reference) where possible so seats and baggage rules match.
- Low-cost fares: add checked baggage online in advance; it is much more expensive at the airport. Carry-on weight limits are enforced.
- Domestic flights: arrive 90 minutes before departure; take your passport (Indian nationals cannot use Vietnamese ID).
- Schedules change often, including same-day retiming. Join the airline's notifications and avoid same-day connections to international departures.`,
        sources: [VIETNAM_AIRLINES, VIETJET, VIETRAVEL_AIR, SUN_PQ_AIR, BAMBOO],
        lastVerified: CHECKED,
      },
      {
        slug: "trains-buses-and-sleeper-buses",
        title: "Trains, city buses and sleeper buses",
        kind: "travel_advice",
        summary:
          "Vietnam Railways sleeper trains (e.g. Hanoi–Lao Cai for Sa Pa), metro lines in Hanoi and HCMC, and long-distance sleeper buses, pros, cons and safety.",
        body: `### Trains (Vietnam Railways)
- The North–South railway connects Hanoi, Hue, Da Nang, Nha Trang and Ho Chi Minh City. The Hanoi–Lao Cai line is the classic overnight route towards Sa Pa (Lao Cai to Sa Pa is then a road transfer of about an hour).
- Book on the official site dsvn.vn (English interface, international cards accepted) or via the station. Private carriages attached to some trains are sold by separate operators.
- Soft-sleeper cabins have four berths, a group of seven can book two cabins.
- Schedules and fares change; confirm on dsvn.vn rather than relying on blog timetables.

### City transport
- Hanoi: urban railway lines 2A (Cat Linh–Ha Dong) and 3 (elevated section from Nhon); extensive public bus network.
- Ho Chi Minh City: Metro Line 1 (Ben Thanh–Suoi Tien) opened in December 2024.
- Buses are cheap but slow; for groups, ride-hailing is often more practical.

### Sleeper buses
- Overnight "sleeper" and "limousine" buses connect almost everywhere (Hanoi–Sa Pa, Hanoi–Ha Giang, Hanoi–Ninh Binh, Da Nang–Hoi An–Hue, HCMC–Da Lat).
- Cheap and frequent, but berths are short for tall travellers, there is no shoe space (shoes off at the door) and road safety is lower than trains or flights.
- Choose established operators with recent reviews, prefer daytime travel on mountain roads, wear the seatbelt where fitted, and keep valuables in a small bag on your berth.
- "Limousine" minivans (9–11 seat) are more comfortable for routes like Hanoi–Sa Pa or Hanoi–Ninh Binh.`,
        warnings: [
          "Sleeper buses on mountain roads at night carry higher accident risk, prefer the train or a daytime limousine van.",
        ],
        sources: [VN_RAILWAYS, wikivoyage("Vietnam", "Rail, bus and sleeper-bus context")],
        lastVerified: CHECKED,
      },
      {
        slug: "ferries-and-group-vans",
        title: "Ferries and private group vans",
        kind: "travel_advice",
        summary:
          "Ferries serve Phu Quoc, Cat Ba, Con Dao and island tours. For seven people, a private 16-seat van with driver is often the best road option.",
        body: `### Ferries and boats
- Phu Quoc: high-speed ferries connect the island with Rach Gia and Ha Tien on the mainland; car ferries also run. Most visitors fly in/out instead.
- Cat Ba / Lan Ha Bay: ferries and speedboats from Hai Phong; Ha Long Bay cruises depart from Tuan Chau and nearby marinas.
- Con Dao: ferries from Vung Tau / Tran De; flights are faster.
- Sea conditions in December are usually calm in the south (Phu Quoc dry season) but can be rough in the north and centre, sailings can be cancelled at short notice for weather. Keep a buffer day before international flights.
- Check life jackets are available on every boat; for small island-hopping boats, ask how many passengers are licensed.

### Private group vans
- For 7 people with luggage, a 16-seat van (often a Ford Transit or Hyundai Solati) with driver is usually more comfortable and cost-effective than two cars on long routes (e.g. Hanoi–Ninh Binh day trips, Hanoi–Ha Long transfers, Da Nang–Hoi An–Hue).
- 9-seat "limousine" vans have larger reclining seats but limited boot space. Ask about luggage capacity.
- Book through your hotel or a reputable agency; confirm in writing the price, tolls, parking, waiting time, driver meals/overnight costs and pick-up point.
- Drivers rarely speak much English; share the itinerary in writing (Vietnamese translation helps).`,
        sources: [VNAT_TRAVEL, WV_VIETNAM],
        lastVerified: CHECKED,
      },
      {
        slug: "motorbikes-licences-and-indian-idp",
        title: "Motorbike regulations, Indian licences and the IDP question",
        kind: "mixed",
        summary:
          "Vietnam recognises IDPs issued under the 1968 Vienna Convention. India issues IDPs under the 1949 Geneva Convention. Do not assume you may legally ride.",
        body: `### Official requirement
- Riding a motorbike in Vietnam requires a valid licence for that vehicle class. Under Vietnam's Law on Road Traffic Order and Safety (36/2024/QH15, in force from 1 January 2025) motorbikes require class A1/A licences depending on engine size.
- Foreign national licences are not valid on their own in Vietnam. Visitors can drive only with an International Driving Permit (IDP) issued under the 1968 Vienna Convention on Road Traffic (Vietnam acceded to it in 2014), or under the ASEAN mutual-recognition arrangement for ASEAN licences.
- Vietnam is not a party to the 1949 Geneva Convention; IDPs issued only under the 1949 convention are not valid for driving in Vietnam.
- India issues IDPs under the 1949 Geneva Convention (check the convention printed on your IDP booklet). We have not found any official Vietnamese source recognising an Indian-issued IDP, so treat an Indian licence + Indian IDP as not sufficient to ride or drive legally in Vietnam.
- Tourists and business-visa holders cannot convert a foreign licence into a Vietnamese one.
- Helmets are compulsory for riders and passengers on motorbikes and electric scooters.
- Zero alcohol: operating a road vehicle with any alcohol concentration in blood or breath is prohibited (Article 9(2), Law 36/2024/QH15). Fines are set by Decree 168/2024/ND-CP.

### Travel advice
- Rental shops rarely ask for a licence, but that does not make riding legal. In a police stop you can be fined and the bike impounded; in an accident your travel insurance will very likely refuse the claim (most policies exclude riding without a valid local licence).
- Safer alternatives: GrabBike / Be / Xanh SM bike taxis, a hired motorbike with a licensed local driver ("easy rider"), or a guided jeep/car tour (common for the Ha Giang loop).
- If you are a passenger: always wear a properly fastened helmet; avoid riding at night or in rain on mountain roads; keep legs clear of the exhaust (exhaust burns are a common tourist injury).
- Bicycles (e.g. in Hoi An or Ninh Binh) do not require a licence.`,
        keyFacts: [
          { label: "IDP convention recognised by Vietnam", value: "1968 Vienna Convention", status: "verified_provider" },
          { label: "1949 Geneva IDP valid in Vietnam?", value: "No", status: "verified_provider" },
          { label: "Indian IDP valid for riding in Vietnam?", value: "Not confirmed: assume no", status: "needs_verification" },
          { label: "Helmet", value: "Compulsory", status: "verified_official" },
          { label: "Alcohol limit for drivers/riders", value: "Zero", status: "verified_official" },
        ],
        warnings: [
          "Do not ride a motorbike on an Indian licence + Indian IDP; it is very likely not legal and voids most travel insurance.",
          "Never leave your passport as a deposit with a rental shop.",
          "Any alcohol at all is illegal for riders and drivers.",
        ],
        sources: [IDP_NEWS, ROAD_LAW_2024, ZERO_ALCOHOL_NEWS, PARIVAHAN],
        lastVerified: CHECKED,
      },
    ],
  },

  // =========================================================================
  // E. ACCOMMODATION
  // =========================================================================
  {
    slug: "accommodation",
    letter: "E",
    title: "Accommodation",
    summary:
      "Hostels to private villas, how to house a group of seven, which neighbourhoods to pick in each city, and safety checks.",
    icon: "BedDouble",
    articles: [
      {
        slug: "accommodation-types",
        title: "Hostels, hotels, guesthouses, homestays, Airbnb and villas",
        kind: "mixed",
        summary:
          "What each type offers, typical trade-offs, and the police-registration rule that applies to every stay.",
        body: `### Official requirement
- Every foreigner's stay must be declared to local police by the accommodation provider. Hotels and licensed guesthouses do this using your passport at check-in. Private rentals (Airbnb, apartments) must also declare guests. Ask the host to confirm they have done so.

### Travel advice
- Hostels: dorms and private rooms, social atmosphere, bar crawls; good in Hanoi Old Quarter, HCMC District 1, Hoi An, Sa Pa and Ha Giang. Check reviews for noise and lockers.
- Hotels: from budget mini-hotels (narrow "tube" buildings with a lift) to international chains. Mini-hotels offer excellent value in Hanoi and HCMC.
- Guesthouses / homestays: family-run, often with home-cooked dinners; standard in Sa Pa villages, Ha Giang, Mai Chau, Pu Luong and the Mekong Delta. Rooms can be basic and cold in December in the north. Confirm blankets/heaters.
- Airbnb / serviced apartments: good for longer stays and groups that want a kitchen; check building rules, lift, and that the listing is licensed.
- Private villas: common on Phu Quoc, Da Nang, Hoi An and Da Lat; often with pool and kitchen, sometimes with a cook. For groups this can cost less per head than hotel rooms.
- Resorts: Phu Quoc and Da Nang have large resort strips; December is peak season: book early.`,
        sources: [VNAT_TRAVEL, WV_VIETNAM],
        lastVerified: CHECKED,
      },
      {
        slug: "group-and-family-rooms",
        title: "Rooms for a group of seven",
        kind: "travel_advice",
        summary:
          "Mix of twins/triples, family rooms, connecting rooms or a villa. How to request, confirm and split.",
        body: `- Seven people is an awkward number for standard double/twin rooms. Common combinations: 2 twins + 1 triple, 3 twins + 1 single, or 1 family room (4) + 1 triple.
- Family rooms and quadruple rooms are common in Vietnamese hotels, search with "4 adults" per room to surface them.
- Ask for rooms on the same floor or connecting rooms; confirm it in writing after booking.
- In villas, check the number of real beds versus sofa beds, and the number of bathrooms (one bathroom per 2–3 people is comfortable).
- Confirm whether breakfast is included for all seven and whether extra beds are charged.
- Put one person in charge of each booking; store confirmations in a shared folder; note cancellation deadlines.
- December peak: Christmas week prices rise sharply in Phu Quoc, Da Nang/Hoi An and Sa Pa; book at least 6–8 weeks ahead.
- Split costs per room, not per head, if room types differ.`,
        sources: [WV_VIETNAM],
        lastVerified: CHECKED,
      },
      {
        slug: "choosing-neighbourhoods-and-safety",
        title: "Neighbourhood selection and practical safety",
        kind: "travel_advice",
        summary:
          "Where to base yourself in Phu Quoc, Ho Chi Minh City, Da Nang/Hoi An, Hanoi and Sa Pa, and what to check before you book.",
        body: `### Neighbourhoods
- Phu Quoc: Duong Dong town (restaurants, night market, central), Long Beach (sunsets, resorts), Ong Lang (quieter), An Thoi / Sun Sunset Town in the south (cable car, Kiss Bridge area, island-hopping departures). Distances are long: choose based on your main activities.
- Ho Chi Minh City: District 1 (Ben Thanh, Nguyen Hue walking street, nightlife), District 3 (calmer, local food), Thao Dien in the east (expat cafés, quieter).
- Da Nang: My Khe beach strip for the sea; Han River side for the city, Dragon Bridge and night markets. Hoi An: stay just outside the Ancient Town (An Bang / Cam Thanh) for calm, or in town for walkability.
- Hanoi: Old Quarter (walkable, lively, noisy), Hoan Kiem Lake area (central, slightly calmer), Ba Dinh / Tay Ho (West Lake, quieter, cafés).
- Sa Pa: town centre for convenience; Ta Van / Lao Chai valley homestays for scenery (cold at night in December).

### Practical safety checks
- Fire exits: many narrow mini-hotels have one staircase. Check for a second exit, fire extinguisher and that windows/balconies are not barred. Avoid karaoke-bar buildings.
- Use the room safe; carry a passport photocopy and leave the original in the safe (keep it on you on travel days).
- Location: a 5-minute walk from a main road helps with Grab pick-ups at night.
- Noise: Old Quarter and District 1 bars run late; ask for rooms at the back.
- Read recent reviews (last 3–6 months) for cleanliness, hot water and air-conditioning/heating.`,
        sources: [VNAT_TRAVEL, WV_VIETNAM],
        lastVerified: CHECKED,
      },
    ],
  },

  // =========================================================================
  // F. FOOD
  // =========================================================================
  {
    slug: "food",
    letter: "F",
    title: "Food",
    summary:
      "Famous dishes, vegetarian/vegan and halal options, seafood, allergies, street-food safety and drinking water.",
    icon: "UtensilsCrossed",
    articles: [
      {
        slug: "famous-dishes",
        title: "Famous dishes and seafood",
        kind: "travel_advice",
        summary:
          "Pho, bun cha, banh mi, banh xeo, cao lau, mi Quang, bun bo Hue, com tam and the seafood of Phu Quoc, what to try where.",
        body: `### Dishes to try
- Pho (beef or chicken noodle soup), Hanoi is its home; breakfast staple.
- Bun cha: grilled pork with rice noodles and herbs, Hanoi.
- Banh mi: baguette sandwich, everywhere; Hoi An's are famous. Egg or vegetarian versions exist.
- Banh xeo: crispy rice-flour pancake wrapped in herbs and rice paper.
- Cao lau and mi Quang, noodle dishes of Hoi An / Quang Nam.
- Bun bo Hue: spicy lemongrass beef noodle soup from Hue.
- Com tam: broken rice with grilled pork, Ho Chi Minh City.
- Goi cuon, fresh spring rolls; cha gio / nem ran, fried spring rolls.
- Ca phe: Vietnamese coffee: ca phe sua da (iced, condensed milk), egg coffee in Hanoi, salt coffee in Hue, coconut coffee.

### Seafood
- Phu Quoc is known for seafood (grilled squid, scallops, sea urchin, herring salad, goi ca trich), fish sauce (nuoc mam) and black pepper. Duong Dong night market has many seafood grills.
- Seafood is sold by weight: agree the price per kg and total before cooking, and watch it being weighed.
- Avoid seafood that has been sitting unrefrigerated, and be cautious with raw shellfish.`,
        sources: [VNAT_TRAVEL, WV_VIETNAM],
        lastVerified: CHECKED,
      },
      {
        slug: "vegetarian-vegan-halal",
        title: "Vegetarian, vegan and halal food",
        kind: "travel_advice",
        summary:
          "Buddhist vegetarian restaurants (com chay) make Vietnam easier than expected; fish sauce is the hidden ingredient. Indian and halal options in major cities.",
        body: `### Vegetarian and vegan
- Look for "chay" (vegetarian):"quan chay" or "nha hang chay" are Buddhist vegetarian restaurants, found in every city and near pagodas. Most are effectively vegan (no egg/dairy), but ask.
- Hidden non-veg ingredients: fish sauce (nuoc mam), shrimp paste, meat broth in "vegetable" soups, lard. Useful phrases: "Toi an chay" (I eat vegetarian), "Khong nuoc mam" (no fish sauce), "Khong thit, khong ca" (no meat, no fish).
- Full-moon and new-moon days (1st and 15th of the lunar month) many locals eat vegetarian, and vegetarian stalls get busy.
- Easy vegetarian dishes: banh mi chay, pho chay, tofu with tomato sauce (dau sot ca chua), morning-glory stir fry (ask without fish sauce), banh xeo chay.

### Indian food
- Indian restaurants exist in Hanoi, Ho Chi Minh City, Da Nang, Hoi An and Phu Quoc, many run by Indian owners; useful for a familiar meal and for strict Jain/vegetarian diets.

### Halal
- Ho Chi Minh City has a Cham Muslim community with mosques and halal eateries (notably around the District 1 mosque on Dong Du street); halal options are more limited elsewhere. Look for halal certification or ask the restaurant directly.

### Tips
- Carry a printed card in Vietnamese explaining dietary needs.
- Translation apps with camera mode work well on menus.`,
        sources: [WV_VIETNAM, VNAT_TRAVEL],
        lastVerified: CHECKED,
      },
      {
        slug: "food-safety-allergies-water",
        title: "Street-food safety, food allergies and drinking water",
        kind: "travel_advice",
        summary:
          "How to choose safe stalls, handle allergies (peanut, shellfish, gluten), and why you should drink bottled or filtered water.",
        body: `### Street-food safety
- Choose busy stalls with high turnover and food cooked to order in front of you.
- Hot soups and grilled food are safer than items left standing. Fresh herbs are rinsed in tap water, usually fine for most people, but those with sensitive stomachs may skip them for the first days.
- Ice in cities is generally factory-made (cylindrical with a hole); avoid crushed block ice in very rural areas.
- Carry hand sanitiser and wet wipes.
- Pack oral rehydration salts and standard stomach medicines (see the packing checklist) and consult a doctor before travel.

### Allergies
- Peanuts, shellfish/shrimp paste, fish sauce, sesame, soy and wheat (in some noodles and soy sauce) are common.
- Carry a Vietnamese allergy card stating the allergen and severity. If you carry adrenaline auto-injectors, bring a doctor's letter and spares.
- Rice noodles (pho, bun) are naturally gluten-free, but sauces may not be.

### Drinking water
- Do not drink tap water. Drink sealed bottled water or filtered water; many hotels provide refill dispensers.
- Use bottled water to brush teeth if you have a sensitive stomach.
- Refill large 19-litre dispensers or bring a filter bottle to reduce plastic waste.`,
        warnings: ["Do not drink tap water.", "Agree seafood prices by weight before it is cooked."],
        sources: [WV_VIETNAM],
        lastVerified: CHECKED,
      },
    ],
  },

  // =========================================================================
  // G. SAFETY
  // =========================================================================
  {
    slug: "safety",
    letter: "G",
    title: "Safety",
    summary:
      "Common scams and theft, traffic and motorbike safety, adventure and water-activity checks, December weather, emergency numbers, insurance and medical care.",
    icon: "ShieldCheck",
    articles: [
      {
        slug: "emergency-numbers-and-consular-help",
        title: "Emergency numbers and consular help",
        kind: "official_requirement",
        summary:
          "Police 113, fire and rescue 114, ambulance 115, search and rescue 112. Save the Indian Embassy and Consulate emergency numbers before departure.",
        body: `### Vietnamese emergency numbers
- 113: Police
- 114: Fire and rescue
- 115: Ambulance / emergency medical
- 112: Search and rescue (disasters, missing persons)

Operators mostly speak Vietnamese. If possible, ask your hotel reception, tour guide or a local to call on your behalf, and share your location pin. For medical emergencies in tourist areas, calling an international hospital directly can be faster than 115.

### Indian consular help
- Embassy of India, Hanoi (58–60 Tran Hung Dao, Hanoi), emergency: +84-913089165.
- Consulate General of India, Ho Chi Minh City (214 Vo Thi Sau, District 3), emergency: +84-917180776. Covers southern Vietnam including Phu Quoc.
- Indian nationals are encouraged to register with the mission covering their travel area via its website.

### What consular staff can and cannot do
- Can: issue Emergency Certificates for lost passports, advise on local lawyers and hospitals, contact family.
- Cannot: pay hospital bills or fines, intervene in court cases, or fix visa problems; that is the Vietnamese Immigration Department.`,
        keyFacts: [
          { label: "Police", value: "113", status: "community" },
          { label: "Fire and rescue", value: "114", status: "community" },
          { label: "Ambulance", value: "115", status: "community" },
          { label: "Search and rescue", value: "112", status: "community" },
          { label: "Embassy of India Hanoi (emergency)", value: "+84-913089165", status: "verified_official" },
          { label: "Consulate General of India HCMC (emergency)", value: "+84-917180776", status: "verified_official" },
        ],
        sources: [INDIA_EMBASSY_VISITOR_INFO, INDIA_EMBASSY_HANOI, INDIA_CONSULATE_HCMC, EMERGENCY_NUMBERS],
        lastVerified: CHECKED,
      },
      {
        slug: "scams-and-pickpocketing",
        title: "Scams and pickpocketing",
        kind: "travel_advice",
        summary:
          "Vietnam is generally safe for visitors; petty theft and overcharging are the main risks. The common tricks and how to avoid them.",
        body: `### Common scams
- Fake e-visa / arrival-card sites charging inflated fees. Use only evisa.gov.vn and prearrival.immigration.gov.vn.
- Look-alike taxi brands with rigged meters; drivers claiming the meter is broken. Use apps or Mai Linh / Vinasun.
- Note confusion: handing over 500,000 instead of 20,000, or 100,000 instead of 10,000. Count your change.
- Shoe-shine / street vendor "free" offers followed by a large demand; posing for photos with fruit-basket sellers then being asked for money.
- Cyclo rides that triple in price at the end. Agree price, duration and currency in writing (or a photo of the agreed number) before you get in.
- Massage / spa upselling and "tip" pressure; bars with unpriced drinks. Check prices before ordering.
- Seafood weighed with a heavier catch than you chose, watch the weighing.
- Tour "bait and switch": cheap tour booked on the street, different boat/bus on the day. Book through reputable agencies with clear inclusions.

### Pickpocketing and bag snatching
- Motorbike bag-snatching is the main theft risk in Ho Chi Minh City and, less often, Hanoi. Keep phones away from the roadside edge of the pavement, wear bags cross-body on the side away from traffic, and do not hold your phone out while waiting for a Grab.
- Busy night markets, walking streets and festivals: front pockets or zipped bags.
- Use hotel safes; carry a passport photocopy day to day.

### If something is stolen
- Report to the nearest police station and get a written report (needed for insurance).
- Lost passport: see the immigration article: police report, then Embassy/Consulate.`,
        sources: [WV_VIETNAM, INDIA_EMBASSY_VISITOR_INFO],
        lastVerified: CHECKED,
      },
      {
        slug: "traffic-and-motorbike-safety",
        title: "Traffic and motorbike safety",
        kind: "travel_advice",
        summary:
          "How to cross the road, why riding yourself is a bad idea, and passenger safety on bike taxis.",
        body: `- Road traffic accidents are the leading cause of serious injury to visitors in Vietnam.
- Crossing the road: walk at a slow, steady, predictable pace; do not run or stop suddenly, riders steer around you. Use crossings and traffic lights where they exist; in a group, cross together.
- Pavements are often used for parking and riding; watch for bikes on the footpath.
- Do not ride a motorbike yourself without a licence valid in Vietnam (see Transportation → Motorbike regulations).
- As a bike-taxi passenger: wear the provided helmet with the strap fastened; ask the driver to slow down ("cham thoi"); avoid bike taxis with large luggage.
- In cars and vans: use seat belts; ask drivers not to speed on mountain passes.
- Night-time and rain significantly increase risk on rural roads; plan transfers in daylight.`,
        sources: [ROAD_LAW_2024, WV_VIETNAM],
        lastVerified: CHECKED,
      },
      {
        slug: "adventure-and-water-activities",
        title: "Adventure provider checks and water activities",
        kind: "travel_advice",
        summary:
          "Questions to ask before caving, trekking, canyoning, diving, kayaking or boat trips, and when to walk away.",
        body: `### Before booking any adventure activity
- Is the operator licensed and are guides certified for this activity (e.g. PADI/SSI for diving)? Ask to see it.
- Group size and guide ratio; is there a first-aid trained guide and a first-aid kit?
- Equipment: helmets, harnesses, life jackets in your size and in good condition.
- Weather policy: will they cancel and refund in bad weather?
- Insurance: does your travel insurance cover this activity? Many policies exclude scuba below a certain depth, canyoning, or motorbiking.
- Read recent independent reviews, especially for safety incidents.

### Water activities
- Wear a life jacket on all boats and kayaks, even if you swim well.
- Phu Quoc in December is generally calm on the west coast; check the daily sea conditions. North (Ha Long / Lan Ha) water is cool in December.
- Watch for rip currents on open beaches (e.g. Da Nang in the winter monsoon). Swim between flags where lifeguards are present.
- Jellyfish occur seasonally; ask locals before swimming.
- Do not drink alcohol before swimming, diving or kayaking.
- Snorkelling: use reef-safe sunscreen and do not touch or stand on coral.`,
        sources: [WV_VIETNAM, VNAT_TRAVEL],
        lastVerified: CHECKED,
      },
      {
        slug: "weather-in-december",
        title: "Weather risks in December",
        kind: "travel_advice",
        summary:
          "Dry and hot in Phu Quoc and the south; rainy with flood risk in the centre; cool to cold in Hanoi and near-freezing nights in Sa Pa and Ha Giang.",
        body: `Typical December conditions (climate patterns, not forecasts. Check the forecast a few days before each leg):

- Phu Quoc and the south (Ho Chi Minh City, Mekong Delta): dry season, sunny and warm to hot. Sun protection and hydration are the main concerns.
- Central coast (Da Nang, Hoi An, Hue): end of the rainy season; heavy rain, flooding and rough seas are possible, especially in early December. Keep plans flexible and watch for flood warnings.
- Hanoi, Ninh Binh, Ha Long: cool and often overcast, with chilly evenings; fog can affect Ha Long Bay views and occasionally sailings.
- Sa Pa and Ha Giang (mountains): cold; nights can approach freezing and frost or rare snow events happen in cold spells. Homestays may not have central heating.

Practical tips:
- Pack layers for the north even if you start in hot Phu Quoc (see the packing checklist).
- Domestic flights and boats can be delayed by weather. Avoid same-day connections to international flights.
- Typhoon season is largely over by December, but late-season storms are possible in the centre; follow local authority instructions.`,
        sources: [VNAT_TRAVEL, WV_VIETNAM],
        lastVerified: CHECKED,
      },
      {
        slug: "insurance-and-medical-access",
        title: "Travel insurance and medical access",
        kind: "travel_advice",
        summary:
          "Buy insurance with medical evacuation and adventure cover. International hospitals exist in big cities; remote areas have limited care.",
        body: `### Insurance
- Buy comprehensive travel insurance covering medical treatment, hospitalisation, medical evacuation/repatriation, trip cancellation/curtailment, baggage and personal liability.
- Check adventure-activity cover (trekking altitude limits, scuba depth, canyoning, kayaking) and motorbike exclusions; most policies refuse claims if you ride without a valid licence or after drinking.
- Carry the insurer's 24-hour emergency number and policy number on paper and on your phone; share them in the group folder.
- Many private hospitals require a deposit or guarantee of payment before treatment, know how your insurer handles cashless admission.

### Medical access
- Hanoi, Ho Chi Minh City, Da Nang and Phu Quoc have private / international hospitals and clinics with English-speaking staff (for example the Vinmec network has hospitals in several of these cities).
- Rural and mountain areas (Ha Giang, Sa Pa villages, Pu Luong, island tours) have only basic clinics; serious cases are transferred to provincial hospitals or Hanoi.
- Pharmacies (nha thuoc) are everywhere; many medicines are sold over the counter, but bring your own prescription medicines in original packaging with a copy of the prescription.

### Health preparation
- Consult your doctor or a travel clinic 4–6 weeks before departure about routine and recommended vaccinations and any personal medication needs.
- Mosquito-borne diseases such as dengue occur in Vietnam; use repellent and long sleeves at dawn and dusk.`,
        sources: [INDIA_EMBASSY_VISITOR_INFO, WV_VIETNAM],
        lastVerified: CHECKED,
      },
    ],
  },

  // =========================================================================
  // H. LOCAL RULES AND ETIQUETTE
  // =========================================================================
  {
    slug: "local-rules-and-etiquette",
    letter: "H",
    title: "Local rules and etiquette",
    summary:
      "Temple clothing, respectful photography, public behaviour, alcohol and vaping rules, drones, protected wildlife and environmental responsibility.",
    icon: "Landmark",
    articles: [
      {
        slug: "temples-photography-public-behaviour",
        title: "Temple clothing, respectful photography and public behaviour",
        kind: "travel_advice",
        summary:
          "Cover shoulders and knees at pagodas and memorials, ask before photographing people, and keep calm in disputes.",
        body: `### Temples, pagodas and memorial sites
- Cover shoulders and knees; remove hats; remove shoes where others have (often at the entrance to the main hall).
- Do not point feet at altars or Buddha statues; do not touch statues or offerings.
- Ho Chi Minh Mausoleum (Hanoi): strict dress code and conduct: no shorts or sleeveless tops, no talking, hands out of pockets, no photography inside, bags checked. Opening days and hours are limited and it closes for maintenance periods; check before going.
- War memorials and cemeteries: behave quietly and respectfully.

### Photography
- Ask before photographing people, especially ethnic-minority villagers in Sa Pa and Ha Giang, children and monks. Some will ask for a small payment, decide before you raise the camera.
- Do not photograph military installations, police, border areas or signs marked "no photography" (khu vuc cam).
- Wedding and family photo shoots are common in parks. Avoid walking into them.

### Public behaviour
- Raising your voice or showing anger causes loss of face and usually makes problems worse; stay calm and polite.
- Moderate public displays of affection.
- Use both hands (or right hand with left supporting) when giving or receiving items such as cards or money from elders.
- Political discussion and criticism of national leaders in public are sensitive. Avoid them.
- Dress modestly away from beaches; swimwear is for the beach and pool only.`,
        sources: [VNAT_TRAVEL, WV_VIETNAM],
        lastVerified: CHECKED,
      },
      {
        slug: "alcohol-vaping-and-drugs",
        title: "Alcohol, vaping and drug regulations",
        kind: "official_requirement",
        summary:
          "Zero alcohol for anyone driving or riding, a nationwide ban on e-cigarettes and heated tobacco since 31 Dec 2025, and severe drug penalties.",
        body: `### Alcohol
- Drinking is legal for adults and widely available. Selling alcohol to people under 18 is prohibited.
- Zero tolerance for drivers and riders: operating any road vehicle with alcohol in your blood or breath is prohibited (Article 9(2), Law 36/2024/QH15, in force since 1 January 2025). This includes motorbikes, cars and e-bikes. Fines and licence penalties are set by Decree 168/2024/ND-CP.
- Methanol poisoning has occurred from counterfeit spirits; buy drinks from reputable venues and avoid unlabelled homemade rice wine served in plastic bottles.

### E-cigarettes and heated tobacco
- Vietnam banned the production, trading, import, storage, transport and use of e-cigarettes and heated tobacco products; enforcement began on 31 December 2025. Users, including foreign tourists, face fines, and devices can be confiscated at airports.
- Do not pack vapes or heated-tobacco devices.

### Drugs
- Vietnam has some of the strictest drug laws in the world. Possession, use and trafficking are serious crimes; trafficking can carry the death penalty. "Laughing gas" balloons in bars are also restricted.`,
        keyFacts: [
          { label: "Alcohol limit for drivers/riders", value: "Zero", status: "verified_official" },
          { label: "E-cigarettes / heated tobacco", value: "Banned, including use (from 31 Dec 2025)", status: "verified_provider" },
          { label: "Fine for vape use", value: "Reported up to several million VND", status: "needs_verification" },
        ],
        warnings: ["Do not bring vapes or heated-tobacco devices into Vietnam.", "Never drive or ride after any alcohol."],
        sources: [ROAD_LAW_2024, ZERO_ALCOHOL_NEWS, VAPE_BAN_NEWS],
        lastVerified: CHECKED,
      },
      {
        slug: "drone-rules",
        title: "Drone rules",
        kind: "official_requirement",
        summary:
          "Flying a drone (flycam) in Vietnam is regulated under Decree 288/2025/ND-CP. Visitors should assume a permit is required and that most tourist trips cannot easily obtain one.",
        body: `- Vietnam regulates unmanned aircraft under Decree 288/2025/ND-CP (in force from November 2025), which applies to both Vietnamese and foreign individuals and organisations.
- Drones must be registered and flights require permission; restrictions around airports, military and security areas, border zones, government buildings and crowds are strict.
- Reported requirements include a minimum operator age and an operator qualification; sources indicate that foreign operators generally need a Vietnamese sponsoring organisation. A clear visitor route for short tourist trips has not been confirmed.
- Flying without permission can lead to fines and confiscation of the device.
- Customs may question or hold drones in checked or carry-on baggage.

Practical advice: leave the drone at home, or engage a licensed local aerial-photography company that holds the required permits. If you must bring one, obtain written confirmation of a valid permit before departure.`,
        keyFacts: [
          { label: "Governing rule", value: "Decree 288/2025/ND-CP", status: "verified_provider" },
          { label: "Tourist permit route", value: "Not confirmed: assume flights not permitted", status: "needs_verification" },
        ],
        warnings: ["Do not fly drones without a permit, especially near airports, military areas, borders or in Hanoi."],
        sources: [DRONE_DECREE],
        lastVerified: CHECKED,
      },
      {
        slug: "wildlife-and-environment",
        title: "Protected wildlife and environmental responsibility",
        kind: "mixed",
        summary:
          "Do not buy wildlife products, avoid exploitative animal attractions, protect coral and reduce plastic.",
        body: `### Official requirement
- Trading, buying or transporting protected wildlife and wildlife products (ivory, rhino horn, pangolin scales, turtle shell, certain corals and shells) is illegal in Vietnam and under CITES; importing such items into India is also illegal.
- National parks and marine protected areas (e.g. Phu Quoc National Park and the Phu Quoc marine protected area, Cat Ba National Park, Phong Nha–Ke Bang) have rules on access, fishing and collecting, follow ranger and guide instructions.

### Travel advice
- Do not buy "snake wine", bear-bile products, turtle-shell or coral souvenirs.
- Avoid attractions that offer elephant riding, animal performances or photos with wild animals.
- Snorkelling and diving: do not touch, stand on or take coral and shells; use reef-safe sunscreen.
- Reduce plastic: carry a refillable water bottle, refuse plastic straws and bags, and pack out rubbish from beaches, treks and boats.
- Choose cruise and tour operators that manage waste responsibly (Ha Long and Lan Ha Bays have specific environmental rules for boats).
- On treks and in villages, stay on paths and buy handicrafts directly from makers.`,
        sources: [VNAT_TRAVEL, WV_VIETNAM],
        lastVerified: CHECKED,
      },
    ],
  },

  // =========================================================================
  // I. PACKING CHECKLIST
  // =========================================================================
  {
    slug: "packing-checklist",
    letter: "I",
    title: "Packing checklist",
    summary:
      "What to pack for a December trip spanning tropical Phu Quoc and cold northern mountains: clothing, rain, winter layers, footwear, swim, electronics, documents and medicines.",
    icon: "Backpack",
    articles: [
      {
        slug: "packing-overview",
        title: "Packing for two climates in one trip",
        kind: "travel_advice",
        summary:
          "Pack light, layer for the north, and keep documents and medicines in your carry-on. The full interactive checklist is in the Packing tab.",
        body: `A December itinerary from Phu Quoc to Hanoi covers hot beaches (around 30°C by day) and cold mountains (Sa Pa and Ha Giang nights near freezing). The answer is layers, not a second suitcase.

### Clothing
- Light, breathable tops and shorts for Phu Quoc and the south; at least one outfit covering shoulders and knees for temples and the Ho Chi Minh Mausoleum.
- Long trousers for evenings, mosquitoes and the north.

### Rain protection
- Light rain jacket or poncho; a packable umbrella; dry bags for phones and documents on boats.

### Winter layers for Sa Pa / Ha Giang / Hanoi
- Thermal base layer (top and bottom), fleece, insulated or down jacket, beanie, gloves, warm socks. Warm jackets can also be bought cheaply in Hanoi if you prefer not to carry them through the beach leg.

### Footwear
- Comfortable walking shoes; trekking shoes with grip for Sa Pa/Ninh Binh/caves; sandals or flip-flops for beaches; easily removable shoes for temples.

### Swimming
- Swimwear, rash guard, quick-dry towel, reef-safe sunscreen, water shoes for rocky beaches and kayaking.

Electronics, documents and medicines are covered in the next article. The full interactive packing list is in the Packing tab.`,
        sources: [WV_VIETNAM, VNAT_TRAVEL],
        lastVerified: CHECKED,
      },
      {
        slug: "electronics-documents-medicines",
        title: "Electronics, travel documents, medicines and personal essentials",
        kind: "mixed",
        summary:
          "Vietnam runs on 220V/50Hz with mostly 2-pin sockets. What documents to carry, and which medicines and essentials belong in your carry-on.",
        body: `### Official requirement
- Passport valid at least 6 months beyond arrival and the approved e-visa (printed) must be presented at immigration.
- E-cigarettes and heated-tobacco devices are banned in Vietnam. Do not pack them.
- Power banks and spare lithium batteries must go in carry-on baggage under airline rules; check each airline's watt-hour limit.
- Prescription medicines: carry them in original packaging with a copy of the prescription or a doctor's letter. Controlled medicines (strong painkillers, some sleeping or ADHD medicines) may need extra paperwork. Ask your doctor and check with the Vietnamese embassy before travelling.

### Travel advice: electronics
- Vietnam uses 220V, 50Hz electricity, essentially the same as India, so Indian chargers and laptops work without a voltage converter.
- Sockets usually accept Type A (two flat pins) and Type C/F (two round pins). Indian 2-pin round plugs (Type C) usually fit; Indian 3-pin plugs (Type D/M) generally need an adapter. A universal adapter plus a small multi-port USB charger covers a whole room.
- Power bank, cables, waterproof phone pouch, head torch for caves and homestays, earphones and eye mask for sleeper trains.
- Download offline maps, booking confirmations and e-visa PDFs before you go.

### Travel advice: documents folder (per traveller)
- Passport + two printed e-visa copies + pre-arrival QR screenshot.
- Flight, train, cruise and hotel confirmations (offline).
- Travel-insurance policy and 24-hour assistance number.
- Passport data-page photocopy (carry day to day) and a spare passport-size photo.
- Emergency contacts: Embassy of India Hanoi, Consulate General of India HCMC, family contact, group leader.

### Travel advice: medicines and personal essentials
- Discuss a personal kit with your doctor: oral rehydration salts, stomach medicines, motion-sickness tablets (boats and mountain roads), antihistamine, painkillers, plasters and blister care.
- Insect repellent (dengue risk), SPF 50 reef-safe sunscreen, lip balm and moisturiser for the dry northern cold, hand sanitiser, wet wipes, and a refillable water bottle.`,
        keyFacts: [
          { label: "Voltage / frequency", value: "220V / 50Hz", status: "community" },
          { label: "Plug types", value: "A, C, F (mostly 2-pin)", status: "community" },
          { label: "Vapes / heated tobacco", value: "Banned: do not pack", status: "verified_provider" },
        ],
        sources: [WV_VIETNAM, VAPE_BAN_NEWS, VN_EMBASSY_INDIA_EVISA],
        lastVerified: CHECKED,
      },
    ],
  },

  // =========================================================================
  // J. TRAVEL PREPARATION CHECKLIST
  // =========================================================================
  {
    slug: "travel-preparation-checklist",
    letter: "J",
    title: "Travel preparation checklist",
    summary:
      "A trackable, time-ordered checklist from 8 weeks before departure to arrival day. Tick items off in the Preparation tab, progress is saved per traveller.",
    icon: "ListChecks",
    articles: [
      {
        slug: "preparation-timeline",
        title: "Preparation timeline for the group",
        kind: "mixed",
        summary:
          "What to do 8 weeks, 4 weeks, 2 weeks, 1 week and 3 days before flying, with the legal must-dos clearly marked.",
        body: `### Official requirement (must be done)
- Passport valid at least 6 months beyond arrival date. Check all 7 passports now.
- E-visa approved for each traveller via evisa.gov.vn, dates covering the full trip.
- Pre-arrival declaration at prearrival.immigration.gov.vn within 3 days before landing (free).
- Do not carry vapes/heated-tobacco devices or undeclared cash above the customs threshold.

### Travel advice: timeline
- 8+ weeks: fix the route; book international flights, domestic flights and December-peak accommodation; buy travel insurance with adventure cover.
- 4–6 weeks: apply for e-visas; see a doctor or travel clinic about vaccinations and medicines; set up a shared group folder and expense-splitting app.
- 3–4 weeks: book trains, cruises, key tours and group vans; plan cash (USD and/or forex card); enable international usage on cards.
- 2 weeks: print e-visas; buy or reserve eSIMs; install Grab, Be/Xanh SM, Zalo, translation and offline-map apps; download offline maps for each city.
- 1 week: confirm all bookings; share the final itinerary and emergency numbers; check weather for the north and pack layers.
- 3 days: complete pre-arrival declarations; check in online; charge power banks.
- Arrival day: passport + printed e-visa + QR code in hand; SIM/eSIM active; withdraw or exchange first-day cash.

The full interactive checklist (with due dates and completion status for each traveller) is in the Preparation tab.`,
        sources: [EVISA_PORTAL, PREARRIVAL_PORTAL, VN_EMBASSY_INDIA_EVISA, INDIA_EMBASSY_VISITOR_INFO],
        lastVerified: CHECKED,
      },
      {
        slug: "group-coordination",
        title: "Coordinating preparation for a group of seven",
        kind: "travel_advice",
        summary:
          "Assign owners, track every traveller's e-visa and documents, agree a money system and an emergency plan before anyone boards.",
        body: `### Assign owners
- Visa lead: tracks each traveller's e-visa registration code, status and printed copy. Nobody boards without an approved e-visa.
- Bookings lead: flights, trains, cruises, transfers; holds all references in the shared workspace.
- Accommodation lead: room allocations, check-in times, villa house rules.
- Treasurer: shared VND float, expense app, daily reconciliation.
- Health and safety lead: insurance policy numbers, medical notes (allergies, conditions, shared only with consent), first-aid kit.

### Track per traveller
- Passport validity checked; e-visa approved and printed; insurance bought; pre-arrival QR done; eSIM/SIM plan; card enabled for international use; emergency contact recorded.
- Each item in the Preparation tab is tracked per person, so the group can see who is still pending.

### Agree before departure
- Daily meeting point and time; what to do if someone is separated (meet at the hotel, message the group, call the lead).
- Who keeps spare copies of documents.
- Individual plans: networking events or solo activities are optional; each traveller can join without the rest of the group, as long as the group workspace knows where they are.

### Emergency plan
- Save 113 / 114 / 115, the Indian Embassy (+84-913089165) and Consulate (+84-917180776) numbers, the insurer's assistance line and each hotel's address in Vietnamese.
- Share live location within the group on travel days and nights out.`,
        sources: [INDIA_EMBASSY_VISITOR_INFO, EVISA_PORTAL],
        lastVerified: CHECKED,
      },
    ],
  },
];
