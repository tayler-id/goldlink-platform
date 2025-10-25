/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // Proxy API requests to backend server (development only)
  async rewrites() {
    // Only use rewrites in development, production uses environment variables
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    return [
      {
        source: '/bmapi/:path*',
        destination: 'https://localhost:3005/bmapi/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'https://localhost:3005/socket.io/:path*',
      },
    ];
  },

  // Allow self-signed certificates in development
  webpack: (config, { isServer }) => {
    if (isServer) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    return config;
  },
}

export default nextConfig
