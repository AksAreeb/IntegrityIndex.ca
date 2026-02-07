import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pg"],
  experimental: {
    ...({
      instrumentationHook: true,
    } as Record<string, unknown>),
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  async redirects() {
    return [{ source: "/mps", destination: "/members", permanent: false }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.ourcommons.ca",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.ola.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "represent.opennorth.ca",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
