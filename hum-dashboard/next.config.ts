import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'hum-core', 'hum-onboarding', 'hum-integrations'],
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = [...(config.externals || []), 'hum-core', 'hum-onboarding', 'hum-integrations'];
    }
    return config;
  },
};

export default nextConfig;
