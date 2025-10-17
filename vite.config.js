import { defineConfig } from 'vite';
import path from 'path';

const inputFile = path.resolve(__dirname, 'js/kaz-image-craft.js');

export default defineConfig({
  build: {
    lib: {
      entry: inputFile,
      name: 'KazImageCraft',
      fileName: (format, min) => {
        if (format === 'es') return min ? 'kaz-image-craft.es.min.js' : 'kaz-image-craft.es.js';
        if (format === 'umd') return min ? 'kaz-image-craft.umd.min.js' : 'kaz-image-craft.umd.js';
        return 'kaz-image-craft';
      },
      formats: ['es', 'umd'],
    },
    outDir: 'dist',
    minify: true, // ✅ 这里控制整个 build 是否压缩
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
