import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testMatch: ['**/tests/**/*.test.ts'],
  setupFilesAfterEnv: [],
  globalSetup: '../jest.global-setup.ts',
  globalTeardown: '../jest.global-teardown.ts',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testTimeout: 30000,
  forceExit: true,
  clearMocks: true,
};

export default config;
