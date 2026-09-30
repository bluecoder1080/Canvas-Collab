/** @type {import('next').NextConfig} */
const nextConfig = {
  // Our workspace packages ship raw TS -> compiled JS; let Next compile them.
  transpilePackages: ["@repo/shared", "@repo/ui"],
};

export default nextConfig;
