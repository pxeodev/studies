const withLess = require("next-with-less");
const { withSentryConfig } = require('@sentry/nextjs');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

let moduleExports = {
  experimental: {
    swcPlugins: [["next-superjson-plugin", {}]],
  },
  lessLoaderOptions: {
    /* ... */
  },
  sentry: {
    hideSourceMaps: true
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
      },
      {
        source: "/api/prenftwithelist",
        headers: [
            { key: "Access-Control-Allow-Credentials", value: "false" },
            { key: "Access-Control-Allow-Origin", value: "*" },
            { key: "Access-Control-Allow-Methods", value: "POST" },
            { key: "Access-Control-Allow-Headers", value: "*" },
        ]
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
moduleExports = withSentryConfig(moduleExports, {
  // Additional config options for the Sentry Webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, org, project, authToken, configFile, stripPrefix,
  //   urlPrefix, include, ignore

  authToken: 'e41aa3e82996443d94086d83bc8d4f9bdf1668e6995c45998db4ef64baddfeff',
  silent: true, // Suppresses all logs
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options.
})
moduleExports = withBundleAnalyzer(moduleExports)

module.exports = moduleExports;