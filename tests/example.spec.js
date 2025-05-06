
import fs from 'node:fs'

import { expect, test } from 'vitest'

import {tokenize} from './src/tokenize.js';
import {parse} from './src/parse.js';
import {Graphics} from './src/graphics.js';
import {graph} from './src/graph.js';

import { createCanvas } from 'canvas'


import { createSVGWindow, config } from 'svgdom';
import { SVG,registerWindow } from '@svgdotjs/svg.js'
import { createCanvas } from 'canvas'

const window = createSVGWindow();
const document = window.document;
registerWindow(window, document);

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

test('example generates without error', () => {

  const example = fs.readFileSync('./tests/example.ckwnc', 'utf8');
  const toks = tokenize(example);
  const ast = parse(toks);

  const canvas = createCanvas(200, 200)
  const svg = SVG(document.documentElement)

  const gfx = new Graphics({
    canvas: canvas,
    svg: svg,
    fontWeight: 100,
    fontSize: 10,
    fontFace: '"Century Gothic", CenturyGothic, AppleGothic, sans-serif',
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

  const out = fs.createWriteStream('./tests-out/example.png')
  const stream = canvas.createPNGStream()
  stream.pipe(out)
  out.on('finish', () =>  console.log('The PNG file was created.'))

  fs.writeFileSync('./tests-out/example.svg', svg.svg(), { encoding: 'utf8' })
});