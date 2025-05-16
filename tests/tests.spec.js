
import fs from 'node:fs'
import { describe, test } from 'vitest'
import { createSVGWindow } from 'svgdom';
import { registerWindow } from '@svgdotjs/svg.js'
import seqcode from './src/main.js';

const window = createSVGWindow();
const document = window.document;
registerWindow(window, document);

describe.each(
  fs.readdirSync('./tests/input').map(file => file.replace('.seqcode', ''))
)('svg from source', (f) => {

  test(f, () => {
    const txt = fs.readFileSync(`./tests/input/${f}.seqcode`, 'utf8');
    // test with sans-serif as we haven't loaded fonts into
    // svgdom which it would need to measure text
    const svg = seqcode(txt, {fontFace: 'sans-serif'});
    fs.writeFileSync(`./tests/output/${f}.svg`, svg, { encoding: 'utf8' })
  })

})

describe('svg from string', () => {
  test('test1', () => {
    // test with sans-serif as we haven't loaded fonts into
    // svgdom which it would need to measure text
    const svg = seqcode("bob", {fontFace: 'sans-serif'});
    fs.writeFileSync(`./tests/output/test1.svg`, svg, { encoding: 'utf8' })
  })
})