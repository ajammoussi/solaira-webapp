const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/backend/',
    '<rootDir>/tests/e2e/',
  ],
  collectCoverageFrom: [
    'lib/**/*.{js,jsx}',
    'components/**/*.{js,jsx}',
    'pages/api/**/*.js',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    // Honest floor rather than an aspiration: the suite focuses on the data
    // layer, API routes and config. Raise as coverage grows.
    global: {
      statements: 8,
      branches: 5,
      functions: 5,
      lines: 8,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
