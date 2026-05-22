module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
  },
  root: true,
  env: { node: true, jest: true },
  ignorePatterns: ['.eslintrc.js', 'dist/**'],
  rules: {
    'no-console': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
  },
};
