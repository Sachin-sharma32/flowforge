/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '@flowforge/shared': '<rootDir>/../../packages/shared/src',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/**/*.d.ts'],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 15,
      lines: 15,
      statements: 15,
    },
  },
};
