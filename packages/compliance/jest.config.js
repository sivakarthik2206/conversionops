// @ts-check
const path = require('path');

const pkgRoot = path.resolve(__dirname, '../');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testMatch: ['**/__tests__/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          paths: {},
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@conversionops/db$': path.join(pkgRoot, 'db/dist/index.js'),
    '^@conversionops/types$': path.join(pkgRoot, 'types/src/index.ts'),
    '^@conversionops/sdk-standards$': path.join(pkgRoot, 'sdk-standards/src/index.ts'),
    '^@conversionops/observability$': path.join(pkgRoot, 'observability/src/index.ts'),
  },
  transformIgnorePatterns: ['/node_modules/'],
  passWithNoTests: true,
};
