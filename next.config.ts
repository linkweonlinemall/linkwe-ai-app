import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs/config"

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
    ],
  },
  serverExternalPackages: ["@prisma/client", "@prisma/engines"],
  experimental: {
    serverActions: {
      // Covers AI chat images (Rex vendor assistant) + user uploads that fall
      // back to the original file if client-side compression fails.
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: "linkwe-online-mall",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  sourcemaps: {
    // Error monitoring works without an auth token. Source-map uploads can be
    // enabled later after a narrowly scoped Sentry token is added to Vercel.
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
