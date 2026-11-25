import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second, isolated local dev server (e.g. the PGlite test site on
  // port 3100) use its own build folder instead of clashing with `.next`.
  ...(process.env.GHARSAH_DIST_DIR ? { distDir: process.env.GHARSAH_DIST_DIR } : {}),
};

export default nextConfig;
