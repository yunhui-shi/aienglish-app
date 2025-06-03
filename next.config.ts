import type { NextConfig } from "next";
import { env } from 'next-runtime-env';
const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_API_URL: env('NEXT_PUBLIC_API_URL') || 'http://localhost:8000',
  },
};

export default nextConfig;
