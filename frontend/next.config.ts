import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://168.138.202.82:8081'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
