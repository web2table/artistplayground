import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const basePath = isGitHubPages ? '/artistplayground' : '';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  ...(basePath ? { basePath, assetPrefix: basePath + '/' } : {}),
};

export default nextConfig;
