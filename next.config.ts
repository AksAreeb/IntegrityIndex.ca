import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pg"],
  async redirects() {
    return [{ source: "/mps", destination: "/members", permanent: false }];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
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
