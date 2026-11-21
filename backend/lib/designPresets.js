// Visual presets for generated sites. Keep the ids and names in sync with frontend/lib/websiteTemplates.ts.
const SANS = "Inter, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";
const ROUNDED = "'Trebuchet MS', Arial, sans-serif";
const GROTESK = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const PRESETS = [
  { id: 'midnight', name: 'Midnight', description: 'Dark with a soft blue glow', bg: '#05070d', surface: '#0d1220', text: '#e5e7eb', muted: '#94a3b8', accent: '#60a5fa', accentText: '#05070d', border: 'rgba(148,163,184,0.18)', font: SANS, headingFont: SANS, radius: '16px', headingWeight: 700, headingTransform: 'none' },
  { id: 'paper', name: 'Paper', description: 'Light and editorial', bg: '#faf7f2', surface: '#ffffff', text: '#1c1917', muted: '#78716c', accent: '#1c1917', accentText: '#faf7f2', border: '#e7e5e4', font: SERIF, headingFont: SERIF, radius: '4px', headingWeight: 600, headingTransform: 'none' },
  { id: 'bold', name: 'Bold', description: 'High contrast with large type', bg: '#000000', surface: '#111111', text: '#ffffff', muted: '#a3a3a3', accent: '#facc15', accentText: '#000000', border: '#262626', font: SANS, headingFont: SANS, radius: '0px', headingWeight: 900, headingTransform: 'uppercase' },
  { id: 'minimal', name: 'Minimal', description: 'Monochrome and clean', bg: '#ffffff', surface: '#fafafa', text: '#111111', muted: '#6b7280', accent: '#111111', accentText: '#ffffff', border: '#e5e7eb', font: SANS, headingFont: SANS, radius: '10px', headingWeight: 600, headingTransform: 'none' },
  { id: 'warm', name: 'Warm', description: 'Earthy and friendly', bg: '#2a1f17', surface: '#3a2b20', text: '#fdf6ec', muted: '#d6c3ab', accent: '#f59e0b', accentText: '#2a1f17', border: 'rgba(253,246,236,0.14)', font: ROUNDED, headingFont: ROUNDED, radius: '20px', headingWeight: 700, headingTransform: 'none' },
  { id: 'ink', name: 'Ink', description: 'Pure black with white accents', bg: '#000000', surface: '#0a0a0a', text: '#ffffff', muted: '#9ca3af', accent: '#ffffff', accentText: '#000000', border: '#1f1f1f', font: SANS, headingFont: SANS, radius: '999px', headingWeight: 600, headingTransform: 'none' },
  { id: 'forest', name: 'Forest', description: 'Deep green with mint accents', bg: '#0b1a14', surface: '#12281f', text: '#e6f4ee', muted: '#9bb8a9', accent: '#34d399', accentText: '#05140e', border: 'rgba(230,244,238,0.12)', font: SANS, headingFont: SERIF, radius: '12px', headingWeight: 600, headingTransform: 'none' },
  { id: 'blueprint', name: 'Blueprint', description: 'Navy with orange and technical headings', bg: '#0a2540', surface: '#0f3057', text: '#e8f1fb', muted: '#9db7d5', accent: '#f97316', accentText: '#1a0f00', border: 'rgba(232,241,251,0.16)', font: SANS, headingFont: MONO, radius: '0px', headingWeight: 700, headingTransform: 'none' },
  { id: 'sand', name: 'Sand', description: 'Soft sand with terracotta', bg: '#f3ecdf', surface: '#fbf7ef', text: '#2b2118', muted: '#7a6a58', accent: '#b45309', accentText: '#fff7ed', border: '#e2d6c2', font: SERIF, headingFont: SERIF, radius: '12px', headingWeight: 600, headingTransform: 'none' },
  { id: 'concrete', name: 'Concrete', description: 'Stark grey with heavy headings', bg: '#e7e5e4', surface: '#d6d3d1', text: '#1c1917', muted: '#57534e', accent: '#1c1917', accentText: '#e7e5e4', border: '#a8a29e', font: GROTESK, headingFont: GROTESK, radius: '0px', headingWeight: 900, headingTransform: 'uppercase' },
  { id: 'neon', name: 'Neon', description: 'Black with lime highlights', bg: '#0b0b10', surface: '#15151d', text: '#f4f4f5', muted: '#a1a1aa', accent: '#a3e635', accentText: '#0b0b10', border: 'rgba(244,244,245,0.12)', font: SANS, headingFont: SANS, radius: '6px', headingWeight: 800, headingTransform: 'none' },
  { id: 'ocean', name: 'Ocean', description: 'Airy blue and white', bg: '#f0f9ff', surface: '#ffffff', text: '#0c4a6e', muted: '#475569', accent: '#0284c7', accentText: '#ffffff', border: '#bae6fd', font: SANS, headingFont: SANS, radius: '18px', headingWeight: 700, headingTransform: 'none' },
  { id: 'plum', name: 'Plum', description: 'Deep plum with rose accents', bg: '#1a0b1e', surface: '#26122c', text: '#f5e9f7', muted: '#c4a5cc', accent: '#fb7185', accentText: '#1a0b1e', border: 'rgba(245,233,247,0.14)', font: ROUNDED, headingFont: ROUNDED, radius: '28px', headingWeight: 700, headingTransform: 'none' },
  { id: 'rust', name: 'Rust', description: 'Charcoal with copper and bold caps', bg: '#171412', surface: '#221d19', text: '#f5efe8', muted: '#a8998a', accent: '#d97706', accentText: '#171412', border: 'rgba(245,239,232,0.12)', font: GROTESK, headingFont: GROTESK, radius: '2px', headingWeight: 800, headingTransform: 'uppercase' },
  { id: 'iron', name: 'Iron', description: "Dark gym grey with bold orange", bg: '#111315', surface: '#1b1f23', text: '#f5f5f5', muted: '#9ca3af', accent: '#f97316', accentText: '#111315', border: 'rgba(245,245,245,0.12)', font: GROTESK, headingFont: GROTESK, radius: '14px', headingWeight: 800, headingTransform: 'uppercase' },
  { id: 'studio', name: 'Studio', description: "Light studio with terracotta", bg: '#f4efe9', surface: '#ffffff', text: '#2a2622', muted: '#7d7268', accent: '#c2410c', accentText: '#fff7ed', border: '#e4dcd2', font: SANS, headingFont: SANS, radius: '14px', headingWeight: 700, headingTransform: 'none' },
  { id: 'pulse', name: 'Pulse', description: "Night violet with lilac highlights", bg: '#0f0a1f', surface: '#1a1233', text: '#f8f7ff', muted: '#a5a0c4', accent: '#a78bfa', accentText: '#0f0a1f', border: 'rgba(248,247,255,0.12)', font: SANS, headingFont: SANS, radius: '14px', headingWeight: 800, headingTransform: 'none' },
  { id: 'tradesman', name: 'Tradesman', description: "Off-white with safety yellow", bg: '#fbfbf7', surface: '#ffffff', text: '#1f2328', muted: '#5b636d', accent: '#f5b700', accentText: '#1f2328', border: '#d9dce0', font: GROTESK, headingFont: GROTESK, radius: '14px', headingWeight: 800, headingTransform: 'uppercase' },
  { id: 'slate', name: 'Slate', description: "Cool grey with navy", bg: '#eceff3', surface: '#f8fafc', text: '#0f172a', muted: '#475569', accent: '#1e40af', accentText: '#ffffff', border: '#cbd5e1', font: SANS, headingFont: SANS, radius: '14px', headingWeight: 700, headingTransform: 'none' },
  { id: 'workshop', name: 'Workshop', description: "Graphite with ember orange", bg: '#2b2f33', surface: '#373c41', text: '#f1efe9', muted: '#b8b2a7', accent: '#e4572e', accentText: '#1d1f22', border: 'rgba(241,239,233,0.14)', font: MONO, headingFont: MONO, radius: '14px', headingWeight: 700, headingTransform: 'none' },
  { id: 'bistro', name: 'Bistro', description: "Espresso dark with brass", bg: '#1f1a17', surface: '#2b2421', text: '#f7efe4', muted: '#cdbfae', accent: '#d4a373', accentText: '#1f1a17', border: 'rgba(247,239,228,0.14)', font: SERIF, headingFont: SERIF, radius: '14px', headingWeight: 700, headingTransform: 'none' },
  { id: 'cafe', name: 'Café', description: "Cream with coffee brown", bg: '#f7f1e8', surface: '#fffaf3', text: '#3b2f2a', muted: '#8a7767', accent: '#8b5e3c', accentText: '#fffaf3', border: '#e6dccd', font: SERIF, headingFont: SERIF, radius: '14px', headingWeight: 700, headingTransform: 'none' },
  { id: 'fresh', name: 'Fresh', description: "Mint white with leaf green", bg: '#f5fbf6', surface: '#ffffff', text: '#14312a', muted: '#4d7a6b', accent: '#16a34a', accentText: '#ffffff', border: '#d5ebdd', font: ROUNDED, headingFont: ROUNDED, radius: '14px', headingWeight: 700, headingTransform: 'none' },
  { id: 'bakery', name: 'Bakery', description: "Peach cream with coral", bg: '#fdf2e9', surface: '#fff8f1', text: '#4a2c1d', muted: '#9a6b52', accent: '#e76f51', accentText: '#2a1510', border: '#f1dccb', font: ROUNDED, headingFont: ROUNDED, radius: '14px', headingWeight: 700, headingTransform: 'none' },
  { id: 'calm', name: 'Calm', description: "Sea mist with deep teal", bg: '#eef5f3', surface: '#ffffff', text: '#1f3b38', muted: '#5b7f79', accent: '#0f766e', accentText: '#ffffff', border: '#cfe3de', font: SANS, headingFont: SANS, radius: '14px', headingWeight: 600, headingTransform: 'none' },
  { id: 'serene', name: 'Serene', description: "Lavender mist with plum", bg: '#f3f0fa', surface: '#ffffff', text: '#2e2640', muted: '#7b7394', accent: '#7c6bb0', accentText: '#ffffff', border: '#ddd6ec', font: SERIF, headingFont: SERIF, radius: '14px', headingWeight: 600, headingTransform: 'none' },
  { id: 'clinic', name: 'Clinic', description: "White with clinical blue", bg: '#ffffff', surface: '#f1f6fb', text: '#0b2a4a', muted: '#4a6785', accent: '#0a7ea4', accentText: '#ffffff', border: '#d6e4f0', font: SANS, headingFont: SANS, radius: '14px', headingWeight: 600, headingTransform: 'none' },
  { id: 'spa', name: 'Spa', description: "Warm ivory with rose clay", bg: '#faf6f3', surface: '#ffffff', text: '#3d3430', muted: '#8e7f77', accent: '#b08d7a', accentText: '#ffffff', border: '#eadfd8', font: SERIF, headingFont: SERIF, radius: '14px', headingWeight: 600, headingTransform: 'none' },
  { id: 'mentor', name: 'Mentor', description: "Midnight slate with aqua", bg: '#101828', surface: '#1d2939', text: '#f2f4f7', muted: '#98a2b3', accent: '#2dd4bf', accentText: '#0b1220', border: 'rgba(242,244,247,0.12)', font: SANS, headingFont: SANS, radius: '14px', headingWeight: 700, headingTransform: 'none' },
  { id: 'advisor', name: 'Advisor', description: "Paper white with ink serif", bg: '#fbfbfa', surface: '#ffffff', text: '#1a1a1a', muted: '#666666', accent: '#1a1a1a', accentText: '#fbfbfa', border: '#e3e3e0', font: SERIF, headingFont: SERIF, radius: '14px', headingWeight: 600, headingTransform: 'none' },
  { id: 'modern', name: 'Modern', description: "Ink navy with indigo", bg: '#0b0f19', surface: '#111827', text: '#f9fafb', muted: '#9ca3af', accent: '#6366f1', accentText: '#ffffff', border: 'rgba(249,250,251,0.12)', font: SANS, headingFont: SANS, radius: '14px', headingWeight: 700, headingTransform: 'none' },
  { id: 'portfolio', name: 'Portfolio', description: "Pure white, black type", bg: '#ffffff', surface: '#f5f5f5', text: '#111111', muted: '#737373', accent: '#111111', accentText: '#ffffff', border: '#e5e5e5', font: GROTESK, headingFont: GROTESK, radius: '14px', headingWeight: 700, headingTransform: 'none' },
  { id: 'boutique', name: 'Boutique', description: "Blush white with raspberry", bg: '#fff7f9', surface: '#ffffff', text: '#3a2233', muted: '#8f6b7f', accent: '#db2777', accentText: '#ffffff', border: '#f2d9e3', font: SERIF, headingFont: SERIF, radius: '14px', headingWeight: 600, headingTransform: 'none' },
  { id: 'market', name: 'Market', description: "Cream with forest green", bg: '#fffbeb', surface: '#ffffff', text: '#292524', muted: '#78716c', accent: '#15803d', accentText: '#ffffff', border: '#e7e0c8', font: ROUNDED, headingFont: ROUNDED, radius: '14px', headingWeight: 700, headingTransform: 'none' },
  { id: 'gallery', name: 'Gallery', description: "Charcoal with silver", bg: '#0c0c0c', surface: '#161616', text: '#f5f5f5', muted: '#8a8a8a', accent: '#e5e5e5', accentText: '#0c0c0c', border: 'rgba(245,245,245,0.12)', font: SERIF, headingFont: SERIF, radius: '14px', headingWeight: 600, headingTransform: 'none' },
  { id: 'vintage', name: 'Vintage', description: "Parchment with rust", bg: '#efe6d2', surface: '#f7f0de', text: '#3a2e1f', muted: '#7d6b51', accent: '#9a3412', accentText: '#f7f0de', border: '#d9ccb1', font: SERIF, headingFont: SERIF, radius: '14px', headingWeight: 700, headingTransform: 'none' },
  { id: 'sport', name: 'Sport', description: "Black with cyan", bg: '#0a0a0a', surface: '#151515', text: '#ffffff', muted: '#a1a1a1', accent: '#22d3ee', accentText: '#0a0a0a', border: 'rgba(255,255,255,0.12)', font: GROTESK, headingFont: GROTESK, radius: '14px', headingWeight: 800, headingTransform: 'uppercase' },
  { id: 'event', name: 'Event', description: "Indigo night with pink", bg: '#1e1b4b', surface: '#312e81', text: '#eef2ff', muted: '#a5b4fc', accent: '#f472b6', accentText: '#1e1b4b', border: 'rgba(238,242,255,0.14)', font: SANS, headingFont: SANS, radius: '14px', headingWeight: 800, headingTransform: 'none' },
  { id: 'photo', name: 'Photo', description: "Black with golden accent", bg: '#111111', surface: '#1a1a1a', text: '#f0f0f0', muted: '#909090', accent: '#fbbf24', accentText: '#111111', border: 'rgba(240,240,240,0.12)', font: SANS, headingFont: SANS, radius: '14px', headingWeight: 700, headingTransform: 'none' },
  { id: 'garden', name: 'Garden', description: "Sage mist with moss", bg: '#f1f5ec', surface: '#ffffff', text: '#26351f', muted: '#6b7d5c', accent: '#4d7c0f', accentText: '#ffffff', border: '#d6e0c8', font: SERIF, headingFont: SERIF, radius: '14px', headingWeight: 600, headingTransform: 'none' },
  { id: 'coastal', name: 'Coastal', description: "Sea glass with ocean blue", bg: '#eaf6fb', surface: '#ffffff', text: '#103447', muted: '#4f7d91', accent: '#0891b2', accentText: '#ffffff', border: '#c6e5f0', font: ROUNDED, headingFont: ROUNDED, radius: '14px', headingWeight: 700, headingTransform: 'none' },
  { id: 'rustic', name: 'Rustic', description: "Walnut with honey", bg: '#3b2f2a', surface: '#4a3b34', text: '#f4ebe1', muted: '#c8b6a4', accent: '#e0a458', accentText: '#3b2f2a', border: 'rgba(244,235,225,0.14)', font: SERIF, headingFont: SERIF, radius: '14px', headingWeight: 700, headingTransform: 'none' },
];

const SUITS = {
  midnight: { suits: "Tech start-ups, creative agencies and evening venues", mood: "Dark, modern, calm glow" },
  paper: { suits: "Writers, editors, bookshops and quiet professionals", mood: "Light, editorial, considered" },
  bold: { suits: "Brands that want to shout: fitness, streetwear, launches", mood: "Loud, confident, high contrast" },
  minimal: { suits: "Any business that wants nothing to distract from the work", mood: "Neutral, clean, uncluttered" },
  warm: { suits: "Family businesses, hospitality, community services", mood: "Earthy, friendly, personal" },
  ink: { suits: "Fashion, design studios and premium services", mood: "Stark, sophisticated, black and white" },
  forest: { suits: "Outdoor businesses, eco brands and nature services", mood: "Deep green, growing, grounded" },
  blueprint: { suits: "Architects, engineers, technical and construction firms", mood: "Technical, precise, drawn" },
  sand: { suits: "Holiday rentals, spas, wellness and Mediterranean feel", mood: "Sunny, relaxed, natural" },
  concrete: { suits: "Architecture, industrial design and urban brands", mood: "Raw, solid, modern" },
  neon: { suits: "Gaming, music, night events and energy drinks", mood: "Electric, playful, after dark" },
  ocean: { suits: "Swim schools, travel, cleaning and health services", mood: "Light, clean, fresh" },
  plum: { suits: "Boutique hotels, beauty, luxury and events", mood: "Rich, romantic, a little bold" },
  rust: { suits: "Workshops, mechanics, craft breweries and heritage makers", mood: "Rugged, bold, hand-made" },
  iron: { suits: "Gyms, personal training, strength and boxing studios", mood: "Strong, disciplined, energetic" },
  studio: { suits: "Yoga, pilates, dance and class studios", mood: "Warm, airy, welcoming" },
  pulse: { suits: "Dance, nightlife, music classes and event trainers", mood: "Lively, modern, after-hours" },
  tradesman: { suits: "Builders, plumbers, electricians and garages", mood: "Practical, reliable, direct" },
  slate: { suits: "Surveyors, accountants, property and engineering firms", mood: "Calm, precise, trustworthy" },
  workshop: { suits: "Makers, joiners, metalwork and repair workshops", mood: "Hands-on, honest, crafted" },
  bistro: { suits: "Restaurants, wine bars and fine dining", mood: "Intimate, refined, evening" },
  cafe: { suits: "Cafés, coffee shops and brunch spots", mood: "Cosy, friendly, unhurried" },
  fresh: { suits: "Juice bars, healthy food, grocers and farm shops", mood: "Clean, natural, lively" },
  bakery: { suits: "Bakeries, patisseries and dessert shops", mood: "Soft, cheerful, homemade" },
  calm: { suits: "Therapists, counsellors, massage and wellbeing clinics", mood: "Gentle, safe, reassuring" },
  serene: { suits: "Meditation teachers, retreats and holistic practitioners", mood: "Quiet, thoughtful, spiritual" },
  clinic: { suits: "Dentists, physiotherapy, opticians and medical practices", mood: "Clear, clean, professional" },
  spa: { suits: "Beauty salons, spas, nail bars and barbers", mood: "Soft, luxurious, personal" },
  mentor: { suits: "Business coaches, tutors and consultants", mood: "Confident, focused, forward-looking" },
  advisor: { suits: "Lawyers, financial advisers and private consultants", mood: "Measured, credible, understated" },
  modern: { suits: "Software, digital agencies and tech services", mood: "Sharp, contemporary, capable" },
  portfolio: { suits: "Designers, photographers and freelance creatives", mood: "Minimal, gallery-like, confident" },
  boutique: { suits: "Clothing boutiques, gift shops and bridal", mood: "Feminine, elegant, curated" },
  market: { suits: "Farmers markets, florists, local shops and makers", mood: "Friendly, local, seasonal" },
  gallery: { suits: "Art galleries, antiques, jewellers and fine craft", mood: "Quiet, premium, collected" },
  vintage: { suits: "Second-hand shops, record stores and heritage retailers", mood: "Nostalgic, handmade, characterful" },
  sport: { suits: "Sports shops, running clubs, cycling and team kit", mood: "Fast, bold, competitive" },
  event: { suits: "Event venues, festivals, party planners and DJs", mood: "Celebratory, vivid, memorable" },
  photo: { suits: "Photographers, videographers and film makers", mood: "Cinematic, bold imagery, dark room" },
  garden: { suits: "Landscapers, garden centres, florists and allotments", mood: "Natural, grounded, growing" },
  coastal: { suits: "Surf schools, boat hire, seaside cafés and holiday lets", mood: "Breezy, relaxed, sunny" },
  rustic: { suits: "Farms, cabins, bakeries with heritage and country pubs", mood: "Warm, traditional, rooted" },
};

// Each look with what kind of business it suits and its mood, for the look picker.
const PRESETS_WITH_META = PRESETS.map((preset) => ({ ...preset, ...(SUITS[preset.id] || {}) }));

const PRESET_IDS = PRESETS.map((preset) => preset.id);

// Scroll effects. "reveal" fades sections in as they enter the screen. "stack" makes each section overlap the one before it.
const EFFECTS = ['none', 'reveal', 'stack'];

module.exports = { PRESETS: PRESETS_WITH_META, PRESET_IDS, EFFECTS };
