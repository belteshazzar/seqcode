
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
    const {svg,errors} = seqcode(txt, {fontFace: 'sans-serif'});
    if (errors) console.error(errors)
    fs.writeFileSync(`./tests/output/${f}.svg`, svg, { encoding: 'utf8' })
  })

})

describe('from string', () => {
  test('test1', () => {
    // test with sans-serif as we haven't loaded fonts into
    // svgdom which it would need to measure text
    const {svg,errors} = seqcode("bob", {fontFace: 'sans-serif'});
    if (errors) console.error(errors)
    fs.writeFileSync(`./tests/output/from-string-test1.svg`, svg, { encoding: 'utf8' })
  })

  test('create-width', () => {
    // test with sans-serif as we haven't loaded fonts into
    // svgdom which it would need to measure text
    const {svg,errors} = seqcode("frame(x){me:actor\nb:Object\na:Object\na.test() { state(label) }\na.create()}", {fontFace: 'sans-serif'});
    if (errors) console.error(errors)
    fs.writeFileSync(`./tests/output/from-string-create-width.svg`, svg, { encoding: 'utf8' })
  })
})