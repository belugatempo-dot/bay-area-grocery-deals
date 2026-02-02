import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**', 'scripts/utils/**', 'scripts/scrapers/**', 'src/components/**'],
      thresholds: {
        'src/utils/**': { statements: 90 },
        'scripts/utils/**': { statements: 85 },
      },
    },
  },
})
