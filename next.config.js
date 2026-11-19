const path = require('path');

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,

  // `next build` otherwise re-runs ESLint; CI already has an explicit lint
  // step, so keep the build to compile + type-check only.
  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    // Keep ESM-only packages bundled: Next 12 otherwise emits
    // `import("@supabase/supabase-js")` into the server build, and Node 18
    // cannot load that package's ESM wrapper (its .js files are CJS).
    esmExternals: false,
  },

  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
  },

  async rewrites() {
    return [
      // Auth routes
      { source: '/signin', destination: '/auth/signin' },
      { source: '/signup', destination: '/auth/signup' },
      { source: '/account', destination: '/auth/account' },
      { source: '/forgot-password', destination: '/auth/forgot-password' },
      { source: '/reset-password', destination: '/auth/reset-password' },
      { source: '/callback', destination: '/auth/callback' },
    ];
  },

  webpack: (config) => {
    // @supabase/supabase-js ships an ESM wrapper (`dist/esm/wrapper.mjs`) that
    // Next 12's webpack cannot resolve. Point it at the CommonJS build instead.
    config.resolve.alias['@supabase/supabase-js'] = path.resolve(
      __dirname,
      'node_modules/@supabase/supabase-js/dist/main/index.js'
    );
    return config;
  },
};
