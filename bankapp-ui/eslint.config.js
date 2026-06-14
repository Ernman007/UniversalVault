import eslint from '@eslint/js';
import tseslintParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'e2e-tests/**', 'coverage/**', '.angular/**']
  },
  eslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        sourceType: 'module'
      },
      globals: {
        window: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        document: 'readonly',
        location: 'readonly',
        navigator: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        spyOn: 'readonly',
        vi: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLSelectElement: 'readonly',
        KeyboardEvent: 'readonly',
        HTMLElement: 'readonly',
        Element: 'readonly',
        NodeList: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        IntersectionObserver: 'readonly',
        matchMedia: 'readonly'
      }
    },
    plugins: {
      import: importPlugin,
      prettier: prettierPlugin
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-case-declarations': 'warn',
      'import/order': ['error', {
        groups: [
          ['builtin', 'external'],
          'internal',
          ['parent', 'sibling'],
          'index'
        ],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true }
      }],
      'import/no-unresolved': 'off'
    }
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      'no-unused-vars': 'off'
    }
  },
  {
    files: ['*.config.js', 'tailwind.config.js', 'postcss.config.js', 'vitest.config.ts'],
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off'
    }
  }
];
