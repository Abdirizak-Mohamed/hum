import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['hum-core', 'hum-onboarding', 'hum-integrations'],
  serverExternalPackages: ['pg'],
};

export default nextConfig;
