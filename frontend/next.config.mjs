/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'media.istockphoto.com',
      'images.unsplash.com',
      'plus.unsplash.com',
      'ipfs.io',
      'gateway.pinata.cloud',
      // Add any other domains you need to load images from
    ],
  },
  reactStrictMode: true,
  
  // Add this line to enable static exports
  output: 'standalone',
};

export default nextConfig;
