import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "localhost";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
    ],
  },
  async redirects() {
    // URLs antigas do Shopkit que mudaram de nome
    return [
      { source: "/home", destination: "/", permanent: true },
      { source: "/categories", destination: "/catalog", permanent: true },
      { source: "/cart", destination: "/checkout", permanent: false },
      { source: "/brands/:slug", destination: "/brand/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
