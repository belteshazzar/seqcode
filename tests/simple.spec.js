
import fs from 'node:fs'

import { expect, test } from 'vitest'

import {tokenize} from './src/tokenize.js';
import {parse} from './src/parse.js';
import {Graphics} from './src/graphics.js';
import {graph} from './src/graph.js';

import { createSVGWindow,config } from 'svgdom';
import { SVG,registerWindow } from '@svgdotjs/svg.js'
import { createCanvas } from 'canvas'

config
    // your font directory
    .setFontDir('./fonts')
    // map the font-family to the file
    .setFontFamilyMappings({
      'sans-serif': 'OpenSans-Regular.ttf'
    })
    // you can preload your fonts to avoid the loading delay
    // when the font is used the first time
    .preloadFonts()

const window = createSVGWindow();
const document = window.document;
registerWindow(window, document);

test('simple', () => {

  const toks = tokenize("frame(simple) { fred.wait() }");
  const ast = parse(toks);

  const canvas = createCanvas(200, 200)
  const svg = SVG(document.documentElement)

  const gfx = new Graphics({
    canvas: canvas,
    svg: svg,
    fontWeight: 100,
    fontSize: 10,
    fontFace: 'sans-serif',
    background: "white",
    foreground: "black",
    dashStyle: [8, 5],
    gradLight: "#eee",
    gradDark: "#ddd",
    arrowSize: 7,
    margin: 30,
    rowSpacing: 40,
    objectSpacing: 50,
    areaPadding: 15,
    //refCallback: cb
  });

  graph(ast.objects, ast.rootCall, gfx);

  const out = fs.createWriteStream('./tests-out/simple.png')
  const stream = canvas.createPNGStream()
  stream.pipe(out)
  out.on('finish', () =>  console.log('The PNG file was created.'))

  fs.writeFileSync('./tests-out/simple.svg', svg.svg(), { encoding: 'utf8' })
  
});