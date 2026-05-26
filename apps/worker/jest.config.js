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
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      },
    ],
  },
  moduleNameMapper: Object.fromEntries([
    workspaceMapper('ai'),
    ['@conversionops/db$', path.join(pkgRoot, 'db/dist/index.js')],
    workspaceMapper('compliance'),
    workspaceMapper('orchestration'),
    workspaceMapper('observability'),
    workspaceMapper('integrations'),
    workspaceMapper('sdk-standards'),
    workspaceMapper('types'),
    workspaceMapper('config'),
  ]),
  transformIgnorePatterns: ['/node_modules/(?!(@conversionops)/)'],
  passWithNoTests: true,
};
