import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Next to trace files outside web/ (we import ../data/projects.json).
  outputFileTracingRoot: path.join(__dirname, ".."),
  images: {
    // Project logos come from many external hosts; allow them all.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
