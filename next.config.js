const withLess = require("next-with-less");
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

let moduleExports = {
  experimental: {
    swcPlugins: [["next-superjson-plugin", {}]],
    appDir: true,
    instrumentationHook: true,
  },
  lessLoaderOptions: {
    /* ... */
  },
  staticPageGenerationTimeout: 60 * 60,
  images: {
    domains: ['assets.coingecko.com', 'coin-images.coingecko.com'],
  },
  env: {
    'TZ': 'UTC',
  },
  webpack: (config, { isServer }) => {
    // Handle React Native dependencies for Web3Auth
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'react-native': false,
    };

    // Ignore React Native modules
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        '@react-native-async-storage/async-storage': 'false',
        'react-native': 'false',
      });
    }

    return config;
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
        // Fix Web3Auth COOP issues for social login
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'unsafe-none',
          },
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
      {
        source: '/category/Finance',
        destination: '/category/Finance-Banking',
        permanent: true,
      },
      {
        source: '/category/DAO-Maker-IDO',
        destination: '/category/DaoMaker-Launchpad',
        permanent: true,
      },
      {
        source: '/category/DeFi',
        destination: '/category/Decentralized-Finance-%28DeFi%29',
        permanent: true,
      },
      {
        source: '/category/Technology',
        destination: '/category/Technology-and-Science',
        permanent: true,
      },
      {
        source: '/category/Gold',
        destination: '/category/Tokenized-Gold',
        permanent: true,
      },
      {
        source: '/category/Identity',
        destination: '/category/Decentralized-Identifier-%28DID%29',
        permanent: true,
      },
      {
        source: '/category/Animoca-Brands',
        destination: '/category/Animoca-Brands-Portfolio',
        permanent: true,
      },
      {
        source: '/category/BRC-20-Token',
        destination: '/category/BRC-20',
        permanent: true,
      },
      {
        source: '/category/PAAL-AI',
        destination: '/category/PAAL-AI-Launchpad',
        permanent: true,
      },
      {
        source: '/category/TokenSets',
        destination: '/category/TokenSets-Ecosystem',
        permanent: true,
      },
      {
        source: '/category/TON-Meme-Coins',
        destination: '/category/TON-Meme',
        permanent: true,
      },
      {
        source: '/category/Elon-Musk-Inspired-Coins',
        destination: '/category/Elon-Musk-Inspired',
        permanent: true,
      },
      {
        source: '/category/Frog-Themed-Coins',
        destination: '/category/Frog-Themed',
        permanent: true,
      },
      {
        source: '/category/Cat-Themed-Coins',
        destination: '/category/Cat-Themed',
        permanent: true,
      },
      {
        source: '/category/Parody-Themed-Coins',
        destination: '/category/Parody-Themed',
        permanent: true,
      },
      {
        source: '/category/Solana-Themed-Coins',
        destination: '/category/Solana-Themed',
        permanent: true,
      },
      {
        source: '/category/IOT',
        destination: '/category/Internet-of-Things-%28IOT%29',
        permanent: true,
      },
    ]
  },
}
moduleExports = withLess(moduleExports)
moduleExports = withBundleAnalyzer(moduleExports)

module.exports = moduleExports;