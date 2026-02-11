/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com','m.media-amazon.com'], // allow Cloudinary images
  },
};

export default nextConfig;
