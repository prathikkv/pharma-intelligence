/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enhanced environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
  },

  // API configuration for better performance
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Max-Age', value: '86400' },
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
    ];
  },

  // Optimize for serverless functions
  experimental: {
    serverComponentsExternalPackages: [],
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization (if needed for future enhancements)
  images: {
    domains: ['www.ebi.ac.uk', 'www.uniprot.org', 'clinicaltrials.gov'],
    formats: ['image/webp', 'image/avif'],
  },

  // Webpack configuration for better bundle optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle size
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

    // Handle potential issues with external API calls
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      });
    }

    return config;
  },

  // Redirect configuration for better UX
  async redirects() {
    return [
      {
        source: '/search',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // Enhanced security headers
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
    ];
  },
};

module.exports = nextConfig;
