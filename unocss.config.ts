import { defineConfig, presetWind4, presetAttributify, presetTypography } from 'unocss'
import extractorPug from '@unocss/extractor-pug'

const PROD = process.env.NODE_ENV === 'production' && process.env.BUILD_ENV !== 'development'

export default defineConfig({
  presets: [
    presetWind4(),
    presetAttributify({
      prefix: 'uno:',
    }),
    presetTypography(),
  ],
  extractors: [extractorPug()],
  rules: [
    ['dev-only', PROD ? { display: 'none', position: 'absolute', left: '-9999vw', visible: 'hidden' } : {}],
    [
      'bg-dev',
      {
        'background-image':
          'repeating-linear-gradient(-45deg, #e1bb4266, #e1bb4266 1rem, #55366366 1rem, #55366366 2rem)',
      },
    ],
  ],
})
