# PROJECT: VIETNAM ATLAS
## Premium Vietnam Travel Discovery, Experience Marketplace & Collaborative Group Trip Planner

Act as a world-class product architect, senior full-stack engineer, UI/UX designer, travel research specialist, data architect, and quality assurance engineer.

Your task is to design and implement a production-quality, premium Vietnam tourism and collaborative trip-planning website.

This must NOT be a basic travel blog, static landing page, generic dashboard, or simple itinerary application.

Build a complete, visually exceptional, information-rich travel discovery platform that could credibly serve as a digital tourism platform for the Vietnam National Authority of Tourism.

The platform should combine the best user experiences from:

- Airbnb — destination discovery, photography and editorial storytelling.
- Booking.com — filters, comparisons and accommodation discovery.
- Tripadvisor — experiences, ratings and reviews.
- Amazon — wishlist, cart-like selection and saved collections.
- Notion — collaborative workspace and shared planning.
- Google Maps — geographical discovery.
- Modern travel marketplaces — experience catalogues and booking-oriented information.

The primary experience is that travellers can discover everything Vietnam offers, understand destinations in detail, explore activities with images, see prices and logistics, add experiences to their wishlist, compare options, vote as a group, and eventually build a shared itinerary.

The website must be fully interactive, responsive, extensible, data-driven and genuinely functional.

---

# 1. PROJECT CONTEXT

## 1.1 Actual travel requirements

Use this real travel scenario as the initial demonstration workspace and default project data.

Trip name: Vietnam Cousins Trip 2026

Travel dates:
- Departure from Hyderabad: 11 December 2026, 10:20 PM.
- Arrival at Phu Quoc International Airport: 12 December 2026, 3:30 PM.
- Return departure from Hanoi: 25 December 2026, 12:20 PM.
- Arrival in Hyderabad: 25 December 2026, 10:55 PM.

International flights are already booked.

Duration: 12–25 December 2026.

Group size: 7 people.

Group composition:
- 3 women.
- 4 men.
- 2 couples.
- 3 individual travellers.
- All travellers are approximately around 30 years old.
- All seven hold Indian passports.

Budget:
- ₹55,000–₹70,000 per person.
- Exclude the already-booked international flights.
- Include Vietnam accommodation, food, local transport, intercity travel, internal flights, activities, insurance and miscellaneous expenses.

Group interests:
- Adventure and thrill activities.
- Beaches and island experiences.
- Nightlife and socialising.
- Nature and photography.
- Local food and street food.
- Shopping and markets.
- Unique experiences and hidden gems.
- Free activities and affordable alternatives.

Travel style:
- Balanced pace.
- Best value accommodation.
- Safety is essential.
- Overnight buses and trains may be used strategically to save accommodation costs.
- The group may book an entire Airbnb/property for all seven.
- The group is open to shared and private transport according to total cost and safety.

Professional opportunities:
- All seven travellers work in software/IT.
- One traveller is particularly interested in software engineering, AI, cloud, startups and international professional networking.
- The platform must support optional professional networking and technology-related activities without forcing the entire group to participate.

IMPORTANT:
These are initial planning assumptions. Make them editable. Never hardcode them into application logic.

## 1.2 Initial destinations

Create complete destination records for:

### Southern Vietnam
1. Phu Quoc.
2. Ho Chi Minh City.
3. Mekong Delta.
   - Can Tho.
   - Ben Tre.
   - Chau Doc.
   - Cai Be.
   - Tra Su Forest.

### Central Vietnam
4. Da Lat.
5. Da Nang.
6. Hoi An.
7. Hue.
8. Phong Nha / Phong Nha-Ke Bang National Park.

### Northern Vietnam
9. Hanoi.
10. Sa Pa.
11. Ninh Binh.
12. Ha Long Bay.
13. Lan Ha Bay.
14. Cat Ba Island.

### Additional destinations worth exploring
15. Ha Giang.
16. Mui Ne.
17. Nha Trang.
18. Cao Bang.
19. Mai Chau.
20. Pu Luong.
21. Con Dao.

These must not just be names on a page. Each must have a proper destination detail page with images, geographical information, descriptions, experiences, attractions, activity catalogues, travel logistics, seasonal suitability and relevant sources.

Clearly distinguish between cities, provinces, islands, regions, bays, national parks and individual attractions.

---

# 2. PRODUCT VISION

Product name: VIETNAM ATLAS

Tagline: Discover More. Experience Vietnam. Plan Together.

Primary objective:

Create the definitive Vietnam discovery and trip-planning companion where a traveller can go from knowing nothing about Vietnam to understanding the country's destinations, attractions, experiences, estimated costs, transport, safety and travel requirements.

The complete user journey:

1. Discover Vietnam.
2. Explore geographical regions.
3. Browse cities and destinations.
4. Understand individual places in depth.
5. Browse all available activities.
6. See photographs and reference imagery.
7. Understand pricing and duration.
8. Identify free and paid alternatives.
9. Save activities to a wishlist.
10. Compare shortlisted experiences.
11. Create or join a travel group.
12. Invite other travellers.
13. Collect everyone's preferences.
14. Vote and discuss activities.
15. Finalise the selection.
16. Build a day-by-day itinerary.
17. Calculate the estimated budget.
18. Research transport and accommodation.
19. Access travel information, rules and safety guidance.
20. Prepare the final trip plan.

Do not force users through this sequence. All features must remain independently accessible.

---

# 3. DESIGN SYSTEM AND VISUAL DIRECTION

This is a premium tourism product.

Design quality is a primary product requirement, not an afterthought.

## 3.1 Visual identity

Design language:

- Premium editorial travel magazine.
- Modern travel marketplace.
- Minimalist, immersive and image-driven.
- Contemporary typography.
- Warm, natural colour palette.
- Beautiful photography.
- Spacious layouts.
- Consistent component system.
- Subtle animations.
- Excellent mobile experience.

Avoid:
- Generic SaaS dashboard aesthetics.
- Excessive gradients.
- Excessive rounded cards.
- Repetitive identical card grids.
- Excessive shadows.
- Huge empty hero sections.
- Emoji-driven interfaces.
- Cluttered layouts.
- Generic AI-generated-looking illustrations.
- Inconsistent typography.
- Unnecessary animations.

## 3.2 Suggested colour palette

Build a complete design token system using:

| Token | Colour | Purpose |
|---|---|---|
| Deep Forest | #173F35 | Primary brand |
| Jade Green | #377A61 | Supporting brand |
| Warm Ivory | #F7F5EF | Primary background |
| Soft Sand | #EAE2D3 | Secondary background |
| Terracotta | #C96F50 | Accent |
| Golden Ochre | #D6AB59 | Highlights |
| Charcoal | #242B28 | Primary text |
| Muted Grey | #777D78 | Secondary text |
| White | #FFFFFF | Cards and surfaces |

Use colours consistently through CSS variables and design tokens.

Support both light and dark themes if feasible without compromising the primary visual language.

## 3.3 Typography

Use an editorial typography pairing:

- Headings: elegant serif such as Playfair Display or a comparable contemporary editorial serif.
- Body/UI: Inter, Manrope or a comparable highly readable sans-serif.
- Numeric prices: tabular numerals.
- Strong information hierarchy.
- Comfortable line heights.

Use locally available or legally served fonts. Avoid unnecessary external font dependencies.

## 3.4 Layout system

Build:
- Responsive 12-column desktop grid.
- Fluid content containers.
- Consistent spacing system.
- Responsive breakpoints.
- Mobile-first navigation behaviour.
- Responsive photography galleries.
- Beautiful destination cards.
- Sticky desktop filters where useful.
- Mobile bottom navigation for key discovery functions where appropriate.

The website must look excellent at:
- 1440px desktop.
- 1280px laptop.
- 1024px tablet.
- 768px tablet.
- 390px mobile.
- 360px mobile.

---

# 4. WEBSITE INFORMATION ARCHITECTURE

Create these primary navigation items:

1. Explore Vietnam
2. Destinations
3. Experiences
4. Travel Guide
5. Maps
6. My Wishlist
7. My Trip
8. Group Planner

Account/profile controls should be accessible without dominating the navigation.

The desktop navigation should be premium and compact.

Mobile navigation should be optimised for touch.

Create a global search experience that searches:
- Destination names.
- Cities.
- Attractions.
- Activities.
- Regions.
- Food experiences.
- Transport.
- Travel information.

Search should support autocomplete, categories, filters and useful suggestions.

---

# 5. HOMEPAGE

The homepage should create an immediate sense of travelling through Vietnam.

## Section 1: Immersive hero

Use a large, high-quality editorial photograph of Vietnam.

Include:
- Headline: Discover the Extraordinary Vietnam.
- Supporting description about exploring destinations, adventures and local experiences.
- Primary CTA: Explore Vietnam.
- Secondary CTA: Plan Your Trip.
- Search bar.
- Beautiful hero photography.
- Subtle scroll interaction.

The hero must not feel like a generic template.

## Section 2: Explore by region

Beautiful geographical cards for:

- Southern Vietnam.
- Central Vietnam.
- Northern Vietnam.

Each includes:
- Regional photograph.
- Description.
- Destinations count.
- Highlights.
- Explore button.

## Section 3: Popular destinations

Feature:
- Phu Quoc.
- Hanoi.
- Ha Long Bay.
- Sa Pa.
- Ninh Binh.
- Da Lat.
- Da Nang.
- Hoi An.
- Ho Chi Minh City.

Use editorial photography, short descriptions and useful metadata.

## Section 4: Find your type of adventure

Categories:
- Water adventures.
- Mountain adventures.
- Nature and wildlife.
- Cultural experiences.
- Food experiences.
- Nightlife.
- Island experiences.
- Scenic photography.
- Extreme adventures.
- Free experiences.

## Section 5: Experiences worth travelling for

Create a visually rich featured experiences section.

Examples:
- Snorkelling in Phu Quoc.
- Canyoning in Da Lat.
- Exploring caves in Phong Nha.
- Trekking in Sa Pa.
- Kayaking in Lan Ha Bay.
- Cruising through Trang An.
- Exploring Ha Giang.
- Basket boating in Hoi An.

## Section 6: Discover Vietnam on a budget

Highlight free and affordable experiences.

## Section 7: Seasonal travel insights

Provide month-based recommendations and seasonal suitability.

## Section 8: Travel smarter

Feature:
- Visa.
- Transportation.
- SIM cards.
- Currency.
- Safety.
- Accommodation.
- Food.
- Local etiquette.

## Section 9: Collaborative trip planning

Explain how a group can create a trip, invite members and shortlist activities together.

## Section 10: Footer

Include:
- About Vietnam Atlas.
- Destination directory.
- Experiences.
- Travel guide.
- Safety.
- Contact.
- Data sources.
- Legal information.
- Privacy.
- Terms.

---

# 6. DESTINATION DISCOVERY SYSTEM

Build a comprehensive destination directory.

Create:
- Destination listing page.
- Region filters.
- Destination search.
- Activity count.
- Season filters.
- Budget filters.
- Adventure level filters.
- Popularity sorting.
- Alphabetical sorting.
- Map/list toggle.

Each destination should be discoverable through multiple routes:
- Region.
- Search.
- Activity category.
- Map.
- Featured destination.
- Related destinations.

## 6.1 Destination detail page

Every destination must use a consistent but flexible content structure.

Required sections:

### A. Destination hero

- High-quality photography.
- Destination title.
- Region.
- Short descriptive introduction.
- Favourite button.
- Share button.
- Add to trip button.
- Explore activities CTA.

### B. Overview

Explain:
- What is special about this place?
- Why visit?
- What makes it unique?
- Who will enjoy it?
- How many days are recommended?
- Best travel style.
- Approximate spending level.
- Location on Vietnam map.
- Nearest airport / railway / major transport hub.

### C. Top attractions

Create individual attraction records.

For each:
- Name.
- Image gallery.
- Detailed description.
- What to see.
- What to do.
- Opening hours.
- Entrance fees.
- Approximate visit duration.
- Accessibility.
- Distance from central area.
- Seasonality.
- Official website where available.
- Booking information.
- Source links.

Do not invent opening hours or ticket prices.

### D. Activities and experiences

List every meaningful activity available in the destination.

Group by:
- Free.
- Low-cost.
- Paid.
- Adventure.
- Nature.
- Culture.
- Nightlife.
- Food.
- Shopping.
- Hidden gems.

Provide filters and a wishlist interaction.

### E. Food and local experiences

Include:
- Famous local dishes.
- Street-food experiences.
- Markets.
- Local cafés.
- Special food experiences.
- Dietary notes.
- Vegetarian-friendly options.
- Food tour options.

Distinguish between a dish recommendation and an actual bookable food tour.

### F. Nightlife and social experiences

Include:
- Night markets.
- Walking streets.
- Rooftop bars.
- Live music.
- Clubs.
- Pub crawls.
- Social hostels.
- Evening shows.

Show age restrictions and safety notes when applicable.

### G. Free experiences

A separate prominent section listing:
- Public beaches.
- Public viewpoints.
- Walking routes.
- Parks.
- Lakes.
- Public markets.
- Cultural streets.
- Scenic locations.
- Public cultural spaces.
- Free events where verified.

Clearly separate genuinely free activities from paid attractions.

### H. Practical travel guide

Include:
- How to reach.
- Getting around.
- Local transport.
- Average local travel time.
- Accommodation areas.
- Safety considerations.
- Weather.
- Packing suggestions.
- Local regulations.
- Connectivity.
- Payment methods.
- Accessibility considerations.

### I. Nearby destinations

Suggest relevant nearby places, explain their distance and travel methods, and allow navigation to their pages.

### J. Useful sources

Every destination page must have a source section with:
- Official tourism sources.
- Official attraction pages.
- Transport operators.
- Relevant government sources.
- Verified activity providers.

Show last verification date.

---

# 7. COMPLETE ACTIVITY AND EXPERIENCE CATALOGUE

This is one of the most important parts of the website.

DO NOT populate the platform with only 3–5 generic activities per city.

Seed a meaningful activity catalogue based on the following inventory.

The system must be designed to add further activities without code changes.

## 7.1 PHU QUOC

Include:

### Free / low-cost
- Sao Beach.
- Long Beach.
- Ong Lang Beach.
- Khem Beach.
- Ganh Dau.
- Dinh Cau Temple.
- Duong Dong Night Market.
- Sunset Town exploration.
- Grand World street exploration.
- Rach Vem Fishing Village.
- Pepper farms.
- Fish sauce factories.
- National Park exploration where accessible.
- Local fishing villages.
- Sunset photography.

### Paid
- Four-island speedboat tours.
- Three-island snorkelling tours.
- Beginner scuba diving.
- Certified scuba diving.
- Sea walking.
- Parasailing.
- Jet skiing.
- Flyboarding where available.
- Kayaking.
- Stand-up paddleboarding.
- Banana boat rides.
- Fishing tours.
- Night squid fishing.
- Sunset cruises.
- Private speedboat charters.
- Yacht experiences.
- Hon Thom cable car.
- Aquatopia Water Park.
- VinWonders.
- Vinpearl Safari.
- Kiss Bridge.
- Kiss of the Sea show.
- Grand World attractions and shows.

## 7.2 HO CHI MINH CITY

### Free / low-cost
- Nguyen Hue Walking Street.
- Central Post Office exterior.
- Notre-Dame Cathedral exterior.
- Opera House exterior.
- Book Street.
- Ben Thanh Market exploration.
- Binh Tay Market.
- Chinatown.
- Thien Hau Pagoda.
- Jade Emperor Pagoda.
- Tao Dan Park.
- Bach Dang Wharf.
- Bui Vien Walking Street.
- Tan Dinh Church exterior.
- Local street-food exploration.

### Paid
- Cu Chi Tunnels.
- War Remnants Museum.
- Independence Palace.
- Bitexco Skydeck.
- Landmark 81 observation experiences.
- AO Show.
- Water puppet theatre.
- Cooking classes.
- Vietnamese coffee workshops.
- Motorbike city tours as a passenger.
- Motorbike street-food tours.
- Saigon River cruises.
- Saigon Waterbus.
- Dinner cruises.
- Guided historical walking tours.
- Rooftop experiences.
- Pub crawls.
- Nightclubs.
- Live music venues.

## 7.3 MEKONG DELTA

Support individual sub-destinations:

- Can Tho.
- Ben Tre.
- Chau Doc.
- Cai Be.
- Tra Su.

Activities:
- Cai Rang Floating Market.
- Sampan boat rides.
- Coconut canal boat rides.
- Private Mekong river tours.
- Fruit orchards.
- Coconut candy workshops.
- Rice paper-making.
- Traditional noodle-making.
- Bee farm visits.
- Cycling excursions.
- Rural homestays.
- Local cooking classes.
- Tra Su Cajuput Forest.
- Tram Chim National Park.
- Chau Doc floating fish farms.
- Sam Mountain.

## 7.4 DA LAT

### Free / low-cost
- Xuan Huong Lake.
- Da Lat Square.
- Night Market.
- Pine forests.
- Tuyen Lam Lake viewpoints.
- City exploration.
- Sunrise viewpoints.
- Local cafés.
- Flower farm exploration where public access permits.

### Paid
- Datanla canyoning.
- Waterfall rappelling.
- Natural water slides.
- Guided cliff jumping.
- Alpine coaster.
- High rope course.
- Ziplining.
- Mountain biking.
- Mountain trekking.
- Guided forest camping.
- Paragliding where available.
- Langbiang excursion.
- Bidoup Nui Ba National Park.
- Pongour Waterfall.
- Elephant Waterfall.
- Prenn Waterfall.
- Kayaking.
- Coffee plantations.
- Strawberry farms.
- Cau Dat tea plantations.
- Crazy House.
- Clay Tunnel.
- Flower Garden.
- Linh Phuoc Pagoda.
- Da Lat–Trai Mat train ride.
- Golf.

Include the 2026 Da Lat Flower Festival only with verified event details and dates.

## 7.5 DA NANG

### Free / low-cost
- My Khe Beach.
- Non Nuoc Beach.
- Son Tra Peninsula.
- Linh Ung Pagoda public areas.
- Lady Buddha.
- Dragon Bridge public viewing.
- Han River promenades.
- Han Market.
- Con Market.
- City exploration.
- Sunrise beach experiences.

### Paid
- Ba Na Hills.
- Golden Bridge.
- Cable car.
- Fantasy Park.
- Marble Mountains.
- Cave exploration.
- Cham Sculpture Museum.
- Han River cruises.
- Dragon Bridge cruises.
- Parasailing.
- Jet skiing.
- Surfing lessons.
- SUP.
- Guided Son Tra tours.
- Hai Van Pass excursions.
- Island snorkelling.
- Photography tours.

## 7.6 HOI AN

### Free / low-cost
- Ancient Town street exploration.
- Lantern-lit streets.
- An Bang Beach.
- Cua Dai Beach.
- Countryside cycling.
- Local markets.
- Photography.
- Riverside walks.
- Explore traditional neighbourhoods.

### Paid
- Ancient Town heritage ticket.
- Japanese Covered Bridge site access where applicable.
- Traditional assembly halls.
- Old houses.
- Basket boat rides in Cam Thanh.
- Lantern boat rides.
- Lantern-making workshops.
- Cooking classes.
- Fishing experiences.
- Tra Que Vegetable Village.
- My Son Sanctuary.
- Cham Island snorkelling.
- Diving.
- Tailor-made clothing.
- Hoi An Memories cultural show.
- Photography tours.

## 7.7 HUE

### Free / low-cost
- Perfume River walks.
- Truong Tien Bridge.
- Dong Ba Market.
- Thien Mu Pagoda.
- Thanh Toan Bridge.
- Thuy Bieu village exploration.
- Vong Canh Hill.
- Local food exploration.
- Local neighbourhoods.

### Paid
- Imperial Citadel.
- Forbidden Purple City.
- Minh Mang Tomb.
- Khai Dinh Tomb.
- Tu Duc Tomb.
- Perfume River boat rides.
- Royal music shows.
- Cooking classes.
- Cycling excursions.
- Bach Ma trekking.
- Waterfall trips.
- Tam Giang Lagoon trips.
- DMZ tours.
- Vinh Moc Tunnels.
- Hai Van Pass trips.

## 7.8 PHONG NHA

### Free / low-cost
- Countryside cycling.
- Village walks.
- Riverside exploration.
- Limestone mountain photography.
- Local nature walks.
- Scenic drives.

### Paid
- Phong Nha Cave.
- Paradise Cave.
- Dark Cave.
- Tu Lan Cave expeditions.
- Hang En Cave expedition.
- Hang Va expedition.
- Hang Pygmy expedition.
- Son Doong expedition.
- Underground river swimming.
- Cave trekking.
- Cave crawling.
- Ziplining.
- Mud baths.
- Kayaking.
- Jungle trekking.
- Botanical Garden.
- Overnight cave camping.

IMPORTANT:
December falls within the potential rainy/flooding season. All cave activities must have seasonal operating status. Never show an activity as available simply because it exists.

## 7.9 SA PA

### Free / low-cost
- Sa Pa Lake.
- Town exploration.
- Stone Church exterior.
- Local markets.
- Mountain viewpoints.
- O Quy Ho Pass viewpoints.
- Photography.
- Local food experiences.
- Public village walks where permitted.

### Paid
- Fansipan cable car.
- Mountain funicular.
- Summit excursion.
- Guided trekking.
- Overnight village trekking.
- Homestays.
- Mountain biking.
- Cat Cat Village.
- Ta Phin Village.
- Lao Chai Village.
- Ta Van Village.
- Silver Waterfall.
- Love Waterfall.
- Ham Rong Mountain.
- Moana photo park.
- Bac Ha Market tours.
- Cultural experiences.
- Guided off-road passenger tours.

Include winter weather information and suitable clothing advice.

## 7.10 NINH BINH

### Free / low-cost
- Countryside cycling.
- Village exploration.
- Scenic roads.
- Photography.
- Public countryside walks.
- Local cafés.
- Pagoda visits where free.

### Paid
- Trang An boat ride.
- Tam Coc boat ride.
- Hang Mua viewpoint.
- Climb to the viewpoint.
- Van Long Nature Reserve.
- Hoa Lu Ancient Capital.
- Bai Dinh Pagoda attractions.
- Thung Nham Bird Park.
- Cuc Phuong National Park.
- Primate Rescue Centre.
- Guided wildlife tours.
- Cycling excursions.
- Photography tours.

## 7.11 HA LONG / LAN HA / CAT BA

### Free / low-cost
- Cat Ba town exploration.
- Waterfront.
- Public beaches.
- Island viewpoints.
- Fishing village exploration.
- Scenic photography.
- Bai Chay waterfront.
- Public promenades.

### Paid
- Ha Long day cruises.
- Overnight cruises.
- Lan Ha Bay excursions.
- Kayaking.
- SUP.
- Bamboo boat rides.
- Rock climbing.
- Deep-water solo climbing.
- Scuba diving where available.
- Private boat charters.
- Overnight cruises with meals.
- Sung Sot Cave.
- Thien Cung Cave.
- Dau Go Cave.
- Titop Island.
- Cat Ba National Park.
- Trung Trang Cave.
- Hospital Cave.
- Ngu Lam Peak.
- Monkey Island.
- Viet Hai village.
- Viet Hai cycling.
- Floating village tours.

Distinguish Ha Long Bay, Lan Ha Bay and Cat Ba Island as separate entities and related travel experiences.

## 7.12 HANOI

### Free / low-cost
- Hoan Kiem Lake.
- Old Quarter.
- Train Street public areas, subject to access regulations.
- Long Bien Bridge.
- West Lake.
- Tran Quoc Pagoda.
- Dong Xuan Market.
- Ta Hien Street.
- St Joseph's Cathedral exterior.
- Ho Chi Minh Mausoleum grounds.
- Walking streets.
- Street-food exploration.
- Local coffee shops.

### Paid
- Temple of Literature.
- Hoa Lo Prison.
- Ho Chi Minh Mausoleum interior, subject to schedule.
- Vietnam Museum of Ethnology.
- Vietnamese Women's Museum.
- Thang Long Imperial Citadel.
- Military History Museum.
- Ngoc Son Temple.
- Water Puppet Theatre.
- Cooking classes.
- Food tours.
- Cyclo rides.
- Coffee workshops.
- Bat Trang pottery.
- Craft workshops.
- Countryside day tours.

## 7.13 HA GIANG

- Ha Giang Loop.
- Ma Pi Leng Pass.
- Nho Que River boat ride.
- Tu San Canyon.
- Dong Van Karst Plateau.
- Lung Cu Flag Tower.
- Quan Ba Heaven Gate.
- Twin Mountains.
- Hmong villages.
- Lung Tam weaving village.
- Local mountain markets.
- Trekking.
- Homestays.
- Guided motorcycle tours with drivers.
- Photography excursions.

## 7.14 MUI NE

- Red Sand Dunes.
- White Sand Dunes.
- Fairy Stream.
- Fishing Village.
- Beach walks.
- Jeep sunrise tours.
- Jeep sunset tours.
- ATV rides.
- Sandboarding.
- Kitesurfing.
- Windsurfing.
- Surfing.
- Quad biking.
- Fishing tours.
- Po Shanu Cham Towers.

## 7.15 NHA TRANG

- Nha Trang Beach.
- Tran Phu promenade.
- Long Son Pagoda.
- Po Nagar.
- Night markets.
- Island hopping.
- Scuba diving.
- Snorkelling.
- Parasailing.
- Jet skiing.
- Banana boats.
- Flyboarding.
- VinWonders.
- Cable car.
- Mud baths.
- Hot mineral springs.
- Boat cruises.
- Fishing.

## 7.16 CAO BANG

- Ban Gioc Waterfall.
- Waterfall boat experiences.
- Nguom Ngao Cave.
- Thang Hen Lakes.
- Truc Lam Pagoda.
- Mountain exploration.
- Scenic road trips.
- Local villages.
- Guided countryside excursions.

## 7.17 MAI CHAU / PU LUONG

- Village walks.
- Rice field photography.
- Homestays.
- Guided trekking.
- Cycling.
- Water-wheel experiences.
- Bamboo rafting.
- Cooking experiences.
- Local markets.
- Guided nature excursions.

## 7.18 CON DAO

- Island exploration.
- Beaches.
- Scuba diving.
- Snorkelling.
- Turtle conservation experiences during applicable nesting/release seasons.
- Con Dao National Park.
- Historical prison sites.
- Hiking.
- Boat trips.
- Wildlife and nature experiences.

Every activity must be represented as its own data record, not merely embedded in a long text block.

---

# 8. ACTIVITY DETAIL PAGE / PRODUCT DETAIL EXPERIENCE

Treat every activity as an individual marketplace-style product.

This is a critical component.

Every activity card should contain:

- Primary image.
- Activity title.
- Destination name.
- Short description.
- Price from / estimated range.
- Free / paid status.
- Duration.
- Adventure intensity.
- Best season.
- Rating if verifiable.
- Save to wishlist icon.
- Add to trip button.

Clicking opens a comprehensive activity detail page.

## Activity detail page structure

1. Full-width image gallery.
2. Activity name.
3. Destination.
4. Category.
5. Overview.
6. Detailed experience description.
7. What you'll actually do.
8. Step-by-step experience.
9. Duration.
10. Recommended age.
11. Physical difficulty.
12. Safety requirements.
13. Skill requirements.
14. Seasonal availability.
15. Weather dependencies.
16. Minimum participants.
17. Group suitability.
18. Price and inclusions.
19. Exclusions.
20. Additional charges.
21. Booking requirements.
22. Cancellation conditions, when sourced.
23. What to bring.
24. What to wear.
25. Location and map.
26. Transport and accessibility.
27. Nearby attractions.
28. Free alternative experiences.
29. Related paid alternatives.
30. Photo gallery.
31. Reviews and ratings, only if sourced.
32. Official provider links.
33. Source references and verification dates.

Make the experience feel like a high-quality e-commerce product detail page.

## Activity interactions

Each activity must support these controls:

- Add to wishlist.
- Add to trip cart.
- Mark as interested.
- Mark as must-do.
- Vote.
- Share.
- Compare.
- Add note.
- Remove from selection.

Do not create a fake booking checkout unless a legitimate booking integration is implemented.

---

# 9. WISHLIST / ACTIVITY CART SYSTEM

Implement a powerful saved-activity experience.

The model should behave like an e-commerce cart combined with a travel wishlist.

## Activity states

Each user can place an experience into:

1. Interested.
2. Wishlist.
3. Selected for group discussion.
4. Group approved.
5. Added to final itinerary.
6. Rejected.
7. Completed.

A traveller can save an activity even if it hasn't been approved by the group.

## Wishlist page

Create tabs:

- All Saved.
- Activities.
- Attractions.
- Destinations.
- Food Experiences.
- Adventure.
- Free Activities.
- Paid Activities.

Filters:
- Destination.
- Price.
- Category.
- Duration.
- Seasonal suitability.
- Group approval.
- Personal priority.

Allow:
- Grid view.
- List view.
- Comparison view.
- Drag and drop to itinerary.
- Remove.
- Bulk selection.
- Export.

## Activity comparison

A traveller must be able to compare multiple activities side-by-side.

Comparison fields:
- Activity.
- Destination.
- Estimated price.
- Duration.
- Difficulty.
- Season suitability.
- Safety considerations.
- Group suitability.
- Included services.
- Free alternative.
- Travel time required.

Highlight differences.

---

# 10. GROUP TRIP WORKSPACE

This feature is extremely important.

We have seven people planning one trip.

A user should be able to create a group workspace and invite other people.

## 10.1 Group creation

Allow:
- Create group.
- Trip name.
- Travel dates.
- Number of travellers.
- Budget per person.
- Currency.
- Shareable invite URL.
- Join using group code.
- Manage participants.
- Assign roles.

Example group:

Vietnam Cousins Trip 2026

Participants:
- Traveller 1.
- Traveller 2.
- Traveller 3.
- Traveller 4.
- Traveller 5.
- Traveller 6.
- Traveller 7.

Allow members to set display names and avatars.

## 10.2 Individual preference collection

Each member can independently specify:

- Interests.
- Preferred destinations.
- Adventure tolerance.
- Physical fitness preference.
- Food preferences.
- Accommodation preference.
- Nightlife preference.
- Budget.
- Free vs paid preferences.
- Activities they want to avoid.

## 10.3 Group voting

Each saved activity should support:

- Interested.
- Must do.
- Neutral.
- Not interested.
- Cannot participate.

Show group voting statistics.

Example:

Four-island snorkelling:

- Must do: 5.
- Interested: 1.
- Not interested: 1.
- Estimated group expense: ₹28,000.

Make it visually clear who has voted, respecting the configured privacy settings.

Allow members to add comments and discuss the activity.

## 10.4 Group consensus

Create a group decision interface.

Identify:
- Activities popular with everyone.
- Activities popular with couples.
- Activities popular with individual travellers.
- Activities with low interest.
- Activities exceeding the group budget.
- Activities unsuitable for the season.

Provide a suggested group shortlist, but never automatically impose a decision.

## 10.5 Group budget

Calculate:
- Total estimated activity cost.
- Cost per person.
- Optional activities.
- Shared expenses.
- Per-person differences.
- Budget remaining.

Allow optional and mandatory group participation.

For example, an activity may cost ₹2,000 per person, but only five members participate.

Calculate expenses based on actual participants, not automatically divide everything by seven.

---

# 11. ITINERARY BUILDER

Build a dedicated itinerary planner.

This should feel like a powerful visual planning tool.

## Features

- Calendar view.
- Timeline view.
- Day-by-day cards.
- Destination groups.
- Add activities.
- Drag and drop.
- Change activity dates.
- Reorder activities.
- Remove activities.
- Edit duration.
- Add transportation.
- Add restaurants.
- Add accommodation.
- Add notes.
- Set start times.
- Set estimated costs.
- Assign participants.

## Trip route

Display geographical route through Vietnam.

For every destination transition, show:
- Origin.
- Destination.
- Transport mode.
- Estimated duration.
- Estimated cost.
- Departure time.
- Arrival time.
- Luggage considerations.
- Overnight option.

Transport types:
- Flights.
- Sleeper buses.
- Cabin buses.
- Trains.
- Private transfers.
- Rental vehicles where legally permitted.
- Local ride-hailing.
- Boats.
- Ferries.

## Intelligent planning alerts

Warn users when:
- Two activities overlap.
- Travel time makes the day unrealistic.
- An attraction is closed.
- An activity is weather-dependent.
- The trip is over budget.
- Too many destinations are being squeezed into limited days.
- An overnight journey creates a need for recovery time.
- A destination requires significant detouring.

Provide recommendations, not automatic destructive changes.

## Fixed travel information

Preload the booked international flights.

Do not change or overwrite these without explicit user interaction.

---

# 12. MAP EXPLORER

Create a premium interactive Vietnam map.

It must support:
- Destination pins.
- Attraction pins.
- Activity pins.
- Regional filters.
- Category filters.
- Selected itinerary stops.
- Travel routes.
- Search.
- Pin clustering.
- Zoom and pan.
- Current selected destination highlight.

Clicking a pin opens a small destination/activity preview.

Use MapLibre, Leaflet or another suitable map solution with OpenStreetMap or a licensed map provider.

Do not embed a screenshot of a map as a substitute for an interactive map.

Map filters:
- Adventure.
- Beaches.
- Heritage.
- Nature.
- Food.
- Nightlife.
- Free attractions.
- Paid attractions.

---

# 13. TRAVEL GUIDE — COMPLETE A TO Z

Build an extensive practical travel guide.

Sections:

## A. Visa and immigration
- Vietnam e-visa.
- Indian passport requirements.
- Entry airports.
- Exit airports.
- Single/multiple-entry considerations.
- Visa validity.
- Required photographs and passport scans.
- Application checklist.
- Official immigration portal.
- Immigration arrival process.
- Common mistakes.
- Rules and restrictions.

Always distinguish official legal requirements from travel advice.

## B. Currency and payments
- Vietnamese Dong.
- INR to VND conversion.
- USD to VND conversion.
- Exchange options.
- ATM withdrawal.
- International debit and credit cards.
- Cash payment.
- Typical payment methods.
- Foreign exchange fees.

Use a live FX integration if available.

Show last-updated timestamps.

## C. SIM and connectivity
- Viettel.
- Vinaphone.
- Mobifone.
- Physical SIM vs eSIM.
- Tourist plans.
- Passport registration.
- Data coverage.
- Airport purchase vs city purchase.

## D. Transportation
- Grab.
- Be.
- Xanh SM.
- Buses.
- Trains.
- Sleeper buses.
- Internal flights.
- Ferries.
- Local taxis.
- Private group vans.
- Motorbike regulations.
- Indian licence and IDP considerations.

Do not tell visitors that they can legally drive or ride merely because they have an Indian licence and an IDP. Verify applicable Vietnamese law and the international convention requirements.

## E. Accommodation
- Hostels.
- Hotels.
- Guesthouses.
- Airbnb.
- Private villas.
- Family rooms.
- Group accommodation.

Explain neighbourhood selection and practical safety considerations.

## F. Food
- Famous dishes.
- Vegetarian food.
- Vegan food.
- Halal food.
- Seafood.
- Food allergies.
- Street-food safety.
- Drinking water.

## G. Safety
- Scams.
- Pickpocketing.
- Traffic.
- Motorbike safety.
- Adventure provider checks.
- Water activities.
- Weather.
- Emergency numbers.
- Insurance.
- Medical access.

## H. Local rules and etiquette
- Temple clothing.
- Respectful photography.
- Public behaviour.
- Alcohol regulations.
- Drone rules.
- Protected wildlife.
- Environmental responsibility.

## I. Packing checklist
- Clothing.
- Rain protection.
- Winter clothes for Sa Pa.
- Footwear.
- Swimming equipment.
- Electronic accessories.
- Travel documents.
- Medicines and personal essentials.

## J. Travel preparation checklist

Build a trackable checklist with completion status.

All legal and regulatory information must link to official primary sources.

---

# 14. PROFESSIONAL NETWORKING MODULE

Create a separate optional area called:

WORK & CONNECT — VIETNAM

Purpose:

Help technology professionals discover opportunities to connect with the Vietnamese tech ecosystem.

Include:

- Developer meetups.
- GDG communities.
- Cloud developer groups.
- AI/ML meetups.
- Startup events.
- Hackathons.
- Coworking spaces.
- Startup incubators.
- Technology conferences.
- Founder communities.
- Engineering communities.
- University technology events.

Initial areas of focus:
- Hanoi.
- Ho Chi Minh City.
- Da Nang.

Include:
- Event name.
- Date.
- Venue.
- Price.
- Registration URL.
- Description.
- Organiser.
- Source.
- Last verified date.

NEVER fabricate events or imply that an event is happening unless there is an authoritative listing.

Provide a networking preparation area:
- Personal introduction.
- LinkedIn profile link.
- Interests.
- Meeting notes.
- Contacts.
- Follow-up reminders.

Support optional individual participation without requiring other group members to join.

---

# 15. BUDGET AND COST CALCULATOR

Build a useful budgeting engine.

Display INR and VND simultaneously.

Budget areas:
- International flights: already booked, excluded by default.
- Domestic flights.
- Accommodation.
- Intercity buses.
- Trains.
- Local transport.
- Food.
- Paid activities.
- Free activities.
- Travel insurance.
- SIM cards.
- Shopping.
- Miscellaneous.
- Emergency reserve.

Provide:
- Per-person budget.
- Group budget.
- Shared property costs.
- Individual activity expenses.
- Group activity expenses.
- Optional participant expenses.
- Cost per destination.
- Cost per day.
- Cost remaining.

Allow users to choose a spending scenario:

1. Budget.
2. Balanced.
3. Comfortable.

Allow manual price adjustments.

Distinguish actual quotations from illustrative estimates.

Never use made-up current prices while presenting them as verified prices.

---

# 16. SEARCH, FILTERS AND DISCOVERY

Implement global search across all entities.

Advanced filtering must include:

### Activity categories
- Adventure.
- Water sports.
- Nature.
- Cultural.
- Historical.
- Food.
- Shopping.
- Nightlife.
- Photography.
- Relaxation.
- Wildlife.
- Family.
- Social.
- Professional networking.

### Cost
- Completely free.
- Under ₹500.
- ₹500–₹1,000.
- ₹1,000–₹2,500.
- ₹2,500–₹5,000.
- ₹5,000–₹10,000.
- Above ₹10,000.

Treat these as user-selectable converted INR filters, not hardcoded VND prices.

### Duration
- Under 1 hour.
- 1–3 hours.
- Half day.
- Full day.
- Overnight.
- Multi-day.

### Difficulty
- Easy.
- Moderate.
- Challenging.
- Extreme.

### Availability
- Year-round.
- Seasonal.
- Weather-dependent.
- Temporarily closed.
- Not yet verified.

### Travel suitability
- Couples.
- Groups.
- Solo.
- Social.
- Adventure seekers.

Search results should be fast and intuitive.

Provide empty states, loading states and error states.

---

# 17. IMAGE AND MEDIA REQUIREMENTS

Photography is essential to this product.

Every destination must have:
- Hero image.
- Secondary gallery images.
- Attraction images.
- Activity reference imagery.

Every activity should ideally have its own image or a curated representative image.

Use:
- Properly licensed Unsplash imagery.
- Pexels imagery under applicable licence conditions.
- Official tourism authority media when permitted.
- Verified provider photography.
- Other properly licensed photography sources.

Never scrape Google Images or embed images from unreliable random websites.

Never pretend a representative stock photo is the exact location or operator experience if this is not verified.

Implement:
- Image attribution.
- Alt text.
- Responsive sizes.
- Lazy loading.
- Appropriate image compression.
- Aspect ratio consistency.
- Graceful fallbacks.
- Gallery interactions.

Use image metadata so an administrator can replace photographs without changing code.

Image groups:
- Destination hero: wide landscape.
- Activity card: 4:3 or 3:2.
- Destination card: 4:5 or 3:2.
- Gallery: mixed aspect ratios with consistent visual rhythm.

Use immersive galleries and not repetitive stock-image grids.

---

# 18. CONTENT ACCURACY AND RESEARCH SYSTEM

This is a tourism information platform. Accuracy is non-negotiable.

Use current and trustworthy sources.

Priority:

1. Vietnam National Authority of Tourism.
2. Provincial and city tourism authorities.
3. Official national park websites.
4. Official attraction websites.
5. Official transport and airline websites.
6. Official immigration and government websites.
7. Authorised activity operators.
8. Established tourism organisations.
9. Reputable travel publishers for supplementary information.

For every factual data record, maintain:

- Source title.
- Source URL.
- Information checked.
- Last verification date.
- Confidence level.
- Data status.

Data statuses:
- Verified official.
- Verified provider.
- Estimated.
- Community contribution.
- Needs verification.
- Temporarily unavailable.

For activity prices:
- Amount.
- Currency.
- Adult/child classification.
- Included services.
- Excluded services.
- Price validity.
- Source.
- Verification date.

For opening times:
- Local time zone.
- Days of operation.
- Seasonal exceptions.
- Holiday exceptions.

Do not invent:
- Ticket prices.
- Opening hours.
- Ratings.
- Reviews.
- Bus schedules.
- Event dates.
- Availability.
- Booking links.

If a figure is not verified, explicitly label it as an estimate or unknown.

Do not falsely claim to have comprehensive or real-time coverage.

The catalogue must be extensible and updated through an administrator interface.

---

# 19. ADMIN DASHBOARD / CONTENT MANAGEMENT

Build an admin area to manage all tourism content.

Admin should be able to:

- Create destinations.
- Edit destinations.
- Add attractions.
- Add activities.
- Add images.
- Change images.
- Manage categories.
- Edit price ranges.
- Edit duration.
- Edit seasonality.
- Add sources.
- Set verification dates.
- Publish/unpublish.
- Archive records.
- Manage users.
- Manage user feedback.
- Manage group reports.
- Manage event listings.
- Manage featured content.

Implement role-based access:
- Super Admin.
- Content Editor.
- Group Owner.
- Group Member.
- Visitor.

Create audit fields for changes.

Use proper validation to prevent incomplete records from being published.

Admin dashboard must not expose private group data unnecessarily.

---

# 20. DATA ARCHITECTURE

Design a scalable relational data model.

Suggested entities:

- users
- user_profiles
- trips
- trip_members
- trip_preferences
- regions
- destinations
- destination_relationships
- attractions
- activities
- activity_categories
- activity_images
- destination_images
- activity_prices
- activity_availability
- sources
- source_verifications
- wishlists
- wishlist_items
- comparisons
- group_votes
- comments
- saved_destinations
- itinerary_days
- itinerary_items
- transport_legs
- accommodations
- expenses
- budget_categories
- professional_events
- event_organisers
- travel_guides
- preparation_checklists
- reviews
- admin_audit_logs

Use UUIDs and timestamps.

Define:
- Primary keys.
- Foreign keys.
- Indexes.
- Uniqueness constraints.
- Appropriate nullable fields.
- Data validation.
- Access control.

Use normalized structures where appropriate.

Do not store the entire destination or activity catalogue as one giant JSON blob.

Implement appropriate database migrations and seed scripts.

---

# 21. RECOMMENDED TECH STACK

First inspect the existing repository.

If a project already exists:
- Respect its architecture.
- Reuse installed packages.
- Preserve existing functionality.
- Do not replace the entire stack without a valid reason.

If starting from scratch, use a modern production-ready stack:

Frontend:
- Next.js with App Router.
- React.
- TypeScript with strict mode.
- Tailwind CSS.
- shadcn/ui.
- Lucide icons.
- Framer Motion for subtle interactions.
- React Hook Form.
- Zod validation.

Backend:
- Next.js server-side actions / route handlers as appropriate.
- Supabase.
- PostgreSQL.
- Supabase Auth.
- Supabase Storage.
- Row Level Security.

Maps:
- MapLibre or Leaflet.
- OpenStreetMap or a licensed provider.

State management:
- Zustand or an appropriate lightweight alternative.
- TanStack Query when server-state complexity warrants it.

Testing:
- Vitest.
- React Testing Library.
- Playwright.

Charts:
- Recharts when useful.

Do not add unnecessary libraries.

Create a clean modular folder architecture with separation between:
- UI components.
- Domain models.
- Services.
- Data access.
- Hooks.
- State.
- Validation.
- Utilities.
- Database.
- Tests.

Use environment variables for all secrets and external service keys.

Never expose service-role credentials in the browser.

If Supabase credentials are not available, create a clearly documented demo/local persistence mode. Do not pretend that local mock functionality is real multi-user cloud collaboration.

---

# 22. FUNCTIONAL REQUIREMENTS

Every major control must work.

Examples:

- Search must actually filter results.
- Wishlist buttons must update saved state.
- Group invitations must generate usable invitations.
- Votes must persist.
- Group budgets must calculate.
- Activities must be addable to itinerary.
- Filters must work together.
- Map pins must open details.
- Theme switching must work.
- Share controls must perform real share/copy actions.
- Forms must validate.
- Images must load or show appropriate fallbacks.
- User preferences must persist.
- Group members must see shared changes when using the live backend.
- Admin content updates must affect the public catalogue.

Do not build visually interactive controls that have no functionality.

Do not use alerts as a substitute for properly designed dialogs, drawers or toast notifications.

---

# 23. SEO, PERFORMANCE AND ACCESSIBILITY

Implement:
- SEO-friendly URLs.
- Destination-specific page metadata.
- Open Graph previews.
- Canonical URLs.
- XML sitemap.
- robots.txt.
- Structured data where appropriate.
- Semantic HTML.
- Keyboard navigation.
- Proper focus states.
- Accessible forms.
- Meaningful image alt text.
- Good colour contrast.
- Reduced-motion support.

Performance:
- Lazy-load images.
- Optimise image dimensions.
- Avoid unnecessary client components.
- Avoid unnecessary rerenders.
- Cache appropriate public data.
- Paginate large catalogues.
- Optimise SQL queries.
- Provide skeleton loaders.
- Provide graceful network error states.

Target excellent Core Web Vitals.

---

# 24. SECURITY AND PRIVACY

This platform contains group-level information and possibly personal travel preferences.

Implement:

- Authentication.
- Role-based access.
- Supabase RLS policies.
- Proper group membership validation.
- Secure invitation handling.
- Input sanitisation.
- Rate limiting for sensitive endpoints.
- Server-side permission checks.
- Secure file upload validation.
- Environment variable separation.
- No sensitive tokens in client code.

Users must not be able to read or modify other private groups.

Support account deletion and reasonable data deletion/export functionality.

Do not expose user email addresses unnecessarily.

---

# 25. TESTING AND ACCEPTANCE CRITERIA

Do not consider the task complete because the homepage renders.

Test the actual end-to-end product.

Required scenarios:

### Scenario 1: First-time visitor
- Opens homepage.
- Explores Vietnam.
- Searches Phu Quoc.
- Opens destination detail.
- Browses water activities.
- Opens snorkelling activity detail.
- Saves activity.

### Scenario 2: Wishlist
- Adds multiple activities.
- Filters by price.
- Compares activities.
- Removes an activity.
- Refreshes the page.
- Confirms saved state persists.

### Scenario 3: Group creation
- Creates a trip.
- Invites seven members.
- Joins through invitation link/code.
- Configures preferences.
- Adds an activity.
- Casts a vote.
- Sees updated group voting data.

### Scenario 4: Itinerary
- Selects destinations.
- Adds activities.
- Creates daily schedules.
- Adds overnight transport.
- Changes activity ordering.
- Sees budget updates.
- Detects scheduling conflicts.

### Scenario 5: Budget
- Sets ₹65,000 individual budget.
- Adds accommodation.
- Adds domestic travel.
- Adds paid experiences.
- Allocates an optional experience to five people.
- Confirms per-person and group totals are correct.

### Scenario 6: Admin
- Creates an activity.
- Adds sources and images.
- Sets a price.
- Publishes it.
- Sees it on the public destination page.

### Scenario 7: Responsive
- Complete journeys on desktop and mobile.
- Verify navigation.
- Verify modals.
- Verify gallery.
- Verify activity selection.
- Verify itinerary editing.

### Quality standards
- No TypeScript errors.
- No console errors.
- No dead buttons.
- No broken navigation.
- No empty placeholder sections masquerading as complete features.
- No fabricated information presented as verified.
- No inaccessible form controls.
- No unhandled exceptions.

---

# 26. REQUIRED DELIVERABLES

Implement and deliver:

1. Complete frontend.
2. Working backend.
3. Database schema.
4. Database migrations.
5. Seed data for all listed destinations.
6. Meaningful activity catalogues for every destination.
7. Destination detail pages.
8. Activity detail pages.
9. Wishlist.
10. Group collaboration.
11. Voting.
12. Itinerary builder.
13. Interactive map.
14. Budget calculator.
15. Travel guide.
16. Professional networking module.
17. Admin dashboard.
18. Responsive mobile experience.
19. Automated tests.
20. Environment variable example.
21. README.
22. Local setup instructions.
23. Deployment instructions.
24. Known limitations and integrations requiring credentials.

Seed enough real content to demonstrate all major features meaningfully.

Do not create fake ratings or fabricated user reviews to make the product appear populated.

---

# 27. EXECUTION INSTRUCTIONS FOR THE CODING AGENT

Follow these instructions carefully.

PHASE 1 — REPOSITORY AUDIT
- Inspect all existing files.
- Identify framework and dependencies.
- Understand current architecture.
- Identify reusable components.
- Report implementation risks.
- Create a concise implementation plan.

PHASE 2 — DESIGN SYSTEM
- Build typography.
- Build colour tokens.
- Build navigation.
- Build reusable components.
- Build responsive foundations.
- Implement homepage.

PHASE 3 — DESTINATION AND ACTIVITY DATA
- Establish schemas.
- Create destination records.
- Create activity catalogue.
- Add imagery.
- Add source references.
- Build detail pages.

PHASE 4 — DISCOVERY
- Search.
- Filters.
- Sorting.
- Map.
- Destination navigation.

PHASE 5 — WISHLIST AND GROUP
- User accounts.
- Wishlist.
- Group creation.
- Invitations.
- Voting.
- Comments.
- Collaborative state.

PHASE 6 — PLANNING
- Itinerary.
- Transportation.
- Budget calculator.
- Expense tracking.

PHASE 7 — TRAVEL GUIDE AND PROFESSIONAL NETWORKING
- Visa.
- Transport.
- Currency.
- SIM.
- Safety.
- Events.
- Networking.

PHASE 8 — ADMIN AND CMS
- Editing.
- Sources.
- Media.
- Publishing.
- Access control.

PHASE 9 — TESTING AND POLISH
- Automated tests.
- Responsive testing.
- Accessibility.
- Performance.
- Bug fixes.
- Documentation.

Do not stop after generating a plan or design mockup. Continue through implementation.

Work incrementally while keeping the application runnable.

Do not overwrite existing working functionality without understanding it.

Do not create unnecessary abstractions.

If external API credentials are unavailable, implement an honest, functional fallback and document the limitation.

At the end, provide:
- What was implemented.
- What actually works.
- What requires external credentials.
- What data is verified.
- What remains estimated.
- How to run locally.
- How to deploy.
- Test results.

# FINAL PRODUCT STANDARD

The final website should feel like a premium tourism product, not a college project or a generic AI-generated starter template.

A user who has never visited Vietnam should be able to spend time on the platform and understand:

- Where to go.
- Why to go.
- What to see.
- What to do.
- How much it costs.
- What is free.
- What is worth paying for.
- How to travel between places.
- What to avoid.
- What the seasonal conditions are.
- How to prepare.
- What their friends want to do.
- What the group has selected.
- How to turn all those decisions into a feasible trip.

A tourism authority should be able to extend the platform by updating its destination, attraction, activity and travel-guide content without changing application code.

Build the complete product with exceptional design quality, real interactions, accurate information architecture and a maintainable foundation.

**Do not optimise for the number of pages generated. Optimise for the quality, usefulness, completeness and functionality of the actual traveller experience.**