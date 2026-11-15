import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@elderly-care/types', '@elderly-care/shared', '@elderly-care/validation'],
  reactStrictMode: true
};

export default nextConfig;
