import type { NextConfig } from "next";

const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: supabase.protocol.replace(":", "") as "http" | "https",
        hostname: supabase.hostname,
        port: supabase.port,
        pathname: "/storage/v1/object/public/**",
      },
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
