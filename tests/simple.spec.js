
import fs from 'node:fs'

import { expect, test } from 'vitest'

import {tokenize} from './src/tokenize.js';
import {parse} from './src/parse.js';
import {Graphics} from './src/graphics.js';
import {graph} from './src/graph.js';

import { createCanvas } from 'canvas'

test('simple', () => {

  const toks = tokenize("fred.wait()");
  const ast = parse(toks);

  const canvas = createCanvas(200, 200)

  const gfx = new Graphics(canvas,{
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

  const out = fs.createWriteStream('./tests-out/simple.png')
  const stream = canvas.createPNGStream()
  stream.pipe(out)
  out.on('finish', () =>  console.log('The PNG file was created.'))
});