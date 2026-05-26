// @ts-check
const path = require('path');

const pkgRoot = path.resolve(__dirname, '../');

const workspaceMapper = (pkgName) => [
  `^@conversionops/${pkgName}$`,
  path.join(pkgRoot, pkgName, 'src/index.ts'),
];

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.spec.ts'],
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
  moduleNameMapper: Object.fromEntries([
    ['@conversionops/db$', path.join(pkgRoot, 'db/dist/index.js')],
    workspaceMapper('types'),
    workspaceMapper('sdk-standards'),
  ]),
  transformIgnorePatterns: ['/node_modules/(?!(@conversionops|xstate)/)'],
  passWithNoTests: true,
};
