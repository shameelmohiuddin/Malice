import type { NextConfig } from "next";
const nextConfig: NextConfig = { transpilePackages: ["@classpilot/core"], serverExternalPackages: ["playwright"] };
export default nextConfig;
