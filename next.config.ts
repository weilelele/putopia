import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Videos now upload browser→Supabase via a signed URL (not through this
      // cap), but keep headroom for other multipart actions. Note: on Vercel the
      // platform still caps server-action request bodies at ~4.5 MB regardless.
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
