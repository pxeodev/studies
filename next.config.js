const withLess = require("next-with-less");
const { withSuperjson } = require('next-superjson')
const { withSentryConfig } = require('@sentry/nextjs');

let moduleExports = {
  lessLoaderOptions: {
    /* ... */
  },
  reactStrictMode: true,
  staticPageGenerationTimeout: 60 * 60,
  images: {
    domains: ['assets.coingecko.com'],
  },
  env: {
    'TZ': 'UTC',
  },
}
moduleExports = withLess(withSuperjson()(moduleExports))
moduleExports = withSentryConfig(moduleExports, {
  // Additional config options for the Sentry Webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, org, project, authToken, configFile, stripPrefix,
  //   urlPrefix, include, ignore

  silent: true, // Suppresses all logs
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options.
})

module.exports = moduleExports;