/** @type {import('prettier').Config} */
module.exports = {
  printWidth: 120,
  useTabs: false,
  tabWidth: 2,
  semi: false,
  singleQuote: true,
  trailingComma: 'es5',
  arrowParens: 'always',
  quoteProps: 'as-needed',
  endOfLine: 'auto',
  plugins: [require.resolve('@prettier/plugin-pug')],
}
