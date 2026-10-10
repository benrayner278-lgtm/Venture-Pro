export type WebsiteContent = {
  brand: { name: string; tagline: string };
  hero: { headline: string; subheadline: string; primaryCta: string; secondaryCta: string };
  problem: { title: string; points: string[] };
  solution: { title: string; body: string };
  features: { title: string; description: string }[];
  benefits: { title: string; description: string }[];
  faq: { question: string; answer: string }[];
  finalCta: { headline: string; button: string };
  footer: { note: string };
};

export type WebsiteTheme = {
  id: string;
  name: string;
  description: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  border: string;
  font: string;
  radius: string;
  headingWeight: number;
  headingTransform: 'none' | 'uppercase';
};

const SANS = "Inter, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export const WEBSITE_THEMES: WebsiteTheme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark with a soft blue glow',
    bg: '#05070d',
    surface: '#0d1220',
    text: '#e5e7eb',
    muted: '#94a3b8',
    accent: '#60a5fa',
    accentText: '#05070d',
    border: 'rgba(148,163,184,0.18)',
    font: SANS,
    radius: '16px',
    headingWeight: 700,
    headingTransform: 'none',
  },
  {
    id: 'paper',
    name: 'Paper',
    description: 'Light and editorial',
    bg: '#faf7f2',
    surface: '#ffffff',
    text: '#1c1917',
    muted: '#78716c',
    accent: '#1c1917',
    accentText: '#faf7f2',
    border: '#e7e5e4',
    font: SERIF,
    radius: '4px',
    headingWeight: 600,
    headingTransform: 'none',
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'High contrast with large type',
    bg: '#000000',
    surface: '#111111',
    text: '#ffffff',
    muted: '#a3a3a3',
    accent: '#facc15',
    accentText: '#000000',
    border: '#262626',
    font: SANS,
    radius: '0px',
    headingWeight: 900,
    headingTransform: 'uppercase',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Monochrome and clean',
    bg: '#ffffff',
    surface: '#fafafa',
    text: '#111111',
    muted: '#6b7280',
    accent: '#111111',
    accentText: '#ffffff',
    border: '#e5e7eb',
    font: SANS,
    radius: '10px',
    headingWeight: 600,
    headingTransform: 'none',
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Earthy and friendly',
    bg: '#2a1f17',
    surface: '#3a2b20',
    text: '#fdf6ec',
    muted: '#d6c3ab',
    accent: '#f59e0b',
    accentText: '#2a1f17',
    border: 'rgba(253,246,236,0.14)',
    font: "'Trebuchet MS', Arial, sans-serif",
    radius: '20px',
    headingWeight: 700,
    headingTransform: 'none',
  },
];

const escapeHtml = (text: string) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function renderWebsite(content: WebsiteContent, themeId: string): string {
  const t = WEBSITE_THEMES.find((theme) => theme.id === themeId) ?? WEBSITE_THEMES[0];
  const e = escapeHtml;
  const features = content.features ?? [];
  const benefits = content.benefits ?? [];
  const faq = content.faq ?? [];
  const points = content.problem?.points ?? [];

  const cards = (items: { title: string; description: string }[]) =>
    items
      .map((item) => `<div class="card"><h3>${e(item.title)}</h3><p>${e(item.description)}</p></div>`)
      .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(content.brand?.name)}</title>
<style>
:root{--bg:${t.bg};--surface:${t.surface};--text:${t.text};--muted:${t.muted};--accent:${t.accent};--accent-text:${t.accentText};--border:${t.border};--radius:${t.radius}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:${t.font};line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
nav{display:flex;justify-content:space-between;align-items:center;padding:24px 0}
.brand{font-weight:700;letter-spacing:-0.01em;font-size:18px}
.btn{display:inline-block;padding:14px 26px;border-radius:var(--radius);font-weight:600;text-decoration:none;font-size:15px}
.btn-primary{background:var(--accent);color:var(--accent-text)}
.btn-secondary{border:1px solid var(--border)}
section{padding:96px 0;border-top:1px solid var(--border)}
.hero{padding:120px 0 104px;text-align:center;border-top:none}
h1,h2,h3{font-weight:${t.headingWeight};text-transform:${t.headingTransform};letter-spacing:-0.02em;line-height:1.1}
h1{font-size:clamp(40px,6vw,72px);margin:0 0 22px}
h2{font-size:clamp(28px,4vw,44px);margin:0 0 20px}
.sub{font-size:19px;color:var(--muted);max-width:640px;margin:0 auto 36px}
.centre{text-align:center}
.actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.lead{font-size:18px;color:var(--muted);max-width:720px;margin:0 auto}
ul.points{list-style:none;padding:0;margin:28px auto 0;max-width:640px;text-align:left}
ul.points li{padding:14px 0;border-bottom:1px solid var(--border);color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;margin-top:48px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px}
.card h3{margin:0 0 10px;font-size:18px;text-transform:none;font-weight:600}
.card p{margin:0;color:var(--muted);font-size:15px}
details{border-bottom:1px solid var(--border);padding:22px 0;max-width:720px;margin:0 auto}
summary{cursor:pointer;font-weight:600;font-size:17px;list-style:none}
details p{color:var(--muted);margin:12px 0 0}
footer{padding:40px 0;border-top:1px solid var(--border);color:var(--muted);font-size:14px;text-align:center}
@media (max-width:640px){section{padding:64px 0}.hero{padding:80px 0 64px}nav{flex-direction:column;gap:16px}}
</style>
</head>
<body>
<div class="wrap">
<nav>
  <div class="brand">${e(content.brand?.name)}</div>
  <a class="btn btn-primary" href="#get-started">${e(content.hero?.primaryCta)}</a>
</nav>
</div>

<header class="hero">
<div class="wrap">
  <h1>${e(content.hero?.headline)}</h1>
  <p class="sub">${e(content.hero?.subheadline)}</p>
  <div class="actions">
    <a class="btn btn-primary" href="#get-started">${e(content.hero?.primaryCta)}</a>
    <a class="btn btn-secondary" href="#features">${e(content.hero?.secondaryCta)}</a>
  </div>
</div>
</header>

<section>
<div class="wrap centre">
  <h2>${e(content.problem?.title)}</h2>
  <ul class="points">${points.map((point) => `<li>${e(point)}</li>`).join('')}</ul>
</div>
</section>

<section>
<div class="wrap centre">
  <h2>${e(content.solution?.title)}</h2>
  <p class="lead">${e(content.solution?.body)}</p>
</div>
</section>

<section id="features">
<div class="wrap">
  <h2 class="centre">Features</h2>
  <div class="grid">${cards(features)}</div>
</div>
</section>

<section>
<div class="wrap">
  <h2 class="centre">Benefits</h2>
  <div class="grid">${cards(benefits)}</div>
</div>
</section>

<section>
<div class="wrap">
  <h2 class="centre">Questions</h2>
  ${faq.map((item) => `<details><summary>${e(item.question)}</summary><p>${e(item.answer)}</p></details>`).join('')}
</div>
</section>

<section id="get-started">
<div class="wrap centre">
  <h2>${e(content.finalCta?.headline)}</h2>
  <div class="actions" style="margin-top:32px">
    <a class="btn btn-primary" href="#">${e(content.finalCta?.button)}</a>
  </div>
</div>
</section>

<footer>
<div class="wrap">${e(content.footer?.note)}</div>
</footer>
</body>
</html>`;
}
