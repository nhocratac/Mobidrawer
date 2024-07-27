import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import alias from '@rollup/plugin-alias';
import path from 'path';

export default defineConfig({
  plugins: [
    alias({
      entries: [
        { find: '~', replacement: path.resolve(__dirname, 'src') }
      ]
    }),
    react(),
  ],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src')
    }
  }
});
