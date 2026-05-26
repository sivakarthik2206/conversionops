// @ts-check
const path = require('path');

const pkgRoot = path.resolve(__dirname, '../../packages');

const workspaceMapper = (pkgName) => [
  `^@conversionops/${pkgName}$`,
  path.join(pkgRoot, pkgName, 'src/index.ts'),
];

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.spec.ts',
    '<rootDir>/src/**/*.spec.ts',
  ],
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
    workspaceMapper('auth'),
    workspaceMapper('db'),
    workspaceMapper('types'),
    workspaceMapper('sdk-standards'),
    workspaceMapper('compliance'),
    workspaceMapper('ai'),
    workspaceMapper('orchestration'),
    workspaceMapper('observability'),
    workspaceMapper('integrations'),
    workspaceMapper('config'),
  ]),
  transformIgnorePatterns: ['/node_modules/(?!(@conversionops)/)'],
  passWithNoTests: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts'],
};
