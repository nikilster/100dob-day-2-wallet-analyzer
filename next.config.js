/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: config => {
    config.externals = [...(config.externals || []), 'pino-pretty', 'lokijs', 'encoding']
    return config
  },
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  }
}

module.exports = nextConfig 