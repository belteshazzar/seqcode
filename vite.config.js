import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(resolve(), 'src/main.js'), // Entry point of your library
      name: 'Coded Sequence', // Replace with your library name
      fileName: (format) => `coded-sequence.js`, // Output file name
      formats: ['es'], // Output formats (ES module and UMD)
    },
    rollupOptions: {
      // Externalize dependencies that shouldn't be bundled
      external: [], // Add external dependencies if any
    },
  },
});
