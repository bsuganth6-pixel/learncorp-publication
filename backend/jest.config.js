/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  setupFiles: ['<rootDir>/../tests/setupEnv.ts'],
  testMatch: ['**/*.test.ts'],
};
