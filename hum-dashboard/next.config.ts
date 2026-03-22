import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'hum-core'],
  webpack(config) {
    // hum-core's migrate() method references './migrations' via import.meta.url at
    // runtime, but webpack cannot resolve that path at build time. Since we never
    // call .migrate() from the dashboard (migrations run via drizzle-kit), we
    // safely alias the folder to false to prevent the build error.
    config.resolve.alias = {
      ...config.resolve.alias,
      // Resolve the literal specifier that appears in hum-core/dist/db/connection.js
      './migrations': false,
    };
    return config;
  },
};

export default nextConfig;
