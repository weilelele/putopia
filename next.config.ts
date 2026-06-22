import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The Forge video pipeline shells out to ffmpeg/ffprobe via the static-binary
  // packages; force their binaries into the admin function bundle (Vercel won't
  // trace a runtime-resolved binary path on its own).
  outputFileTracingIncludes: {
    '/admin/signal-tasks': [
      './node_modules/ffmpeg-static/ffmpeg',
      './node_modules/ffprobe-static/bin/linux/**',
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
