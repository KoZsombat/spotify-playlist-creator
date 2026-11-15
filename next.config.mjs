/** @type {import("next").NextConfig} */
const nextConfig = {
  // Standalone output is only for the container image; local builds keep
  // `next start` working as usual.
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" } : {}),
  serverExternalPackages: ["pg"],
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
