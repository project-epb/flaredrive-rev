/** @type {import('prettier').Config} */
export default {
  printWidth: 120,
  useTabs: false,
  tabWidth: 2,
  semi: false,
  singleQuote: true,
  trailingComma: 'es5',
  arrowParens: 'always',
  quoteProps: 'as-needed',
  endOfLine: 'auto',
  plugins: ['@prettier/plugin-pug'],
}
