import nextPwa from "next-pwa";

const withPWA = nextPwa({
  dest: "public",
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      // Default is 1MB — phone photos are often 3-5MB. Allow up to 10MB.
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.supabase.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "irujlajfyhjyenbcsfyd.supabase.co",
        pathname: "/**",
      },
    ],
  },
};

export default withPWA(nextConfig);
