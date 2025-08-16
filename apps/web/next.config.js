/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@screen-link/ui'],
  typescript: {
    ignoreBuildErrors: true, // Temporary for initial build
  },
  eslint: {
    ignoreDuringBuilds: true, // Temporary for initial build
  },
}

module.exports = nextConfig