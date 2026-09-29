/**
 * Editorial content for the site: the made-to-measure process, guides, FAQs and
 * the journal. Plain data so it is easy to edit; pages render it.
 */

export type Block =
  | { h2: string }
  | { h3: string }
  | { p: string }
  | { ul: string[] }
  | { ol: string[] }
  | { quote: string }
  | { note: string };

/* ---------------------------------------------------------------- process */

export const PROCESS = [
  {
    title: "Consult",
    text: "We talk about the room, the light it gets and how you live in it — at home, by video, or with a look you saved in the villa.",
  },
  {
    title: "Choose",
    text: "Cloth in your hands and in your own daylight. We narrow five collections down to the two or three that suit the room.",
  },
  {
    title: "Measure",
    text: "Every window measured by us — rod height, stack space, sill, floor — so the curtains hang exactly as drawn.",
  },
  {
    title: "Make & hang",
    text: "Cut, pleated and weighted by hand in the workroom, then hung, dressed and trained to fall in clean folds.",
  },
];

/* ---------------------------------------------------------------- linings & pleats */

export const LINING_GUIDE = [
  {
    name: "Unlined",
    what: "Just the face fabric.",
    light: "Most light through — the cloth glows.",
    best: "Linen and sheers where you want soft, filtered light.",
  },
  {
    name: "Cotton sateen lining",
    what: "A smooth cotton backing sewn to the face fabric.",
    light: "Softens the light and protects the face from sun.",
    best: "Almost every living room and dining room curtain.",
  },
  {
    name: "Thermal (interlined)",
    what: "A soft flannel layer between face and lining.",
    light: "Much less light, noticeably warmer rooms, fuller folds.",
    best: "Velvet, north-facing rooms, tall draughty windows.",
  },
  {
    name: "Blackout lining",
    what: "A dense coated backing behind the face fabric.",
    light: "Blocks almost all light while keeping the face fabric you love.",
    best: "Bedrooms, nurseries and the home theatre.",
  },
];

export const PLEAT_GUIDE = [
  {
    name: "Pinch pleat",
    text: "Triple folds stitched at the top and released below — tailored, classic, the most versatile heading.",
  },
  {
    name: "Wave",
    text: "Soft, even S-shaped waves on a track — calm, modern and the smallest stack when open.",
  },
  {
    name: "Eyelet",
    text: "Brass rings punched through the heading and threaded onto a pole — relaxed and easy to draw.",
  },
  {
    name: "Pencil pleat",
    text: "Fine gathered tucks along a tape — informal, cottage-soft, lovely in linen.",
  },
  {
    name: "Goblet",
    text: "Cup-shaped pleats filled to hold their form — the most formal heading, for grand windows.",
  },
];

/* ---------------------------------------------------------------- measuring */

export const MEASURE_STEPS = [
  {
    title: "Decide where the curtains hang",
    text: "Fix the pole or track 10–15 cm above the window frame — or higher, towards the ceiling, to make the window feel taller. Extend it 15–25 cm beyond each side of the frame so the curtains can stack clear of the glass when open.",
  },
  {
    title: "Measure the width",
    text: "Measure the full length of the pole or track, excluding the finials. We add the fullness (usually 2 to 2.5 times) for you — never add it yourself.",
  },
  {
    title: "Measure the drop",
    text: "For rings and eyelets, measure from the underside of the ring or the top of the pole. For a track, measure from the top of the track. Take the drop to the floor in three places — floors are rarely level — and use the shortest.",
  },
  {
    title: "Choose the finish at the floor",
    text: "Sill-length stops just above the sill; floor-length clears the floor by 1 cm and moves freely; a kiss touches the floor; a puddle adds 5–15 cm that pools softly. Tell us which, and we will set the hem.",
  },
  {
    title: "Note what is around the window",
    text: "Radiators, deep sills, sockets, wardrobe doors, a ceiling cornice — anything that changes where the curtains can hang or stack. A photograph helps.",
  },
];

/* ---------------------------------------------------------------- care */

export const CARE = [
  {
    title: "Everyday",
    items: [
      "Vacuum gently with a soft brush attachment every few weeks, working from the top down.",
      "Shake curtains out as you open them in the morning; folds that are handled regularly stay fresh.",
      "Keep curtains drawn back from open windows in rain and away from condensation on the glass.",
    ],
  },
  {
    title: "Velvet",
    items: [
      "Brush the pile in one direction with a soft clothes brush to lift crushing.",
      "Steam from the back, never press the face — a garment steamer held a hand's width away revives the pile.",
      "Professional dry cleaning only.",
    ],
  },
  {
    title: "Linen & sheer",
    items: [
      "Linen softens and creases naturally; a light steam restores the drape.",
      "Sheers can often be gently hand-washed — check the label, and rehang while slightly damp so they dry straight.",
      "Expect linen to relax a little in length in its first weeks; this is allowed for when we set the hem.",
    ],
  },
  {
    title: "Lined, blackout & embroidered",
    items: [
      "Dry clean lined and interlined curtains as one piece; face and lining behave differently in water.",
      "Spot-clean embroidery with a barely damp cloth, dabbing rather than rubbing, and never iron over the thread.",
      "Rotate pairs occasionally where one side takes more sun.",
    ],
  },
  {
    title: "Goose feather pillows",
    items: [
      "Plump daily and air in the sun on a dry day every month or two.",
      "Use a protector under the cover; wash covers, not the pillow.",
      "Professional cleaning once a year keeps the fill lofty.",
    ],
  },
];

/* ---------------------------------------------------------------- FAQ */

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Are the prices on the site final?",
    a: "They are careful estimates from your window size, fabric, heading, length and lining. Your final quote is fixed after we measure, and it is itemised so you can see exactly what you are paying for.",
  },
  {
    q: "How long do made-to-measure curtains take?",
    a: "It depends on the fabric and the size of the order; your quote confirms the date. Simple linen pairs are quicker than interlined velvet or embroidery, which are made by hand in several stages.",
  },
  {
    q: "Can I order swatches first?",
    a: "Yes — and we encourage it. Colour changes with daylight, so look at swatches at the window at different times of day before you decide. Ask for them when you book a consultation or send a quote request.",
  },
  {
    q: "Do you measure and fit?",
    a: "We prefer to. Measuring is where made-to-measure is won or lost, and our fitters hang, dress and train every pair so the folds fall correctly from the first day.",
  },
  {
    q: "What is fullness and why does it matter?",
    a: "Fullness is how much fabric goes into a curtain compared with the width of the track — typically 2 to 2.5 times. More fullness gives deeper, richer folds; we set it by heading and fabric weight.",
  },
  {
    q: "Which fabric is best for a bedroom?",
    a: "For sleep, choose blackout — either our blackout fabrics or any fabric with a blackout lining. If you love the look of linen or velvet, ask for it with a blackout lining; you keep the face and gain the dark.",
  },
  {
    q: "Will blackout curtains make a room completely dark?",
    a: "The fabric stops the light; the edges are where it escapes. Mounting the rod higher and wider than the frame, and choosing a heading that overlaps in the middle, gets a room remarkably close to darkness.",
  },
  {
    q: "What does the 3D villa show?",
    a: "Eight rooms lit as they would be by daylight, sunset and lamplight. You can open and close the curtains, change fabric, colour, heading, length and lining, compare fabrics side by side, and dress the beds with pillows — then save the look or request a quote.",
  },
  {
    q: "Do you work with hotels and interior designers?",
    a: "Yes. We make for boutique hotels, serviced residences and design studios — see Hotels & designers for how we handle specification, samples and larger orders.",
  },
  {
    q: "How do I care for my curtains?",
    a: "Regular gentle vacuuming, steaming from the back and professional cleaning for lined curtains. Our care guide goes fabric by fabric.",
  },
];

/* ---------------------------------------------------------------- journal */

export interface Article {
  slug: string;
  title: string;
  dek: string;
  category: string;
  minutes: number;
  image: string;
  body: Block[];
}

export const ARTICLES: Article[] = [
  {
    slug: "choosing-curtains-by-light",
    title: "Choose curtains by the light you want",
    dek: "Blackout, dim-out, linen or sheer? Start with the room's light and the answer follows.",
    category: "Guides",
    minutes: 6,
    image: "/renders/detail-linen.webp",
    body: [
      { p: "Most people choose curtains by colour. The better first question is: what should the light in this room feel like at the time of day you use it most? A bedroom needs darkness at 6 a.m. in June; a living room wants the afternoon sun softened, not shut out; a dining room is mostly used after dark." },
      { h2: "Four kinds of light" },
      { ul: [
        "Darkness — blackout fabric or a blackout lining. For bedrooms, nurseries and screening rooms.",
        "Dusk — a lined velvet or heavy linen that dims the room to a warm half-light. For sitting rooms that face the sun.",
        "Glow — unlined linen: daylight passes through the weave and the whole curtain becomes a soft lantern.",
        "Veil — a sheer. Privacy by day, and the light barely changed.",
      ] },
      { h2: "Which way does the window face?" },
      { p: "South- and west-facing rooms take the strongest sun, and fabric fades there first. Line these curtains, even if you would like them to glow — a cotton lining protects the face fabric and still lets light soften through. North-facing rooms get cool, even light all day; here, warm colours and unlined linen add life without losing brightness." },
      { quote: "Try a sheer behind velvet: the sheer takes the day, the velvet takes the evening." },
      { h2: "Layering" },
      { p: "A double track lets you keep a sheer drawn during the day for privacy and close a heavier curtain at night. It is the most flexible way to dress a window, and it makes even a simple room look finished." },
      { note: "In the villa, switch between Day, Sunset and Night with the curtains open and closed. The room changes with the fabric: that is the fastest way to feel the difference." },
    ],
  },
  {
    slug: "pleat-headings-explained",
    title: "Pinch, wave, eyelet, pencil, goblet: headings explained",
    dek: "The heading decides how a curtain folds from top to hem. Here is how to pick one.",
    category: "Guides",
    minutes: 5,
    image: "/renders/detail-velvet.webp",
    body: [
      { p: "The heading is the top of the curtain — how the fabric is gathered onto the pole or track. It sets the rhythm of the folds all the way down, how much the curtains stack when open, and how formal the room feels." },
      { h2: "Pinch pleat" },
      { p: "Groups of two or three folds stitched together at the top, then released. Tailored without being stiff, and the heading we recommend most. Works on poles with rings or on tracks." },
      { h2: "Wave" },
      { p: "The curtain runs on a track in continuous, even S-curves. Calm and contemporary, with the smallest stack when open — ideal where there is little wall either side of the window." },
      { h2: "Eyelet" },
      { p: "Rings punched through a stiffened heading slide straight onto a pole. Relaxed, simple to draw by hand, best in lighter fabrics and less formal rooms." },
      { h2: "Pencil pleat" },
      { p: "A gathered tape draws the fabric into fine, tight tucks. Soft and informal — lovely in linen for bedrooms and country kitchens." },
      { h2: "Goblet" },
      { p: "Cup-shaped pleats, lightly filled so they hold their shape. The most ceremonial heading, for tall windows in dining rooms and grand salons." },
      { note: "In the villa's customiser, change the heading and watch the folds rebuild — open and close the curtain to see how each one stacks." },
    ],
  },
  {
    slug: "curtain-length",
    title: "Sill, float, kiss or puddle? Getting the length right",
    dek: "A few centimetres at the hem change the whole character of a curtain.",
    category: "Guides",
    minutes: 4,
    image: "/renders/detail-blackout.webp",
    body: [
      { p: "The hem is where a curtain meets the room. Get it right and the curtain looks as though it grew there; a couple of centimetres off and it looks bought." },
      { h2: "The four finishes" },
      { ul: [
        "Sill — just above the window sill. Practical for kitchens, bathrooms and windows over furniture or radiators.",
        "Float — 1 cm clear of the floor. Crisp and modern, easy to clean, draws smoothly.",
        "Kiss — the hem just touches the floor. Tailored and elegant; needs an accurate measure and a level floor.",
        "Puddle — 5 to 15 cm of extra fabric pools on the floor. Romantic and generous, best in velvet and heavy linen, in rooms where the curtains stay open.",
      ] },
      { h2: "Floors are never level" },
      { p: "Measure the drop in three places across the window and use the shortest. We do this for every window we measure, and set weights in the hem so the fabric hangs true." },
      { quote: "If in doubt, float. It is the finish that never looks wrong." },
    ],
  },
  {
    slug: "linings-explained",
    title: "Why the back of a curtain matters as much as the front",
    dek: "Linings decide how much light comes through, how the curtain drapes and how long it lasts.",
    category: "Craft",
    minutes: 5,
    image: "/renders/detail-embroidered.webp",
    body: [
      { p: "Turn a good curtain around and you will find as much care on the back as on the front. The lining is not an afterthought: it shapes the light, the folds and the life of the fabric." },
      { h2: "What a lining does" },
      { ul: [
        "Controls light — from a soft glow to near-total darkness.",
        "Protects the face fabric from sun, dust and condensation.",
        "Adds body, so folds fall deeper and hang straighter.",
        "Insulates — interlined curtains make a real difference to a cold room.",
      ] },
      { h2: "The options" },
      { p: "Cotton sateen is the everyday choice: it softens the light and protects the face. Thermal interlining adds a flannel layer for warmth and fuller folds — velvet loves it. Blackout lining turns any fabric into a bedroom curtain." },
      { note: "Change the lining in the villa's customiser and watch how much daylight reaches the floor as you close the curtains." },
    ],
  },
  {
    slug: "goose-feather-pillows",
    title: "How to choose a goose feather pillow",
    dek: "Fill, firmness and size — and how to build a bed that looks as good as it sleeps.",
    category: "Pillows",
    minutes: 5,
    image: "/renders/pillows.webp",
    body: [
      { p: "A good pillow disappears: you notice the sleep, not the pillow. Goose feather and down move with you through the night, stay cool, and recover their loft with a shake in the morning." },
      { h2: "Feather, down or both" },
      { p: "Feathers give support and a little spring; down — the soft clusters beneath the feathers — gives loft and softness. Our blends balance the two: more feather for support, more down for a cloud-like feel." },
      { h2: "Firmness follows how you sleep" },
      { ul: [
        "Side sleepers need a firmer, higher pillow to fill the space between shoulder and head.",
        "Back sleepers do best with medium support that keeps the neck in line.",
        "Front sleepers want a soft, low pillow — or none at all.",
      ] },
      { h2: "Dressing the bed" },
      { p: "Build in rows: large Euro squares upright against the headboard, sleeping pillows leaning in front, a boudoir cushion to finish. In the villa you can try arrangements on three different beds before you buy." },
    ],
  },
];

export const ARTICLE_BY_SLUG = Object.fromEntries(ARTICLES.map((a) => [a.slug, a])) as Record<string, Article>;
