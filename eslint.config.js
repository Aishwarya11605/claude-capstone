import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dist-alt', 'node_modules', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Use textContent and DOM APIs (Arch s.10).' },
        { property: 'outerHTML', message: 'Use textContent and DOM APIs (Arch s.10).' },
        { property: 'insertAdjacentHTML', message: 'Use textContent and DOM APIs (Arch s.10).' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='setAttribute'][arguments.0.value='style']",
          message: 'Inline style attributes are blocked by the CSP; use CSS classes (Arch s.10).',
        },
      ],
    },
  },
);
