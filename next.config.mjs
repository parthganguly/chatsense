/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  transpilePackages: ["@chatsense/core"],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
