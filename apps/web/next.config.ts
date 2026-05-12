import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  typedRoutes: true,
  transpilePackages: ['@tmh/api-client', '@tmh/types'],
  outputFileTracingRoot: path.join(__dirname, '../..'),
};

export default nextConfig;
