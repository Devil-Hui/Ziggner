/**
 * Cloudflare Pages Middleware — Admin Subdomain Router
 *
 * When accessing admin.ziggner.com, automatically redirects to /admin/*
 * so the React SPA renders the admin panel.
 *
 * - ziggner.com      → serves public pages (Home, Category, etc.)
 * - admin.ziggner.com → redirects to /admin/* (admin dashboard)
 */

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Only intercept admin subdomain
  if (url.hostname !== "admin.ziggner.com") {
    return next();
  }

  // Pass through API proxy requests
  if (url.pathname.startsWith("/api/")) {
    return next();
  }

  // Pass through static assets (JS, CSS, images, fonts, etc.)
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/images/") ||
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/.test(
      url.pathname
    )
  ) {
    return next();
  }

  // If already on an /admin path, serve normally (SPA handles routing)
  if (url.pathname.startsWith("/admin")) {
    return next();
  }

  // Redirect root and other paths to /admin
  const adminPath = url.pathname === "/" ? "/admin" : "/admin" + url.pathname;
  const adminUrl = new URL(adminPath + url.search, url.origin);
  return Response.redirect(adminUrl.toString(), 302);
}
