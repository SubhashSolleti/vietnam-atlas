/**
 * Preparation and packing checklists (direction.md section 13 I & J).
 * Tailored to a December trip arriving Phu Quoc (PQC) and departing Hanoi (HAN),
 * but generic enough for any Vietnam itinerary.
 */
import type { ChecklistItemSeed } from "./guide-types";

export const preparationChecklist: ChecklistItemSeed[] = [
  // Documents
  {
    group: "documents",
    label: "Check passport validity (6+ months beyond arrival)",
    detail: "Vietnam requires the passport to be valid at least 6 months after your arrival date. Renewing an Indian passport can take weeks. Check now.",
    dueDaysBefore: 60,
  },
  {
    group: "documents",
    label: "Apply for the Vietnam e-visa on evisa.gov.vn",
    detail: "Official portal only (mirror: thithucdientu.gov.vn). USD 25 single / USD 50 multiple entry, non-refundable. Choose dates covering the whole trip plus margin. The Phu Quoc visa exemption does not cover onward mainland travel.",
    dueDaysBefore: 30,
  },
  {
    group: "documents",
    label: "Prepare e-visa photo and passport data-page scan",
    detail: "4x6 portrait, white background, no glasses; full data page including the two machine-readable lines.",
    dueDaysBefore: 32,
  },
  {
    group: "documents",
    label: "Save every e-visa registration code in the group sheet",
    detail: "You need the code to look up status and download the approved e-visa.",
    dueDaysBefore: 30,
  },
  {
    group: "documents",
    label: "Check approved e-visa details and print two copies",
    detail: "Compare name, date of birth, passport number and validity dates against the passport. Errors usually require a new paid application.",
    dueDaysBefore: 14,
  },
  {
    group: "documents",
    label: "Complete the pre-arrival declaration (QR code)",
    detail: "Free at prearrival.immigration.gov.vn, up to 3 days before arrival. Screenshot the QR code for each traveller.",
    dueDaysBefore: 2,
  },
  {
    group: "documents",
    label: "Make paper and offline copies of all documents",
    detail: "Passport data page, e-visa, insurance policy, flight and hotel bookings, in a shared offline folder and one paper set kept separately from the passport.",
    dueDaysBefore: 7,
  },
  {
    group: "documents",
    label: "Save Indian Embassy Hanoi and Consulate HCMC emergency numbers",
    detail: "Embassy Hanoi +84-913089165; Consulate General HCMC +84-917180776 (covers Phu Quoc). Also 113 police, 114 fire, 115 ambulance.",
    dueDaysBefore: 7,
  },

  // Health
  {
    group: "health",
    label: "Buy travel insurance with medical evacuation and adventure cover",
    detail: "Check cover for trekking, kayaking, diving and boat trips. Note most policies exclude riding a motorbike without a licence valid in Vietnam.",
    dueDaysBefore: 45,
  },
  {
    group: "health",
    label: "See a doctor or travel clinic about vaccinations and medicines",
    detail: "Ask about routine and recommended vaccines for Vietnam, mosquito protection (dengue) and any personal prescriptions. Go 4–6 weeks before departure.",
    dueDaysBefore: 42,
  },
  {
    group: "health",
    label: "Refill prescription medicines and get a prescription copy",
    detail: "Carry enough for the trip plus a few days, in original packaging.",
    dueDaysBefore: 10,
  },

  // Money
  {
    group: "money",
    label: "Notify your bank and enable international card usage",
    detail: "Turn on international transactions in your banking app; confirm OTPs will reach you abroad.",
    dueDaysBefore: 10,
  },
  {
    group: "money",
    label: "Get a forex card or a low-markup Visa/Mastercard",
    detail: "RuPay acceptance in Vietnam is limited. Compare foreign-currency markup and ATM fees.",
    dueDaysBefore: 21,
  },
  {
    group: "money",
    label: "Plan VND cash for the first days",
    detail: "Bring some clean USD notes to exchange, or plan an ATM withdrawal at PQC. Check the app's currency widget for the current reference rate. Keep small notes for street food and tips.",
    dueDaysBefore: 7,
  },
  {
    group: "money",
    label: "Set up a group expense-splitting app and choose a treasurer",
    detail: "One person holds a shared VND float for group meals, boat tips and entry fees.",
    dueDaysBefore: 14,
  },

  // Connectivity
  {
    group: "connectivity",
    label: "Buy an eSIM or plan a SIM purchase at arrival",
    detail: "Check your phone is unlocked and eSIM-capable. Local SIMs are registered with passport and face check at official kiosks.",
    dueDaysBefore: 10,
  },
  {
    group: "connectivity",
    label: "Install Grab, Be or Xanh SM, and Zalo",
    detail: "Register and add a payment card before departure; Zalo is widely used by hotels, drivers and guides.",
    dueDaysBefore: 7,
  },
  {
    group: "connectivity",
    label: "Download offline maps and a translation app with Vietnamese",
    detail: "Offline maps for Phu Quoc, Ho Chi Minh City, Da Nang/Hoi An, Hanoi, Sa Pa/Ha Giang; camera translation helps with menus.",
    dueDaysBefore: 5,
  },

  // Bookings
  {
    group: "bookings",
    label: "Book international flights (HYD → PQC, HAN → home)",
    dueDaysBefore: 60,
  },
  {
    group: "bookings",
    label: "Book domestic flights for all 7 on one booking",
    detail: "December and Christmas week fill up. Add checked baggage in advance on low-cost fares.",
    dueDaysBefore: 45,
  },
  {
    group: "bookings",
    label: "Book accommodation for 7 (family rooms, connecting rooms or villa)",
    detail: "Peak-season prices rise sharply around Christmas in Phu Quoc, Da Nang/Hoi An and Sa Pa. Note cancellation deadlines.",
    dueDaysBefore: 45,
  },
  {
    group: "bookings",
    label: "Book trains, cruises and key tours",
    detail: "E.g. Hanoi–Lao Cai sleeper on dsvn.vn, Ha Long/Lan Ha cruise, island-hopping in Phu Quoc. Check operator safety and inclusions.",
    dueDaysBefore: 30,
  },
  {
    group: "bookings",
    label: "Arrange airport transfers and group vans",
    detail: "A 16-seat van fits 7 people plus luggage. Confirm price, tolls, waiting time and pick-up point in writing.",
    dueDaysBefore: 14,
  },
  {
    group: "bookings",
    label: "Reconfirm all bookings and share the final itinerary",
    detail: "Share hotel addresses (in Vietnamese), booking references and contact numbers in the group workspace.",
    dueDaysBefore: 5,
  },
  {
    group: "bookings",
    label: "Online check-in for the HYD → PQC flight",
    detail: "Have the printed e-visa ready: airline staff will check it before boarding.",
    dueDaysBefore: 1,
  },
];

export const packingChecklist: ChecklistItemSeed[] = [
  // Clothing
  { group: "packing_clothing", label: "Light breathable T-shirts / tops", detail: "For Phu Quoc and the south (around 30°C by day in December)." },
  { group: "packing_clothing", label: "Shorts and light trousers" },
  { group: "packing_clothing", label: "Long trousers (2 pairs)", detail: "Evenings, mosquitoes, treks and the cooler north." },
  { group: "packing_clothing", label: "Temple-appropriate outfit", detail: "Covers shoulders and knees: needed for pagodas and the Ho Chi Minh Mausoleum." },
  { group: "packing_clothing", label: "Light long-sleeve shirt", detail: "Sun and mosquito protection." },
  { group: "packing_clothing", label: "Smart-casual outfit", detail: "For rooftop bars or networking events." },
  { group: "packing_clothing", label: "Sun hat or cap and sunglasses" },
  { group: "packing_clothing", label: "Underwear and socks for 7+ days", detail: "Laundry services are cheap and widely available." },

  // Rain
  { group: "packing_rain", label: "Lightweight rain jacket or poncho", detail: "Central Vietnam can be wet in December." },
  { group: "packing_rain", label: "Compact umbrella" },
  { group: "packing_rain", label: "Dry bag for boat trips" },
  { group: "packing_rain", label: "Waterproof phone pouch" },

  // Cold (Sa Pa / Ha Giang / Hanoi)
  { group: "packing_cold", label: "Thermal base layer (top and bottom)", detail: "Sa Pa and Ha Giang nights can approach freezing in December." },
  { group: "packing_cold", label: "Fleece or warm mid-layer" },
  { group: "packing_cold", label: "Insulated / down jacket", detail: "Packable is best; warm jackets can also be bought in Hanoi." },
  { group: "packing_cold", label: "Beanie, gloves and scarf" },
  { group: "packing_cold", label: "Warm socks" },

  // Footwear
  { group: "packing_footwear", label: "Comfortable walking shoes" },
  { group: "packing_footwear", label: "Trekking shoes with good grip", detail: "Sa Pa trails, Ninh Binh viewpoints and caves can be muddy and slippery." },
  { group: "packing_footwear", label: "Sandals or flip-flops", detail: "Beaches, showers and easy removal at temples." },

  // Swim
  { group: "packing_swim", label: "Swimwear (2 sets)" },
  { group: "packing_swim", label: "Rash guard", detail: "Sun protection while snorkelling and kayaking." },
  { group: "packing_swim", label: "Quick-dry towel" },
  { group: "packing_swim", label: "Water shoes", detail: "Rocky beaches, kayaking and some cave trips." },
  { group: "packing_swim", label: "Reef-safe sunscreen (SPF 50)" },

  // Electronics
  { group: "packing_electronics", label: "Universal travel adapter", detail: "Vietnam sockets mostly take Type A and Type C/F (2-pin) plugs; Indian 3-pin plugs need an adapter." },
  { group: "packing_electronics", label: "Phone and device chargers", detail: "Vietnam uses 220V/50Hz: Indian chargers work without a converter." },
  { group: "packing_electronics", label: "Power bank (carry-on only)", detail: "Check the airline's watt-hour limit." },
  { group: "packing_electronics", label: "Charging cables + small multi-port USB charger" },
  { group: "packing_electronics", label: "Earphones and eye mask", detail: "For flights, sleeper trains and buses." },
  { group: "packing_electronics", label: "Head torch", detail: "Useful for caves, homestays and power cuts." },

  // Medicine and personal essentials
  { group: "packing_medicine", label: "Prescription medicines + prescription copy", detail: "Original packaging; enough for the trip plus spare days." },
  { group: "packing_medicine", label: "Oral rehydration salts and stomach medicines", detail: "Ask your doctor which to carry." },
  { group: "packing_medicine", label: "Motion-sickness tablets", detail: "Boats in Ha Long / Phu Quoc and winding mountain roads." },
  { group: "packing_medicine", label: "Insect repellent (DEET or picaridin)" },
  { group: "packing_medicine", label: "Basic first-aid kit", detail: "Plasters, antiseptic, blister plasters, painkillers, antihistamine." },
  { group: "packing_medicine", label: "Hand sanitiser and wet wipes" },
  { group: "packing_medicine", label: "Lip balm and moisturiser", detail: "Cold, dry air in the northern mountains." },
  { group: "packing_medicine", label: "Refillable water bottle (ideally with filter)", detail: "Do not drink tap water." },
];
