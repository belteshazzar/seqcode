
import fs from 'node:fs'
import { describe, expect, test } from 'vitest'
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
    const svg = seqcode(txt);
    fs.writeFileSync(`./tests/output/${f}.svg`, svg, { encoding: 'utf8' })
  })

})

describe('svg from string', () => {
  test('test1', () => {
    const svg = seqcode("bob");
    fs.writeFileSync(`./tests/output/test1.svg`, svg, { encoding: 'utf8' })
  })
})