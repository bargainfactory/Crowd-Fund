// Dynamic sitemap — lists static pages (per locale) and active campaigns.
// Served at /sitemap.xml and referenced from robots.txt.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://crowdfundafrica.com';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const LOCALES = ['en', 'fr', 'es', 'ar', 'wo'];

const STATIC_PATHS = [
  { path: '', priority: '1.0', changefreq: 'daily' },
  { path: '/campaigns', priority: '0.9', changefreq: 'hourly' },
  { path: '/auth/register', priority: '0.5', changefreq: 'monthly' },
  { path: '/auth/login', priority: '0.4', changefreq: 'monthly' }
];

function url({ loc, lastmod, changefreq, priority, alternates }) {
  const alt = (alternates || [])
    .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`)
    .join('\n');
  return `  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${alt ? `\n${alt}` : ''}
  </url>`;
}

function buildSitemap(campaigns) {
  const entries = [];

  for (const { path, priority, changefreq } of STATIC_PATHS) {
    const alternates = LOCALES.map((l) => ({
      hreflang: l,
      href: `${SITE_URL}${l === 'en' ? '' : `/${l}`}${path}`
    }));
    alternates.push({ hreflang: 'x-default', href: `${SITE_URL}${path}` });
    entries.push(url({ loc: `${SITE_URL}${path}`, changefreq, priority, alternates }));
  }

  for (const c of campaigns) {
    if (!c?._id) continue;
    entries.push(
      url({
        loc: `${SITE_URL}/campaigns/${c._id}`,
        lastmod: c.updatedAt ? new Date(c.updatedAt).toISOString() : undefined,
        changefreq: 'daily',
        priority: '0.8'
      })
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  let campaigns = [];
  try {
    const r = await fetch(`${API_BASE}/api/campaigns?status=active&limit=1000&fields=_id,updatedAt`, {
      headers: { Accept: 'application/json' }
    });
    if (r.ok) {
      const json = await r.json();
      campaigns = json?.data || [];
    }
  } catch {
    // If the API is unreachable, still emit a valid sitemap with static pages.
  }

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(buildSitemap(campaigns));
  res.end();

  return { props: {} };
}

export default function Sitemap() {
  return null;
}
