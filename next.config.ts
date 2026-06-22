import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The Forge video pipeline shells out to ffmpeg/ffprobe via the static-binary
  // packages; force their binaries into the function bundle (Vercel can't trace
  // ffprobe-static's runtime-computed path). Use EXACT linux/x64 file paths — a
  // `bin/linux/**` glob did not get picked up — and key broadly so it lands in
  // whichever function bundles the Forge server actions.
  outputFileTracingIncludes: {
    '/**': [
      'node_modules/ffmpeg-static/ffmpeg',
      'node_modules/ffprobe-static/bin/linux/x64/ffprobe',
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
