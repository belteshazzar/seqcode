
import js from '@eslint/js';

export default [
  {
    files: ['src/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        performance: 'readonly',
      },
    },
    rules: {
      // no-undef would have caught the undeclared `refs` assignment that
      // silently broke the re-layout path
      'no-undef': 'error',
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      eqeqeq: 'warn',
    },
  },
];
