const preset = require('jest-expo/jest-preset');

module.exports = {
  ...preset,
  testEnvironment: 'node',
  setupFiles: [],
  setupFilesAfterEnv: [],
  testMatch: ['<rootDir>/integration/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
};
