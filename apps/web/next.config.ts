import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@pil/domain', '@pil/db', '@pil/testkit'],
}

export default nextConfig
