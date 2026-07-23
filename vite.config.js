
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(resolve(), 'src/main.js'), // Entry point of your library
      name: 'SeqCode', // Replace with your library name
      fileName: (format) => `seqcode.js`, // Output file name
      formats: ['es'], // Output formats (ES module and UMD)
    },
    rollupOptions: {
      // svg.js must not be bundled: consumers (and the README's Node
      // setup) call registerWindow on their own copy, which must be the
      // same module instance the library draws with.
      external: ['@svgdotjs/svg.js'],
      output: {
      }
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: './tests/input/example.seqcode',
          dest: './',
        },
      ],
    }),
  ]
});
