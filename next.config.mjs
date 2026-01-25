/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@aicr/auth'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
