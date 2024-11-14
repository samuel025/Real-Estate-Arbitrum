/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    domains: [
      'media.istockphoto.com',
      'images.unsplash.com',
      'plus.unsplash.com',
      'ipfs.io',
      'gateway.pinata.cloud',
    ],
  },
  reactStrictMode: true,
  output: 'standalone',
};

export default nextConfig;