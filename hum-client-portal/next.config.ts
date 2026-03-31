import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['hum-core', 'hum-integrations'],
  serverExternalPackages: ['pg'],
};

export default nextConfig;
