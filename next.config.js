/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  reactStrictMode: true,
  swcMinify: true,
  
  // Image optimization
  images: {
    domains: ['clinicaltrials.gov', 'ebi.ac.uk', 'ncbi.nlm.nih.gov'],
    unoptimized: true // For static export if needed
  },
  
  // API routes configuration
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ];
  },
  
  // Webpack configuration for better bundling
  webpack: (config, { dev, isServer }) => {
    // Optimize for production
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    
    // Handle potential module resolution issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY || 'default_value',
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Experimental features for better performance
  experimental: {
    // Enable modern JavaScript features
    esmExternals: true,
    // Server components (if using Next.js 13+)
    appDir: false, // Set to true if using app directory
    // Webpack build worker for faster builds
    webpackBuildWorker: true,
  },
  
  // Output configuration for deployment
  trailingSlash: false,
  
  // Custom build ID for cache busting
  generateBuildId: async () => {
    return 'pharma-intelligence-' + Date.now();
  },
  
  // Redirect configuration
  async redirects() {
    return [
      {
        source: '/docs',
        destination: '/api/docs',
        permanent: true,
      },
    ];
  },
  
  // TypeScript configuration (if using TypeScript)
  typescript: {
    // Ignore type errors during build (use with caution)
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    // Ignore ESLint errors during build (use with caution)
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;