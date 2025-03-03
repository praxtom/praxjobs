import { defineMiddleware } from "astro/middleware";

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
  const response = await next();

  // Cache static assets
  if (url.pathname.startsWith('/assets/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000');
  }

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
});
