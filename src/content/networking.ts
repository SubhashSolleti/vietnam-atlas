/**
 * WORK & CONNECT: VIETNAM (direction.md section 14).
 *
 * Communities: recurring groups, hubs, coworking spaces and annual conferences in Hanoi,
 * Ho Chi Minh City and Da Nang. No dates are invented: cadence text points to the organiser.
 *
 * Events: ONLY dated events found on an authoritative organiser listing (gdg.community.dev)
 * that fall inside the demo trip window (12–25 Dec 2026). Checked 2026-11-12.
 */
import type { CommunitySeed, ProfessionalEventSeed } from "./guide-types";
import type { SourceRef } from "./types";
import { official, provider } from "./helpers";

const CHECKED = "2026-11-12";

function organiserPage(title: string, url: string, publisher: string, checked: string): SourceRef {
  return { title, url, publisher, kind: "provider", checked, status: "verified_provider", confidence: "high" };
}

function newsSource(title: string, url: string, publisher: string, checked: string): SourceRef {
  return { title, url, publisher, kind: "publisher", checked, status: "verified_provider", confidence: "medium" };
}

const DEFAULT_CADENCE = "Recurring: check the organiser's page for current dates";

export const communities: CommunitySeed[] = [
  // ---------------------------------------------------------------- GDG / cloud
  {
    slug: "gdg-ha-noi",
    name: "GDG Ha Noi",
    type: "gdg",
    city: "hanoi",
    description:
      "Google Developer Groups chapter for Hanoi. Runs talks and hands-on workshops on AI, Google Cloud, web and mobile, including the annual DevFest Hanoi (the 2026 edition is listed for 21 November 2026, before the trip window). Independent community group, not part of Google.",
    organiser: "Google Developer Groups: GDG Ha Noi volunteers",
    url: "https://gdg.community.dev/gdg-ha-noi/",
    howToEngage: "Join the chapter on gdg.community.dev (free) to get event notifications and RSVP links; sessions are mostly in Vietnamese with some English talks.",
    cadence: DEFAULT_CADENCE,
    price: "Free membership; most events free with RSVP",
    status: "verified_provider",
    sources: [organiserPage("GDG Ha Noi chapter page", "https://gdg.community.dev/gdg-ha-noi/", "Google Developer Groups", "Chapter existence, ~600 members, DevFest Hanoi 2026 date (21 Nov 2026)")],
  },
  {
    slug: "gdg-cloud-hanoi",
    name: "GDG Cloud Hanoi",
    type: "cloud_group",
    city: "hanoi",
    description:
      "Large cloud-focused Google Developer Groups chapter (several thousand members) for engineers working with Google Cloud, Kubernetes, data and AI. Runs workshops, code-along series and an annual DevFest Cloud Hanoi.",
    organiser: "Google Developer Groups: GDG Cloud Hanoi volunteers",
    url: "https://gdg.community.dev/gdg-cloud-hanoi/",
    howToEngage: "Join on gdg.community.dev to receive invitations; no upcoming events were listed when checked on 2026-11-12.",
    cadence: DEFAULT_CADENCE,
    price: "Free membership; events typically free with RSVP",
    status: "verified_provider",
    sources: [organiserPage("GDG Cloud Hanoi chapter page", "https://gdg.community.dev/gdg-cloud-hanoi/", "Google Developer Groups", "Chapter existence, ~8,900 members, past 2026 events, no upcoming events listed")],
  },
  {
    slug: "gdg-ho-chi-minh-city",
    name: "GDG Ho Chi Minh City",
    type: "gdg",
    city: "ho-chi-minh-city",
    description:
      "One of Vietnam's most active Google Developer Groups chapters (~2,500 members), with Women Techmakers HCMC. Runs Build with AI, Google I/O Extended and the annual DevFest Ho Chi Minh City; industry partners have included Thoughtworks, Netcompany, JetBrains and Viettel.",
    organiser: "Google Developer Groups: GDG Ho Chi Minh City volunteers",
    url: "https://gdg.community.dev/gdg-ho-chi-minh-city/",
    howToEngage: "Join the chapter on gdg.community.dev; DevFest Ho Chi Minh 2026 is listed for 13 December 2026 (see Events).",
    cadence: DEFAULT_CADENCE,
    price: "Free membership; DevFest ticketing via external registration",
    status: "verified_provider",
    sources: [organiserPage("GDG Ho Chi Minh City chapter page", "https://gdg.community.dev/gdg-ho-chi-minh-city/", "Google Developer Groups", "Chapter description, members, upcoming Road to DevFest (21 Nov 2026) and DevFest (13 Dec 2026)")],
  },
  {
    slug: "gdg-cloud-hcmc",
    name: "GDG Cloud HCMC",
    type: "cloud_group",
    city: "ho-chi-minh-city",
    description:
      "Cloud-focused Google Developer Groups chapter in Ho Chi Minh City with over 13,000 members; co-runs community programmes such as AI Riser Vietnam and Build with AI hands-on sessions.",
    organiser: "Google Developer Groups: GDG Cloud HCMC volunteers",
    url: "https://gdg.community.dev/gdg-cloud-hcmc/",
    howToEngage: "Join on gdg.community.dev; no upcoming events were listed when checked on 2026-11-12.",
    cadence: DEFAULT_CADENCE,
    price: "Free membership; events typically free with RSVP",
    status: "verified_provider",
    sources: [organiserPage("GDG Cloud HCMC chapter page", "https://gdg.community.dev/gdg-cloud-hcmc/", "Google Developer Groups", "Chapter existence, ~13,000 members, 2026 events")],
  },
  {
    slug: "gdg-cloud-da-nang",
    name: "GDG Cloud Da Nang",
    type: "cloud_group",
    city: "da-nang",
    description:
      "Da Nang's Google Developer Groups chapter for cloud engineers and architects (~2,100 members). Runs Build with AI, AI Riser Vietnam sessions and the annual DevFest Cloud Da Nang.",
    organiser: "Google Developer Groups: GDG Cloud Da Nang volunteers",
    url: "https://gdg.community.dev/gdg-cloud-da-nang/",
    howToEngage: "Join on gdg.community.dev; DevFest Cloud Da Nang 2026 is listed for 13 December 2026 (see Events).",
    cadence: DEFAULT_CADENCE,
    price: "Free membership; DevFest Cloud Da Nang listed as free registration",
    status: "verified_provider",
    sources: [organiserPage("GDG Cloud Da Nang chapter page", "https://gdg.community.dev/gdg-cloud-da-nang/", "Google Developer Groups", "Chapter existence, ~2,100 members, DevFest Cloud Da Nang 2026 on 13 Dec 2026")],
  },
  {
    slug: "aws-community-vietnam",
    name: "AWS community in Vietnam (AWS Study Group / First Cloud Journey)",
    type: "cloud_group",
    city: "nationwide",
    description:
      "Vietnam's AWS builder community runs study groups and community days (branded First Cloud Journey), mainly in Ho Chi Minh City and Hanoi, plus larger AWS-run events. Event pages are published on Luma and social channels rather than a single official homepage.",
    organiser: "AWS community volunteers in Vietnam (with AWS Vietnam support)",
    howToEngage: "Search Luma for \"AWS First Cloud Journey\" or \"AWS Vietnam\" and follow the community's social channels; confirm each event on its own listing.",
    cadence: DEFAULT_CADENCE,
    price: "Community events usually free with registration",
    status: "needs_verification",
    sources: [
      provider("AWS First Cloud Journey Community Day Vietnam 2025 (Luma)", "https://luma.com/jfw264vd", "AWS First Cloud Journey community", "Evidence of recurring community days (2025 edition)"),
    ],
  },
  {
    slug: "aws-cloud-and-ai-day-hanoi",
    name: "AWS Cloud & AI Day Hanoi",
    type: "conference",
    city: "hanoi",
    description:
      "AWS-organised one-day cloud and AI conference in Hanoi with technical sessions and customer talks; the 2026 edition took place on 29 September 2026.",
    organiser: "Amazon Web Services",
    url: "https://aws.amazon.com/events/cloud-day-hanoi/",
    howToEngage: "Register on the AWS events page when the next edition is announced.",
    cadence: "Annual: 2026 edition has passed; check AWS events for the next date",
    price: "Check organiser",
    status: "verified_provider",
    sources: [organiserPage("AWS Cloud Day Hanoi event page", "https://aws.amazon.com/events/cloud-day-hanoi/", "Amazon Web Services", "Event existence and 2026 edition")],
  },

  // ---------------------------------------------------------------- AI / ML
  {
    slug: "ai-tinkerers-ho-chi-minh-city",
    name: "AI Tinkerers Ho Chi Minh City",
    type: "ai_ml",
    city: "ho-chi-minh-city",
    description:
      "Hands-on AI builder meetups (part of the global AI Tinkerers network) with live demos of working projects (agents, RAG, evals) technical Q&A and no-pitch networking for engineers, founders and researchers. Attendees are screened.",
    organiser: "AI Tinkerers Ho Chi Minh City organisers",
    url: "https://ho-chi-minh-city.aitinkerers.org",
    howToEngage: "Apply to attend via the event page; demo slots are offered to builders with working projects. No events were listed for 12–25 Dec 2026 when checked.",
    cadence: DEFAULT_CADENCE,
    price: "Typically free (application required)",
    status: "verified_provider",
    sources: [organiserPage("AI Tinkerers Ho Chi Minh City", "https://ho-chi-minh-city.aitinkerers.org", "AI Tinkerers", "Group format, past and listed events (checked 2026-11-12)")],
  },
  {
    slug: "genai-fund-builders-meetups",
    name: "GenAI Builders Meetups (GenAI Fund)",
    type: "ai_ml",
    city: "ho-chi-minh-city",
    description:
      "Generative-AI builder meetups, build weeks and hackathons hosted by GenAI Fund in Ho Chi Minh City, often with model providers and cloud partners.",
    organiser: "GenAI Fund",
    url: "https://luma.com/holfneup",
    howToEngage: "Subscribe to the GenAI Fund calendar on Luma to receive new event announcements.",
    cadence: DEFAULT_CADENCE,
    price: "Varies by event: usually free with registration",
    status: "needs_verification",
    sources: [provider("GenAI Fund on Luma", "https://luma.com/holfneup", "GenAI Fund", "Calendar of builder meetups and build weeks in HCMC (2026)")],
  },
  {
    slug: "ai4vn",
    name: "AI4VN: Vietnam Artificial Intelligence Festival",
    type: "conference",
    city: "hanoi",
    description:
      "Annual national AI festival held since 2018 that brings together researchers, universities, government and companies. The 2026 edition (theme \"Agentic AI & The Future of Learning\") took place in Hanoi in early November 2026.",
    organiser: "Ministry of Science and Technology with VnExpress and partners",
    howToEngage: "Follow announcements via VnExpress / Ministry of Science and Technology for the next edition.",
    cadence: "Annual: 2026 edition has passed; check organiser for the next date",
    price: "Check organiser",
    status: "verified_provider",
    sources: [
      newsSource("Khai mạc AI4VN 2026", "https://www.vietnamplus.vn/khai-mac-ai4vn-2026-ba-nha-chung-suc-xay-dung-he-sinh-thai-ai-tu-chu-post1146442.vnp", "VietnamPlus (Vietnam News Agency)", "AI4VN 2026 held at Vietnam National University, Hanoi"),
    ],
  },

  // ---------------------------------------------------------------- Startup / innovation
  {
    slug: "techfest-vietnam",
    name: "TECHFEST Vietnam (National Innovation & Startup Festival)",
    type: "startup_community",
    city: "nationwide",
    description:
      "Vietnam's largest annual startup and innovation festival, run since 2015 under the Ministry of Science and Technology: startup exhibitions, investor matchmaking, technology demonstrations and the national startup competition final. TECHFEST 2026 is hosted in Hanoi (reported 13–15 November 2026, before the trip window); regional TECHFEST events run in other provinces during the year.",
    organiser: "Ministry of Science and Technology of Viet Nam",
    url: "https://techfest.vn",
    howToEngage: "Check techfest.vn for the programme and registration for exhibitions, pitch sessions and side events.",
    cadence: "Annual national festival plus regional editions. Check organiser for current dates",
    price: "Check organiser",
    status: "verified_official",
    sources: [
      official("TECHFEST Quốc gia 2026", "https://techfest.vn", "Ministry of Science and Technology of Viet Nam", "Official festival site (TECHFEST 2026)", "government"),
      newsSource("Hanoi to host TECHFEST Vietnam 2026 in November", "https://en.vietnamplus.vn/hanoi-to-host-techfest-vietnam-2026-in-november-post352273.vnp", "VietnamPlus", "2026 host city and dates"),
    ],
  },
  {
    slug: "national-innovation-center",
    name: "National Innovation Center (NIC)",
    type: "incubator",
    city: "hanoi",
    description:
      "Government-established national innovation hub with its flagship campus at Hoa Lac Hi-Tech Park (west of Hanoi), inaugurated in 2023. Focus areas include semiconductors, AI and startup support; hosts international innovation exhibitions and partner programmes.",
    organiser: "Government of Viet Nam",
    url: "https://nic.gov.vn/en",
    howToEngage: "Check the NIC website for public events and partner programmes; visits to the Hoa Lac campus are generally arranged in advance.",
    cadence: DEFAULT_CADENCE,
    price: "Varies",
    status: "verified_official",
    sources: [official("National Innovation Center", "https://nic.gov.vn/en", "National Innovation Center (Viet Nam)", "Official site and mission", "government")],
  },
  {
    slug: "saigon-innovation-hub",
    name: "Saigon Innovation Hub (SIHUB)",
    type: "incubator",
    city: "ho-chi-minh-city",
    description:
      "Ho Chi Minh City's public innovation and startup support centre under the city's Department of Science and Technology. Runs founder meetups, investor meetups, the Startup Connection Day exhibition series and international startup exchange programmes.",
    organiser: "Ho Chi Minh City Department of Science and Technology",
    howToEngage: "Look for SIHUB founder and investor meetups on Luma and the city's science and technology channels; events are often bilingual.",
    cadence: DEFAULT_CADENCE,
    price: "Most community events free with registration",
    status: "verified_provider",
    sources: [
      newsSource("Austria, Vietnam strengthen startup collaboration", "https://en.vneconomy.vn/austria-vietnam-strengthen-startup-collaboration.htm", "VnEconomy", "SIHUB hosting startup collaboration programme (Mar 2026)"),
      newsSource("Smart Green Living Week 2026 showcases sustainable city solutions", "https://en.vneconomy.vn/smart-green-living-week-2026-showcases-sustainable-city-solutions.htm", "VnEconomy", "Startup Connection Day 2026 series (Jul 2026)"),
    ],
  },
  {
    slug: "dnes-da-nang",
    name: "DNES: Da Nang Business Incubator",
    type: "incubator",
    city: "da-nang",
    description:
      "Da Nang's startup incubator and \"innovation hub by the sea\": incubation programmes (FINC+), founder and mentor training, startup competitions and investor connections.",
    organiser: "DNES (Da Nang Business Incubator)",
    url: "https://dnes.vn",
    howToEngage: "Contact DNES through its website to ask about upcoming community events or a visit; its office is at 179 Tran Hung Dao, Da Nang.",
    cadence: DEFAULT_CADENCE,
    price: "Varies",
    status: "verified_provider",
    sources: [organiserPage("DNES Business Incubator", "https://dnes.vn", "DNES", "Programmes, address; no December 2026 events listed")],
  },
  {
    slug: "ai-riser-vietnam",
    name: "AI Riser Vietnam",
    type: "hackathon",
    city: "nationwide",
    description:
      "Google Developer Groups-led programme taking participants from idea to AI product, with kick-off sessions, vibe-coding days and build events across Vietnamese GDG chapters (2026 edition ran from August 2026).",
    organiser: "Google Developer Groups chapters in Vietnam (incl. GDG Cloud HCMC, GDG Cloud Da Nang)",
    howToEngage: "Follow GDG Cloud HCMC / GDG Cloud Da Nang on gdg.community.dev for the next edition.",
    cadence: "Annual programme: check GDG chapter pages for the next edition",
    price: "2026 sessions listed as free registration",
    status: "verified_provider",
    sources: [
      organiserPage("AI Riser Vietnam 2026: Vibe Coding Day", "https://gdg.community.dev/events/details/google-gdg-cloud-hcmc-presents-ai-riser-vietnam-2026-vibe-coding-day/", "Google Developer Groups: GDG Cloud HCMC", "Programme existence and 2026 sessions"),
    ],
  },
  {
    slug: "vietnam-web-summit",
    name: "Vietnam Web Summit",
    type: "conference",
    city: "nationwide",
    description:
      "Developer and tech-industry conference held in Vietnam's major cities. The official site still showed the 2024 edition when checked, so treat future editions as unconfirmed.",
    organiser: "Vietnam Web Summit organisers",
    url: "https://vietnamwebsummit.com",
    howToEngage: "Check the official site for announcements of a new edition.",
    cadence: "Irregular: no current edition confirmed; check organiser",
    price: "Check organiser",
    status: "needs_verification",
    sources: [provider("Vietnam Web Summit", "https://vietnamwebsummit.com", "Vietnam Web Summit", "Site title still references the 2024 edition (checked 2026-11-12)")],
  },

  // ---------------------------------------------------------------- Coworking
  {
    slug: "dreamplex-coworking",
    name: "Dreamplex",
    type: "coworking",
    city: "ho-chi-minh-city",
    description:
      "Premium hospitality-style coworking brand with several Ho Chi Minh City locations (including District 1 and Thao Dien / District 2) offering hot desks, private offices, meeting rooms and community events.",
    organiser: "Dreamplex",
    url: "https://dreamplex.co",
    howToEngage: "Book a day pass or meeting room through the website or at reception; useful as a base for remote work days and to meet local founders.",
    cadence: "Open on business days: check location hours",
    price: "Day passes and memberships: check current rates with Dreamplex",
    status: "verified_provider",
    sources: [organiserPage("Dreamplex", "https://dreamplex.co", "Dreamplex", "Brand and locations (2026 content on site)")],
  },
  {
    slug: "toong-coworking",
    name: "Toong",
    type: "coworking",
    city: "nationwide",
    description:
      "Vietnamese coworking chain founded in 2015 with design-led spaces, reported to operate locations in Hanoi, Ho Chi Minh City and Da Nang. Its website could not be reached when checked, so confirm current locations before visiting.",
    organiser: "Toong",
    howToEngage: "Confirm current locations and day-pass availability directly with Toong before going.",
    cadence: "Open on business days: check location hours",
    price: "Day passes reported: check current rates",
    status: "needs_verification",
    sources: [provider("Toong vs. Dreamplex comparison", "https://dreamplex.co/en/toong-or-dreamplex-coworking/", "Dreamplex (competitor blog)", "Toong still referenced as an operating brand in 2026")],
  },
  {
    slug: "enouvo-space-da-nang",
    name: "Enouvo Space",
    type: "coworking",
    city: "da-nang",
    description:
      "Da Nang coworking and co-living community opened in 2017 by Enouvo, popular with startups, remote workers and digital nomads; has hosted startup and tech community events.",
    organiser: "Enouvo Group",
    url: "https://enouvospace.com",
    howToEngage: "Contact the space to ask about day passes and community events during your Da Nang stay.",
    cadence: "Open daily: check current hours",
    price: "Hot-desk day passes: check current rates",
    status: "needs_verification",
    sources: [
      provider("Enouvo Space", "https://enouvospace.com", "Enouvo Group", "Website responds; content could not be read (JS-rendered), operating status not confirmed"),
      newsSource("The city's first co-working & co-living space opens", "https://baodanang.vn/english/business/201907/the-citys-first-co-working-amp-co-living-space-opens-3228400", "Da Nang Today", "Background on Enouvo Space"),
    ],
  },

  // ---------------------------------------------------------------- University
  {
    slug: "gdg-on-campus-hust",
    name: "GDG on Campus: Hanoi University of Science & Technology",
    type: "university",
    city: "hanoi",
    description:
      "Student-run Google developer community at Hanoi University of Science and Technology (HUST), one of Vietnam's leading engineering universities. Runs study jams, workshops and student hackathons; good for meeting student developers and university innovation networks.",
    organiser: "GDG on Campus HUST student organisers",
    url: "https://gdg.community.dev/gdg-on-campus-hanoi-university-of-science-technology-hanoi-vietnam",
    howToEngage: "Join on gdg.community.dev; note that university events are fewer around the December exam period.",
    cadence: DEFAULT_CADENCE,
    price: "Free",
    status: "verified_provider",
    sources: [organiserPage("GDG on Campus Hanoi University of Science & Technology", "https://gdg.community.dev/gdg-on-campus-hanoi-university-of-science-technology-hanoi-vietnam", "Google Developer Groups", "Chapter existence")],
  },
  {
    slug: "gdg-on-campus-uit-hcmc",
    name: "GDG on Campus: University of Information Technology (VNU-HCM)",
    type: "university",
    city: "ho-chi-minh-city",
    description:
      "Student Google developer community at the University of Information Technology, Vietnam National University Ho Chi Minh City. Other active HCMC campus chapters include FPT University, HCMC University of Technology and VNU-HCM International University.",
    organiser: "GDG on Campus UIT student organisers",
    url: "https://gdg.community.dev/gdg-on-campus-university-of-information-technology-ho-chi-minh-city-vietnam",
    howToEngage: "Join on gdg.community.dev; campus events are fewer around the December exam period.",
    cadence: DEFAULT_CADENCE,
    price: "Free",
    status: "verified_provider",
    sources: [organiserPage("GDG on Campus University of Information Technology - Ho Chi Minh City", "https://gdg.community.dev/gdg-on-campus-university-of-information-technology-ho-chi-minh-city-vietnam", "Google Developer Groups", "Chapter existence")],
  },
];

/**
 * Dated events in Hanoi / Ho Chi Minh City / Da Nang between 2026-12-12 and 2026-12-25,
 * each read on its organiser listing on 2026-11-12. Both venues were still "TBD" on the listing.
 */
export const professionalEvents: ProfessionalEventSeed[] = [
  {
    slug: "devfest-ho-chi-minh-2026",
    name: "DevFest Ho Chi Minh 2026: Unlock the Agentic Era",
    type: "gdg",
    city: "ho-chi-minh-city",
    startDate: "2026-12-13",
    venue: "Venue TBD: not yet announced on the organiser listing (Ho Chi Minh City)",
    price: "Not stated on the organiser listing, tickets via external registration",
    registrationUrl: "https://gdg.community.dev/events/details/google-gdg-ho-chi-minh-city-presents-devfest-ho-chi-minh-2026-unlock-the-agentic-era/",
    description:
      "Full-day developer conference (listed 07:00–17:00 GMT+7) by GDG Ho Chi Minh City, themed \"Build, secure, scale: developers and builders in the agentic era\", covering AI, web and mobile, and featuring the Sudo Code 2026 NLP mentorship programme. The organiser says more details will be announced.",
    organiser: "Google Developer Groups: GDG Ho Chi Minh City",
    sources: [
      organiserPage(
        "DevFest Ho Chi Minh 2026: Unlock the Agentic Era",
        "https://gdg.community.dev/events/details/google-gdg-ho-chi-minh-city-presents-devfest-ho-chi-minh-2026-unlock-the-agentic-era/",
        "Google Developer Groups: GDG Ho Chi Minh City",
        "Date 13 Dec 2026, time, theme; venue TBD; no price stated",
      ),
    ],
    lastVerified: CHECKED,
  },
  {
    slug: "devfest-cloud-da-nang-2026",
    name: "DevFest Cloud Da Nang 2026",
    type: "cloud_group",
    city: "da-nang",
    startDate: "2026-12-13",
    venue: "Venue TBD: not yet announced on the organiser listing (Da Nang)",
    price: "Free registration (as shown on the GDG chapter page)",
    registrationUrl: "https://gdg.community.dev/events/details/google-gdg-cloud-da-nang-presents-devfest-cloud-da-nang-2026/",
    description:
      "In-person afternoon event (listed 13:00–17:30 GMT+7) by GDG Cloud Da Nang with speaker sessions, a panel discussion, business showcases and hands-on workshops on Google AI, Cloud and Firebase.",
    organiser: "Google Developer Groups: GDG Cloud Da Nang",
    sources: [
      organiserPage(
        "DevFest Cloud Da Nang 2026",
        "https://gdg.community.dev/events/details/google-gdg-cloud-da-nang-presents-devfest-cloud-da-nang-2026/",
        "Google Developer Groups: GDG Cloud Da Nang",
        "Date 13 Dec 2026, time, format; venue TBD; free registration per chapter page",
      ),
    ],
    lastVerified: CHECKED,
  },
];
