/** @type {import('next').NextConfig} */
const backend = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";

const nextConfig = {
  images: {
    domains: ["api.dicebear.com", "images.unsplash.com", "source.unsplash.com"],
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/health", destination: `${backend}/health` },
      { source: "/ready", destination: `${backend}/ready` },
    ];
  },
};

module.exports = nextConfig;
