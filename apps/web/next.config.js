/** @type {import('next').NextConfig} */
const nextConfig = {
  // Our workspace packages ship compiled JS; let Next compile TS sources.
  transpilePackages: ["@repo/shared"],

  // Local-dev only: proxy same-origin /api/* to the Express backend, so the
  // frontend can use relative API URLs everywhere (see lib/config.ts).
  // This never fires in production: Vercel's top-level /api/* rewrite routes
  // to the http-backend service before requests reach the web service
  // (`vercel dev` uses vercel.json routing too). If you change the backend
  // PORT in apps/http-backend/.env, update the URL below to match.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
