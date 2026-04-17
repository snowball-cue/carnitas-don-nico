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
  experimental: {
    typedRoutes: false,
  },
};

export default withPWA(nextConfig);
