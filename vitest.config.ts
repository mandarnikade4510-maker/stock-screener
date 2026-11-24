import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [react()], resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node', include: ['src/__tests__/**/*.test.{ts,tsx}'], coverage: { provider: 'v8', include: ['src/lib/**', 'src/stores/**'], exclude: ['src/lib/bench.ts'], reporter: ['text', 'html'] } },
});
