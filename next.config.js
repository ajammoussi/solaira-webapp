module.exports = {
  i18n: {
    locales: ['en'],
    defaultLocale: "en",
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
};