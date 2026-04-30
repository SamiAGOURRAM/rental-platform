import js from '@eslint/js';
import ts from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default ts.config(
  js.configs.recommended,
  ts.configs.recommended,
  prettier,
  {
    ignores: [
      '**/dist',
      '**/node_modules',
      '**/.prisma',
      '**/migrations',
      '**/*.config.*',
      'packages/backend/modify-plugin.js',
      'packages/backend/modify-plugin.cjs',
      'packages/backend/modify-plugin2.cjs',
      'packages/backend/test-rate-limit.mjs',
    ],
  },
  {
    // Test files: relax strict rules (vitest mocks are hoisted, ESLint can't detect usage)
    files: ['packages/backend/**/*.{test,integration,spec}.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      'prefer-const': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    // Prisma seed: not part of src
    files: ['packages/backend/prisma/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    files: ['packages/frontend/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-unescaped-entities': 'off',
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  {
    files: ['packages/backend/src/**/*.ts'],
    ignores: [
      'packages/backend/src/**/*.test.ts',
      'packages/backend/src/**/*.integration.test.ts',
      'packages/backend/src/**/*.routes.test.ts',
    ],
    languageOptions: {
      parserOptions: {
        project: './packages/backend/tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
);
