import { Container } from "@cloudflare/containers";

/**
 * DjangoContainer - Cloudflare Container running the Ziggner Django backend.
 *
 * The container listens on port 8000 (Gunicorn) via the Dockerfile.prod
 * ENTRYPOINT. The Worker proxies all incoming requests to this container.
 *
 * Environment variables (secrets) that must be set via `wrangler secret put`:
 *   - DJANGO_SECRET_KEY   : Django secret key
 *   - DB_HOST             : MySQL host (e.g. external managed MySQL)
 *   - DB_PORT             : MySQL port (default 3306)
 *   - DB_NAME             : MySQL database name
 *   - DB_USER             : MySQL username
 *   - DB_PASSWORD         : MySQL password
 *   - REDIS_URL           : Redis connection string (e.g. Upstash)
 *   - CELERY_BROKER_URL   : Celery broker URL
 *   - CELERY_RESULT_BACKEND: Celery result backend URL
 */
export class DjangoContainer extends Container {
  defaultPort = 8000;
  sleepAfter = "5m";

  envVars = {
    DJANGO_ENV: "prod",
    SERVICE_TYPE: "django",
    FILE_STORAGE: "r2",
  };

  onStart() {
    console.log("[Ziggner] Django container started");
  }

  onStop() {
    console.log("[Ziggner] Django container stopped");
  }

  onError(error) {
    console.error("[Ziggner] Container error:", error);
  }
}

export default {
  /**
   * Main fetch handler — routes all requests to the Django container.
   * Uses a single named instance ("django-main") for stateful session support.
   */
  async fetch(request, env) {
    // Route all requests to a single Django container instance
    const container = env.DJANGO_CONTAINER.getByName("django-main");
    return await container.fetch(request);
  },
};
