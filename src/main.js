
import { SVG } from '@svgdotjs/svg.js'

import { tokenize } from './tokenize.js';
import { parse } from './parse.js';
import { graph } from './graph.js';
import { Graphics } from './graphics.js';

export default function (text,options) {

  const config = {
    fontWeight: 100,
    fontSize: 12,
    fontFace: 'verdana',
    foreground: "black",
    background: 'white',
    noteFill: 'rgba(255,255,204,0.8)',
    noteStroke: '#ccc',
//    fill: '#eee',
    fillLight: '#eee',
    fillDark: '#ddd',
    linkColor: "#999",
    dashStyle: [8, 5],
    arrowSize: 7,
    margin: 30,
    rowSpacing: 30,
    objectSpacing: 5,
    areaPadding: 15,
    linkHandler: {
      href: (link) => '#',
      target: (link) => '',
      onclick: (link) => `alert(decodeURIComponent("${encodeURIComponent(link)}"))`
    },
  }

  Object.assign(config, options);

  const toks = tokenize(text);

  const ast = parse(toks);

  config.svg = SVG()

  if (!config.fill) {
    config.fill = config.svg.gradient('linear', (add) => {
      add.stop(0, config.fillLight)
      add.stop(1, config.fillDark)
    })
  }

  const gfx = new Graphics(config);

  graph(ast.objects, ast.rootCall, gfx);
  config.svg.defs().plain(text).attr('id', 'seqcode')

  return {
    svg: config.svg.svg(),
    errors: ast.errors.length > 0 ? ast.errors : null
  };
}
