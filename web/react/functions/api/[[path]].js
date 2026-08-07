/**
 * Cloudflare Pages Function — API Proxy
 *
 * Proxies all /api/* requests to the Ziggner backend Worker.
 * Set BACKEND_URL in Cloudflare Pages environment variables
 * (Settings → Environment variables → Production).
 *
 * Default: https://ziggner-backend.<your-subdomain>.workers.dev
 */

const BACKEND_URL = typeof env !== "undefined" && env.BACKEND_URL
  ? env.BACKEND_URL
  : "https://ziggner-backend.workers.dev";

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Build the backend URL
  const backendUrl = `${BACKEND_URL}${url.pathname}${url.search}`;

  // Clone the request with the backend URL
  const proxyRequest = new Request(backendUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "manual",
  });

  // Add forwarded headers
  proxyRequest.headers.set("X-Forwarded-Host", url.hostname);
  proxyRequest.headers.set("X-Forwarded-Proto", "https");

  try {
    const response = await fetch(proxyRequest);

    // Return the response with CORS headers
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    newResponse.headers.set("Access-Control-Allow-Origin", url.origin);
    newResponse.headers.set("Access-Control-Allow-Credentials", "true");

    return newResponse;
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Backend unavailable", detail: error.message }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Handle CORS preflight
export async function onRequestOptions(context) {
  const { request } = context;
  const url = new URL(request.url);

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": url.origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRFToken",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}
