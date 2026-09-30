/** @type {import('next').NextConfig} */
const nextConfig = {
  // Our workspace packages ship compiled JS; let Next compile TS sources.
  transpilePackages: ["@repo/shared"],

  // Local-dev only: proxy same-origin /api/* to the Express backend, so the
  // frontend can use relative API URLs everywhere (see lib/config.ts).
  // This never fires in production: Vercel's top-level /api/* rewrite routes
  // to the http-backend service before requests reach the web service.
  // (`vercel dev` also uses vercel.json routing, so no proxy is needed there.)
  async rewrites() {
    if (process.env.VERCEL || process.env.NEXT_PUBLIC_HTTP_URL) return [];
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
