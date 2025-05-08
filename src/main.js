
import { createSVGWindow } from 'svgdom';
import { SVG, registerWindow } from '@svgdotjs/svg.js'

import { tokenize } from './tokenize.js';
import { parse } from './parse.js';
import { graph } from './graph.js';
import { Graphics } from './src/graphics.js';

export default function (text,options) {

  const config = {
    fontWeight: 200,
    fontSize: 12,
    fontFace: 'sans-serif',
    background: "white",
    foreground: "black",
    noteBackground: 'rgba(255,255,204,0.8)',
    noteStroke: '#eee',
    dashStyle: [8, 5],
    arrowSize: 7,
    margin: 30,
    rowSpacing: 25,
    objectSpacing: 5,
    areaPadding: 15,
  }

  Object.assign(config, options);

  const toks = tokenize(text);
  const ast = parse(toks);

  const window = createSVGWindow();
  const document = window.document;
  registerWindow(window, document);
  config.svg = SVG(document.documentElement)
  const gfx = new Graphics(config);

  graph(ast.objects, ast.rootCall, gfx);
  config.svg.defs().plain(text).attr('id', 'seqcode')

  return config.svg.svg()
}