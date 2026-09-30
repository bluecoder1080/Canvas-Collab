/** @type {import('next').NextConfig} */
const nextConfig = {
  // Our workspace packages ship compiled JS; let Next compile TS sources.
  transpilePackages: ["@repo/shared"],
};

export default nextConfig;
