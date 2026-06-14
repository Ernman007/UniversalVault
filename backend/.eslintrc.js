module.exports = {
  root: true,
  env: {
    commonjs: true,
    es2021: true,
    node: true
  },
  extends: ['airbnb-base'],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'no-console': 'off',
    'no-underscore-dangle': 'off',
    'consistent-return': 'off',
    'no-param-reassign': ['error', { props: false }],
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    'import/no-dynamic-require': 'off',
    'global-require': 'off',
    'comma-dangle': 'off',
    'prefer-destructuring': 'off',
    'prefer-template': 'off',
    'wrap-iife': 'off',
    'no-trailing-spaces': 'off',
    'eol-last': 'off'
  },
  ignorePatterns: ['node_modules/', 'tools/reports/**']
};
