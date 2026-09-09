import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0.05,
  // The free plan includes only 50 replays monthly. Keep routine recording off
  // and preserve that allowance for a small sample of sessions with errors.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.05,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
