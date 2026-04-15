import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma must stay external in the server bundle (incl. Server Actions) so the
  // query engine loads correctly. Missing this often surfaces as connection/query failures.
  serverExternalPackages: ["@prisma/client", "@prisma/engines"],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
