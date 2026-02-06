import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.ourcommons.ca",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
