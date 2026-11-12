import type { NextConfig } from "next";
const nextConfig: NextConfig = { transpilePackages: ["@bunk/core"], serverExternalPackages: ["playwright"] };
export default nextConfig;
