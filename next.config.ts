import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Keep build discovery inside this repository. This also makes cloud builds
    // independent of any unrelated lockfiles in a parent directory.
    root: __dirname,
  },
};

export default nextConfig;
