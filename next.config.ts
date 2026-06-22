import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb',
    },
  },
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default nextConfig;
