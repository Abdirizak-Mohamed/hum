import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'hum-core'],
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = [...(config.externals || []), 'hum-core'];
    }
    return config;
  },
};

export default nextConfig;
