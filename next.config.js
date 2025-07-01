/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Only add environment variables that exist and are custom
  env: {
    // Add your custom environment variables here if needed
    // Example: API_KEY: process.env.API_KEY,
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
        ],
      },
    ];
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Simplified webpack configuration
  webpack: (config, { isServer }) => {
    // Only add necessary external packages for server-side
    if (isServer) {
      config.externals = config.externals || [];
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

  // Health check rewrite
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
