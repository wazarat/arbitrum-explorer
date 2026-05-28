/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Project logos come from many external hosts; allow them all.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
