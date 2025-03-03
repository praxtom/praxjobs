import type { APIRoute } from 'astro';

const pages = [
  "",
  "about",
  "login",
  "register",
  "pricing",
  "dashboard",
  "job-analysis",
  "resume",
  "cover-letter",
  "job-tracker",
  "interview-prep",
  "forgot-password"
];

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    return new Response('Site URL not defined', { status: 500 });
  }
  
  const baseUrl = site.toString().replace(/\/$/, '');
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages.map(page => `
  <url>
    <loc>${baseUrl}/${page}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page === "" ? "daily" : "weekly"}</changefreq>
    <priority>${page === "" ? "1.0" : "0.8"}</priority>
  </url>`).join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};
