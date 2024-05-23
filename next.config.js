const withLess = require("next-with-less");
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

let moduleExports = {
  experimental: {
    swcPlugins: [["next-superjson-plugin", {}]],
    appDir: false
  },
  lessLoaderOptions: {
    /* ... */
  },
  staticPageGenerationTimeout: 60 * 60,
  images: {
    domains: ['assets.coingecko.com'],
  },
  env: {
    'TZ': 'UTC',
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=9999999999, must-revalidate',
          }
        ],
      }
    ]
  },
  async redirects() {
    return [
      {
        source: '/categories',
        destination: '/category',
        permanent: true,
      },
    ]
  },
}
moduleExports = withLess(moduleExports)
moduleExports = withBundleAnalyzer(moduleExports)

module.exports = moduleExports;