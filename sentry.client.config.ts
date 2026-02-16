import * as Sentry from "@sentry/astro";

Sentry.init({
  spotlight: true,
  defaultIntegrations: false,
});
