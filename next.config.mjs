/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com', 'm.media-amazon.com'], // allow Cloudinary images
  },
  // The admin panel was folded into /dashboard. Old links keep working.
  async redirects() {
    return [
      { source: '/admin', destination: '/dashboard', permanent: false },
      { source: '/admin/add-product', destination: '/dashboard/products', permanent: false },
      { source: '/admin/orders', destination: '/dashboard/orders', permanent: false },
      { source: '/admin/posts', destination: '/dashboard/posts', permanent: false },
      { source: '/admin/:path*', destination: '/dashboard', permanent: false },
    ];
  },
};

export default nextConfig;
