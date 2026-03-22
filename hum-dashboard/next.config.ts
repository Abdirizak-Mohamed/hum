import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['hum-core'],
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
